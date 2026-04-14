"use client";

import React from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

function fmtUSD(cents: number) {
  return "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const STRIPE_PURPLE = "#533afd";
const NAVY = "#061b31";
const BODY = "#64748d";
const BORDER = "#e5edf5";

const tooltipStyle = {
  backgroundColor: "#fff",
  border: `1px solid ${BORDER}`,
  borderRadius: 6,
  boxShadow: "rgba(50,50,93,0.25) 0px 6px 12px -2px, rgba(0,0,0,0.1) 0px 3px 7px -3px",
  fontSize: 12,
  color: NAVY,
};

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#e5edf5] rounded-[6px] [box-shadow:rgba(23,23,23,0.06)_0px_3px_6px] p-5">
      <div
        className="text-[13px] font-normal text-[#273951] mb-4"
        style={{ fontFeatureSettings: '"ss01"' }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

export function RevenueChart({ data }: { data: { period: string; grossCents: number }[] }) {
  const formatted = data.map((d) => ({ ...d, label: fmtDate(d.period) }));
  return (
    <ChartCard title="Revenue over time">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={formatted} barSize={16}>
          <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: BODY }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => fmtUSD(v)} tick={{ fontSize: 11, fill: BODY }} axisLine={false} tickLine={false} width={60} />
          <Tooltip formatter={(v) => fmtUSD(Number(v))} contentStyle={tooltipStyle} cursor={{ fill: "rgba(83,58,253,0.05)" }} />
          <Bar dataKey="grossCents" fill={STRIPE_PURPLE} radius={[3, 3, 0, 0]} name="Gross" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function VolumeChart({ data }: { data: { period: string; count: number }[] }) {
  const formatted = data.map((d) => ({ ...d, label: fmtDate(d.period) }));
  return (
    <ChartCard title="Transaction volume">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={formatted} barSize={16}>
          <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: BODY }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: BODY }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(83,58,253,0.05)" }} />
          <Bar dataKey="count" fill="#0d253d" radius={[3, 3, 0, 0]} name="Transactions" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function FeeChart({ data }: { data: { period: string; feePercent: number }[] }) {
  const formatted = data.map((d) => ({ ...d, label: fmtDate(d.period) }));
  return (
    <ChartCard title="Stripe fee %">
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: BODY }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => `${v.toFixed(1)}%`} tick={{ fontSize: 11, fill: BODY }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} contentStyle={tooltipStyle} />
          <Line dataKey="feePercent" stroke="#ea2261" strokeWidth={2} dot={false} name="Fee %" />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function NetMarginChart({ data }: { data: { period: string; netMarginPercent: number }[] }) {
  const formatted = data.map((d) => ({ ...d, label: fmtDate(d.period) }));
  return (
    <ChartCard title="Net margin over time">
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: BODY }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => `${v.toFixed(1)}%`} tick={{ fontSize: 11, fill: BODY }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} contentStyle={tooltipStyle} />
          <Line dataKey="netMarginPercent" stroke="#15be53" strokeWidth={2} dot={false} name="Net margin" />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function RevenueByMedChart({
  data,
}: {
  data: { medicationName: string | null; grossCents: number }[];
}) {
  const formatted = data.map((d) => ({
    name: d.medicationName ?? "Unknown",
    grossCents: d.grossCents,
  }));
  return (
    <ChartCard title="Revenue by medication">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={formatted} layout="vertical" barSize={14}>
          <CartesianGrid strokeDasharray="3 3" stroke={BORDER} horizontal={false} />
          <XAxis type="number" tickFormatter={(v) => fmtUSD(v)} tick={{ fontSize: 11, fill: BODY }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: BODY }} axisLine={false} tickLine={false} width={120} />
          <Tooltip formatter={(v) => fmtUSD(Number(v))} contentStyle={tooltipStyle} cursor={{ fill: "rgba(83,58,253,0.05)" }} />
          <Bar dataKey="grossCents" fill={STRIPE_PURPLE} radius={[0, 3, 3, 0]} name="Revenue" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
