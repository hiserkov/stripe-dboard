"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/Input";

type SyncState = "idle" | "syncing" | "success" | "error";

export function Topbar() {
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [syncMsg, setSyncMsg] = useState("");

  const handleSync = async () => {
    setSyncState("syncing");
    setSyncMsg("");
    try {
      const res = await fetch("/api/sync");
      const json = await res.json();
      if (json.ok || res.ok) {
        setSyncMsg(`Synced ${json.paymentIntents ?? 0} payments, ${json.medications ?? 0} meds`);
        setSyncState("success");
      } else {
        setSyncMsg(json.errors?.[0] ?? "Sync failed");
        setSyncState("error");
      }
    } catch {
      setSyncMsg("Network error");
      setSyncState("error");
    }
    // Auto-clear after 4s
    setTimeout(() => { setSyncState("idle"); setSyncMsg(""); }, 4000);
  };

  return (
    <header className="h-14 bg-white border-b border-[#e5edf5] flex items-center px-6 gap-4 sticky top-0 z-10">
      {/* Search */}
      <div className="w-64">
        <SearchInput placeholder="Search" />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Sync feedback */}
      {syncMsg && (
        <div
          className={[
            "flex items-center gap-1.5 text-[12px] px-3 py-1 rounded-full border transition-all",
            syncState === "success"
              ? "bg-[#d4f5e2] text-[#0a7c34] border-[#a3e6be]"
              : "bg-[#fde8ef] text-[#c0154f] border-[#f5b8cc]",
          ].join(" ")}
          style={{ fontFeatureSettings: '"ss01"' }}
        >
          {syncState === "success" ? (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M2 5.5L4.5 8L9 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M2 2l7 7M9 2l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          )}
          {syncMsg}
        </div>
      )}

      {/* Icons */}
      <div className="flex items-center gap-3 text-[#64748d]">
        {/* Team */}
        <button className="hover:text-[#061b31] transition-colors p-1 rounded hover:bg-[#f6f9fc]">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M1 14c0-3 2-4.5 5-4.5s5 1.5 5 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M11 3c1.2.4 2 1.5 2 2.5s-.8 2.1-2 2.5M13 10c1.5.5 2.5 1.5 2.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
        {/* Notifications */}
        <button className="hover:text-[#061b31] transition-colors p-1 rounded hover:bg-[#f6f9fc]">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1a5 5 0 0 1 5 5v3l1.5 2H1.5L3 9V6a5 5 0 0 1 5-5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M6.5 13a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
        {/* Settings */}
        <button className="hover:text-[#061b31] transition-colors p-1 rounded hover:bg-[#f6f9fc]">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M12.95 3.05l-1.06 1.06M4.11 11.89l-1.06 1.06" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-[#e5edf5]" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSync}
          disabled={syncState === "syncing"}
          className={[
            "flex items-center gap-1.5 px-3 py-1.5 rounded text-[13px] border transition-colors",
            syncState === "syncing"
              ? "bg-[#f6f9fc] text-[#64748d] border-[#e5edf5] cursor-not-allowed"
              : "bg-white text-[#273951] border-[#e5edf5] hover:border-[#b9b9f9] hover:text-[#533afd]",
          ].join(" ")}
          style={{ fontFeatureSettings: '"ss01"' }}
        >
          <svg
            width="13" height="13" viewBox="0 0 13 13" fill="none"
            className={syncState === "syncing" ? "animate-spin" : ""}
          >
            <path
              d="M11.5 6.5A5 5 0 1 1 6.5 1.5"
              stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"
            />
            <path d="M6.5 1.5L9 4M6.5 1.5L9 .5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {syncState === "syncing" ? "Syncing…" : "Sync"}
        </button>
        <Button variant="primary" size="sm">+ Create payment</Button>
        <Button variant="ghost" size="sm">Analyze</Button>
      </div>
    </header>
  );
}
