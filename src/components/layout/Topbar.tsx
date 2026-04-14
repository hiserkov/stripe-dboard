"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/Input";

export function Topbar() {
  return (
    <header className="h-14 bg-white border-b border-[#e5edf5] flex items-center px-6 gap-4 sticky top-0 z-10">
      {/* Search */}
      <div className="w-64">
        <SearchInput placeholder="Search" />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

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
        <Button variant="primary" size="sm">+ Create payment</Button>
        <Button variant="ghost" size="sm">Analyze</Button>
      </div>
    </header>
  );
}
