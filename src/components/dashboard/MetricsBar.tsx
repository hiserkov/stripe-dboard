"use client";

import React, { useState } from "react";

interface MetricItem {
  label: string;
  value: string;
}

const metrics: MetricItem[] = [
  { label: "All", value: "5,781" },
  { label: "Succeeded", value: "3,318" },
  { label: "Refunded", value: "114" },
  { label: "Disputed", value: "7" },
  { label: "Failed", value: "654" },
  { label: "Uncaptured", value: "18" },
];

const labelColor: Record<string, string> = {
  Succeeded: "text-[#108c3d]",
  Failed: "text-[#c0154f]",
  Refunded: "text-[#4a5568]",
  Disputed: "text-[#c0154f]",
  Uncaptured: "text-[#7a5220]",
};

export function MetricsBar() {
  const [active, setActive] = useState(0);

  return (
    <div className="flex gap-3 flex-wrap">
      {metrics.map((m, i) => (
        <button
          key={m.label}
          onClick={() => setActive(i)}
          className={[
            "flex flex-col items-start gap-0.5 px-4 py-3 rounded-[6px] border transition-all text-left",
            active === i
              ? "bg-white border-[#533afd] [box-shadow:rgba(83,58,253,0.15)_0px_0px_0px_3px]"
              : "bg-white border-[#e5edf5] hover:border-[#b9b9f9] [box-shadow:rgba(23,23,23,0.06)_0px_3px_6px]",
          ].join(" ")}
          style={{ fontFeatureSettings: '"ss01"' }}
        >
          <span className="text-[10px] text-[#64748d] font-light">{m.label}</span>
          <span
            className={[
              "text-lg font-light tnum",
              labelColor[m.label] ?? "text-[#061b31]",
            ].join(" ")}
            style={{ fontFeatureSettings: '"tnum"' }}
          >
            {m.value}
          </span>
        </button>
      ))}
    </div>
  );
}
