"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";

export type DatePreset = "today" | "this_week" | "this_month" | "last_month" | "custom";

export interface DateFilterState {
  preset: DatePreset;
  from?: string;
  to?: string;
}

interface DateFilterProps {
  value: DateFilterState;
  onChange: (v: DateFilterState) => void;
}

const PRESETS: { label: string; value: DatePreset }[] = [
  { label: "Today", value: "today" },
  { label: "This week", value: "this_week" },
  { label: "This month", value: "this_month" },
  { label: "Last month", value: "last_month" },
  { label: "Custom", value: "custom" },
];

export function DateFilter({ value, onChange }: DateFilterProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [localFrom, setLocalFrom] = useState(value.from ?? "");
  const [localTo, setLocalTo] = useState(value.to ?? "");

  const handlePreset = (preset: DatePreset) => {
    if (preset === "custom") {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    onChange({ preset });
  };

  const applyCustom = () => {
    if (localFrom && localTo) {
      onChange({ preset: "custom", from: localFrom, to: localTo });
      setShowCustom(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {PRESETS.map((p) => (
        <button
          key={p.value}
          onClick={() => handlePreset(p.value)}
          className={[
            "px-3 py-1.5 rounded text-[13px] border transition-colors",
            value.preset === p.value && !(p.value === "custom" && showCustom === false && value.preset !== "custom")
              ? "bg-[#533afd] text-white border-[#533afd]"
              : "bg-white text-[#273951] border-[#e5edf5] hover:border-[#b9b9f9] hover:text-[#533afd]",
          ].join(" ")}
          style={{ fontFeatureSettings: '"ss01"' }}
        >
          {p.label}
        </button>
      ))}

      {showCustom && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={localFrom}
            onChange={(e) => setLocalFrom(e.target.value)}
            className="border border-[#e5edf5] rounded px-2 py-1.5 text-[13px] text-[#061b31] outline-none focus:border-[#533afd]"
          />
          <span className="text-[#64748d] text-[13px]">to</span>
          <input
            type="date"
            value={localTo}
            onChange={(e) => setLocalTo(e.target.value)}
            className="border border-[#e5edf5] rounded px-2 py-1.5 text-[13px] text-[#061b31] outline-none focus:border-[#533afd]"
          />
          <Button size="sm" variant="primary" onClick={applyCustom}>
            Apply
          </Button>
        </div>
      )}
    </div>
  );
}
