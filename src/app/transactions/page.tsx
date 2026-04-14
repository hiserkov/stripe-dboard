"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { DateFilter, type DateFilterState } from "@/components/dashboard/DateFilter";
import { Badge, statusToBadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface TxRow {
  id: string;
  amountCents: number;
  stripeFee: number;
  medCostCents: number;
  prescriberFeeCents: number;
  netCents: number;
  status: string;
  customerName: string | null;
  customerEmail: string | null;
  medicationName: string | null;
  prescriber: string | null;
  orderId: string | null;
  refillNumber: string | null;
  stripeCreatedAt: string;
  currency: string;
}

const STATUS_OPTIONS = ["all", "succeeded", "canceled", "requires_payment_method"];

function fmt(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function TransactionsPage() {
  const [filter, setFilter] = useState<DateFilterState>({ preset: "this_month" });
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<TxRow[]>([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const buildQs = useCallback((f: DateFilterState, s: string, p: number) => {
    const qs = new URLSearchParams({ preset: f.preset, status: s, page: String(p) });
    if (f.from) qs.set("from", f.from);
    if (f.to) qs.set("to", f.to);
    return qs.toString();
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/transactions?${buildQs(filter, status, page)}`)
      .then((r) => r.json())
      .then((json) => {
        setData(json.data ?? []);
        setPagination(json.pagination ?? { total: 0, totalPages: 1 });
      })
      .finally(() => setLoading(false));
  }, [filter, status, page, buildQs]);

  // Reset page when filter or status changes
  useEffect(() => { setPage(1); }, [filter, status]);

  const allSelected = data.length > 0 && data.every((r) => selected.has(r.id));
  const someSelected = data.some((r) => selected.has(r.id));
  const toggleAll = () => {
    if (allSelected) { const s = new Set(selected); data.forEach((r) => s.delete(r.id)); setSelected(s); }
    else { const s = new Set(selected); data.forEach((r) => s.add(r.id)); setSelected(s); }
  };
  const toggleRow = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  return (
    <div className="flex min-h-screen bg-[#f6f9fc]">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <main className="flex-1 px-8 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h1 className="text-[32px] font-light text-[#061b31] leading-tight" style={{ letterSpacing: "-0.64px", fontFeatureSettings: '"ss01"' }}>
              Transactions
            </h1>
            <DateFilter value={filter} onChange={setFilter} />
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={[
                    "px-3 py-1.5 rounded text-[13px] border transition-colors capitalize",
                    status === s
                      ? "bg-[#533afd] text-white border-[#533afd]"
                      : "bg-white text-[#273951] border-[#e5edf5] hover:border-[#b9b9f9]",
                  ].join(" ")}
                  style={{ fontFeatureSettings: '"ss01"' }}
                >
                  {s === "all" ? "All" : s === "requires_payment_method" ? "Failed" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex-1" />
            <Button variant="ghost" size="sm">Export</Button>
          </div>

          {/* Table */}
          <div className="w-full overflow-x-auto rounded-[6px] border border-[#e5edf5] [box-shadow:rgba(23,23,23,0.06)_0px_3px_6px] bg-white">
            <table className="w-full text-[13px]" style={{ fontFeatureSettings: '"ss01"' }}>
              <thead>
                <tr className="border-b border-[#e5edf5] bg-[#f8fafc]">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox" checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                      onChange={toggleAll}
                      className="w-3.5 h-3.5 accent-[#533afd] cursor-pointer"
                    />
                  </th>
                  {["Date", "Order ID", "Customer", "Medication", "Prescriber", "Refill #", "Gross", "Stripe fee", "Med cost", "Net", "Status"].map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-[11px] font-normal text-[#64748d] uppercase whitespace-nowrap" style={{ letterSpacing: "0.04em" }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={12} className="px-4 py-10 text-center text-[#64748d]">Loading…</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={12} className="px-4 py-10 text-center text-[#64748d]">No transactions found</td></tr>
                ) : data.map((tx) => (
                  <tr key={tx.id} className={["border-b border-[#e5edf5] last:border-0 transition-colors", selected.has(tx.id) ? "bg-[rgba(83,58,253,0.03)]" : "hover:bg-[#fafbfc]"].join(" ")}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(tx.id)} onChange={() => toggleRow(tx.id)} className="w-3.5 h-3.5 accent-[#533afd] cursor-pointer" />
                    </td>
                    <td className="px-4 py-3 text-[#64748d] whitespace-nowrap">
                      {new Date(tx.stripeCreatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-[#273951] whitespace-nowrap">{tx.orderId ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="text-[#061b31]">{tx.customerName ?? "—"}</div>
                      <div className="text-[11px] text-[#64748d]">{tx.customerEmail ?? ""}</div>
                    </td>
                    <td className="px-4 py-3 text-[#273951]">{tx.medicationName ?? "—"}</td>
                    <td className="px-4 py-3 text-[#273951]">{tx.prescriber ?? "—"}</td>
                    <td className="px-4 py-3 text-[#64748d]">{tx.refillNumber ?? "—"}</td>
                    <td className="px-4 py-3 font-normal text-[#061b31] whitespace-nowrap" style={{ fontFeatureSettings: '"tnum"' }}>{fmt(tx.amountCents)}</td>
                    <td className="px-4 py-3 text-[#64748d] whitespace-nowrap" style={{ fontFeatureSettings: '"tnum"' }}>{fmt(tx.stripeFee)}</td>
                    <td className="px-4 py-3 text-[#64748d] whitespace-nowrap" style={{ fontFeatureSettings: '"tnum"' }}>{fmt(tx.medCostCents)}</td>
                    <td className="px-4 py-3 font-normal whitespace-nowrap" style={{ fontFeatureSettings: '"tnum"', color: tx.netCents >= 0 ? "#108c3d" : "#c0154f" }}>{fmt(tx.netCents)}</td>
                    <td className="px-4 py-3"><Badge variant={statusToBadgeVariant(tx.status)}>{tx.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[#64748d]" style={{ fontFeatureSettings: '"ss01"' }}>
              Showing {Math.min((page - 1) * 20 + 1, pagination.total)}–{Math.min(page * 20, pagination.total)} of {pagination.total.toLocaleString()} transactions
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Previous</Button>
              <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}>Next →</Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
