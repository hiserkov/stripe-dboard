"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Badge, statusToBadgeVariant } from "@/components/ui/Badge";

interface Customer {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  stripeCreatedAt: string | null;
}

interface Kpi {
  txCount: number;
  ltvCents: number;
  netCents: number;
  avgOrderCents: number;
  firstOrderAt: string | null;
  lastOrderAt: string | null;
}

interface MedRow {
  medicationName: string | null;
  cnt: number;
}

interface TxRow {
  id: string;
  amountCents: number;
  stripeFee: number;
  medCostCents: number;
  netCents: number;
  status: string;
  medicationName: string | null;
  prescriber: string | null;
  orderId: string | null;
  refillNumber: string | null;
  stripeCreatedAt: string;
}

function fmt(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtPhone(phone: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits[0] === "1") {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

function fmtDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function KpiCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div
      className="bg-white rounded-[6px] border border-[#e5edf5] px-5 py-4"
      style={{ boxShadow: "rgba(23,23,23,0.06) 0px 3px 6px" }}
    >
      <div
        className="text-[11px] font-normal text-[#64748d] uppercase mb-2"
        style={{ letterSpacing: "0.04em", fontFeatureSettings: '"ss01"' }}
      >
        {label}
      </div>
      <div
        className="text-[22px] font-light leading-none"
        style={{ color: color ?? "#061b31", fontFeatureSettings: '"tnum"', letterSpacing: "-0.3px" }}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[11px] text-[#64748d] mt-1" style={{ fontFeatureSettings: '"ss01"' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [topMeds, setTopMeds] = useState<MedRow[]>([]);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/customers/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) { setError(json.error); return; }
        setCustomer(json.customer);
        setKpi(json.kpi);
        setTopMeds(json.topMedications ?? []);
        setTransactions(json.transactions ?? []);
      })
      .catch(() => setError("Failed to load customer"))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="flex min-h-screen bg-[#f6f9fc]">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <main className="flex-1 px-8 py-6 space-y-6">
          {/* Back */}
          <Link
            href="/customers"
            className="inline-flex items-center gap-1.5 text-[13px] text-[#64748d] hover:text-[#061b31] transition-colors"
            style={{ fontFeatureSettings: '"ss01"' }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Customers
          </Link>

          {loading && (
            <div className="text-[#64748d] text-[13px]" style={{ fontFeatureSettings: '"ss01"' }}>
              Loading…
            </div>
          )}
          {error && (
            <div className="text-red-500 text-[13px]">{error}</div>
          )}

          {!loading && !error && customer && kpi && (
            <>
              {/* Header */}
              <div>
                <h1
                  className="text-[32px] font-light text-[#061b31] leading-tight"
                  style={{ letterSpacing: "-0.64px", fontFeatureSettings: '"ss01"' }}
                >
                  {customer.name ?? customer.email ?? customer.id}
                </h1>
                <div
                  className="flex items-center gap-3 mt-1 text-[13px] text-[#64748d]"
                  style={{ fontFeatureSettings: '"ss01"' }}
                >
                  {customer.email && <span>{customer.email}</span>}
                  {customer.phone && (
                    <>
                      <span className="text-[#e5edf5]">·</span>
                      <span>{fmtPhone(customer.phone)}</span>
                    </>
                  )}
                  {customer.stripeCreatedAt && (
                    <>
                      <span className="text-[#e5edf5]">·</span>
                      <span>Customer since {fmtDate(customer.stripeCreatedAt)}</span>
                    </>
                  )}
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 gap-4" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
                <KpiCard
                  label="Lifetime Value"
                  value={fmt(kpi.ltvCents)}
                  sub={`${kpi.txCount} order${kpi.txCount !== 1 ? "s" : ""}`}
                />
                <KpiCard
                  label="Net Revenue"
                  value={fmt(kpi.netCents)}
                  color={kpi.netCents >= 0 ? "#108c3d" : "#c0154f"}
                  sub="After fees & costs"
                />
                <KpiCard
                  label="Orders"
                  value={String(kpi.txCount)}
                  sub={kpi.firstOrderAt ? `Since ${fmtDate(kpi.firstOrderAt)}` : undefined}
                />
                <KpiCard
                  label="Avg Order Value"
                  value={fmt(kpi.avgOrderCents)}
                  sub={kpi.lastOrderAt ? `Last: ${fmtDate(kpi.lastOrderAt)}` : undefined}
                />
              </div>

              {/* Top medications */}
              {topMeds.length > 0 && (
                <div
                  className="bg-white rounded-[6px] border border-[#e5edf5] px-5 py-4"
                  style={{ boxShadow: "rgba(23,23,23,0.06) 0px 3px 6px" }}
                >
                  <div
                    className="text-[11px] font-normal text-[#64748d] uppercase mb-3"
                    style={{ letterSpacing: "0.04em", fontFeatureSettings: '"ss01"' }}
                  >
                    Top Medications
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {topMeds.map((m, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-3 py-1.5 rounded border border-[#e5edf5] bg-[#f8fafc]"
                      >
                        <span
                          className="text-[13px] text-[#273951]"
                          style={{ fontFeatureSettings: '"ss01"' }}
                        >
                          {m.medicationName ?? "Unknown"}
                        </span>
                        <span
                          className="text-[11px] font-normal px-1.5 py-0.5 rounded bg-[#e8e4fe] text-[#533afd]"
                          style={{ fontFeatureSettings: '"tnum"' }}
                        >
                          {Number(m.cnt)}×
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transactions table */}
              <div>
                <h2
                  className="text-[15px] font-normal text-[#061b31] mb-3"
                  style={{ fontFeatureSettings: '"ss01"' }}
                >
                  All Transactions
                </h2>
                <div className="w-full overflow-x-auto rounded-[6px] border border-[#e5edf5] [box-shadow:rgba(23,23,23,0.06)_0px_3px_6px] bg-white">
                  <table className="w-full text-[13px]" style={{ fontFeatureSettings: '"ss01"' }}>
                    <thead>
                      <tr className="border-b border-[#e5edf5] bg-[#f8fafc]">
                        {[
                          "Date",
                          "Order ID",
                          "Medication",
                          "Prescriber",
                          "Gross",
                          "Stripe fee",
                          "Med cost",
                          "Net",
                          "Status",
                        ].map((col) => (
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
                      {transactions.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-10 text-center text-[#64748d]">
                            No transactions found
                          </td>
                        </tr>
                      ) : (
                        transactions.map((tx) => (
                          <tr
                            key={tx.id}
                            className="border-b border-[#e5edf5] last:border-0 hover:bg-[#fafbfc] transition-colors"
                          >
                            <td className="px-4 py-3 text-[#64748d] whitespace-nowrap">
                              {new Date(tx.stripeCreatedAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </td>
                            <td className="px-4 py-3 font-mono text-[12px] text-[#273951] whitespace-nowrap">
                              {tx.orderId ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-[#273951]">{tx.medicationName ?? "—"}</td>
                            <td className="px-4 py-3 text-[#273951]">{tx.prescriber ?? "—"}</td>
                            <td
                              className="px-4 py-3 text-[#061b31] whitespace-nowrap"
                              style={{ fontFeatureSettings: '"tnum"' }}
                            >
                              {fmt(tx.amountCents)}
                            </td>
                            <td
                              className="px-4 py-3 text-[#64748d] whitespace-nowrap"
                              style={{ fontFeatureSettings: '"tnum"' }}
                            >
                              {fmt(tx.stripeFee)}
                            </td>
                            <td
                              className="px-4 py-3 text-[#64748d] whitespace-nowrap"
                              style={{ fontFeatureSettings: '"tnum"' }}
                            >
                              {fmt(tx.medCostCents)}
                            </td>
                            <td
                              className="px-4 py-3 whitespace-nowrap"
                              style={{
                                fontFeatureSettings: '"tnum"',
                                color: Number(tx.netCents) >= 0 ? "#108c3d" : "#c0154f",
                              }}
                            >
                              {fmt(Number(tx.netCents))}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={statusToBadgeVariant(tx.status)}>{tx.status}</Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
