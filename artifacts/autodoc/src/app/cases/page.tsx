"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ClipboardList, Calendar, Download, Trash2, User, Building2 } from "lucide-react";
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
