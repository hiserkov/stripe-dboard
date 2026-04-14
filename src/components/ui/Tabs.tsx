"use client";

import React, { useState } from "react";

interface Tab {
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  defaultActive?: number;
  onChange?: (index: number) => void;
  className?: string;
}

export function Tabs({ tabs, defaultActive = 0, onChange, className = "" }: TabsProps) {
  const [active, setActive] = useState(defaultActive);

  const handleClick = (index: number) => {
    setActive(index);
    onChange?.(index);
  };

  return (
    <div className={["flex border-b border-[#e5edf5]", className].join(" ")}>
      {tabs.map((tab, i) => (
        <button
          key={tab.label}
          onClick={() => handleClick(i)}
          className={[
            "relative px-4 py-3 text-sm transition-colors leading-none",
            active === i
              ? "text-[#061b31] font-normal after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#533afd] after:rounded-t"
              : "text-[#64748d] hover:text-[#061b31] font-light",
          ].join(" ")}
          style={{ fontFeatureSettings: '"ss01"' }}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={[
                "ml-1.5 text-[10px] rounded px-1 py-px",
                active === i
                  ? "bg-[rgba(83,58,253,0.1)] text-[#533afd]"
                  : "bg-[#f6f9fc] text-[#64748d]",
              ].join(" ")}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
