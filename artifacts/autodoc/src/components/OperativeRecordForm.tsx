"use client";

import { useRef, useState, useEffect, Fragment } from "react";
import { Loader2, ImagePlus, X, Sparkles } from "lucide-react";
import type {
  PlanningTable,
  InitialAssessment,
  TrialEntry,
  TimeLogValues,
  TimeLogEntry,
  TimeLogKey,
  TimeLogStatus,
  ImplantSticker,
} from "@/lib/storage";
import { TIME_LOG_KEYS } from "@/lib/storage";

const INPUT =
  "w-full px-2 py-1.5 rounded-lg bg-surface-900 border border-surface-600 text-slate-100 text-xs font-mono placeholder:text-slate-700 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all";
const LABEL = "text-[9px] font-semibold text-slate-500 uppercase tracking-wider";
const SECTION_TITLE =
  "text-[10px] font-bold text-slate-400 uppercase tracking-widest";

function Cell({
  value,
  onChange,
  placeholder,
  accent,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  accent?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? "—"}
      className={`${INPUT} ${accent ? "text-accent font-bold" : ""}`}
    />
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-[10px] text-slate-500">{label}</span>
      {children}
    </div>
  );
}

// ── Numeric stepper (0.0–19.9, no keyboard) ──────────────────────────────────
function NumericStepper({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const MIN = 0, MAX = 19.9, STEP = 0.1;
  const timerRef = useRef<{ t: ReturnType<typeof setTimeout> | null; i: ReturnType<typeof setInterval> | null }>({ t: null, i: null });
  const latestVal = useRef(value);
  latestVal.current = value;
  const latestCb = useRef(onChange);
  latestCb.current = onChange;

  function nudge(dir: 1 | -1) {
    const cur = latestVal.current === "" ? (dir > 0 ? -STEP : STEP) : parseFloat(latestVal.current);
    const raw = Math.round((cur + dir * STEP) * 10) / 10;
    if (raw < MIN || raw > MAX + 0.001) return;
    latestCb.current(Math.min(Math.max(raw, MIN), MAX).toFixed(1));
  }

  function startHold(dir: 1 | -1) {
    nudge(dir);
    timerRef.current.t = setTimeout(() => {
      timerRef.current.i = setInterval(() => nudge(dir), 75);
    }, 420);
  }

  function stopHold() {
    if (timerRef.current.t) clearTimeout(timerRef.current.t);
    if (timerRef.current.i) clearInterval(timerRef.current.i);
    timerRef.current = { t: null, i: null };
  }

  useEffect(() => () => stopHold(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const num = value === "" ? null : parseFloat(value);
  const display = num !== null ? num.toFixed(1) : "—";

  return (
    <div className="flex items-center rounded-lg overflow-hidden border border-surface-600 bg-surface-900 select-none">
      <button type="button"
        onPointerDown={() => startHold(-1)} onPointerUp={stopHold} onPointerLeave={stopHold}
        className="w-8 py-1.5 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-surface-700 active:bg-surface-600 transition-colors font-bold text-sm shrink-0">
        −
      </button>
      <span className="flex-1 text-center text-xs font-mono text-slate-100 min-w-[38px]">{display}</span>
      <button type="button"
        onPointerDown={() => startHold(1)} onPointerUp={stopHold} onPointerLeave={stopHold}
        className="w-8 py-1.5 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-surface-700 active:bg-surface-600 transition-colors font-bold text-sm shrink-0">
        +
      </button>
    </div>
  );
}

// ── Pre-OP extraction helpers ─────────────────────────────────────────────────
function stripNum(s: string | undefined): string {
  if (!s) return "";
  const m = s.match(/\d+(\.\d+)?/);
  return m ? m[0] : "";
}

function mapIntraopToPreOp(data: Record<string, string>): Partial<Record<keyof PlanningTable, string>> {
  return {
    femurVarValg:     stripNum(data.valgusMa),
    femurIntAx:       stripNum(data.pcaExternal),
    femurExtFlex:     stripNum(data.flexion),
    femurSize:        stripNum(data.femurSize),
    tibiaVarValg:     stripNum(data.varusBase),
    tibiaIntAx:       stripNum(data.apExternal),
    tibiaSlope:       stripNum(data.pSlope),
    tibiaSize:        stripNum(data.tibiaSize),
    cutFemurDistalMed: stripNum(data.femurCutDistalMed),
    cutFemurDistalLat: stripNum(data.femurCutDistalLat),
    cutFemurPostMed:   stripNum(data.femurCutPostMed),
    cutFemurPostLat:   stripNum(data.femurCutPostLat),
    cutTibiaMed:       stripNum(data.tibiaCutMed),
    cutTibiaLat:       stripNum(data.tibiaCutLat),
    cutPcaIntExt:      stripNum(data.pcaExternal),
  };
}

function SizeSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 rounded-lg bg-surface-900 border border-surface-600 text-slate-100 text-xs font-bold font-mono focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all appearance-none cursor-pointer"
      >
        <option value="">—</option>
        {["1","2","3","4","5","6","7","8"].map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      {(value === "1" || value === "2") && (
        <span className="text-[9px] font-semibold text-amber-400 flex items-center gap-1">
          ⚠ Use narrow saw blades
        </span>
      )}
    </div>
  );
}

function PlanningTableSection({
  title,
  data,
  onChange,
  loaded,
  showExtract,
  onScreenshotCapture,
}: {
  title: string;
  data: PlanningTable;
  onChange: (key: keyof PlanningTable, v: string) => void;
  loaded: boolean;
  showExtract?: boolean;
  onScreenshotCapture?: (file: File, label: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [extracting, setExtracting] = useState(false);
  const [thumb, setThumb] = useState<string | null>(null);
  const [extractError, setExtractError] = useState("");

  async function handleExtractFile(file: File) {
    const url = URL.createObjectURL(file);
    setThumb(url);
    onScreenshotCapture?.(file, `${title} Screenshot`);
    setExtractError("");
    setExtracting(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("screen_type", "intraop");
      const res = await fetch("/api/extract", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Extraction failed");
      const mapped = mapIntraopToPreOp(json.data ?? {});
      (Object.keys(mapped) as (keyof PlanningTable)[]).forEach((k) => {
        if (mapped[k]) onChange(k, mapped[k]!);
      });
    } catch (e) {
      setExtractError(e instanceof Error ? e.message : "Failed");
    } finally {
      setExtracting(false);
    }
  }

  return (
    <div className="flex-1 rounded-2xl border border-surface-600 bg-surface-800/30 p-4 min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-1.5 h-1.5 rounded-full ${loaded ? "bg-success" : "bg-surface-500"}`} />
        <span className={SECTION_TITLE}>{title}</span>
      </div>

      <div className="grid grid-cols-[72px_1fr_1fr] gap-x-2 gap-y-0 mb-1">
        <div />
        <div className="text-center text-[9px] font-bold text-slate-500 border-b border-surface-700 pb-1">Femur</div>
        <div className="text-center text-[9px] font-bold text-slate-500 border-b border-surface-700 pb-1">Tibia</div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-[72px_1fr_1fr] gap-x-2 items-center">
          <span className={LABEL}>Int./Ax.</span>
          <NumericStepper value={data.femurIntAx} onChange={(v) => onChange("femurIntAx", v)} />
          <NumericStepper value={data.tibiaIntAx} onChange={(v) => onChange("tibiaIntAx", v)} />
        </div>

        <div className="grid grid-cols-[72px_1fr_1fr] gap-x-2 items-center">
          <span className={LABEL}>Var./Valg.</span>
          <NumericStepper value={data.femurVarValg} onChange={(v) => onChange("femurVarValg", v)} />
          <NumericStepper value={data.tibiaVarValg} onChange={(v) => onChange("tibiaVarValg", v)} />
        </div>

        <div className="grid grid-cols-[72px_1fr_1fr] gap-x-2 items-center">
          <span className={LABEL}>Ext./Flex.</span>
          <NumericStepper value={data.femurExtFlex} onChange={(v) => onChange("femurExtFlex", v)} />
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] text-slate-600">Slope</span>
            <NumericStepper value={data.tibiaSlope} onChange={(v) => onChange("tibiaSlope", v)} />
          </div>
        </div>

        <div className="grid grid-cols-[72px_1fr_1fr] gap-x-2 items-start">
          <span className={`${LABEL} pt-1.5`}>Size</span>
          <SizeSelector value={data.femurSize} onChange={(v) => onChange("femurSize", v)} />
          <SizeSelector value={data.tibiaSize} onChange={(v) => onChange("tibiaSize", v)} />
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-surface-700/60">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Cut (mm)</span>
        {/* Column headers */}
        <div className="grid grid-cols-[68px_1fr_1fr] gap-x-2 mb-1">
          <div />
          <div className="text-center text-[8px] font-bold text-slate-500">Med</div>
          <div className="text-center text-[8px] font-bold text-slate-500">Lat</div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-[68px_1fr_1fr] gap-x-2 items-center">
            <span className="text-[8px] text-slate-600">Fem. Distal</span>
            <Cell value={data.cutFemurDistalMed} onChange={(v) => onChange("cutFemurDistalMed", v)} />
            <Cell value={data.cutFemurDistalLat} onChange={(v) => onChange("cutFemurDistalLat", v)} />
          </div>
          <div className="grid grid-cols-[68px_1fr_1fr] gap-x-2 items-center">
            <span className="text-[8px] text-slate-600">Fem. Post.</span>
            <Cell value={data.cutFemurPostMed} onChange={(v) => onChange("cutFemurPostMed", v)} />
            <Cell value={data.cutFemurPostLat} onChange={(v) => onChange("cutFemurPostLat", v)} />
          </div>
          <div className="grid grid-cols-[68px_1fr_1fr] gap-x-2 items-center">
            <span className="text-[8px] text-slate-600">Tibia</span>
            <Cell value={data.cutTibiaMed} onChange={(v) => onChange("cutTibiaMed", v)} />
            <Cell value={data.cutTibiaLat} onChange={(v) => onChange("cutTibiaLat", v)} />
          </div>
          <div className="grid grid-cols-[68px_1fr_1fr] gap-x-2 items-center mt-1 pt-1 border-t border-surface-700/40">
            <span className="text-[8px] text-slate-600">PCA Int./Ext.</span>
            <Cell value={data.cutPcaIntExt} onChange={(v) => onChange("cutPcaIntExt", v)} />
            <div />
          </div>
        </div>
      </div>

      {/* Screenshot extraction — Pre-OP only */}
      {showExtract && (
        <div className="mt-3 pt-3 border-t border-surface-700/60">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleExtractFile(f); e.target.value = ""; }}
          />

          {!thumb ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-surface-500 text-slate-500 hover:border-accent/40 hover:text-accent/70 transition-all text-[11px] font-medium"
            >
              <ImagePlus size={14} />
              Upload planning screenshot to auto-fill
            </button>
          ) : (
            <div className="flex items-start gap-3">
              <div className="relative shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumb} alt="planning screenshot" className="w-24 h-16 object-cover rounded-lg border border-surface-600" />
                {extracting && (
                  <div className="absolute inset-0 flex items-center justify-center bg-surface-900/70 rounded-lg">
                    <Loader2 size={16} className="animate-spin text-accent" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                {extracting && (
                  <p className="text-[10px] text-accent flex items-center gap-1">
                    <Sparkles size={10} /> Extracting values…
                  </p>
                )}
                {!extracting && !extractError && (
                  <p className="text-[10px] text-success font-medium">✓ Values filled from screenshot</p>
                )}
                {extractError && (
                  <p className="text-[10px] text-red-400">{extractError}</p>
                )}
                <button
                  type="button"
                  onClick={() => { setThumb(null); setExtractError(""); fileRef.current?.click(); }}
                  className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X size={10} /> Replace screenshot
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InitialAssessmentBlock({
  data,
  onChange,
  onScreenshotCapture,
}: {
  data: InitialAssessment;
  onChange: (key: keyof InitialAssessment, v: string) => void;
  onScreenshotCapture?: (file: File, label: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [extracting, setExtracting] = useState(false);
  const [thumb, setThumb] = useState<string | null>(null);
  const [extractError, setExtractError] = useState("");

  async function handleFile(file: File) {
    const url = URL.createObjectURL(file);
    setThumb(url);
    onScreenshotCapture?.(file, "Initial Assessment Screenshot");
    setExtractError("");
    setExtracting(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("screen_type", "initial_assessment");
      const res = await fetch("/api/extract", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Extraction failed");
      const d: Record<string, string> = json.data ?? {};
      const map: Partial<Record<keyof InitialAssessment, string>> = {
        laxityExtLat:      stripNum(d.laxityExtLat),
        laxityExtMed:      stripNum(d.laxityExtMed),
        laxityFlexLat:     stripNum(d.laxityFlexLat),
        laxityFlexMed:     stripNum(d.laxityFlexMed),
        nativeAlignment:   stripNum(d.deformityNative),
        nativeFlexion:     stripNum(d.flexion),
        correctedAlignment: stripNum(d.deformityCorrect),
        tibiaExtRot:       stripNum(d.tibiaExtRot),
      };
      (Object.keys(map) as (keyof InitialAssessment)[]).forEach((k) => {
        if (map[k]) onChange(k, map[k]!);
      });
    } catch (e) {
      setExtractError(e instanceof Error ? e.message : "Failed");
    } finally {
      setExtracting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <span className={SECTION_TITLE}>Initial Assessment</span>

      {/* Laxity */}
      <div>
        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Laxity (mm)</span>
        <div className="grid grid-cols-[68px_1fr_1fr] gap-x-2 mb-1">
          <div />
          <div className="text-center text-[8px] font-bold text-slate-500">Lat</div>
          <div className="text-center text-[8px] font-bold text-slate-500">Med</div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-[68px_1fr_1fr] gap-x-2 items-center">
            <span className="text-[8px] text-slate-600">Extension</span>
            <Cell value={data.laxityExtLat} onChange={(v) => onChange("laxityExtLat", v)} />
            <Cell value={data.laxityExtMed} onChange={(v) => onChange("laxityExtMed", v)} />
          </div>
          <div className="grid grid-cols-[68px_1fr_1fr] gap-x-2 items-center">
            <span className="text-[8px] text-slate-600">Flexion</span>
            <Cell value={data.laxityFlexLat} onChange={(v) => onChange("laxityFlexLat", v)} />
            <Cell value={data.laxityFlexMed} onChange={(v) => onChange("laxityFlexMed", v)} />
          </div>
        </div>
      </div>

      {/* Deformity */}
      <div>
        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Deformity</span>
        <div className="grid grid-cols-[68px_1fr_1fr] gap-x-2 mb-1">
          <div />
          <div className="text-center text-[8px] font-bold text-slate-500">Alignment</div>
          <div className="text-center text-[8px] font-bold text-slate-500">Flexion</div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-[68px_1fr_1fr] gap-x-2 items-center">
            <span className="text-[8px] text-slate-600">Native</span>
            <Cell value={data.nativeAlignment} onChange={(v) => onChange("nativeAlignment", v)} />
            <Cell value={data.nativeFlexion} onChange={(v) => onChange("nativeFlexion", v)} />
          </div>
          <div className="grid grid-cols-[68px_1fr_1fr] gap-x-2 items-center">
            <span className="text-[8px] text-slate-600">Corrected</span>
            <Cell value={data.correctedAlignment} onChange={(v) => onChange("correctedAlignment", v)} />
            <div />
          </div>
        </div>
      </div>

      {/* Tibia ext rot */}
      <div className="pt-2 border-t border-surface-700/40">
        <div className="grid grid-cols-[68px_1fr_1fr] gap-x-2 items-center">
          <span className="text-[8px] text-slate-600">Tibia Ext. Rot.</span>
          <Cell value={data.tibiaExtRot} onChange={(v) => onChange("tibiaExtRot", v)} />
          <div />
        </div>
      </div>

      {/* Extraction upload */}
      <div className="mt-1 pt-3 border-t border-surface-700/60">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
        />
        {!thumb ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-surface-500 text-slate-500 hover:border-accent/40 hover:text-accent/70 transition-all text-[11px] font-medium"
          >
            <ImagePlus size={13} /> Upload screenshot to auto-fill
          </button>
        ) : (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumb} alt="screenshot" className="w-20 h-12 object-cover rounded-lg border border-surface-600 shrink-0" />
            <div className="flex flex-col gap-1 min-w-0">
              {extracting && <p className="text-[10px] text-accent animate-pulse">Extracting…</p>}
              {!extracting && !extractError && <p className="text-[10px] text-success">Extracted ✓</p>}
              {extractError && <p className="text-[10px] text-red-400">{extractError}</p>}
              <button
                type="button"
                onClick={() => { setThumb(null); setExtractError(""); fileRef.current?.click(); }}
                className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors text-left"
              >
                Replace
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TrialBlock({
  data,
  onChange,
  onScreenshotCapture,
}: {
  data: TrialEntry;
  onChange: (key: keyof TrialEntry, v: string) => void;
  onScreenshotCapture?: (file: File, label: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [extracting, setExtracting] = useState(false);
  const [thumb, setThumb] = useState<string | null>(null);
  const [extractError, setExtractError] = useState("");

  async function handleFile(file: File) {
    const url = URL.createObjectURL(file);
    setThumb(url);
    onScreenshotCapture?.(file, "Trial Screenshot");
    setExtractError("");
    setExtracting(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("screen_type", "trial");
      const res = await fetch("/api/extract", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Extraction failed");
      const d: Record<string, string> = json.data ?? {};
      const map: Partial<Record<keyof TrialEntry, string>> = {
        insertSizeMm:      stripNum(d.polySize),
        laxityExtLat:      stripNum(d.laxityExtLat),
        laxityExtMed:      stripNum(d.laxityExtMed),
        laxityFlexLat:     stripNum(d.laxityFlexLat),
        laxityFlexMed:     stripNum(d.laxityFlexMed),
        nativeAlignment:   stripNum(d.deformityNative),
        nativeFlexion:     stripNum(d.finalFlexion),
        correctedAlignment: stripNum(d.deformityFinal),
        tibiaExtRot:       stripNum(d.tibiaExtRot),
      };
      (Object.keys(map) as (keyof TrialEntry)[]).forEach((k) => {
        if (map[k]) onChange(k, map[k]!);
      });
    } catch (e) {
      setExtractError(e instanceof Error ? e.message : "Failed");
    } finally {
      setExtracting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className={SECTION_TITLE}>Trial</span>
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={data.insertSizeMm}
            onChange={(e) => onChange("insertSizeMm", e.target.value)}
            className="w-10 px-1.5 py-1 rounded-md bg-surface-900 border border-accent/40 text-accent text-xs font-bold text-center focus:outline-none focus:border-accent/60 transition-all"
            placeholder="0"
          />
          <span className="text-[10px] text-slate-500">mm insert</span>
        </div>
      </div>

      {/* Laxity */}
      <div>
        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Laxity (mm)</span>
        <div className="grid grid-cols-[68px_1fr_1fr] gap-x-2 mb-1">
          <div />
          <div className="text-center text-[8px] font-bold text-slate-500">Lat</div>
          <div className="text-center text-[8px] font-bold text-slate-500">Med</div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-[68px_1fr_1fr] gap-x-2 items-center">
            <span className="text-[8px] text-slate-600">Extension</span>
            <Cell value={data.laxityExtLat} onChange={(v) => onChange("laxityExtLat", v)} />
            <Cell value={data.laxityExtMed} onChange={(v) => onChange("laxityExtMed", v)} />
          </div>
          <div className="grid grid-cols-[68px_1fr_1fr] gap-x-2 items-center">
            <span className="text-[8px] text-slate-600">Flexion</span>
            <Cell value={data.laxityFlexLat} onChange={(v) => onChange("laxityFlexLat", v)} />
            <Cell value={data.laxityFlexMed} onChange={(v) => onChange("laxityFlexMed", v)} />
          </div>
        </div>
      </div>

      {/* Deformity */}
      <div>
        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Deformity</span>
        <div className="grid grid-cols-[68px_1fr_1fr] gap-x-2 mb-1">
          <div />
          <div className="text-center text-[8px] font-bold text-slate-500">Alignment</div>
          <div className="text-center text-[8px] font-bold text-slate-500">Flexion</div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-[68px_1fr_1fr] gap-x-2 items-center">
            <span className="text-[8px] text-slate-600">Native</span>
            <Cell value={data.nativeAlignment} onChange={(v) => onChange("nativeAlignment", v)} />
            <Cell value={data.nativeFlexion} onChange={(v) => onChange("nativeFlexion", v)} />
          </div>
          <div className="grid grid-cols-[68px_1fr_1fr] gap-x-2 items-center">
            <span className="text-[8px] text-slate-600">Corrected</span>
            <Cell value={data.correctedAlignment} onChange={(v) => onChange("correctedAlignment", v)} />
            <div />
          </div>
        </div>
      </div>

      {/* Tibia ext rot */}
      <div className="pt-2 border-t border-surface-700/40">
        <div className="grid grid-cols-[68px_1fr_1fr] gap-x-2 items-center">
          <span className="text-[8px] text-slate-600">Tibia Ext. Rot.</span>
          <Cell value={data.tibiaExtRot} onChange={(v) => onChange("tibiaExtRot", v)} />
          <div />
        </div>
      </div>

      {/* Extraction upload */}
      <div className="mt-1 pt-3 border-t border-surface-700/60">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
        />
        {!thumb ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-surface-500 text-slate-500 hover:border-accent/40 hover:text-accent/70 transition-all text-[11px] font-medium"
          >
            <ImagePlus size={13} /> Upload screenshot to auto-fill
          </button>
        ) : (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumb} alt="screenshot" className="w-20 h-12 object-cover rounded-lg border border-surface-600 shrink-0" />
            <div className="flex flex-col gap-1 min-w-0">
              {extracting && <p className="text-[10px] text-accent animate-pulse">Extracting…</p>}
              {!extracting && !extractError && <p className="text-[10px] text-success">Extracted ✓</p>}
              {extractError && <p className="text-[10px] text-red-400">{extractError}</p>}
              <button
                type="button"
                onClick={() => { setThumb(null); setExtractError(""); fileRef.current?.click(); }}
                className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors text-left"
              >
                Replace
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const STEP_LABELS: Record<TimeLogKey, string> = {
  timeOut: "Time Out",
  pinsIncision: "Pins / Incision",
  boneRegFemur: "Bone Reg. Femur",
  boneRegTibia: "Bone Reg. Tibia",
  jointBal: "Joint Balance",
  bonePrepFemur: "Bone Prep Femur",
  bonePrepTibia: "Bone Prep Tibia",
  trial: "Trial",
  cement: "Cement",
  close: "Close",
  cp: "CP",
};

function parseMinutes(time: string): number | null {
  const m = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1]);
  const min = parseInt(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function calcDuration(a: string, b: string): string | null {
  const ma = parseMinutes(a);
  const mb = parseMinutes(b);
  if (ma === null || mb === null) return null;
  let diff = mb - ma;
  if (diff < 0) diff += 24 * 60;
  if (diff > 12 * 60) return null;
  if (diff >= 60) {
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }
  return `${diff}m`;
}

function nowHHmm(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function getDurationMins(a: string, b: string): number | null {
  const ma = parseMinutes(a);
  const mb = parseMinutes(b);
  if (ma === null || mb === null) return null;
  let diff = mb - ma;
  if (diff < 0) diff += 24 * 60;
  if (diff > 12 * 60) return null;
  return diff;
}

// ── Simple screenshot capture (no extraction) ─────────────────────────────────
function ScreenshotUpload({ label, onCapture }: {
  label: string;
  onCapture: (file: File, label: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [thumb, setThumb] = useState<string | null>(null);

  function handleFile(file: File) {
    setThumb(URL.createObjectURL(file));
    onCapture(file, label);
  }

  return (
    <div className="mt-3 pt-3 border-t border-surface-700/60">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
      {!thumb ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-surface-500 text-slate-500 hover:border-accent/40 hover:text-accent/70 transition-all text-[11px] font-medium"
        >
          <ImagePlus size={13} /> Upload screenshot
        </button>
      ) : (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb} alt="screenshot" className="w-20 h-12 object-cover rounded-lg border border-surface-600 shrink-0" />
          <button
            type="button"
            onClick={() => { setThumb(null); fileRef.current?.click(); }}
            className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
          >
            Replace
          </button>
        </div>
      )}
    </div>
  );
}

// ── Horizontal timeline connector ─────────────────────────────────────────────
function TimelineConnector({ connected, duration, flexGrow }: {
  connected: boolean; duration: string | null; flexGrow: number;
}) {
  const animKey = useRef(0);
  const wasConnected = useRef(false);
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (connected && !wasConnected.current) {
      animKey.current += 1;
      forceRender(n => n + 1);
    }
    wasConnected.current = connected;
  }, [connected]);

  return (
    <div className="flex flex-col pt-[6px]" style={{ flexGrow, minWidth: 14 }}>
      {/* line track */}
      <div className="w-full h-[2px] bg-surface-700/40 relative overflow-hidden">
        {connected && (
          <div
            key={animKey.current}
            className="absolute inset-0 bg-accent origin-left"
            style={{ animation: "growLine 0.55s cubic-bezier(0.4,0,0.2,1) both" }}
          />
        )}
      </div>
      {/* duration badge */}
      <div className="flex justify-center mt-1">
        {duration && (
          <span className="text-[7.5px] font-mono text-accent/70 bg-surface-800/80 px-1 py-0.5 rounded leading-none">
            {duration}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Timeline node ─────────────────────────────────────────────────────────────
function TimelineNode({ stepKey, entry, onNow, onClear, onTimeEdit, onStatusCycle }: {
  stepKey: TimeLogKey;
  entry: TimeLogEntry;
  onNow: () => void;
  onClear: () => void;
  onTimeEdit: (t: string) => void;
  onStatusCycle: () => void;
}) {
  const isRecorded = entry.status === "recorded";
  const isReview   = entry.status === "needs_review";
  const prevStatus = useRef(entry.status);
  const [dotKey, setDotKey] = useState(0);

  useEffect(() => {
    if (entry.status === "recorded" && prevStatus.current !== "recorded") {
      setDotKey(k => k + 1);
    }
    prevStatus.current = entry.status;
  }, [entry.status]);

  return (
    <div className="flex flex-col items-center w-[52px] shrink-0">
      {/* Status dot — tap to cycle */}
      <button
        type="button"
        onClick={onStatusCycle}
        title="Tap to toggle review flag"
        className="relative w-3.5 h-3.5 flex items-center justify-center focus:outline-none"
      >
        <div
          key={dotKey}
          className={`w-3.5 h-3.5 rounded-full border-2 transition-colors ${
            isRecorded ? "bg-accent border-accent shadow-[0_0_6px_rgba(56,189,248,0.6)]"
            : isReview  ? "bg-warning/20 border-warning"
            : "bg-surface-900 border-surface-600"
          }`}
          style={isRecorded && dotKey > 0
            ? { animation: "nodePop 0.4s ease-out both" }
            : undefined}
        />
        {isReview && (
          <span className="absolute -top-0.5 -right-0.5 text-[7px] text-warning leading-none">⚠</span>
        )}
      </button>

      {/* Step name */}
      <span className="text-[7px] text-slate-500 text-center mt-1 leading-tight px-0.5 h-6 overflow-hidden">
        {STEP_LABELS[stepKey]}
      </span>

      {/* Time input */}
      <input
        type="text"
        value={entry.time}
        onChange={(e) => onTimeEdit(e.target.value)}
        placeholder="--:--"
        maxLength={5}
        className={`mt-0.5 w-full text-center text-[10px] font-mono bg-transparent border-b focus:outline-none transition-colors px-0 ${
          isRecorded ? "text-accent border-accent/40 focus:border-accent"
          : "text-slate-500 border-surface-600 focus:border-slate-500"
        }`}
      />

      {/* Now button */}
      <button
        type="button"
        onClick={onNow}
        className="mt-1.5 w-full py-1 rounded-md text-[8px] font-bold bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 active:scale-95 transition-all"
      >
        Now
      </button>

      {/* Clear */}
      {entry.status !== "empty" && (
        <button
          type="button"
          onClick={onClear}
          className="mt-0.5 text-[7px] text-slate-600 hover:text-slate-400 transition-colors"
        >
          clear
        </button>
      )}
    </div>
  );
}

// ── Horizontal timeline (replaces vertical TimeLogSection) ────────────────────
const TIMELINE_ROW1 = TIME_LOG_KEYS.slice(0, 6);       // TimeOut → BonePrepFemur
const TIMELINE_ROW2 = TIME_LOG_KEYS.slice(6, -1);      // BonePrepTibia → CP (CP excluded)

function HorizontalTimeline({ data, onChange }: {
  data: TimeLogValues;
  onChange: (key: TimeLogKey, entry: TimeLogEntry) => void;
}) {
  // Total time: first → last recorded entry
  const recorded = TIME_LOG_KEYS.filter(k => data[k].status === "recorded" && data[k].time);
  const totalTime = recorded.length >= 2
    ? calcDuration(data[recorded[0]].time, data[recorded[recorded.length - 1]].time)
    : null;
  const pinEntry = data["pinsIncision"];
  const trialEntry = data["trial"];
  const roboticTime = (pinEntry.status === "recorded" && pinEntry.time && trialEntry.status === "recorded" && trialEntry.time)
    ? calcDuration(pinEntry.time, trialEntry.time)
    : null;

  function renderRow(keys: TimeLogKey[]) {
    return (
      <div className="flex items-start w-full">
        {keys.map((key, idx) => {
          const entry     = data[key];
          const prevKey   = idx > 0 ? keys[idx - 1] : null;
          const prevEntry = prevKey ? data[prevKey] : null;
          const durMins   = (prevEntry?.status === "recorded" && entry.status === "recorded")
            ? getDurationMins(prevEntry.time, entry.time) : null;
          const duration  = durMins !== null ? calcDuration(prevEntry!.time, entry.time) : null;

          return (
            <Fragment key={key}>
              {idx > 0 && (
                <TimelineConnector
                  connected={durMins !== null}
                  duration={duration}
                  flexGrow={Math.max(1, Math.min(durMins ?? 1, 60))}
                />
              )}
              <TimelineNode
                stepKey={key}
                entry={entry}
                onNow={() => onChange(key, { time: nowHHmm(), status: "recorded" })}
                onClear={() => onChange(key, { time: "", status: "empty" })}
                onTimeEdit={(t) => {
                  const cur = data[key];
                  const status: TimeLogStatus = t === "" ? "empty"
                    : cur.status === "empty" ? "needs_review" : cur.status;
                  onChange(key, { time: t, status });
                }}
                onStatusCycle={() => {
                  const cur = data[key];
                  if (cur.status === "empty") return;
                  const next: TimeLogStatus = cur.status === "recorded" ? "needs_review" : "recorded";
                  onChange(key, { ...cur, status: next });
                }}
              />
            </Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className={SECTION_TITLE}>Milestones</span>
          {totalTime && (
            <span className="text-[9px] font-mono text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full">
              Total&nbsp;{totalTime}
            </span>
          )}
          {roboticTime && (
            <span className="text-[9px] font-mono text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
              Robotic&nbsp;{roboticTime}
            </span>
          )}
        </div>
        <span className="text-[9px] text-slate-600">Tap dot · flag for review</span>
      </div>

      {/* Row 1 */}
      {renderRow(TIMELINE_ROW1)}

      {/* Divider */}
      <div className="border-t border-surface-700/40 my-4" />

      {/* Row 2 */}
      {renderRow(TIMELINE_ROW2)}

      {/* CP — standalone hardware-removal checkbox */}
      <div className="mt-4 pt-3 border-t border-surface-700/40 flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            const cur = data.cp;
            if (cur.status === "recorded") {
              onChange("cp", { time: "", status: "empty" });
            } else {
              onChange("cp", { time: nowHHmm(), status: "recorded" });
            }
          }}
          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
            data.cp.status === "recorded"
              ? "bg-accent border-accent"
              : "bg-surface-900 border-surface-600 hover:border-accent/50"
          }`}
        >
          {data.cp.status === "recorded" && (
            <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-surface-900" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1.5 5 4 7.5 8.5 2" />
            </svg>
          )}
        </button>
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold text-slate-400">Check Points (CP) confirmed removed from patient</span>
          {data.cp.status === "recorded" && data.cp.time && (
            <span className="text-[9px] font-mono text-accent/70">{data.cp.time}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export interface OperativeRecordFormProps {
  mps: string;
  onMpsChange: (v: string) => void;
  procedureVariant: string;
  onProcedureVariantChange: (v: string) => void;

  preOp: PlanningTable;
  onPreOpChange: (key: keyof PlanningTable, v: string) => void;
  preOpLoaded: boolean;

  intraOp: PlanningTable;
  onIntraOpChange: (key: keyof PlanningTable, v: string) => void;
  intraOpLoaded: boolean;

  timeLog: TimeLogValues;
  onTimeLogChange: (key: TimeLogKey, entry: TimeLogEntry) => void;

  initialAssessment: InitialAssessment;
  onInitialAssessmentChange: (key: keyof InitialAssessment, v: string) => void;

  trial1: TrialEntry;
  onTrial1Change: (key: keyof TrialEntry, v: string) => void;

  isMock: boolean;
  onScreenshotCapture?: (file: File, label: string) => void;
}

const VARIANTS = ["CR", "PS"];

export function OperativeRecordForm({
  mps,
  onMpsChange,
  procedureVariant,
  onProcedureVariantChange,
  preOp,
  onPreOpChange,
  preOpLoaded,
  intraOp,
  onIntraOpChange,
  intraOpLoaded,
  timeLog,
  onTimeLogChange,
  initialAssessment,
  onInitialAssessmentChange,
  trial1,
  onTrial1Change,
  isMock,
  onScreenshotCapture,
}: OperativeRecordFormProps) {
  return (
    <div className="flex flex-col gap-5">
      {isMock && (
        <div className="px-4 py-2.5 rounded-xl bg-warning/5 border border-warning/20 text-warning text-xs">
          Some fields contain mock data — review and correct before saving.
        </div>
      )}

      {/* MPS */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-surface-600 bg-surface-800/30">
        <span className={`${LABEL} shrink-0`}>MPS</span>
        <input
          type="text"
          value={mps}
          onChange={(e) => onMpsChange(e.target.value)}
          placeholder="e.g. Felipe"
          className={INPUT}
        />
      </div>

      {/* Milestones timeline — full width, above planning tables */}
      <div className="rounded-2xl border border-surface-600 bg-surface-800/30 px-4 pt-4 pb-5">
        <HorizontalTimeline data={timeLog} onChange={onTimeLogChange} />
      </div>

      {/* Planning tables */}
      <div className="flex gap-4">
        <PlanningTableSection
          title="Pre-OP"
          data={preOp}
          onChange={onPreOpChange}
          loaded={preOpLoaded}
          showExtract
          onScreenshotCapture={onScreenshotCapture}
        />
        <PlanningTableSection
          title="Intra-OP"
          data={intraOp}
          onChange={onIntraOpChange}
          loaded={intraOpLoaded}
          showExtract
          onScreenshotCapture={onScreenshotCapture}
        />
      </div>

      {/* ROM & Trial */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-surface-600 bg-surface-800/30 p-4">
          <InitialAssessmentBlock
            data={initialAssessment}
            onChange={onInitialAssessmentChange}
            onScreenshotCapture={onScreenshotCapture}
          />
        </div>
        <div className="rounded-2xl border border-surface-600 bg-surface-800/30 p-4">
          <TrialBlock
            data={trial1}
            onChange={onTrial1Change}
            onScreenshotCapture={onScreenshotCapture}
          />
        </div>
      </div>

    </div>
  );
}
