"""
RXCS Dispense Report PDF Parser
Parses Rx Compound Store dispense report PDFs and loads data into PostgreSQL.
Uses word-position-based column detection (the PDF uses positioned text, not tables).
"""

import re
import os
from datetime import datetime, date
from pathlib import Path
from typing import Optional

import pdfplumber
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# ---------------------------------------------------------------------------
# Column x-ranges (measured empirically from actual PDF word positions)
# Each entry: (col_name, x_min, x_max)
# ---------------------------------------------------------------------------
RX_COLUMNS = [
    ("line_number",      33,  56),
    ("rx_number",        56,  92),
    ("patient_name",     90, 158),
    ("drug_name",       156, 252),
    ("quantity",        250, 272),
    ("fill_date",       272, 304),
    ("pickup",          304, 335),
    ("tracking_number", 333, 388),
    ("prescriber",      386, 446),
    ("clinic_name",     443, 504),
    ("price",           500, 560),
]

SHIP_COLUMNS = [
    ("tracking_number",  33, 170),
    ("shipping_method", 168, 370),
    ("in_out_state",    368, 440),
    ("items",           437, 475),
    ("price",           472, 560),
]

# Maximum y-gap (in points) between stacked digits of the same multi-digit
# line number (e.g. "1" over "0" for row 10).
DIGIT_STACK_GAP = 15.0


# ---------------------------------------------------------------------------
# Utility
# ---------------------------------------------------------------------------

def clean(s: str) -> str:
    return re.sub(r"\s+", " ", s or "").strip()


def parse_price(s: str) -> Optional[float]:
    s = re.sub(r"[\s$,]", "", s or "")
    try:
        return float(s)
    except ValueError:
        return None


def parse_date(s: str) -> Optional[date]:
    s = re.sub(r"\s+", "", s or "")
    for fmt in ("%m/%d/%y", "%m/%d/%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    return None


def parse_int(s: str) -> Optional[int]:
    s = clean(s)
    try:
        return int(s)
    except (ValueError, TypeError):
        return None


def assign_col(x: float, columns: list) -> Optional[str]:
    for name, xmin, xmax in columns:
        if xmin <= x < xmax:
            return name
    return None


# ---------------------------------------------------------------------------
# Multi-digit line number pre-processing
# ---------------------------------------------------------------------------

def merge_stacked_line_numbers(words: list[dict]) -> list[dict]:
    """
    In this PDF, multi-digit line numbers are rendered as stacked single
    characters at the same x position. E.g. row 10 appears as:
        y=33.9  text='1'   x=41
        y=43.9  text='0'   x=41
    This function merges such groups into a single word with the top y.
    """
    LN_X_MIN, LN_X_MAX = 33, 56

    # Separate line-number-column single digits from everything else
    ln_digits = [w for w in words
                 if LN_X_MIN <= w["x0"] < LN_X_MAX and re.match(r"^\d$", w["text"])]
    other = [w for w in words
             if not (LN_X_MIN <= w["x0"] < LN_X_MAX and re.match(r"^\d$", w["text"]))]

    if not ln_digits:
        return words

    ln_digits.sort(key=lambda w: w["top"])

    # Group consecutive digits that are within DIGIT_STACK_GAP of each other
    groups: list[list[dict]] = []
    current_group: list[dict] = [ln_digits[0]]
    for d in ln_digits[1:]:
        if d["top"] - current_group[-1]["top"] <= DIGIT_STACK_GAP:
            current_group.append(d)
        else:
            groups.append(current_group)
            current_group = [d]
    groups.append(current_group)

    # Synthesize merged word dicts
    merged = []
    for grp in groups:
        merged.append({
            "x0": grp[0]["x0"],
            "x1": grp[0]["x1"],
            "top": grp[0]["top"],
            "doctop": grp[0]["doctop"],
            "bottom": grp[-1]["bottom"],
            "text": "".join(d["text"] for d in grp),
        })

    return other + merged


# ---------------------------------------------------------------------------
# Row-bucket builder
# ---------------------------------------------------------------------------

def build_row_buckets(words: list[dict], columns: list) -> list[dict]:
    """
    Group words into prescription (or shipping) row buckets.
    A new row starts when a word in the first column contains a digit string.

    Returns list of {col_name: str}.
    """
    first_col = columns[0][0]
    first_col_range = (columns[0][1], columns[0][2])

    # Annotate each word with its column
    annotated = []
    for w in words:
        col = assign_col(w["x0"], columns)
        if col:
            annotated.append({
                "top": w["top"],
                "x0":  w["x0"],
                "col": col,
                "text": w["text"],
            })
    # Sort by vertical position first (rounded to nearest integer to handle
    # sub-point y-offsets between columns), then by x (left→right) so that the
    # line_number column always precedes other columns on the same visual line.
    annotated.sort(key=lambda w: (round(w["top"]), w["x0"]))

    records: list[dict] = []
    current: Optional[dict] = None

    for w in annotated:
        if w["col"] == first_col and re.match(r"^\d+$", w["text"]):
            current = {c[0]: [] for c in columns}
            records.append(current)
        if current is not None:
            current[w["col"]].append(w["text"])

    # Collapse token lists to final strings
    result = []
    for rec in records:
        row = {}
        for col_name, _, _ in columns:
            tokens = rec.get(col_name, [])
            if col_name == "price":
                # "$290" + ".00" → "$290.00" (no space)
                row[col_name] = "".join(tokens)
            else:
                row[col_name] = " ".join(tokens)
        result.append(row)

    return result


# ---------------------------------------------------------------------------
# Header extraction
# ---------------------------------------------------------------------------

def extract_report_header(pdf) -> dict:
    """
    Header layout (from empirical word positions):
      y≈103  GENERATED  |  REPORT #  |  INVOICE  |  CLINIC  |  DATE RANGE  |  PRESCRIPTIONS
      y≈113  4/13/2026  |  DR-       |  INV-     |  North   |  3/5/2026 -  |  408
      y≈126             |  20260413- |  20260413-|  Laser Cafe Inc DBA | 4/12/2026
      y≈139             |  00040     |  00038    |  Helimeds|

    Column x-ranges (labels are at y≈103; data starts at y≈108):
      generated:  x =  55–130
      report_num: x = 129–200
      invoice:    x = 200–280
      clinic:     x = 280–406
      date_range: x = 405–480  (dates only, skip '-')
      presc_count:x ≥ 480
    """
    words = pdf.pages[0].extract_words()
    # Data rows start at y≈113; labels are at y≈103 — use y>108 to skip column headers
    data_words = [w for w in words if 108 < w["top"] < 165]
    data_words.sort(key=lambda w: (w["top"], w["x0"]))

    def col_tokens(x_min, x_max):
        return [w["text"] for w in data_words if x_min <= w["x0"] < x_max]

    info: dict = {}

    # Report number: DR- / 20260413- / 00040 (concatenate, no spaces)
    rpt = "".join(col_tokens(129, 200))
    if rpt:
        info["report_number"] = rpt

    # Invoice number: INV- / 20260413- / 00038
    inv = "".join(col_tokens(200, 280))
    if inv:
        info["invoice_number"] = inv

    # Generated date: single token like "4/13/2026"
    gen_toks = [t for t in col_tokens(55, 130) if re.match(r"\d+/\d+/\d+", t)]
    if gen_toks:
        info["generated_date"] = parse_date(gen_toks[0])

    # Clinic: words between invoice and date-range columns, joined with spaces
    clinic_toks = col_tokens(280, 406)
    if clinic_toks:
        info["clinic"] = " ".join(clinic_toks)

    # Date range: two date tokens in the x=405-480 band (skip the '-' separator)
    date_toks = [t for t in col_tokens(405, 480) if re.match(r"\d+/\d+/\d+", t)]
    if len(date_toks) >= 1:
        info["date_range_start"] = parse_date(date_toks[0])
    if len(date_toks) >= 2:
        info["date_range_end"] = parse_date(date_toks[1])

    # Prescription count: digit token at far right
    presc_toks = [t for t in col_tokens(480, 560) if re.match(r"^\d+$", t)]
    if presc_toks:
        info["prescription_count"] = int(presc_toks[0])

    # Financials from text (extract cleanly via text layer)
    text = pdf.pages[0].extract_text() or ""
    m = re.search(r"Subtotal:\s*\$([\d,]+\.\d+)", text)
    if m:
        info["subtotal"] = float(m.group(1).replace(",", ""))

    m = re.search(r"Shipping:\s*\$([\d,]+\.\d+)", text)
    if m:
        info["shipping"] = float(m.group(1).replace(",", ""))

    m = re.search(r"TOTAL:\s*\$([\d,]+\.\d+)", text)
    if m:
        info["total"] = float(m.group(1).replace(",", ""))

    return info


# ---------------------------------------------------------------------------
# Prescription extraction
# ---------------------------------------------------------------------------

def split_prescriber(raw: str) -> tuple[str, str]:
    """Split "ELIAZER MORGAN HELIMEDS" into (prescriber_name, prescriber_clinic)."""
    clinic_keywords = [
        "HELIMEDS PINA",
        "HELIMEDS GONZALEZ",
        "HELIMEDS KESSLER",
        "HELIMEDS FOSTER",
        "JEAN-LOUIS",
        "JEANLOUIS",
        "MCDOWELL",
        "HELIMEDS",
    ]
    up = raw.upper()
    for kw in clinic_keywords:
        idx = up.find(kw)
        if idx > 0:
            return clean(raw[:idx]), clean(raw[idx:])
    return raw, ""


def _extract_page_prescriptions(page) -> list[dict]:
    """Extract prescriptions from a single page. Used by CLI and streaming API."""
    words = merge_stacked_line_numbers(page.extract_words())

    ln_words = [w for w in words
                if 33 <= w["x0"] < 56 and re.match(r"^\d+$", w["text"])]
    if not ln_words:
        return []

    text = page.extract_text() or ""
    if "SHIPPING ITEMS" in text.upper() or "TRACKING NUMBER" in text.upper():
        rx_count = sum(1 for w in words if 56 <= w["x0"] < 92 and re.match(r"^\d{5,}", w["text"]))
        if rx_count == 0:
            return []

    rows = build_row_buckets(words, RX_COLUMNS)
    page_prescriptions = []

    for row in rows:
        ln = parse_int(row.get("line_number", ""))
        if ln is None:
            continue

        rx_raw = re.sub(r"\s+", "", row.get("rx_number", ""))
        if not re.match(r"^\d{5,}", rx_raw):
            continue

        tracking_raw = re.sub(r"\s+", "", row.get("tracking_number", ""))
        tracking = tracking_raw if re.match(r"^\d{10,}", tracking_raw) else None

        prescriber_raw = row.get("prescriber", "")
        prescriber_name, prescriber_clinic = split_prescriber(prescriber_raw)

        page_prescriptions.append({
            "line_number": ln,
            "rx_number": rx_raw,
            "patient_name": clean(row.get("patient_name", "")),
            "drug_name": clean(row.get("drug_name", "")),
            "quantity": parse_int(row.get("quantity", "")),
            "fill_date": parse_date(row.get("fill_date", "")),
            "pickup": row.get("pickup", "").strip() or None,
            "tracking_number": tracking,
            "prescriber_name": prescriber_name or None,
            "prescriber_clinic": prescriber_clinic or None,
            "clinic_name": clean(row.get("clinic_name", "")),
            "price": parse_price(row.get("price", "")),
        })

    return page_prescriptions


def extract_prescriptions(pdf) -> list[dict]:
    prescriptions = []
    for page in pdf.pages:
        prescriptions.extend(_extract_page_prescriptions(page))
    return prescriptions


# ---------------------------------------------------------------------------
# Shipping extraction
# ---------------------------------------------------------------------------

def extract_shipping(pdf) -> list[dict]:
    shipping = []

    for page in pdf.pages:
        text = page.extract_text() or ""
        if "SHIPPING ITEMS" not in text.upper() and "TRACKING NUMBER" not in text.upper():
            continue

        words = page.extract_words()
        rows = build_row_buckets(words, SHIP_COLUMNS)

        for row in rows:
            tracking = re.sub(r"\s+", "", row.get("tracking_number", ""))
            if not re.match(r"^\d{10,}", tracking):
                continue
            shipping.append({
                "tracking_number": tracking,
                "shipping_method": clean(row.get("shipping_method", "")) or None,
                "in_out_state": clean(row.get("in_out_state", "")) or None,
                "items": parse_int(row.get("items", "")),
                "price": parse_price(row.get("price", "")),
            })

    return shipping


# ---------------------------------------------------------------------------
# Database operations
# ---------------------------------------------------------------------------

def get_connection():
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable is not set.")
    return psycopg2.connect(DATABASE_URL)


def apply_schema(conn):
    schema_path = Path(__file__).parent / "schema.sql"
    with open(schema_path) as f:
        sql = f.read()
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()


def insert_report(conn, info: dict, filename: str) -> int:
    sql = """
        INSERT INTO dispense_reports
            (report_number, invoice_number, clinic, date_range_start, date_range_end,
             prescription_count, subtotal, shipping, total, generated_date, source_filename)
        VALUES (%(report_number)s, %(invoice_number)s, %(clinic)s, %(date_range_start)s,
                %(date_range_end)s, %(prescription_count)s, %(subtotal)s, %(shipping)s,
                %(total)s, %(generated_date)s, %(source_filename)s)
        ON CONFLICT (report_number)
        DO UPDATE SET
            invoice_number     = EXCLUDED.invoice_number,
            clinic             = EXCLUDED.clinic,
            date_range_start   = EXCLUDED.date_range_start,
            date_range_end     = EXCLUDED.date_range_end,
            prescription_count = EXCLUDED.prescription_count,
            subtotal           = EXCLUDED.subtotal,
            shipping           = EXCLUDED.shipping,
            total              = EXCLUDED.total,
            generated_date     = EXCLUDED.generated_date,
            source_filename    = EXCLUDED.source_filename,
            imported_at        = NOW()
        RETURNING id
    """
    row = {
        "report_number":    info.get("report_number", "UNKNOWN"),
        "invoice_number":   info.get("invoice_number"),
        "clinic":           info.get("clinic"),
        "date_range_start": info.get("date_range_start"),
        "date_range_end":   info.get("date_range_end"),
        "prescription_count": info.get("prescription_count"),
        "subtotal":         info.get("subtotal"),
        "shipping":         info.get("shipping"),
        "total":            info.get("total"),
        "generated_date":   info.get("generated_date"),
        "source_filename":  filename,
    }
    with conn.cursor() as cur:
        cur.execute(sql, row)
        report_id = cur.fetchone()[0]
        cur.execute("DELETE FROM prescriptions WHERE report_id = %s", (report_id,))
        cur.execute("DELETE FROM shipping_items WHERE report_id = %s", (report_id,))
    conn.commit()
    return report_id


def insert_prescriptions(conn, report_id: int, rows: list[dict]):
    if not rows:
        return
    sql = """
        INSERT INTO prescriptions
            (report_id, line_number, rx_number, patient_name, drug_name, quantity,
             fill_date, pickup, tracking_number, prescriber_name, prescriber_clinic,
             clinic_name, price)
        VALUES %s
    """
    values = [
        (report_id, r["line_number"], r["rx_number"], r["patient_name"], r["drug_name"],
         r["quantity"], r["fill_date"], r["pickup"], r["tracking_number"],
         r["prescriber_name"], r["prescriber_clinic"], r["clinic_name"], r["price"])
        for r in rows
    ]
    with conn.cursor() as cur:
        execute_values(cur, sql, values)
    conn.commit()


def insert_shipping(conn, report_id: int, rows: list[dict]):
    if not rows:
        return
    sql = """
        INSERT INTO shipping_items
            (report_id, tracking_number, shipping_method, in_out_state, items, price)
        VALUES %s
    """
    values = [
        (report_id, r["tracking_number"], r["shipping_method"],
         r["in_out_state"], r["items"], r["price"])
        for r in rows
    ]
    with conn.cursor() as cur:
        execute_values(cur, sql, values)
    conn.commit()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def process_pdf(pdf_path: str, dry_run: bool = False, verbose: bool = False):
    pdf_path = Path(pdf_path)
    print(f"Parsing: {pdf_path.name}")

    with pdfplumber.open(pdf_path) as pdf:
        header = extract_report_header(pdf)
        prescriptions = extract_prescriptions(pdf)
        shipping = extract_shipping(pdf)

    print(f"  Report #:      {header.get('report_number', '?')}")
    print(f"  Invoice #:     {header.get('invoice_number', '?')}")
    print(f"  Clinic:        {header.get('clinic', '?')}")
    print(f"  Date range:    {header.get('date_range_start')} – {header.get('date_range_end')}")
    print(f"  Prescriptions: {len(prescriptions)} rows parsed")
    print(f"  Shipping:      {len(shipping)} rows parsed")
    print(f"  Subtotal:      ${header.get('subtotal', 0):,.2f}")
    print(f"  Shipping cost: ${header.get('shipping', 0):,.2f}")
    print(f"  Total:         ${header.get('total', 0):,.2f}")

    if dry_run:
        print("\n[dry-run] Skipping database insert. Sample rows:")
        sample = prescriptions[:5] if not verbose else prescriptions
        for r in sample:
            print(f"  #{r['line_number']:3d}  {r['rx_number']:<12}  {r['patient_name']:<25}  "
                  f"{r['drug_name']:<35}  qty={r['quantity']}  "
                  f"fill={r['fill_date']}  ${r['price']}  trk={r['tracking_number']}")
        return

    conn = get_connection()
    try:
        apply_schema(conn)
        report_id = insert_report(conn, header, pdf_path.name)
        insert_prescriptions(conn, report_id, prescriptions)
        insert_shipping(conn, report_id, shipping)
        print(f"  Saved to DB (report_id={report_id})")
    finally:
        conn.close()


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser(description="Parse RXCS dispense report PDFs into PostgreSQL")
    ap.add_argument("files", nargs="+", help="PDF file paths")
    ap.add_argument("--dry-run", action="store_true", help="Parse but do not write to DB")
    ap.add_argument("--verbose", action="store_true", help="Print all parsed rows")
    args = ap.parse_args()

    for f in args.files:
        process_pdf(f, dry_run=args.dry_run, verbose=args.verbose)
