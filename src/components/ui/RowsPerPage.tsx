"use client";

import React from "react";

const OPTIONS = [25, 50, 100, 200] as const;

interface Props {
  value: number;
  onChange: (n: number) => void;
}

export function RowsPerPage({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="text-[12px] text-[#64748d] select-none"
        style={{ fontFeatureSettings: '"ss01"' }}
      >
        Rows per page
      </span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="border border-[#e5edf5] rounded px-2 py-1 text-[12px] text-[#273951] bg-white outline-none focus:border-[#533afd] cursor-pointer appearance-none pr-6 transition-colors"
        style={{
          fontFeatureSettings: '"ss01"',
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2364748d' stroke-width='1.3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 7px center",
        }}
      >
        {OPTIONS.map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
    </div>
  );
}
