"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  icon?: string;
  href?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const icons: Record<string, React.ReactNode> = {
  home: (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path d="M2 6.5L8 2l6 4.5V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M6 15v-5h4v5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  ),
  wallet: (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="4" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1 7h14M11 10.5h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M4 4V3a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  ),
  list: (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path d="M3 4h10M3 8h10M3 12h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  users: (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1 14c0-3 2-4.5 5-4.5s5 1.5 5 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M11 3c1.2.4 2 1.5 2 2.5s-.8 2.1-2 2.5M13 10c1.5.5 2.5 1.5 2.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  box: (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path d="M8 1 L14 4.5 L14 11.5 L8 15 L2 11.5 L2 4.5 Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M8 1v14M2 4.5l6 3.5 6-3.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  ),
  pill: (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="5.5" width="13" height="5" rx="2.5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="8" y1="5.5" x2="8" y2="10.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  ),
};

const navGroups: NavGroup[] = [
  {
    label: "Main Navigation",
    items: [
      { label: "Home", icon: "home", href: "/" },
      { label: "Transactions", icon: "list", href: "/transactions" },
      { label: "Medications", icon: "box", href: "/medications" },
      { label: "Dispense Reports", icon: "pill", href: "/dispense-reports" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[220px] min-h-screen bg-[#061b31] flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[rgba(255,255,255,0.08)]">
        <div className="text-white text-sm font-normal" style={{ fontFeatureSettings: '"ss01"' }}>
          helimeds.com
        </div>
        <div className="text-[rgba(255,255,255,0.45)] text-xs mt-0.5" style={{ fontFeatureSettings: '"ss01"' }}>
          TravEx
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div
              className="text-[rgba(255,255,255,0.35)] text-[10px] font-normal uppercase tracking-wider px-2 pb-1.5"
              style={{ fontFeatureSettings: '"ss01"', letterSpacing: "0.06em" }}
            >
              {group.label}
            </div>
            <ul className="space-y-px">
              {group.items.map((item) => {
                const isActive = item.href ? pathname === item.href : false;
                const linkClass = [
                  "flex items-center gap-2.5 px-2 py-1.5 rounded text-[13px] transition-colors",
                  isActive
                    ? "bg-[rgba(83,58,253,0.25)] text-white"
                    : "text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.06)]",
                  item.href ? "cursor-pointer" : "cursor-default opacity-50",
                ].join(" ");
                return (
                  <li key={item.label}>
                    {item.href ? (
                      <Link href={item.href} className={linkClass} style={{ fontFeatureSettings: '"ss01"' }}>
                        {item.icon && (
                          <span className={isActive ? "text-white" : "text-[rgba(255,255,255,0.5)]"}>
                            {icons[item.icon]}
                          </span>
                        )}
                        {item.label}
                      </Link>
                    ) : (
                      <span className={linkClass} style={{ fontFeatureSettings: '"ss01"' }}>
                        {item.icon && (
                          <span className="text-[rgba(255,255,255,0.5)]">{icons[item.icon]}</span>
                        )}
                        {item.label}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
