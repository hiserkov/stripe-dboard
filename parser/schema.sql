-- RXCS Dispense Report schema

CREATE TABLE IF NOT EXISTS dispense_reports (
    id               SERIAL PRIMARY KEY,
    report_number    TEXT UNIQUE NOT NULL,
    invoice_number   TEXT,
    clinic           TEXT,
    date_range_start DATE,
    date_range_end   DATE,
    prescription_count INTEGER,
    subtotal         NUMERIC(10, 2),
    shipping         NUMERIC(10, 2),
    total            NUMERIC(10, 2),
    generated_date   DATE,
    source_filename  TEXT,
    imported_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prescriptions (
    id               SERIAL PRIMARY KEY,
    report_id        INTEGER REFERENCES dispense_reports(id) ON DELETE CASCADE,
    line_number      INTEGER,
    rx_number        TEXT,
    patient_name     TEXT,
    drug_name        TEXT,
    quantity         INTEGER,
    fill_date        DATE,
    pickup           TEXT,
    tracking_number  TEXT,
    prescriber_name  TEXT,
    prescriber_clinic TEXT,
    clinic_name      TEXT,
    price            NUMERIC(10, 2)
);

CREATE TABLE IF NOT EXISTS shipping_items (
    id               SERIAL PRIMARY KEY,
    report_id        INTEGER REFERENCES dispense_reports(id) ON DELETE CASCADE,
    tracking_number  TEXT,
    shipping_method  TEXT,
    in_out_state     TEXT,
    items            INTEGER,
    price            NUMERIC(10, 2)
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_report_id ON prescriptions(report_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_rx_number ON prescriptions(rx_number);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_name);
CREATE INDEX IF NOT EXISTS idx_shipping_report_id ON shipping_items(report_id);
CREATE INDEX IF NOT EXISTS idx_reports_report_number ON dispense_reports(report_number);
