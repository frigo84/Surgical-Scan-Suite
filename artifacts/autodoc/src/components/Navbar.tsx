"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Stethoscope } from "lucide-react";

const NAV_LINKS = [
  { href: "/cases/new", label: "New Case" },
  { href: "/cases", label: "Cases" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between px-6 py-3.5 border-b border-surface-700/60 shrink-0 bg-surface-900/80 backdrop-blur-sm">
      <Link href="/" className="flex items-center gap-3 group">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 text-accent group-hover:bg-accent/15 transition-colors">
          <Stethoscope size={16} />
        </div>
        <div>
          <span className="text-sm font-bold text-white tracking-tight">AutoDoc</span>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-none mt-0.5">
            Surgical Data Extraction
          </p>
        </div>
      </Link>

      <nav className="flex items-center gap-1">
        {NAV_LINKS.map(({ href, label }) => {
          const active = pathname === href || (href === "/cases/new" && pathname === "/cases/new");
          return (
            <Link
              key={href}
              href={href}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-accent text-surface-900 shadow-[0_0_16px_rgba(56,189,248,0.2)]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-surface-700/60"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
