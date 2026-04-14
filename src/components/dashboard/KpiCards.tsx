import React from "react";

interface KpiData {
  grossCents: number;
  netCents: number;
  txCount: number;
  avgFeePercent: number;
  avgNetMarginPercent: number;
}

function fmt(cents: number) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function pct(n: number) {
  return `${n.toFixed(1)}%`;
}

export function KpiCards({ data }: { data: KpiData | null }) {
  const cards = [
    {
      label: "Gross Revenue",
      value: data ? fmt(data.grossCents) : "—",
      sub: "succeeded payments",
    },
    {
      label: "Net Revenue",
      value: data ? fmt(data.netCents) : "—",
      sub: "after all deductions",
      highlight: true,
    },
    {
      label: "Transactions",
      value: data ? data.txCount.toLocaleString() : "—",
      sub: "succeeded",
    },
    {
      label: "Avg Stripe Fee",
      value: data ? pct(data.avgFeePercent) : "—",
      sub: "of gross",
    },
    {
      label: "Net Margin",
      value: data ? pct(data.avgNetMarginPercent) : "—",
      sub: "avg per transaction",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className={[
            "bg-white border rounded-[6px] px-5 py-4 flex flex-col gap-1",
            c.highlight
              ? "border-[#533afd] [box-shadow:rgba(83,58,253,0.12)_0px_0px_0px_3px]"
              : "border-[#e5edf5] [box-shadow:rgba(23,23,23,0.06)_0px_3px_6px]",
          ].join(" ")}
        >
          <span
            className="text-[11px] text-[#64748d] font-light uppercase"
            style={{ letterSpacing: "0.04em", fontFeatureSettings: '"ss01"' }}
          >
            {c.label}
          </span>
          <span
            className="text-[22px] font-light text-[#061b31] leading-tight"
            style={{ fontFeatureSettings: '"tnum"', letterSpacing: "-0.22px" }}
          >
            {c.value}
          </span>
          <span className="text-[11px] text-[#64748d]" style={{ fontFeatureSettings: '"ss01"' }}>
            {c.sub}
          </span>
        </div>
      ))}
    </div>
  );
}
