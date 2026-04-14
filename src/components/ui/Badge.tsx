import React from "react";

type BadgeVariant =
  | "success"
  | "failed"
  | "neutral"
  | "incomplete"
  | "uncaptured"
  | "refunded"
  | "disputed"
  | "canceled";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

// Status icons matching Stripe's exact badge icons
const StatusIcon = ({ variant }: { variant: BadgeVariant }) => {
  switch (variant) {
    case "success":
      return (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "failed":
      return (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "canceled":
      return (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "refunded":
      return (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M9.5 4.5H4a2 2 0 0 0 0 4h5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M7.5 2.5L9.5 4.5L7.5 6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "disputed":
      return (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M6 2v5M6 8.5v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "uncaptured":
      return (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M6 3.5V6l1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "incomplete":
      return (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M6 3.5V6l1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
};

const variantStyles: Record<BadgeVariant, { container: string }> = {
  success: {
    container: "bg-[#d4f5e2] text-[#0a7c34] border border-[#a3e6be]",
  },
  failed: {
    container: "bg-[#fde8ee] text-[#c0154f] border border-[#f5b8cc]",
  },
  neutral: {
    container: "bg-[#f6f9fc] text-[#4a5568] border border-[#e5edf5]",
  },
  incomplete: {
    container: "bg-[#e8eeff] text-[#3730a3] border border-[#c7d2fe]",
  },
  uncaptured: {
    container: "bg-[#f6f9fc] text-[#4a5568] border border-[#dde3eb]",
  },
  refunded: {
    container: "bg-[#f6f9fc] text-[#4a5568] border border-[#dde3eb]",
  },
  disputed: {
    container: "bg-[#fde8ee] text-[#c0154f] border border-[#f5b8cc]",
  },
  canceled: {
    container: "bg-[#f6f9fc] text-[#4a5568] border border-[#dde3eb]",
  },
};

export function Badge({ variant = "neutral", children, className = "" }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[5px] text-[12px] font-normal leading-none whitespace-nowrap",
        variantStyles[variant].container,
        className,
      ].join(" ")}
      style={{ fontFeatureSettings: '"ss01"' }}
    >
      {children}
      <StatusIcon variant={variant} />
    </span>
  );
}

export function statusToBadgeVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    Succeeded: "success",
    succeeded: "success",
    Failed: "failed",
    failed: "failed",
    Canceled: "canceled",
    Cancelled: "canceled",
    canceled: "canceled",
    cancelled: "canceled",
    Incomplete: "incomplete",
    incomplete: "incomplete",
    Uncaptured: "uncaptured",
    uncaptured: "uncaptured",
    Refunded: "refunded",
    refunded: "refunded",
    Disputed: "disputed",
    disputed: "disputed",
  };
  return map[status] ?? "neutral";
}
