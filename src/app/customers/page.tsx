"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/Button";

interface CustomerRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  stripeCreatedAt: string | null;
  txCount: number;
  ltvCents: number;
  lastOrderAt: string | null;
  lastMedication: string | null;
}

function fmt(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtPhone(phone: string | null) {
  if (!phone) return "—";
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

export default function CustomersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const fetchData = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page) });
    if (debouncedSearch) qs.set("q", debouncedSearch);
    fetch(`/api/customers?${qs}`)
      .then((r) => r.json())
      .then((json) => {
        setData(json.data ?? []);
        setTotal(Number(json.total ?? 0));
      })
      .finally(() => setLoading(false));
  }, [page, debouncedSearch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(total / 50));

  return (
    <div className="flex min-h-screen bg-[#f6f9fc]">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <main className="flex-1 px-8 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1
                className="text-[32px] font-light text-[#061b31] leading-tight"
                style={{ letterSpacing: "-0.64px", fontFeatureSettings: '"ss01"' }}
              >
                Customers
              </h1>
              <p className="text-[13px] text-[#64748d] mt-0.5" style={{ fontFeatureSettings: '"ss01"' }}>
                All Stripe customers with order history and lifetime value
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-3">
            <div className="relative w-72">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748d]"
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
              >
                <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M10 10.5l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or email…"
                className="w-full pl-8 pr-3 py-1.5 text-[13px] border border-[#e5edf5] rounded bg-white text-[#061b31] placeholder-[#64748d] outline-none focus:border-[#533afd] transition-colors"
                style={{ fontFeatureSettings: '"ss01"' }}
              />
            </div>
          </div>

          {/* Table */}
          <div className="w-full overflow-x-auto rounded-[6px] border border-[#e5edf5] [box-shadow:rgba(23,23,23,0.06)_0px_3px_6px] bg-white">
            <table className="w-full text-[13px]" style={{ fontFeatureSettings: '"ss01"' }}>
              <thead>
                <tr className="border-b border-[#e5edf5] bg-[#f8fafc]">
                  {["Name / Email", "Phone", "Customer since", "Last order", "Last medication", "Orders", "LTV", "Net"].map(
                    (col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left text-[11px] font-normal text-[#64748d] uppercase whitespace-nowrap"
                        style={{ letterSpacing: "0.04em" }}
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-[#64748d]">
                      Loading…
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-[#64748d]">
                      No customers found
                    </td>
                  </tr>
                ) : (
                  data.map((c) => {
                    const ltvCents = Number(c.ltvCents);
                    // Rough net: ltv - 2.9% - 30¢ per tx - $XX med cost unknown here, just show LTV
                    return (
                      <tr
                        key={c.id}
                        className="border-b border-[#e5edf5] last:border-0 hover:bg-[#fafbfc] cursor-pointer transition-colors"
                        onClick={() => router.push(`/customers/${c.id}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="text-[#061b31] font-normal">{c.name ?? "—"}</div>
                          <div className="text-[11px] text-[#64748d]">{c.email ?? ""}</div>
                        </td>
                        <td className="px-4 py-3 text-[#64748d] whitespace-nowrap">{fmtPhone(c.phone)}</td>
                        <td className="px-4 py-3 text-[#64748d] whitespace-nowrap">{fmtDate(c.stripeCreatedAt)}</td>
                        <td className="px-4 py-3 text-[#64748d] whitespace-nowrap">{fmtDate(c.lastOrderAt)}</td>
                        <td className="px-4 py-3 text-[#273951] max-w-[180px] truncate">{c.lastMedication ?? "—"}</td>
                        <td
                          className="px-4 py-3 text-[#061b31] text-center"
                          style={{ fontFeatureSettings: '"tnum"' }}
                        >
                          {Number(c.txCount)}
                        </td>
                        <td
                          className="px-4 py-3 text-[#061b31] whitespace-nowrap"
                          style={{ fontFeatureSettings: '"tnum"' }}
                        >
                          {fmt(ltvCents)}
                        </td>
                        <td
                          className="px-4 py-3 whitespace-nowrap"
                          style={{ fontFeatureSettings: '"tnum"', color: ltvCents >= 0 ? "#108c3d" : "#c0154f" }}
                        >
                          —
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[#64748d]" style={{ fontFeatureSettings: '"ss01"' }}>
              {total > 0
                ? `Showing ${Math.min((page - 1) * 50 + 1, total)}–${Math.min(page * 50, total)} of ${total.toLocaleString()} customers`
                : "No customers"}
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ← Previous
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next →
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
