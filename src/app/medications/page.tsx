"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/Button";

interface Medication {
  id: string;
  name: string;
  costCents: number;
  active: boolean;
  updatedAt: string;
}

function fmt(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function InlineEdit({ value, onSave }: { value: number; onSave: (cents: number) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState((value / 100).toFixed(2));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const cents = Math.round(parseFloat(input) * 100);
    if (isNaN(cents) || cents < 0) return;
    setSaving(true);
    await onSave(cents);
    setSaving(false);
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        onClick={() => { setInput((value / 100).toFixed(2)); setEditing(true); }}
        className="group flex items-center gap-2 text-[13px] text-[#061b31] hover:text-[#533afd] transition-colors"
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        {fmt(value)}
        <span className="text-[#b9b9f9] group-hover:text-[#533afd] opacity-0 group-hover:opacity-100 transition-opacity">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748d] text-[13px]">$</span>
        <input
          autoFocus
          type="number"
          step="0.01"
          min="0"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
          className="w-28 border border-[#533afd] rounded px-2 py-1 pl-6 text-[13px] text-[#061b31] outline-none [box-shadow:rgba(83,58,253,0.15)_0px_0px_0px_3px]"
          style={{ fontFeatureSettings: '"tnum"' }}
        />
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-6 h-6 flex items-center justify-center rounded bg-[#533afd] text-white hover:bg-[#4434d4] transition-colors disabled:opacity-50"
      >
        {saving ? (
          <svg className="animate-spin" width="10" height="10" viewBox="0 0 10 10" fill="none">
            <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 6" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5L4 7L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
      <button
        onClick={() => setEditing(false)}
        className="w-6 h-6 flex items-center justify-center rounded border border-[#e5edf5] text-[#64748d] hover:text-[#061b31] transition-colors"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2.5 2.5L7.5 7.5M7.5 2.5L2.5 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
}

export default function MedicationsPage() {
  const [meds, setMeds] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetch("/api/medications")
      .then((r) => r.json())
      .then(setMeds)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (id: string, costCents: number) => {
    const res = await fetch("/api/medications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, costCents }),
    });
    if (res.ok) {
      const updated = await res.json();
      setMeds((prev) => prev.map((m) => (m.id === id ? { ...m, ...updated } : m)));
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    await fetch("/api/sync");
    const res = await fetch("/api/medications");
    const data = await res.json();
    setMeds(data);
    setSyncing(false);
  };

  return (
    <div className="flex min-h-screen bg-[#f6f9fc]">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <main className="flex-1 px-8 py-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[32px] font-light text-[#061b31] leading-tight" style={{ letterSpacing: "-0.64px", fontFeatureSettings: '"ss01"' }}>
                Medications
              </h1>
              <p className="text-[14px] text-[#64748d] mt-1" style={{ fontFeatureSettings: '"ss01"' }}>
                Set medication costs. Used to calculate net revenue per transaction.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSync} disabled={syncing}>
              {syncing ? "Syncing…" : "↻ Sync from Stripe"}
            </Button>
          </div>

          <div className="w-full overflow-x-auto rounded-[6px] border border-[#e5edf5] [box-shadow:rgba(23,23,23,0.06)_0px_3px_6px] bg-white">
            <table className="w-full text-[13px]" style={{ fontFeatureSettings: '"ss01"' }}>
              <thead>
                <tr className="border-b border-[#e5edf5] bg-[#f8fafc]">
                  {["Medication", "Stripe product ID", "Cost (editable)", "Status", "Last updated"].map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-[11px] font-normal text-[#64748d] uppercase whitespace-nowrap" style={{ letterSpacing: "0.04em" }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-[#64748d]">Loading…</td></tr>
                ) : meds.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-[#64748d]">
                      No medications found.{" "}
                      <button onClick={handleSync} className="text-[#533afd] hover:underline">Sync from Stripe</button>
                    </td>
                  </tr>
                ) : meds.map((med) => (
                  <tr key={med.id} className="border-b border-[#e5edf5] last:border-0 hover:bg-[#fafbfc] transition-colors">
                    <td className="px-4 py-3 text-[#061b31] font-normal">{med.name}</td>
                    <td className="px-4 py-3 text-[#64748d] font-mono text-[12px]">{med.id}</td>
                    <td className="px-4 py-3">
                      <InlineEdit
                        value={med.costCents}
                        onSave={(cents) => handleSave(med.id, cents)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className={["inline-flex items-center px-2 py-0.5 rounded-[5px] text-[11px] font-normal border", med.active ? "bg-[#d4f5e2] text-[#0a7c34] border-[#a3e6be]" : "bg-[#f6f9fc] text-[#64748d] border-[#dde3eb]"].join(" ")}>
                        {med.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#64748d]">
                      {new Date(med.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
