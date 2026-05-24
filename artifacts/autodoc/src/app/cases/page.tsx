"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  Plus, ClipboardList, Calendar, Download, Trash2, User, Building2,
  Activity, BarChart3, CircleGauge, PieChart,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { loadCases, deleteCase, type StoredCase } from "@/lib/storage";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function exportCsv(cases: StoredCase[]) {
  const headers = [
    "Case Code", "Date", "Surgeon", "Site", "Side", "Procedure Type", "Implant System",
    "Femur Size", "Tibia Size", "Poly Size", "Varus/Valgus", "Flexion", "Ext. Rotation",
    "Post. Slope", "Medial Resection", "Lateral Resection",
    "Ext. Medial", "Ext. Lateral", "Flex. Medial", "Flex. Lateral",
    "Native Alignment", "Final Alignment", "Max Flexion",
    "Manufacturer", "Implant System (Label)", "Femur Component", "Tibial Component",
    "Poly Insert", "Size", "REF", "LOT", "Expiry Date",
    "Case Notes",
  ];

  const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;

  const rows = cases.map((c) =>
    [
      c.caseCode, formatDate(c.createdAt), c.surgeon, c.site, c.side,
      c.procedureType, c.implantSystem,
      c.planning.femurSize, c.planning.tibiaSize, c.planning.polySize,
      c.planning.varusValgus, c.planning.flexion, c.planning.externalRotation,
      c.planning.posteriorSlope, c.planning.medialResection, c.planning.lateralResection,
      c.laxity.extensionMedial, c.laxity.extensionLateral,
      c.laxity.flexionMedial, c.laxity.flexionLateral,
      c.laxity.nativeAlignment, c.laxity.finalAlignment, c.laxity.maxFlexion,
      c.implant.manufacturer, c.implant.implantSystem, c.implant.femurComponent,
      c.implant.tibialComponent, c.implant.polyInsert, c.implant.implantSize,
      c.implant.ref, c.implant.lot, c.implant.expiryDate,
      c.caseNotes,
    ].map((v) => escape(String(v ?? ""))).join(",")
  );

  const csv = [headers.map((h) => escape(h)).join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `autodoc-cases-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function pct(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function hasAny(values: unknown[]) {
  return values.some((v) => typeof v === "string" && v.trim() !== "");
}

function caseCompleteness(c: StoredCase) {
  const areas = [
    hasAny(Object.values(c.preOp ?? c.planning)),
    hasAny(Object.values(c.intraOp ?? {})),
    hasAny(Object.values(c.initialAssessment ?? c.laxity)),
    hasAny(Object.values(c.trial1 ?? {})),
  ];
  return areas.filter(Boolean).length;
}

function StatTile({
  icon,
  label,
  value,
  detail,
  tone = "accent",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  tone?: "accent" | "blue" | "purple" | "amber";
}) {
  const toneCls = {
    accent: "text-accent bg-accent/10 border-accent/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  }[tone];

  return (
    <div className="rounded-2xl border border-surface-600 bg-surface-800/45 p-4 min-w-0">
      <div className="flex items-center justify-between gap-3">
        <div className={`shrink-0 p-2 rounded-xl border ${toneCls}`}>{icon}</div>
        <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest truncate">
          {label}
        </span>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-slate-100 tabular-nums">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5 truncate">{detail}</p>
      </div>
    </div>
  );
}

function SplitBar({
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
}: {
  leftLabel: string;
  leftValue: number;
  rightLabel: string;
  rightValue: number;
}) {
  const total = leftValue + rightValue;
  const leftPct = pct(leftValue, total);
  const rightPct = total > 0 ? 100 - leftPct : 0;

  return (
    <div>
      <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-wider mb-2">
        <span>{leftLabel} {leftValue}</span>
        <span>{rightLabel} {rightValue}</span>
      </div>
      <div className="h-3 rounded-full overflow-hidden bg-surface-700 border border-surface-600 flex">
        <div className="h-full bg-blue-400" style={{ width: `${leftPct}%` }} />
        <div className="h-full bg-purple-400" style={{ width: `${rightPct}%` }} />
      </div>
    </div>
  );
}

function MiniTrend({ cases }: { cases: StoredCase[] }) {
  const monthCounts = new Map<string, number>();
  cases.forEach((c) => {
    const d = new Date(c.procedureDate ? `${c.procedureDate}T00:00:00` : c.createdAt);
    if (Number.isNaN(d.getTime())) return;
    const key = d.toLocaleDateString("en-US", { month: "short" });
    monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
  });
  const bars = Array.from(monthCounts.entries()).slice(-6);
  const max = Math.max(1, ...bars.map(([, count]) => count));

  return (
    <div className="rounded-2xl border border-surface-600 bg-surface-800/45 p-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 size={14} className="text-accent" />
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Recent Volume</span>
      </div>
      <div className="flex items-end gap-2 h-24">
        {bars.length === 0 ? (
          <div className="flex-1 text-xs text-slate-600">No dated cases yet</div>
        ) : bars.map(([label, count]) => (
          <div key={label} className="flex-1 min-w-0 flex flex-col items-center gap-2">
            <div
              className="w-full max-w-8 rounded-t-lg bg-accent/70 border border-accent/30"
              style={{ height: `${Math.max(10, (count / max) * 72)}px` }}
            />
            <span className="text-[10px] text-slate-500 truncate">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CasesOverview({ cases }: { cases: StoredCase[] }) {
  const left = cases.filter((c) => c.side === "left").length;
  const right = cases.filter((c) => c.side === "right").length;
  const cr = cases.filter((c) => c.implantSystem.includes("CR") || c.procedureType.includes("CR")).length;
  const ps = cases.filter((c) => c.implantSystem.includes("PS") || c.procedureType.includes("PS")).length;
  const completedAreas = cases.reduce((sum, c) => sum + caseCompleteness(c), 0);
  const possibleAreas = cases.length * 4;
  const completeness = pct(completedAreas, possibleAreas);
  const withTimeline = cases.filter((c) => c.timeLog && Object.values(c.timeLog).some((e) => e.status === "recorded")).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-3">
      <div className="grid grid-cols-2 gap-3">
        <StatTile
          icon={<ClipboardList size={16} />}
          label="Cases"
          value={String(cases.length)}
          detail={`${withTimeline} with timeline`}
        />
        <StatTile
          icon={<CircleGauge size={16} />}
          label="Extraction"
          value={`${completeness}%`}
          detail={`${completedAreas}/${possibleAreas} areas captured`}
          tone="amber"
        />
        <StatTile
          icon={<Activity size={16} />}
          label="Left"
          value={`${pct(left, cases.length)}%`}
          detail={`${left} left knees`}
          tone="blue"
        />
        <StatTile
          icon={<PieChart size={16} />}
          label="Right"
          value={`${pct(right, cases.length)}%`}
          detail={`${right} right knees`}
          tone="purple"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-3">
        <div className="rounded-2xl border border-surface-600 bg-surface-800/45 p-4 flex flex-col justify-between gap-5">
          <div className="flex items-center gap-2">
            <PieChart size={14} className="text-accent" />
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Case Mix</span>
          </div>
          <div className="flex flex-col gap-5">
            <SplitBar leftLabel="Left" leftValue={left} rightLabel="Right" rightValue={right} />
            <SplitBar leftLabel="CR" leftValue={cr} rightLabel="PS" rightValue={ps} />
          </div>
        </div>
        <MiniTrend cases={cases} />
      </div>
    </div>
  );
}

function CaseCard({ c, onDelete }: { c: StoredCase; onDelete: (id: string) => void }) {
  const planFields = [
    { label: "Femur", value: c.planning.femurSize },
    { label: "Tibia", value: c.planning.tibiaSize },
    { label: "Poly", value: c.planning.polySize },
    { label: "Varus/Valgus", value: c.planning.varusValgus },
    { label: "Flexion", value: c.planning.flexion },
    { label: "Ext. Rot.", value: c.planning.externalRotation },
    { label: "Post. Slope", value: c.planning.posteriorSlope },
    { label: "Med. Res.", value: c.planning.medialResection },
  ];

  return (
    <div className="rounded-2xl border border-surface-600 bg-surface-800/50 p-5 hover:border-surface-500 transition-colors group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-base font-bold text-accent font-mono tracking-wide">
              {c.caseCode}
            </span>
            <div className="flex items-center gap-3 mt-0.5">
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                  c.side === "left"
                    ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                    : "bg-purple-500/10 border border-purple-500/20 text-purple-400"
                }`}
              >
                {c.side} knee
              </span>
              <span className="text-xs text-slate-500">{c.procedureType}</span>
              <span className="text-xs text-slate-500">·</span>
              <span className="text-xs text-slate-500">{c.implantSystem}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end gap-1 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <User size={10} />
              {c.surgeon}
            </div>
            {c.site && (
              <div className="flex items-center gap-1.5">
                <Building2 size={10} />
                {c.site}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Calendar size={10} />
              {c.procedureDate ? formatDate(c.procedureDate + "T00:00:00") : formatDate(c.createdAt)}
            </div>
          </div>
          <Link
            href={`/cases/new?caseId=${encodeURIComponent(c.id)}`}
            className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-accent border border-accent/25 bg-accent/5 hover:bg-accent/10 transition-all"
          >
            <Download size={12} />
            Open / PDF
          </Link>
          <button
            onClick={() => onDelete(c.id)}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
            aria-label="Delete case"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-3">
        {planFields.map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-0.5 rounded-xl bg-surface-700/60 px-3 py-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
            <span className="text-sm font-semibold text-slate-100 truncate">
              {value || <span className="text-slate-600">—</span>}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs text-slate-500">
        <div className="rounded-xl bg-surface-700/40 border border-surface-600/50 px-3 py-2">
          <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">Laxity</p>
          <p>
            Ext: {c.laxity.extensionMedial || "—"} / {c.laxity.extensionLateral || "—"}
          </p>
          <p>
            Flex: {c.laxity.flexionMedial || "—"} / {c.laxity.flexionLateral || "—"}
          </p>
        </div>
        <div className="rounded-xl bg-surface-700/40 border border-surface-600/50 px-3 py-2">
          <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">Alignment</p>
          <p>Native: {c.laxity.nativeAlignment || "—"}</p>
          <p>Final: {c.laxity.finalAlignment || "—"}</p>
        </div>
        <div className="rounded-xl bg-surface-700/40 border border-surface-600/50 px-3 py-2">
          <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">Implant</p>
          <p>{c.implant.femurComponent || c.implant.implantSystem || "—"}</p>
          <p className="text-slate-600">
            {c.implant.lot ? `LOT: ${c.implant.lot}` : "No label data"}
          </p>
        </div>
      </div>

      {c.caseNotes && (
        <div className="mt-2 px-3.5 py-2.5 rounded-xl bg-surface-700/40 border border-surface-600/50">
          <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">{c.caseNotes}</p>
        </div>
      )}
    </div>
  );
}

export default function CasesPage() {
  const [cases, setCases] = useState<StoredCase[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCases(loadCases());
    setMounted(true);
  }, []);

  const handleDelete = (id: string) => {
    deleteCase(id);
    setCases(loadCases());
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-screen bg-surface-900 overflow-hidden">
      <Navbar />

      <div className="flex items-center justify-between px-6 py-3 border-b border-surface-700/40 shrink-0">
        <p className="text-xs text-slate-500">
          {cases.length > 0
            ? `${cases.length} case${cases.length !== 1 ? "s" : ""} — anonymous, no patient data stored`
            : "No cases saved yet"}
        </p>
        <div className="flex items-center gap-2">
          {cases.length > 0 && (
            <button
              onClick={() => exportCsv(cases)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 border border-surface-600 hover:text-slate-200 hover:border-surface-500 transition-all"
            >
              <Download size={12} />
              Export CSV
            </button>
          )}
          <Link
            href="/cases/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-accent text-surface-900 hover:bg-accent/90 shadow-[0_0_16px_rgba(56,189,248,0.2)] transition-all active:scale-95"
          >
            <Plus size={14} />
            New Case
          </Link>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-5">
        {cases.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="p-5 rounded-2xl bg-surface-700 border border-surface-600 text-slate-500">
              <ClipboardList size={28} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-400 mb-1">No cases saved yet</p>
              <p className="text-xs text-slate-600">
                Complete the guided workflow to save your first case
              </p>
            </div>
            <Link
              href="/cases/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-accent text-surface-900 hover:bg-accent/90 transition-all"
            >
              <Plus size={13} />
              Start first case
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-w-5xl mx-auto">
            <CasesOverview cases={cases} />
            {cases.map((c) => (
              <CaseCard key={c.id} c={c} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>

      <footer className="px-6 py-2.5 border-t border-surface-700/40 shrink-0">
        <p className="text-[10px] text-slate-600 text-center uppercase tracking-widest">
          AutoDoc · Robotic Knee Surgery · No patient data stored
        </p>
      </footer>
    </div>
  );
}
