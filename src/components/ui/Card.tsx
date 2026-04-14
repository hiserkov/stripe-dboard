import React from "react";

type CardElevation = "flat" | "ambient" | "standard" | "elevated" | "deep";

interface CardProps {
  elevation?: CardElevation;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const elevationStyles: Record<CardElevation, string> = {
  flat: "",
  ambient: "[box-shadow:rgba(23,23,23,0.06)_0px_3px_6px]",
  standard: "[box-shadow:rgba(23,23,23,0.08)_0px_15px_35px_0px]",
  elevated:
    "[box-shadow:rgba(50,50,93,0.25)_0px_30px_45px_-30px,rgba(0,0,0,0.1)_0px_18px_36px_-18px]",
  deep:
    "[box-shadow:rgba(3,3,39,0.25)_0px_14px_21px_-14px,rgba(0,0,0,0.1)_0px_8px_17px_-8px]",
};

export function Card({
  elevation = "elevated",
  children,
  className = "",
  onClick,
}: CardProps) {
  return (
    <div
      className={[
        "bg-white border border-[#e5edf5] rounded-[6px]",
        elevationStyles[elevation],
        onClick ? "cursor-pointer" : "",
        className,
      ].join(" ")}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
