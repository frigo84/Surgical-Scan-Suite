"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  ChevronRight, ChevronLeft, FileDown, Mail, Upload, X,
  CheckCircle2, AlertCircle, Loader2,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { OperativeRecordForm } from "@/components/OperativeRecordForm";
import {
  saveCase,
  generateCaseCode,
  TIME_LOG_KEYS,
  type PlanningTable,
  type InitialAssessment,
  type TrialEntry,
  type TimeLogValues,
  type TimeLogEntry,
  type TimeLogKey,
} from "@/lib/storage";
import { generateCasePDF, type ScreenshotItem } from "@/lib/generatePDF";

type Step = 1 | 2;

export interface SimpleCaseInfo {
  caseCode: string;
  procedureDate: string;
  surgeon: string;
  site: string;
  side: "left" | "right" | "";
  implantType: "CR" | "PS" | "";
  notes: string;
}

const EMPTY_TABLE: PlanningTable = {
  femurIntAx: "", femurVarValg: "", femurExtFlex: "", femurSize: "",
  tibiaIntAx: "", tibiaVarValg: "", tibiaSlope: "", tibiaSize: "",
  cutFemurDistalMed: "", cutFemurDistalLat: "",
  cutFemurPostMed: "", cutFemurPostLat: "",
  cutTibiaMed: "", cutTibiaLat: "",
  cutPcaIntExt: "",
};
const EMPTY_ASSESSMENT: InitialAssessment = {
  laxityExtLat: "", laxityExtMed: "", laxityFlexLat: "", laxityFlexMed: "",
  nativeAlignment: "", nativeFlexion: "", correctedAlignment: "", tibiaExtRot: "",
};
const EMPTY_TRIAL: TrialEntry = {
  insertSizeMm: "",
  laxityExtLat: "", laxityExtMed: "", laxityFlexLat: "", laxityFlexMed: "",
  nativeAlignment: "", nativeFlexion: "", correctedAlignment: "", tibiaExtRot: "",
};
const EMPTY_TIME_LOG: TimeLogValues = Object.fromEntries(
  TIME_LOG_KEYS.map((k) => [k, { time: "", status: "empty" as const }])
) as TimeLogValues;

const STEP_LABELS = ["Operative Record", "Screenshots & PDF"];

const DRAFT_KEY = "autodoc_draft_v1";

function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="flex items-center shrink-0">
      {STEP_LABELS.map((label, i) => {
        const num = (i + 1) as Step;
        const active = step === num;
        const done = step > num;
        return (
          <div key={num} className="flex items-center">
            <div className="flex items-center gap-2 px-3 py-1.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                done ? "bg-success/20 border-success/40 text-success"
                  : active ? "bg-accent text-surface-900 border-accent shadow-[0_0_12px_rgba(56,189,248,0.3)]"
                  : "bg-surface-700 border-surface-600 text-slate-500"
              }`}>
                {done ? <CheckCircle2 size={12} /> : num}
              </div>
              <span className={`text-xs font-medium transition-colors ${
                active ? "text-slate-200" : done ? "text-slate-400" : "text-slate-600"
              }`}>{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <ChevronRight size={14} className="text-slate-700 mx-1" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function NewCasePage() {
  const [step, setStep] = useState<Step>(1);

  const [caseInfo, setCaseInfo] = useState<SimpleCaseInfo>({
    caseCode: "", procedureDate: "", surgeon: "", site: "", side: "", implantType: "", notes: "",
  });

  const [preOp, setPreOp] = useState<PlanningTable>(EMPTY_TABLE);
  const [intraOp, setIntraOp] = useState<PlanningTable>(EMPTY_TABLE);
  const [timeLog, setTimeLog] = useState<TimeLogValues>(EMPTY_TIME_LOG);
  const [initialAssessment, setInitialAssessment] = useState<InitialAssessment>(EMPTY_ASSESSMENT);
  const [trial1, setTrial1] = useState<TrialEntry>(EMPTY_TRIAL);
  const [mps, setMps] = useState("");
  const [procedureVariant, setProcedureVariant] = useState("");

  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfFilename, setPdfFilename] = useState("");
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfError, setPdfError] = useState("");

  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);

  // Restore draft or generate new case code on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.caseInfo) setCaseInfo(d.caseInfo);
        if (d.preOp) setPreOp(d.preOp);
        if (d.intraOp) setIntraOp(d.intraOp);
        if (d.timeLog) setTimeLog(d.timeLog);
        if (d.initialAssessment) setInitialAssessment({ ...EMPTY_ASSESSMENT, ...d.initialAssessment });
        if (d.trial1) setTrial1({ ...EMPTY_TRIAL, ...d.trial1 });
        if (d.mps !== undefined) setMps(d.mps);
        if (d.procedureVariant !== undefined) setProcedureVariant(d.procedureVariant);
        if (d.savedAt) setDraftSavedAt(new Date(d.savedAt));
        setDraftRestored(true);
        return;
      }
    } catch { /* corrupt draft — ignore */ }
    setCaseInfo((p) => ({ ...p, caseCode: generateCaseCode() }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save draft on every change (debounced 600ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const now = new Date();
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          caseInfo, mps, procedureVariant, preOp, intraOp,
          timeLog, initialAssessment, trial1,
          savedAt: now.toISOString(),
        }));
        setDraftSavedAt(now);
      } catch { /* storage full or unavailable */ }
    }, 600);
    return () => clearTimeout(timer);
  }, [caseInfo, mps, procedureVariant, preOp, intraOp, timeLog, initialAssessment, trial1]);

  const addScreenshots = useCallback((files: File[]) => {
    const items: ScreenshotItem[] = files
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => ({ id: Math.random().toString(36).slice(2), file: f, preview: URL.createObjectURL(f), name: f.name }));
    setScreenshots((prev) => [...prev, ...items]);
    setPdfBlob(null);
  }, []);

  const removeScreenshot = useCallback((id: string) => {
    setScreenshots((prev) => {
      const item = prev.find((s) => s.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((s) => s.id !== id);
    });
    setPdfBlob(null);
  }, []);

  const validateForm = () => {
    const errs: string[] = [];
    if (!caseInfo.procedureDate) errs.push("Procedure date is required");
    if (!caseInfo.surgeon.trim()) errs.push("Surgeon name is required");
    if (!caseInfo.side) errs.push("Side (Left / Right) is required");
    setFormErrors(errs);
    return errs.length === 0;
  };

  const goToStep2 = () => {
    if (validateForm()) setStep(2);
  };

  const handleSave = () => {
    if (!validateForm()) return;
    saveCase({
      caseCode: caseInfo.caseCode,
      procedureDate: caseInfo.procedureDate,
      surgeon: caseInfo.surgeon,
      site: caseInfo.site,
      side: caseInfo.side as "left" | "right",
      procedureType: caseInfo.implantType ? `${caseInfo.implantType} TKA` : "Robotic TKA",
      implantSystem: caseInfo.implantType === "CR" ? "Triathlon CR" : caseInfo.implantType === "PS" ? "Triathlon PS" : "",
      caseNotes: caseInfo.notes,
      planning: {
        femurSize: preOp.femurSize, tibiaSize: preOp.tibiaSize, polySize: trial1.insertSizeMm,
        varusValgus: preOp.femurVarValg, flexion: preOp.femurExtFlex, externalRotation: preOp.femurIntAx,
        posteriorSlope: preOp.tibiaSlope, medialResection: preOp.cutFemurDistalMed, lateralResection: preOp.cutTibiaMed,
      },
      laxity: {
        extensionMedial: initialAssessment.laxityExtMed, extensionLateral: initialAssessment.laxityExtLat,
        flexionMedial: initialAssessment.laxityFlexMed, flexionLateral: initialAssessment.laxityFlexLat,
        nativeAlignment: initialAssessment.nativeAlignment, finalAlignment: initialAssessment.correctedAlignment, maxFlexion: "",
      },
      implant: {
        manufacturer: "", implantSystem: caseInfo.implantType || "",
        femurComponent: "", tibialComponent: "",
        polyInsert: "", implantSize: "", ref: "", lot: "", expiryDate: "",
      },
      mps, procedureVariant, preOp, intraOp, timeLog, initialAssessment, trial1,
    });
    setSaveStatus("saved");
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    setDraftSavedAt(null);
    setDraftRestored(false);
  };

  const handleGeneratePDF = async () => {
    setPdfGenerating(true);
    setPdfError("");
    try {
      const blob = await generateCasePDF(caseInfo, mps, procedureVariant, preOp, intraOp, timeLog, initialAssessment, trial1, screenshots);
      const fname = `AutoDoc_${caseInfo.caseCode}_${caseInfo.procedureDate || "case"}.pdf`;
      setPdfBlob(blob);
      setPdfFilename(fname);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "Failed to generate PDF");
    } finally {
      setPdfGenerating(false);
    }
  };

  const downloadPDF = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = pdfFilename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const emailPDF = async () => {
    if (!pdfBlob) return;
    const file = new File([pdfBlob], pdfFilename, { type: "application/pdf" });
    if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `AutoDoc – ${caseInfo.caseCode}`,
          text: `AutoDoc operative record for case ${caseInfo.caseCode}.`,
        });
        return;
      } catch { /* fall through */ }
    }
    downloadPDF();
    const sub = encodeURIComponent(`AutoDoc Report – ${caseInfo.caseCode}`);
    const bod = encodeURIComponent(`Please find the AutoDoc operative record for case ${caseInfo.caseCode} attached (PDF downloaded to your device).`);
    window.open(`mailto:?subject=${sub}&body=${bod}`);
  };

  const info = (k: keyof SimpleCaseInfo, v: string) => {
    setCaseInfo((p) => ({ ...p, [k]: v }));
    setFormErrors([]);
    setSaveStatus("idle");
  };

  return (
    <div className="flex flex-col h-screen bg-surface-900 overflow-hidden">
      <Navbar />

      {/* ── top bar ── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-surface-700/40 shrink-0">
        <StepIndicator step={step} />

        <div className="flex items-center gap-3">
          {formErrors.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-red-400">
              <AlertCircle size={12} /> {formErrors[0]}
            </span>
          )}

          {/* Draft status indicator */}
          {step === 1 && saveStatus !== "saved" && draftSavedAt && (
            <span className="text-[10px] text-slate-600 font-mono tabular-nums select-none">
              {draftRestored ? "restored · " : ""}
              draft {draftSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}

          {step === 1 && (
            <>
              {saveStatus === "saved" ? (
                <span className="flex items-center gap-1.5 text-xs text-success font-medium">
                  <CheckCircle2 size={12} /> Saved
                </span>
              ) : (
                <button
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 border border-surface-600 hover:text-slate-200 hover:border-surface-500 transition-all"
                >
                  <CheckCircle2 size={14} /> Save
                </button>
              )}
              <button
                onClick={goToStep2}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-accent text-surface-900 hover:bg-accent/90 shadow-[0_0_16px_rgba(56,189,248,0.2)] active:scale-95 transition-all"
              >
                Screenshots & PDF <ChevronRight size={14} />
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button
                onClick={() => { setStep(1); setSaveStatus("idle"); }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 border border-surface-600 hover:text-slate-200 hover:border-surface-500 transition-all"
              >
                <ChevronLeft size={14} /> Back to form
              </button>
              {pdfBlob ? (
                <>
                  <button
                    onClick={downloadPDF}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 border border-surface-500 hover:text-white hover:border-accent/50 transition-all"
                  >
                    <FileDown size={14} /> Download PDF
                  </button>
                  <button
                    onClick={emailPDF}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-accent text-surface-900 hover:bg-accent/90 shadow-[0_0_16px_rgba(56,189,248,0.2)] transition-all"
                  >
                    <Mail size={14} /> Send by email
                  </button>
                </>
              ) : (
                <button
                  onClick={handleGeneratePDF}
                  disabled={pdfGenerating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-accent text-surface-900 hover:bg-accent/90 shadow-[0_0_16px_rgba(56,189,248,0.2)] active:scale-95 transition-all disabled:opacity-60"
                >
                  {pdfGenerating ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : <><FileDown size={14} /> Generate PDF</>}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-6 min-h-0">
        {/* ── STEP 1: Full form ── */}
        {step === 1 && (
          <div className="max-w-6xl mx-auto">
            {/* Compact case info row */}
            <div className="mb-6 p-4 rounded-2xl bg-surface-800 border border-surface-700/60 flex flex-wrap gap-x-5 gap-y-3 items-end">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Case</span>
                <span className="text-sm font-bold text-accent font-mono">{caseInfo.caseCode}</span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={caseInfo.procedureDate}
                  onChange={(e) => info("procedureDate", e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-surface-700 border border-surface-600 text-slate-200 text-sm focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20"
                />
              </div>

              <div className="flex flex-col gap-1" style={{ minWidth: 140 }}>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Surgeon <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={caseInfo.surgeon}
                  placeholder="Dr. Smith"
                  onChange={(e) => info("surgeon", e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-surface-700 border border-surface-600 text-slate-200 text-sm focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20 placeholder:text-slate-600"
                />
              </div>

              <div className="flex flex-col gap-1" style={{ minWidth: 140 }}>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Site / Hospital</label>
                <input
                  type="text"
                  value={caseInfo.site}
                  placeholder="Hospital name"
                  onChange={(e) => info("site", e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-surface-700 border border-surface-600 text-slate-200 text-sm focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20 placeholder:text-slate-600"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Side <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-1">
                  {(["left", "right"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => info("side", s)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize border transition-all ${
                        caseInfo.side === s
                          ? "bg-accent text-surface-900 border-accent"
                          : "bg-surface-700 border-surface-600 text-slate-400 hover:border-accent/40"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Implant</label>
                <div className="flex gap-1">
                  {(["CR", "PS"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => info("implantType", t)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-bold border transition-all ${
                        caseInfo.implantType === t
                          ? "bg-accent text-surface-900 border-accent"
                          : "bg-surface-700 border-surface-600 text-slate-400 hover:border-accent/40"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1 flex-1" style={{ minWidth: 160 }}>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Notes</label>
                <input
                  type="text"
                  value={caseInfo.notes}
                  placeholder="Optional notes"
                  onChange={(e) => info("notes", e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-surface-700 border border-surface-600 text-slate-200 text-sm focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20 placeholder:text-slate-600"
                />
              </div>
            </div>

            {formErrors.length > 0 && (
              <div className="mb-4 flex items-start gap-2 px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <ul className="flex flex-col gap-0.5">{formErrors.map((e) => <li key={e}>{e}</li>)}</ul>
              </div>
            )}

            <OperativeRecordForm
              mps={mps}
              onMpsChange={setMps}
              procedureVariant={procedureVariant}
              onProcedureVariantChange={setProcedureVariant}
              preOp={preOp}
              onPreOpChange={(k, v) => setPreOp((p) => ({ ...p, [k]: v }))}
              preOpLoaded={false}
              intraOp={intraOp}
              onIntraOpChange={(k, v) => setIntraOp((p) => ({ ...p, [k]: v }))}
              intraOpLoaded={false}
              timeLog={timeLog}
              onTimeLogChange={(k: TimeLogKey, entry: TimeLogEntry) => setTimeLog((t) => ({ ...t, [k]: entry }))}
              initialAssessment={initialAssessment}
              onInitialAssessmentChange={(k, v) => setInitialAssessment((r) => ({ ...r, [k]: v }))}
              trial1={trial1}
              onTrial1Change={(k, v) => setTrial1((t) => ({ ...t, [k]: v }))}
              isMock={false}
              onScreenshotCapture={(file, label) => {
                const item: ScreenshotItem = {
                  id: Math.random().toString(36).slice(2),
                  file,
                  preview: URL.createObjectURL(file),
                  name: label,
                };
                setScreenshots((prev) => [...prev, item]);
                setPdfBlob(null);
              }}
            />
          </div>
        )}

        {/* ── STEP 2: Screenshots & PDF ── */}
        {step === 2 && (
          <div className="max-w-3xl mx-auto">

            {/* Captured screenshots from form */}
            {screenshots.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Screenshots in PDF ({screenshots.length})
                  </span>
                  <span className="text-[10px] text-slate-600">PDF order: Pre-OP → Intra-OP → Initial Assessment → Trial → Extras</span>
                </div>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {screenshots.map((s) => (
                    <div key={s.id} className="relative group rounded-xl overflow-hidden bg-surface-800 border border-surface-700/60 aspect-video">
                      <img src={s.preview} alt={s.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={() => removeScreenshot(s.id)}
                          className="p-1.5 rounded-lg bg-red-500/80 text-white hover:bg-red-500 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <p className="absolute bottom-0 inset-x-0 text-[9px] text-slate-300 truncate px-1.5 py-1 bg-black/70">{s.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add extra screenshots */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Add extra screenshots</span>
                <span className="text-[10px] text-slate-600">Appended at the end of the PDF</span>
              </div>
              <div
                className={`flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                  isDragging
                    ? "border-accent/70 bg-accent/5"
                    : "border-surface-600 hover:border-accent/40 bg-surface-800/20"
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const files = Array.from(e.dataTransfer.files);
                  if (files.length) { addScreenshots(files); setPdfBlob(null); }
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className={`shrink-0 p-3 rounded-xl border transition-colors ${isDragging ? "bg-accent/10 border-accent/30 text-accent" : "bg-surface-700 border-surface-600 text-slate-400"}`}>
                  <Upload size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Drop files here or click to browse</p>
                  <p className="text-xs text-slate-500 mt-0.5">PNG · JPG · Multiple files supported</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="ml-auto shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-accent/30 text-accent bg-accent/5 hover:bg-accent/10 transition-all"
                >
                  <Upload size={12} /> Add Screenshot
                </button>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) { addScreenshots(files); setPdfBlob(null); }
                e.target.value = "";
              }}
            />

            {pdfError && (
              <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle size={14} /> {pdfError}
              </div>
            )}

            {/* Generate / Download / Email */}
            {pdfBlob ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={downloadPDF}
                  className="flex-1 inline-flex items-center justify-center gap-3 px-6 py-5 rounded-2xl text-base font-semibold border border-accent/40 text-accent bg-accent/5 hover:bg-accent/10 transition-all"
                >
                  <FileDown size={20} /> Download PDF
                </button>
                <button
                  onClick={emailPDF}
                  className="flex-1 inline-flex items-center justify-center gap-3 px-6 py-5 rounded-2xl text-base font-semibold bg-accent text-surface-900 hover:bg-accent/90 shadow-[0_0_24px_rgba(56,189,248,0.2)] transition-all"
                >
                  <Mail size={20} /> Send by email
                </button>
              </div>
            ) : (
              <div className="flex justify-center">
                <button
                  onClick={handleGeneratePDF}
                  disabled={pdfGenerating}
                  className="inline-flex items-center gap-3 px-12 py-5 rounded-2xl text-base font-bold bg-accent text-surface-900 hover:bg-accent/90 shadow-[0_0_28px_rgba(56,189,248,0.25)] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {pdfGenerating
                    ? <><Loader2 size={20} className="animate-spin" /> Generating PDF…</>
                    : <><FileDown size={20} /> Generate PDF</>}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="px-6 py-2.5 border-t border-surface-700/40 shrink-0">
        <p className="text-[10px] text-slate-600 text-center uppercase tracking-widest">
          AutoDoc · Robotic Knee Surgery · {caseInfo.caseCode} · No patient data stored
        </p>
      </footer>
    </div>
  );
}
