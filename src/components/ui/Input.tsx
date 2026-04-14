"use client";

import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({
  label,
  hint,
  error,
  leftIcon,
  rightIcon,
  className = "",
  id,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm text-[#273951] font-normal"
          style={{ fontFeatureSettings: '"ss01"' }}
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3 text-[#64748d] flex items-center">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          className={[
            "w-full border rounded px-3 py-2 text-sm text-[#061b31] placeholder:text-[#64748d] font-light transition-colors outline-none",
            error
              ? "border-[#ea2261] focus:border-[#ea2261]"
              : "border-[#e5edf5] focus:border-[#533afd]",
            leftIcon ? "pl-9" : "",
            rightIcon ? "pr-9" : "",
            className,
          ].join(" ")}
          style={{ fontFeatureSettings: '"ss01"' }}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 text-[#64748d] flex items-center">
            {rightIcon}
          </span>
        )}
      </div>
      {error && (
        <p className="text-xs text-[#ea2261]" style={{ fontFeatureSettings: '"ss01"' }}>
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-[#64748d]" style={{ fontFeatureSettings: '"ss01"' }}>
          {hint}
        </p>
      )}
    </div>
  );
}

export function SearchInput({
  placeholder = "Search",
  className = "",
  ...props
}: Omit<InputProps, "label">) {
  return (
    <div className="relative flex items-center">
      <span className="absolute left-3 text-[#64748d]">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path
            d="M7 13A6 6 0 1 0 7 1a6 6 0 0 0 0 12ZM15 15l-3.5-3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <input
        placeholder={placeholder}
        className={[
          "w-full border border-[#e5edf5] rounded-full pl-9 pr-3 py-1.5 text-sm text-[#061b31] placeholder:text-[#64748d] font-light outline-none focus:border-[#533afd] transition-colors bg-white",
          className,
        ].join(" ")}
        style={{ fontFeatureSettings: '"ss01"' }}
        {...props}
      />
    </div>
  );
}
