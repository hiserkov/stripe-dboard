"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/Button";
import { RowsPerPage } from "@/components/ui/RowsPerPage";

interface RxRow {
  id: number;
  reportId: number | null;
  lineNumber: number | null;
  rxNumber: string | null;
  patientName: string | null;
  drugName: string | null;
  quantity: number | null;
  fillDate: string | null;
  pickup: string | null;
  trackingNumber: string | null;
  prescriberName: string | null;
  prescriberClinic: string | null;
  clinicName: string | null;
  price: number | null;
}

interface ReportOption {
  reportNumber: string;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  prescriptionCount: number | null;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m) - 1]} ${parseInt(day)}, ${y}`;
}

function fmtPrice(n: number | null) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

// Pill / capsule icon for sidebar
export const pillIcon = (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="5.5" width="13" height="5" rx="2.5" stroke="currentColor" strokeWidth="1.2" />
    <line x1="8" y1="5.5" x2="8" y2="10.5" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

// Drug badge colors — consistent per drug name
const DRUG_COLORS: Record<string, { bg: string; text: string }> = {
  "TIRZEPATIDE": { bg: "rgba(83,58,253,0.08)", text: "#3d25c9" },
  "SEMAGLUTIDE": { bg: "rgba(21,190,83,0.10)", text: "#108c3d" },
  "INSULIN":     { bg: "rgba(249,107,238,0.10)", text: "#a3128c" },
  "SILDENAFIL":  { bg: "rgba(255,180,0,0.12)", text: "#8a5c00" },
  "RXCS":        { bg: "rgba(23,23,23,0.06)", text: "#273951" },
};

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: active ? 1 : 0.35 }}>
      {dir === "asc" || !active ? (
        <path d="M5 2L8 6H2L5 2Z" fill={active ? "#533afd" : "currentColor"} />
      ) : null}
      {dir === "desc" || !active ? (
        <path d="M5 8L2 4H8L5 8Z" fill={active && dir === "desc" ? "#533afd" : "currentColor"} style={{ opacity: active && dir === "asc" ? 0 : 1 }} />
      ) : null}
    </svg>
  );
}

function DrugBadge({ name }: { name: string }) {
  const key = Object.keys(DRUG_COLORS).find((k) => name.toUpperCase().startsWith(k));
  const style = key ? DRUG_COLORS[key] : { bg: "rgba(23,23,23,0.06)", text: "#273951" };
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-[11px] font-normal whitespace-nowrap"
      style={{ background: style.bg, color: style.text, fontFeatureSettings: '"ss01"' }}
    >
      {name}
    </span>
  );
}

export default function DispenseReportsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedReport, setSelectedReport] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState<"fill_date" | "line_number">("fill_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (col: "fill_date" | "line_number") => {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir(col === "line_number" ? "asc" : "desc");
    }
    setPage(1);
  };
  const [data, setData] = useState<RxRow[]>([]);
  const [reports, setReports] = useState<ReportOption[]>([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const buildQs = useCallback(() => {
    const qs = new URLSearchParams({ page: String(page), limit: String(pageSize), sortBy, sortDir });
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    if (debouncedSearch) qs.set("search", debouncedSearch);
    if (selectedReport !== "all") qs.set("report", selectedReport);
    return qs.toString();
  }, [from, to, debouncedSearch, selectedReport, page, pageSize, sortBy, sortDir]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dispense-reports?${buildQs()}`)
      .then((r) => r.json())
      .then((json) => {
        setData(json.data ?? []);
        setReports(json.reports ?? []);
        setPagination(json.pagination ?? { total: 0, totalPages: 1 });
      })
      .finally(() => setLoading(false));
  }, [buildQs]);

  // Reset to page 1 on filter, page size, or sort change
  useEffect(() => { setPage(1); }, [from, to, debouncedSearch, selectedReport, pageSize, sortBy, sortDir]);

  const allSelected = data.length > 0 && data.every((r) => selected.has(r.id));
  const someSelected = data.some((r) => selected.has(r.id));
  const toggleAll = () => {
    if (allSelected) { const s = new Set(selected); data.forEach((r) => s.delete(r.id)); setSelected(s); }
    else { const s = new Set(selected); data.forEach((r) => s.add(r.id)); setSelected(s); }
  };
  const toggleRow = (id: number) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const clearFilters = () => {
    setSearch(""); setDebouncedSearch(""); setFrom(""); setTo(""); setSelectedReport("all");
  };
  const hasFilters = from || to || debouncedSearch || selectedReport !== "all";

  return (
    <div className="flex min-h-screen bg-[#f6f9fc]">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <main className="flex-1 px-8 py-6 space-y-6">

          {/* Page header */}
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1
                className="text-[32px] font-light text-[#061b31] leading-tight"
                style={{ letterSpacing: "-0.64px", fontFeatureSettings: '"ss01"' }}
              >
                Dispense Reports
              </h1>
              {reports.length > 0 && (
                <p className="text-[13px] text-[#64748d] mt-1" style={{ fontFeatureSettings: '"ss01"' }}>
                  {reports.length} report{reports.length !== 1 ? "s" : ""} imported · {pagination.total.toLocaleString()} total prescriptions
                </p>
              )}
            </div>
            <Link
              href="/dispense-reports/imports"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#e5edf5] text-[13px] text-[#64748d] hover:border-[#b9b9f9] hover:text-[#533afd] transition-colors bg-white"
              style={{ fontFeatureSettings: '"ss01"' }}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M6 2h4M2 4h12M5 4v8a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Manage imports
            </Link>
          </div>

          {/* Filters row */}
          <div className="flex items-center gap-3 flex-wrap">

            {/* Report selector */}
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => setSelectedReport("all")}
                className={[
                  "px-3 py-1.5 rounded text-[13px] border transition-colors",
                  selectedReport === "all"
                    ? "bg-[#533afd] text-white border-[#533afd]"
                    : "bg-white text-[#273951] border-[#e5edf5] hover:border-[#b9b9f9] hover:text-[#533afd]",
                ].join(" ")}
                style={{ fontFeatureSettings: '"ss01"' }}
              >
                All reports
              </button>
              {reports.map((r) => (
                <button
                  key={r.reportNumber}
                  onClick={() => setSelectedReport(r.reportNumber)}
                  className={[
                    "px-3 py-1.5 rounded text-[13px] border transition-colors",
                    selectedReport === r.reportNumber
                      ? "bg-[#533afd] text-white border-[#533afd]"
                      : "bg-white text-[#273951] border-[#e5edf5] hover:border-[#b9b9f9] hover:text-[#533afd]",
                  ].join(" ")}
                  style={{ fontFeatureSettings: '"ss01"' }}
                >
                  {r.reportNumber}
                  {r.dateRangeStart && (
                    <span className="ml-1.5 opacity-60 text-[11px]">
                      {fmtDate(r.dateRangeStart)} – {fmtDate(r.dateRangeEnd)}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1" />

            {/* Search input */}
            <div className="relative">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#b0b8c8]"
                width="13" height="13" viewBox="0 0 16 16" fill="none"
              >
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient, drug, RX#, prescriber…"
                className="pl-8 pr-3 py-1.5 border border-[#e5edf5] rounded text-[13px] text-[#061b31] placeholder:text-[#b0b8c8] outline-none focus:border-[#533afd] bg-white w-[280px] transition-colors"
                style={{ fontFeatureSettings: '"ss01"' }}
              />
            </div>

            {/* Fill date range */}
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="border border-[#e5edf5] rounded px-2 py-1.5 text-[13px] text-[#061b31] outline-none focus:border-[#533afd] bg-white"
              />
              <span className="text-[#b0b8c8] text-[12px]">→</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="border border-[#e5edf5] rounded px-2 py-1.5 text-[13px] text-[#061b31] outline-none focus:border-[#533afd] bg-white"
              />
            </div>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-[13px] text-[#64748d] hover:text-[#533afd] transition-colors px-1"
                style={{ fontFeatureSettings: '"ss01"' }}
              >
                Clear
              </button>
            )}

            <Button variant="ghost" size="sm">Export</Button>
          </div>

          {/* Table */}
          <div className="w-full overflow-x-auto rounded-[6px] border border-[#e5edf5] [box-shadow:rgba(23,23,23,0.06)_0px_3px_6px] bg-white">
            <table className="w-full text-[13px]" style={{ fontFeatureSettings: '"ss01"' }}>
              <thead>
                <tr className="border-b border-[#e5edf5] bg-[#f8fafc]">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                      onChange={toggleAll}
                      className="w-3.5 h-3.5 accent-[#533afd] cursor-pointer"
                    />
                  </th>
                  {/* Sortable: # */}
                  <th
                    className="px-4 py-3 text-left text-[11px] font-normal uppercase whitespace-nowrap cursor-pointer select-none group"
                    style={{ letterSpacing: "0.04em", color: sortBy === "line_number" ? "#533afd" : "#64748d" }}
                    onClick={() => toggleSort("line_number")}
                  >
                    <span className="inline-flex items-center gap-1">
                      #
                      <SortIcon active={sortBy === "line_number"} dir={sortDir} />
                    </span>
                  </th>
                  {/* Sortable: Fill Date */}
                  <th
                    className="px-4 py-3 text-left text-[11px] font-normal uppercase whitespace-nowrap cursor-pointer select-none"
                    style={{ letterSpacing: "0.04em", color: sortBy === "fill_date" ? "#533afd" : "#64748d" }}
                    onClick={() => toggleSort("fill_date")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Fill Date
                      <SortIcon active={sortBy === "fill_date"} dir={sortDir} />
                    </span>
                  </th>
                  {/* Static columns */}
                  {["RX #", "Patient", "Drug", "Qty", "Tracking #", "Prescriber", "Price"].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-[11px] font-normal text-[#64748d] uppercase whitespace-nowrap"
                      style={{ letterSpacing: "0.04em" }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-[#64748d]">
                      <span className="inline-flex items-center gap-2">
                        <svg className="animate-spin" width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <circle cx="8" cy="8" r="6" stroke="#e5edf5" strokeWidth="2" />
                          <path d="M8 2a6 6 0 0 1 6 6" stroke="#533afd" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Loading…
                      </span>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-[#64748d]">
                      No prescriptions found
                      {hasFilters && (
                        <button onClick={clearFilters} className="ml-2 text-[#533afd] hover:underline">
                          Clear filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : data.map((rx) => (
                  <tr
                    key={rx.id}
                    className={[
                      "border-b border-[#e5edf5] last:border-0 transition-colors",
                      selected.has(rx.id) ? "bg-[rgba(83,58,253,0.03)]" : "hover:bg-[#fafbfc]",
                    ].join(" ")}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(rx.id)}
                        onChange={() => toggleRow(rx.id)}
                        className="w-3.5 h-3.5 accent-[#533afd] cursor-pointer"
                      />
                    </td>

                    {/* Line # */}
                    <td
                      className="px-4 py-3 text-[#b0b8c8] text-right whitespace-nowrap"
                      style={{ fontFeatureSettings: '"tnum"', minWidth: "2.5rem" }}
                    >
                      {rx.lineNumber ?? "—"}
                    </td>

                    {/* Fill date */}
                    <td className="px-4 py-3 text-[#64748d] whitespace-nowrap">
                      {fmtDate(rx.fillDate)}
                    </td>

                    {/* RX # */}
                    <td className="px-4 py-3 font-mono text-[12px] text-[#273951] whitespace-nowrap">
                      {rx.rxNumber ?? "—"}
                    </td>

                    {/* Patient */}
                    <td className="px-4 py-3">
                      <div className="text-[#061b31] whitespace-nowrap">
                        {rx.patientName ? rx.patientName.split(" ").map(
                          (w) => w.charAt(0) + w.slice(1).toLowerCase()
                        ).join(" ") : "—"}
                      </div>
                    </td>

                    {/* Drug */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {rx.drugName ? <DrugBadge name={rx.drugName} /> : "—"}
                    </td>

                    {/* Qty */}
                    <td
                      className="px-4 py-3 text-[#273951] text-right tabular-nums w-12"
                      style={{ fontFeatureSettings: '"tnum"' }}
                    >
                      {rx.quantity ?? "—"}
                    </td>

                    {/* Tracking # */}
                    <td className="px-4 py-3 font-mono text-[12px] whitespace-nowrap">
                      {rx.trackingNumber ? (
                        <span className="text-[#273951]">{rx.trackingNumber}</span>
                      ) : (
                        <span className="text-[#b0b8c8]">—</span>
                      )}
                    </td>

                    {/* Prescriber */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {rx.prescriberName ? (
                        <div>
                          <div className="text-[#273951]">
                            {rx.prescriberName.split(" ").map(
                              (w) => w.charAt(0) + w.slice(1).toLowerCase()
                            ).join(" ")}
                          </div>
                          {rx.prescriberClinic && (
                            <div className="text-[11px] text-[#64748d]">{rx.prescriberClinic}</div>
                          )}
                        </div>
                      ) : "—"}
                    </td>

                    {/* Price */}
                    <td
                      className="px-4 py-3 font-normal whitespace-nowrap text-right"
                      style={{ fontFeatureSettings: '"tnum"', color: "#061b31" }}
                    >
                      {fmtPrice(rx.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <RowsPerPage value={pageSize} onChange={setPageSize} />
              <span className="text-[13px] text-[#64748d]" style={{ fontFeatureSettings: '"ss01"' }}>
                {pagination.total === 0
                  ? "No results"
                  : `${((page - 1) * pageSize + 1).toLocaleString()}–${Math.min(page * pageSize, pagination.total).toLocaleString()} of ${pagination.total.toLocaleString()} prescriptions`}
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Previous</Button>
              <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages}>Next →</Button>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
