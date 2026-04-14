"use client";

import React, { useState } from "react";
import { Badge, statusToBadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface Transaction {
  id: string;
  amount: string;
  currency: string;
  status: string;
  paymentMethod: string;
  customer: string;
  email: string;
  date: string;
  refundedDate?: string;
}

const mockData: Transaction[] = [
  { id: "pi_001", amount: "$240.00", currency: "USD", status: "Succeeded", paymentMethod: "Visa •••• 4242", customer: "Jenny Rosen", email: "jenny@example.com", date: "Apr 10, 2025, 14:32" },
  { id: "pi_002", amount: "$1,050.00", currency: "USD", status: "Succeeded", paymentMethod: "Mastercard •••• 5555", customer: "Thomas Greene", email: "thomas@acme.com", date: "Apr 10, 2025, 13:18" },
  { id: "pi_003", amount: "$89.99", currency: "USD", status: "Failed", paymentMethod: "Visa •••• 1234", customer: "Aisha Patel", email: "aisha@startup.io", date: "Apr 10, 2025, 12:05" },
  { id: "pi_004", amount: "$320.00", currency: "USD", status: "Refunded", paymentMethod: "Amex •••• 3782", customer: "Carlos Reyes", email: "carlos@org.com", date: "Apr 9, 2025, 18:47", refundedDate: "Apr 10, 2025" },
  { id: "pi_005", amount: "$15.00", currency: "USD", status: "Succeeded", paymentMethod: "Apple Pay", customer: "Mei Lin", email: "mei@company.co", date: "Apr 9, 2025, 17:22" },
  { id: "pi_006", amount: "$2,400.00", currency: "USD", status: "Uncaptured", paymentMethod: "Visa •••• 9999", customer: "James Okafor", email: "james@biz.net", date: "Apr 9, 2025, 16:01" },
  { id: "pi_007", amount: "$55.00", currency: "USD", status: "Canceled", paymentMethod: "Google Pay", customer: "Sara Kim", email: "sara@tech.dev", date: "Apr 9, 2025, 15:30" },
  { id: "pi_008", amount: "$780.00", currency: "USD", status: "Disputed", paymentMethod: "Mastercard •••• 6789", customer: "Marco Bianchi", email: "marco@italy.eu", date: "Apr 8, 2025, 11:14" },
  { id: "pi_009", amount: "$120.00", currency: "USD", status: "Succeeded", paymentMethod: "Visa •••• 4242", customer: "Priya Sharma", email: "priya@startup.in", date: "Apr 8, 2025, 10:02" },
  { id: "pi_010", amount: "$49.99", currency: "USD", status: "Incomplete", paymentMethod: "Visa •••• 3333", customer: "David Park", email: "david@corp.kr", date: "Apr 8, 2025, 09:55" },
  { id: "pi_011", amount: "$630.00", currency: "USD", status: "Succeeded", paymentMethod: "Amex •••• 0005", customer: "Leila Hassan", email: "leila@med.ae", date: "Apr 7, 2025, 22:18" },
  { id: "pi_012", amount: "$18.50", currency: "USD", status: "Failed", paymentMethod: "Mastercard •••• 4444", customer: "Tobias Müller", email: "tobias@de.co", date: "Apr 7, 2025, 21:44" },
  { id: "pi_013", amount: "$900.00", currency: "USD", status: "Succeeded", paymentMethod: "Visa •••• 7777", customer: "Yuki Tanaka", email: "yuki@jp.io", date: "Apr 7, 2025, 19:33" },
  { id: "pi_014", amount: "$75.00", currency: "USD", status: "Refunded", paymentMethod: "Apple Pay", customer: "Ana Silva", email: "ana@br.com", date: "Apr 7, 2025, 18:00", refundedDate: "Apr 8, 2025" },
  { id: "pi_015", amount: "$3,200.00", currency: "USD", status: "Succeeded", paymentMethod: "Bank transfer", customer: "Kwame Asante", email: "kwame@gh.org", date: "Apr 6, 2025, 14:10" },
  { id: "pi_016", amount: "$440.00", currency: "USD", status: "Failed", paymentMethod: "Visa •••• 2222", customer: "Fatima Al-Rashid", email: "fatima@sa.co", date: "Apr 6, 2025, 13:05" },
  { id: "pi_017", amount: "$210.00", currency: "USD", status: "Succeeded", paymentMethod: "Google Pay", customer: "Nikolai Petrov", email: "nikolai@ru.net", date: "Apr 6, 2025, 11:22" },
  { id: "pi_018", amount: "$88.00", currency: "USD", status: "Succeeded", paymentMethod: "Mastercard •••• 1010", customer: "Claire Dupont", email: "claire@fr.fr", date: "Apr 5, 2025, 17:48" },
  { id: "pi_019", amount: "$560.00", currency: "USD", status: "Disputed", paymentMethod: "Amex •••• 7777", customer: "Raj Kapoor", email: "raj@in.co", date: "Apr 5, 2025, 16:30" },
  { id: "pi_020", amount: "$130.00", currency: "USD", status: "Succeeded", paymentMethod: "Visa •••• 5678", customer: "Emma Johnson", email: "emma@us.com", date: "Apr 5, 2025, 14:15" },
];

const PAGE_SIZE = 20;

interface FilterState {
  status: string;
}

const statusOptions = [
  "All",
  "Succeeded",
  "Failed",
  "Canceled",
  "Refunded",
  "Disputed",
  "Incomplete",
  "Uncaptured",
];

export function DataTable() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterState>({ status: "All" });
  const [showFilterDrop, setShowFilterDrop] = useState(false);

  const filtered = filter.status === "All"
    ? mockData
    : mockData.filter((r) => r.status === filter.status);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const allSelected = pageData.length > 0 && pageData.every((r) => selected.has(r.id));
  const someSelected = pageData.some((r) => selected.has(r.id));

  const toggleAll = () => {
    if (allSelected) {
      const next = new Set(selected);
      pageData.forEach((r) => next.delete(r.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      pageData.forEach((r) => next.add(r.id));
      setSelected(next);
    }
  };

  const toggleRow = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {["Date and time", "Amount", "Currency", "Status", "Payment method"].map((f) => (
            <button
              key={f}
              className="flex items-center gap-1 px-3 py-1.5 rounded border border-[#e5edf5] text-[13px] text-[#064748d] text-[#273951] hover:border-[#b9b9f9] hover:text-[#533afd] transition-colors bg-white"
              style={{ fontFeatureSettings: '"ss01"' }}
            >
              {f}
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2.5 3.75L5 6.25L7.5 3.75" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>
          ))}

          {/* Status filter dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFilterDrop(!showFilterDrop)}
              className="flex items-center gap-1 px-3 py-1.5 rounded border border-[#e5edf5] text-[13px] text-[#273951] hover:border-[#b9b9f9] hover:text-[#533afd] transition-colors bg-white"
              style={{ fontFeatureSettings: '"ss01"' }}
            >
              More filters
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2.5 3.75L5 6.25L7.5 3.75" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>
            {showFilterDrop && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-[#e5edf5] rounded-[6px] [box-shadow:rgba(50,50,93,0.25)_0px_6px_12px_-2px,rgba(0,0,0,0.1)_0px_3px_7px_-3px] z-20 py-1">
                {statusOptions.map((opt) => (
                  <button
                    key={opt}
                    className={[
                      "w-full text-left px-3 py-2 text-[13px] hover:bg-[#f6f9fc] transition-colors",
                      filter.status === opt ? "text-[#533afd] font-normal" : "text-[#273951] font-light",
                    ].join(" ")}
                    style={{ fontFeatureSettings: '"ss01"' }}
                    onClick={() => {
                      setFilter({ status: opt });
                      setShowFilterDrop(false);
                      setPage(1);
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">Export</Button>
          <Button variant="ghost" size="sm">Edit columns</Button>
        </div>
      </div>

      {/* Table */}
      <div className="w-full overflow-x-auto rounded-[6px] border border-[#e5edf5] [box-shadow:rgba(23,23,23,0.06)_0px_3px_6px]">
        <table className="w-full text-[13px] border-collapse" style={{ fontFeatureSettings: '"ss01"' }}>
          <thead>
            <tr className="border-b border-[#e5edf5] bg-[#f8fafc]">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                  onChange={toggleAll}
                  className="w-3.5 h-3.5 rounded border-[#b9b9f9] accent-[#533afd] cursor-pointer"
                />
              </th>
              {["Amount", "Status", "Payment method", "Customer", "Date", "Refunded date"].map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-[11px] font-normal text-[#64748d] uppercase tracking-wide whitespace-nowrap"
                  style={{ letterSpacing: "0.04em" }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, i) => (
              <tr
                key={row.id}
                className={[
                  "border-b border-[#e5edf5] transition-colors",
                  selected.has(row.id) ? "bg-[rgba(83,58,253,0.03)]" : "hover:bg-[#fafbfc]",
                  i === pageData.length - 1 ? "border-0" : "",
                ].join(" ")}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={() => toggleRow(row.id)}
                    className="w-3.5 h-3.5 rounded border-[#b9b9f9] accent-[#533afd] cursor-pointer"
                  />
                </td>
                <td className="px-4 py-3 font-normal text-[#061b31] whitespace-nowrap" style={{ fontFeatureSettings: '"tnum"' }}>
                  {row.amount}
                  <span className="ml-1 text-[10px] text-[#64748d]">{row.currency}</span>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={statusToBadgeVariant(row.status)}>{row.status}</Badge>
                </td>
                <td className="px-4 py-3 text-[#273951] whitespace-nowrap">{row.paymentMethod}</td>
                <td className="px-4 py-3">
                  <div className="text-[#061b31]">{row.customer}</div>
                  <div className="text-[11px] text-[#64748d]">{row.email}</div>
                </td>
                <td className="px-4 py-3 text-[#64748d] whitespace-nowrap">{row.date}</td>
                <td className="px-4 py-3 text-[#64748d] whitespace-nowrap">{row.refundedDate ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-[#64748d]" style={{ fontFeatureSettings: '"ss01"' }}>
          Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()} items
        </span>
        <div className="flex items-center gap-2">
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
            disabled={page === totalPages}
          >
            Next →
          </Button>
        </div>
      </div>
    </div>
  );
}
