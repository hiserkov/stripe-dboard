"use client";

import React from "react";

type ButtonVariant = "primary" | "ghost" | "info" | "neutral";
type ButtonSize = "sm" | "md";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

const styles: Record<ButtonVariant, string> = {
  primary:
    "bg-[#533afd] text-white hover:bg-[#4434d4] border border-transparent",
  ghost:
    "bg-transparent text-[#533afd] border border-[#b9b9f9] hover:bg-[rgba(83,58,253,0.05)]",
  info:
    "bg-transparent text-[#2874ad] border border-[rgba(43,145,223,0.2)] hover:bg-[rgba(43,145,223,0.04)]",
  neutral:
    "bg-transparent text-[rgba(16,16,16,0.3)] border border-[rgb(212,222,233)] cursor-not-allowed",
};

const sizeStyles: Record<ButtonSize, string> = {
  md: "px-4 py-2 text-base",
  sm: "px-3 py-1.5 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        "inline-flex items-center justify-center gap-2 rounded font-normal leading-none transition-colors duration-150 cursor-pointer select-none",
        styles[variant],
        sizeStyles[size],
        className,
      ].join(" ")}
      style={{ fontFeatureSettings: '"ss01"' }}
      {...props}
    >
      {children}
    </button>
  );
}
