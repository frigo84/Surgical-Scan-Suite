"use client";

import { ClipboardList, RefreshCw, CheckCircle2, FlaskConical } from "lucide-react";

export interface ExtractionValues {
  screenType: string;
  femurSize: string;
  tibiaSize: string;
  polySize: string;
  flexion: string;
  varus: string;
  valgus: string;
  externalRotation: string;
  posteriorSlope: string;
}

interface ExtractionFormProps {
  values: ExtractionValues;
  notes: string;
  onChange: (key: keyof ExtractionValues, value: string) => void;
  onNotesChange: (value: string) => void;
  isLoading: boolean;
  isMock: boolean;
  onSave: () => void;
  isSaving: boolean;
  isSaved: boolean;
}

const FIELDS: { key: keyof ExtractionValues; label: string; unit?: string }[] = [
  { key: "screenType", label: "Screen Type" },
  { key: "femurSize", label: "Femur Size" },
  { key: "tibiaSize", label: "Tibia Size" },
  { key: "polySize", label: "Poly Size" },
  { key: "flexion", label: "Flexion", unit: "°" },
  { key: "varus", label: "Varus", unit: "°" },
  { key: "valgus", label: "Valgus", unit: "°" },
  { key: "externalRotation", label: "External Rotation", unit: "°" },
  { key: "posteriorSlope", label: "Posterior Slope", unit: "°" },
];

function SkeletonField() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="h-3 w-28 rounded bg-surface-600 animate-pulse" />
      <div className="h-10 rounded-xl bg-surface-700 animate-pulse" />
    </div>
  );
}

export function ExtractionForm({
  values,
  notes,
  onChange,
  onNotesChange,
  isLoading,
  isMock,
  onSave,
  isSaving,
  isSaved,
}: ExtractionFormProps) {
  const hasValues = Object.values(values).some((v) => v !== "");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full transition-colors duration-500 ${
              isLoading
                ? "bg-warning animate-pulse"
                : hasValues
                  ? "bg-success"
                  : "bg-surface-500"
            }`}
          />
          <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">
            Extracted Values
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isMock && hasValues && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-warning/10 border border-warning/20 text-warning text-[10px] font-medium">
              <FlaskConical size={10} />
              Mock data
            </div>
          )}
          {isLoading && (
            <div className="flex items-center gap-1.5 text-xs text-warning">
              <RefreshCw size={11} className="animate-spin" />
              <span>Processing</span>
            </div>
          )}
          {!isLoading && hasValues && !isSaved && (
            <span className="text-xs text-success font-medium">Ready</span>
          )}
          {isSaved && (
            <div className="flex items-center gap-1 text-xs text-accent font-medium">
              <CheckCircle2 size={11} />
              Saved
            </div>
          )}
        </div>
      </div>

      {!isLoading && !hasValues && (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 rounded-2xl border border-dashed border-surface-600 bg-surface-800/30 px-8">
          <div className="p-4 rounded-2xl bg-surface-700 border border-surface-600 text-slate-500">
            <ClipboardList size={26} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-400 mb-1">
              No data extracted yet
            </p>
            <p className="text-xs text-slate-600">
              Upload a screenshot and run extraction to populate values
            </p>
          </div>
        </div>
      )}

      {(isLoading || hasValues) && (
        <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto pr-1">
          {FIELDS.map(({ key, label, unit }) =>
            isLoading ? (
              <SkeletonField key={key} />
            ) : (
              <div key={key} className="flex flex-col gap-1.5 group">
                <label
                  htmlFor={key}
                  className="text-xs font-medium text-slate-400 group-focus-within:text-accent transition-colors pl-0.5 flex items-center gap-1"
                >
                  {label}
                  {unit && <span className="text-slate-600">{unit}</span>}
                </label>
                <input
                  id={key}
                  type="text"
                  value={values[key]}
                  onChange={(e) => onChange(key, e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-800 border border-surface-600 text-slate-100 text-sm font-medium
                    placeholder:text-slate-600
                    focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20
                    hover:border-surface-500 transition-all duration-150
                    caret-accent"
                  placeholder="—"
                />
              </div>
            )
          )}

          {!isLoading && (
            <div className="flex flex-col gap-1.5 group pt-1">
              <div className="flex items-center justify-between pl-0.5">
                <label
                  htmlFor="notes"
                  className="text-xs font-medium text-slate-400 group-focus-within:text-accent transition-colors"
                >
                  Surgical Notes
                </label>
                <span className="text-[10px] text-slate-600">Optional</span>
              </div>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Add observations, technique notes, or anything relevant…"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-800 border border-surface-600 text-slate-100 text-sm
                  placeholder:text-slate-600 placeholder:text-xs
                  focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20
                  hover:border-surface-500 transition-all duration-150
                  caret-accent resize-none leading-relaxed"
              />
            </div>
          )}
        </div>
      )}

      {hasValues && !isLoading && (
        <button
          onClick={onSave}
          disabled={isSaving || isSaved}
          className={`mt-4 shrink-0 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/30 ${
            isSaved
              ? "bg-success/10 border border-success/30 text-success cursor-default"
              : isSaving
                ? "bg-surface-700 border border-surface-600 text-slate-400 cursor-not-allowed"
                : "bg-accent text-surface-900 hover:bg-accent/90 shadow-[0_0_20px_rgba(56,189,248,0.2)] hover:shadow-[0_0_28px_rgba(56,189,248,0.3)] active:scale-[0.98]"
          }`}
        >
          {isSaved ? (
            <>
              <CheckCircle2 size={14} />
              Saved to Cases
            </>
          ) : isSaving ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <CheckCircle2 size={14} />
              Confirm &amp; Save
            </>
          )}
        </button>
      )}
    </div>
  );
}
