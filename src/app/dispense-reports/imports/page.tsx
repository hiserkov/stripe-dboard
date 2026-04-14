"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/Button";

interface ReportRow {
  id: number;
  reportNumber: string;
  invoiceNumber: string | null;
  clinic: string | null;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  prescriptionCount: number | null;
  subtotal: string | null;
  shipping: string | null;
  total: string | null;
  generatedDate: string | null;
  sourceFilename: string | null;
  importedAt: string | null;
}

type ParsePhase =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "parsing"; filename: string; page: number; totalPages: number; cumulative: number; reportNumber: string; clinic: string }
  | { status: "saving"; filename: string; cumulative: number; reportNumber: string }
  | { status: "done"; reportNumber: string; prescriptions: number; total: number | null }
  | { status: "error"; message: string };

function fmtDate(d: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
}

function fmtMoney(s: string | null | number) {
  if (s == null) return "—";
  const n = typeof s === "number" ? s : parseFloat(s);
  return isNaN(n) ? "—" : n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

// ---------------------------------------------------------------------------
// Confirmation dialog
// ---------------------------------------------------------------------------
function ConfirmModal({
  report,
  onConfirm,
  onCancel,
  deleting,
}: {
  report: ReportRow;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-[rgba(6,27,49,0.4)] backdrop-blur-[2px]" onClick={onCancel} />
      <div
        className="relative bg-white rounded-[8px] border border-[#e5edf5] w-full max-w-[420px] mx-4 p-6 space-y-4"
        style={{ boxShadow: "rgba(50,50,93,0.25) 0px 30px 60px -12px, rgba(0,0,0,0.15) 0px 18px 36px -18px" }}
      >
        <div className="w-10 h-10 rounded-full bg-[rgba(234,34,97,0.08)] flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <path d="M6 2h4M2 4h12M5 4v8a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V4" stroke="#ea2261" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <h2 className="text-[16px] font-normal text-[#061b31]" style={{ fontFeatureSettings: '"ss01"', letterSpacing: "-0.2px" }}>
            Delete {report.reportNumber}?
          </h2>
          <p className="text-[13px] text-[#64748d] mt-1" style={{ fontFeatureSettings: '"ss01"' }}>
            This will permanently delete this report and all{" "}
            <span className="text-[#273951] font-normal">
              {report.prescriptionCount?.toLocaleString() ?? "its"} prescriptions
            </span>
            . This action cannot be undone.
          </p>
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="px-4 py-2 rounded border border-[#e5edf5] text-[13px] text-[#273951] hover:border-[#b9b9f9] transition-colors bg-white disabled:opacity-50"
            style={{ fontFeatureSettings: '"ss01"' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2 rounded text-[13px] text-white bg-[#ea2261] hover:bg-[#c0154f] transition-colors disabled:opacity-60 inline-flex items-center gap-2"
            style={{ fontFeatureSettings: '"ss01"' }}
          >
            {deleting && (
              <svg className="animate-spin" width="12" height="12" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                <path d="M8 2a6 6 0 0 1 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
            Delete report
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upload / progress panel
// ---------------------------------------------------------------------------
function UploadPanel({ onImported }: { onImported: () => void }) {
  const [phase, setPhase] = useState<ParsePhase>({ status: "idle" });
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const startParse = useCallback(async (file: File) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setPhase({ status: "uploading" });

    const formData = new FormData();
    formData.append("file", file);

    let res: Response;
    try {
      res = await fetch("/api/parse-report", {
        method: "POST",
        body: formData,
        signal: abortRef.current.signal,
      });
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
      setPhase({ status: "error", message: String(e) });
      return;
    }

    if (!res.ok || !res.body) {
      setPhase({ status: "error", message: `HTTP ${res.status}` });
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let done: boolean, value: Uint8Array | undefined;
      try {
        ({ done, value } = await reader.read());
      } catch {
        break;
      }
      if (done) break;

      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        let ev: Record<string, unknown>;
        try {
          ev = JSON.parse(line.slice(6));
        } catch {
          continue;
        }

        const t = ev.type as string;

        if (t === "start") {
          setPhase((prev) => ({
            status: "parsing",
            filename: ev.filename as string,
            page: 0,
            totalPages: ev.pages as number,
            cumulative: 0,
            reportNumber: "",
            clinic: "",
            ...(prev.status === "parsing" ? { reportNumber: prev.reportNumber, clinic: prev.clinic } : {}),
          }));
        } else if (t === "header") {
          setPhase((prev) =>
            prev.status === "parsing"
              ? { ...prev, reportNumber: ev.reportNumber as string, clinic: ev.clinic as string }
              : prev
          );
        } else if (t === "page") {
          setPhase((prev) =>
            prev.status === "parsing"
              ? { ...prev, page: ev.page as number, cumulative: ev.cumulative as number }
              : prev
          );
        } else if (t === "saving") {
          setPhase((prev) =>
            prev.status === "parsing"
              ? { status: "saving", filename: prev.filename, cumulative: prev.cumulative, reportNumber: prev.reportNumber }
              : prev
          );
        } else if (t === "done") {
          setPhase({
            status: "done",
            reportNumber: ev.reportNumber as string,
            prescriptions: ev.prescriptions as number,
            total: ev.total as number | null,
          });
          onImported();
        } else if (t === "error") {
          setPhase({ status: "error", message: ev.message as string });
        }
      }
    }
  }, [onImported]);

  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setPhase({ status: "error", message: "Only PDF files are supported" });
      return;
    }
    startParse(file);
  }, [startParse]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const reset = () => {
    abortRef.current?.abort();
    setPhase({ status: "idle" });
  };

  const p = phase;

  // Progress percentage for parsing phase
  const pct =
    p.status === "parsing" && p.totalPages > 0
      ? Math.round((p.page / p.totalPages) * 100)
      : p.status === "saving"
      ? 100
      : 0;

  return (
    <div
      className="rounded-[8px] border border-[#e5edf5] bg-white overflow-hidden"
      style={{ boxShadow: "rgba(23,23,23,0.06) 0px 3px 6px" }}
    >
      {/* Panel header */}
      <div className="px-5 py-4 border-b border-[#e5edf5] flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M8 2v8M5 5l3-3 3 3" stroke="#533afd" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M2 11v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1" stroke="#533afd" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <span className="text-[13px] font-normal text-[#273951]" style={{ fontFeatureSettings: '"ss01"' }}>
          Import PDF report
        </span>
      </div>

      <div className="p-5">
        {/* ---- IDLE: dropzone ---- */}
        {p.status === "idle" && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={[
              "rounded-[6px] border-2 border-dashed px-6 py-10 flex flex-col items-center gap-3 cursor-pointer transition-colors select-none",
              dragging
                ? "border-[#533afd] bg-[rgba(83,58,253,0.04)]"
                : "border-[#e5edf5] hover:border-[#b9b9f9] hover:bg-[#fafbfc]",
            ].join(" ")}
          >
            <div className="w-10 h-10 rounded-full bg-[rgba(83,58,253,0.06)] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v8M5 5l3-3 3 3" stroke="#533afd" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 11v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1" stroke="#533afd" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-[13px] text-[#273951]" style={{ fontFeatureSettings: '"ss01"' }}>
                Drop PDF here or{" "}
                <span className="text-[#533afd] underline underline-offset-2">browse file</span>
              </p>
              <p className="text-[12px] text-[#64748d] mt-1" style={{ fontFeatureSettings: '"ss01"' }}>
                RXCS dispense report PDF
              </p>
            </div>
            <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={onInputChange} />
          </div>
        )}

        {/* ---- UPLOADING ---- */}
        {p.status === "uploading" && (
          <div className="flex items-center gap-3 py-6 justify-center">
            <svg className="animate-spin shrink-0" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="#e5edf5" strokeWidth="2" />
              <path d="M8 2a6 6 0 0 1 6 6" stroke="#533afd" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="text-[13px] text-[#64748d]" style={{ fontFeatureSettings: '"ss01"' }}>
              Uploading…
            </span>
          </div>
        )}

        {/* ---- PARSING ---- */}
        {p.status === "parsing" && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[13px] font-normal text-[#273951] truncate" style={{ fontFeatureSettings: '"ss01"' }}>
                  {p.reportNumber || p.filename}
                </p>
                {p.clinic && (
                  <p className="text-[12px] text-[#64748d] mt-0.5 truncate" style={{ fontFeatureSettings: '"ss01"' }}>
                    {p.clinic}
                  </p>
                )}
              </div>
              <button
                onClick={reset}
                className="shrink-0 text-[12px] text-[#64748d] hover:text-[#273951] transition-colors"
                style={{ fontFeatureSettings: '"ss01"' }}
              >
                Cancel
              </button>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="w-full h-1.5 rounded-full bg-[#e5edf5] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#533afd] transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#64748d]" style={{ fontFeatureSettings: '"ss01"' }}>
                  Page {p.page} of {p.totalPages}
                </span>
                <span className="text-[11px] text-[#64748d] tabular-nums" style={{ fontFeatureSettings: '"tnum"' }}>
                  {p.cumulative.toLocaleString()} prescriptions
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ---- SAVING ---- */}
        {p.status === "saving" && (
          <div className="space-y-4">
            <div>
              <p className="text-[13px] font-normal text-[#273951]" style={{ fontFeatureSettings: '"ss01"' }}>
                {p.reportNumber || p.filename}
              </p>
              <p className="text-[12px] text-[#64748d] mt-0.5" style={{ fontFeatureSettings: '"ss01"' }}>
                Saving {p.cumulative.toLocaleString()} prescriptions…
              </p>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#e5edf5] overflow-hidden">
              <div className="h-full rounded-full bg-[#533afd] animate-pulse" style={{ width: "100%" }} />
            </div>
          </div>
        )}

        {/* ---- DONE ---- */}
        {p.status === "done" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-[rgba(16,185,129,0.1)] flex items-center justify-center mt-0.5">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8l4 4 6-7" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-normal text-[#273951]" style={{ fontFeatureSettings: '"ss01"' }}>
                  {p.reportNumber} imported
                </p>
                <p className="text-[12px] text-[#64748d] mt-0.5" style={{ fontFeatureSettings: '"ss01"' }}>
                  {p.prescriptions.toLocaleString()} prescriptions
                  {p.total != null && <> · {fmtMoney(p.total)}</>}
                </p>
              </div>
            </div>
            <button
              onClick={reset}
              className="text-[12px] text-[#533afd] hover:underline"
              style={{ fontFeatureSettings: '"ss01"' }}
            >
              Upload another
            </button>
          </div>
        )}

        {/* ---- ERROR ---- */}
        {p.status === "error" && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-[13px] text-[#c0154f]" style={{ fontFeatureSettings: '"ss01"' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
                <path d="M8 5v4M8 11v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <span>{p.message}</span>
            </div>
            <button
              onClick={reset}
              className="text-[12px] text-[#533afd] hover:underline"
              style={{ fontFeatureSettings: '"ss01"' }}
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ImportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<ReportRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/dispense-reports?reportsOnly=1")
      .then((r) => r.json())
      .then((json) => setReports(json.reports ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/dispense-reports/${pendingDelete.id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error ?? "Delete failed");
        return;
      }
      setPendingDelete(null);
      load();
    } catch {
      setError("Network error — please try again");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f6f9fc]">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <main className="flex-1 px-8 py-6 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 text-[13px] text-[#64748d] mb-1" style={{ fontFeatureSettings: '"ss01"' }}>
                <Link href="/dispense-reports" className="hover:text-[#533afd] transition-colors">
                  Dispense Reports
                </Link>
                <span>/</span>
                <span className="text-[#273951]">Manage imports</span>
              </div>
              <h1
                className="text-[32px] font-light text-[#061b31] leading-tight"
                style={{ letterSpacing: "-0.64px", fontFeatureSettings: '"ss01"' }}
              >
                Manage imports
              </h1>
              <p className="text-[13px] text-[#64748d] mt-1" style={{ fontFeatureSettings: '"ss01"' }}>
                {reports.length} report{reports.length !== 1 ? "s" : ""} imported
              </p>
            </div>
          </div>

          {/* Upload panel */}
          <UploadPanel onImported={load} />

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-[6px] bg-[rgba(234,34,97,0.06)] border border-[rgba(234,34,97,0.2)] text-[13px] text-[#c0154f]" style={{ fontFeatureSettings: '"ss01"' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
                <path d="M8 5v4M8 11v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              {error}
              <button onClick={() => setError(null)} className="ml-auto hover:opacity-70">✕</button>
            </div>
          )}

          {/* Table */}
          <div className="w-full overflow-x-auto rounded-[6px] border border-[#e5edf5] [box-shadow:rgba(23,23,23,0.06)_0px_3px_6px] bg-white">
            <table className="w-full text-[13px]" style={{ fontFeatureSettings: '"ss01"' }}>
              <thead>
                <tr className="border-b border-[#e5edf5] bg-[#f8fafc]">
                  {["Report #", "Invoice #", "Date Range", "Prescriptions", "Total", "Source File", "Imported"].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-[11px] font-normal text-[#64748d] uppercase whitespace-nowrap"
                      style={{ letterSpacing: "0.04em" }}
                    >
                      {col}
                    </th>
                  ))}
                  <th className="px-4 py-3 w-12" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-[#64748d]">
                      <span className="inline-flex items-center gap-2">
                        <svg className="animate-spin" width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <circle cx="8" cy="8" r="6" stroke="#e5edf5" strokeWidth="2" />
                          <path d="M8 2a6 6 0 0 1 6 6" stroke="#533afd" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Loading…
                      </span>
                    </td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-[#64748d]">
                      No reports imported yet
                    </td>
                  </tr>
                ) : reports.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-[#e5edf5] last:border-0 hover:bg-[#fafbfc] transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-[12px] text-[#273951] whitespace-nowrap">
                      {r.reportNumber}
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-[#64748d] whitespace-nowrap">
                      {r.invoiceNumber ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[#64748d] whitespace-nowrap">
                      {r.dateRangeStart && r.dateRangeEnd
                        ? `${fmtDate(r.dateRangeStart)} – ${fmtDate(r.dateRangeEnd)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-[#273951] tabular-nums" style={{ fontFeatureSettings: '"tnum"' }}>
                      {r.prescriptionCount?.toLocaleString() ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[#061b31] whitespace-nowrap" style={{ fontFeatureSettings: '"tnum"' }}>
                      {fmtMoney(r.total)}
                    </td>
                    <td className="px-4 py-3 text-[#64748d] max-w-[200px] truncate">
                      {r.sourceFilename ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[#64748d] whitespace-nowrap">
                      {r.importedAt ? fmtDate(r.importedAt) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setPendingDelete(r)}
                        title="Delete report"
                        className="p-1.5 rounded text-[#b0b8c8] hover:text-[#ea2261] hover:bg-[rgba(234,34,97,0.06)] transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path d="M6 2h4M2 4h12M5 4v8a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
              ← Back
            </Button>
          </div>

        </main>
      </div>

      {pendingDelete && (
        <ConfirmModal
          report={pendingDelete}
          onConfirm={handleDelete}
          onCancel={() => { if (!deleting) setPendingDelete(null); }}
          deleting={deleting}
        />
      )}
    </div>
  );
}
