"use client";

import React, { useState, useEffect } from "react";
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

function fmtDate(d: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
}

function fmtMoney(s: string | null) {
  if (!s) return "—";
  const n = parseFloat(s);
  return isNaN(n) ? "—" : n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

// Minimal confirmation dialog
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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[rgba(6,27,49,0.4)] backdrop-blur-[2px]"
        onClick={onCancel}
      />
      {/* Dialog */}
      <div
        className="relative bg-white rounded-[8px] border border-[#e5edf5] w-full max-w-[420px] mx-4 p-6 space-y-4"
        style={{ boxShadow: "rgba(50,50,93,0.25) 0px 30px 60px -12px, rgba(0,0,0,0.15) 0px 18px 36px -18px" }}
      >
        {/* Icon */}
        <div className="w-10 h-10 rounded-full bg-[rgba(234,34,97,0.08)] flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <path d="M6 2h4M2 4h12M5 4v8a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V4" stroke="#ea2261" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div>
          <h2
            className="text-[16px] font-normal text-[#061b31]"
            style={{ fontFeatureSettings: '"ss01"', letterSpacing: "-0.2px" }}
          >
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
                    <td
                      className="px-4 py-3 text-[#273951] tabular-nums"
                      style={{ fontFeatureSettings: '"tnum"' }}
                    >
                      {r.prescriptionCount?.toLocaleString() ?? "—"}
                    </td>
                    <td
                      className="px-4 py-3 text-[#061b31] whitespace-nowrap"
                      style={{ fontFeatureSettings: '"tnum"' }}
                    >
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
