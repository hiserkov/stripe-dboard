"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { DateFilter, type DateFilterState } from "@/components/dashboard/DateFilter";
import { KpiCards } from "@/components/dashboard/KpiCards";
import {
  RevenueChart, VolumeChart, FeeChart, NetMarginChart, RevenueByMedChart,
} from "@/components/dashboard/Charts";
import { Badge, statusToBadgeVariant } from "@/components/ui/Badge";
import { RowsPerPage } from "@/components/ui/RowsPerPage";

function fmt(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function DashboardPage() {
  const [filter, setFilter] = useState<DateFilterState>({ preset: "this_month" });
  const [kpi, setKpi] = useState<null | {
    grossCents: number; netCents: number; txCount: number;
    avgFeePercent: number; avgNetMarginPercent: number;
  }>(null);
  const [charts, setCharts] = useState<null | {
    revenueOverTime: { period: string; grossCents: number; count: number }[];
    feeOverTime: { period: string; feePercent: number }[];
    revenueByMed: { medicationName: string | null; grossCents: number }[];
    netOverTime: { period: string; netMarginPercent: number }[];
  }>(null);
  const [recentTx, setRecentTx] = useState<null | {
    id: string; amountCents: number; stripeFee: number; medCostCents: number;
    prescriberFeeCents: number; netCents: number; status: string;
    customerName: string | null; customerEmail: string | null;
    medicationName: string | null; stripeCreatedAt: string;
  }[]>(null);
  const [loading, setLoading] = useState(true);
  const [txPageSize, setTxPageSize] = useState(25);

  const buildQs = useCallback((f: DateFilterState) => {
    const p = new URLSearchParams({ preset: f.preset });
    if (f.from) p.set("from", f.from);
    if (f.to) p.set("to", f.to);
    return p.toString();
  }, []);

  useEffect(() => {
    setLoading(true);
    const qs = buildQs(filter);
    Promise.all([
      fetch(`/api/dashboard?${qs}`).then((r) => r.json()),
      fetch(`/api/transactions?${qs}&page=1&limit=${txPageSize}`).then((r) => r.json()),
    ]).then(([dash, tx]) => {
      setKpi(dash.kpi);
      setCharts(dash.charts);
      setRecentTx(tx.data ?? []);
    }).finally(() => setLoading(false));
  }, [filter, txPageSize, buildQs]);

  return (
    <div className="flex min-h-screen bg-[#f6f9fc]">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <main className="flex-1 px-8 py-6 space-y-6">
          {/* Header + filter */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h1
              className="text-[32px] font-light text-[#061b31] leading-tight"
              style={{ letterSpacing: "-0.64px", fontFeatureSettings: '"ss01"' }}
            >
              Dashboard
            </h1>
            <DateFilter value={filter} onChange={setFilter} />
          </div>

          {/* KPIs */}
          <KpiCards data={loading ? null : kpi} />

          {/* Charts 2×2 + 1 wide */}
          {charts && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <RevenueChart data={charts.revenueOverTime} />
                <VolumeChart data={charts.revenueOverTime.map((d) => ({ period: d.period, count: d.count }))} />
                <FeeChart data={charts.feeOverTime} />
                <NetMarginChart data={charts.netOverTime} />
              </div>
              <RevenueByMedChart data={charts.revenueByMed} />
            </>
          )}

          {/* Latest transactions */}
          <div>
            <h2
              className="text-[16px] font-normal text-[#061b31] mb-3"
              style={{ fontFeatureSettings: '"ss01"' }}
            >
              Latest transactions
            </h2>
            <div className="w-full overflow-x-auto rounded-[6px] border border-[#e5edf5] [box-shadow:rgba(23,23,23,0.06)_0px_3px_6px] bg-white">
              <table className="w-full text-[13px]" style={{ fontFeatureSettings: '"ss01"' }}>

                <thead>
                  <tr className="border-b border-[#e5edf5] bg-[#f8fafc]">
                    {["Date", "Customer", "Medication", "Gross", "Stripe fee", "Med cost", "Net", "Status"].map((col) => (
                      <th key={col} className="px-4 py-3 text-left text-[11px] font-normal text-[#64748d] uppercase whitespace-nowrap" style={{ letterSpacing: "0.04em" }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!recentTx || loading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-[#64748d]">
                        {loading ? "Loading…" : "No transactions"}
                      </td>
                    </tr>
                  ) : recentTx.map((tx) => (
                    <tr key={tx.id} className="border-b border-[#e5edf5] last:border-0 hover:bg-[#fafbfc] transition-colors">
                      <td className="px-4 py-3 text-[#64748d] whitespace-nowrap">
                        {new Date(tx.stripeCreatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[#061b31]">{tx.customerName ?? "—"}</div>
                        <div className="text-[11px] text-[#64748d]">{tx.customerEmail ?? ""}</div>
                      </td>
                      <td className="px-4 py-3 text-[#273951]">{tx.medicationName ?? "—"}</td>
                      <td className="px-4 py-3 font-normal text-[#061b31] whitespace-nowrap" style={{ fontFeatureSettings: '"tnum"' }}>{fmt(tx.amountCents)}</td>
                      <td className="px-4 py-3 text-[#64748d] whitespace-nowrap" style={{ fontFeatureSettings: '"tnum"' }}>{fmt(tx.stripeFee)}</td>
                      <td className="px-4 py-3 text-[#64748d] whitespace-nowrap" style={{ fontFeatureSettings: '"tnum"' }}>{fmt(tx.medCostCents)}</td>
                      <td className="px-4 py-3 font-normal whitespace-nowrap" style={{ fontFeatureSettings: '"tnum"', color: tx.netCents >= 0 ? "#108c3d" : "#c0154f" }}>{fmt(tx.netCents)}</td>
                      <td className="px-4 py-3"><Badge variant={statusToBadgeVariant(tx.status)}>{tx.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Rows per page — bottom of card */}
              <div className="px-4 py-2.5 border-t border-[#e5edf5] flex items-center">
                <RowsPerPage value={txPageSize} onChange={setTxPageSize} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
