"""
FastAPI service — streams RXCS PDF parsing progress via SSE.
Endpoint: POST /parse  (multipart/form-data, field: file)
"""

import io
import json
import os
import traceback
from pathlib import Path

import pdfplumber
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from parser import (
    extract_report_header,
    _extract_page_prescriptions,
    extract_shipping,
    get_connection,
    apply_schema,
    insert_report,
    insert_prescriptions,
    insert_shipping,
)

app = FastAPI()

# Allow the Next.js server-side proxy to call us
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["*"],
)


def _sse(event_dict: dict) -> str:
    return f"data: {json.dumps(event_dict)}\n\n"


def _parse_stream(file_bytes: bytes, filename: str):
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            total_pages = len(pdf.pages)

            yield _sse({"type": "start", "filename": filename, "pages": total_pages})

            # Header (page 1 only)
            header = extract_report_header(pdf)
            yield _sse({
                "type": "header",
                "reportNumber": header.get("report_number", ""),
                "clinic": header.get("clinic", ""),
            })

            # Prescriptions — page by page
            all_prescriptions = []
            for i, page in enumerate(pdf.pages):
                page_rows = _extract_page_prescriptions(page)
                all_prescriptions.extend(page_rows)
                yield _sse({
                    "type": "page",
                    "page": i + 1,
                    "total": total_pages,
                    "pageRows": len(page_rows),
                    "cumulative": len(all_prescriptions),
                })

            # Shipping
            shipping = extract_shipping(pdf)
            yield _sse({"type": "shipping", "count": len(shipping)})

        # Save to DB
        yield _sse({"type": "saving"})

        conn = get_connection()
        try:
            apply_schema(conn)
            report_id = insert_report(conn, header, filename)
            insert_prescriptions(conn, report_id, all_prescriptions)
            insert_shipping(conn, report_id, shipping)
        finally:
            conn.close()

        yield _sse({
            "type": "done",
            "reportNumber": header.get("report_number", ""),
            "prescriptions": len(all_prescriptions),
            "total": header.get("total"),
        })

    except Exception as exc:
        yield _sse({"type": "error", "message": str(exc)})
        traceback.print_exc()


@app.post("/parse")
async def parse_report(file: UploadFile = File(...)):
    file_bytes = await file.read()
    filename = Path(file.filename or "upload.pdf").name

    return StreamingResponse(
        _parse_stream(file_bytes, filename),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/health")
def health():
    return {"ok": True}
