"use client";

interface CaseInfo {
  caseCode: string;
  procedureDate: string;
  surgeon: string;
  site: string;
  side: "left" | "right" | "";
  procedureType: string;
  implantSystem: string;
  caseNotes: string;
}

interface CaseInfoFormProps {
  values: CaseInfo;
  onChange: (key: keyof CaseInfo, value: string) => void;
  errors: Partial<Record<keyof CaseInfo, string>>;
}

export type { CaseInfo };

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-slate-400 pl-0.5 flex items-center gap-1.5">
        {label}
        {required && <span className="text-red-400 text-[10px]">required</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-red-400 pl-0.5">{error}</p>}
    </div>
  );
}

const INPUT_CLS =
  "w-full px-3.5 py-2.5 rounded-xl bg-surface-800 border border-surface-600 text-slate-100 text-sm font-medium placeholder:text-slate-600 focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20 hover:border-surface-500 transition-all duration-150 caret-accent";

export function CaseInfoForm({ values, onChange, errors }: CaseInfoFormProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-accent/5 border border-accent/15">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">
            Case Code
          </span>
          <span className="text-lg font-bold text-accent tracking-wide font-mono">
            {values.caseCode}
          </span>
        </div>
        <span className="text-xs text-slate-600 ml-2">
          Auto-generated · Anonymous · No patient identifiers
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Procedure Date" required error={errors.procedureDate}>
          <input
            type="date"
            value={values.procedureDate}
            onChange={(e) => onChange("procedureDate", e.target.value)}
            className={INPUT_CLS}
          />
        </Field>

        <Field label="Surgeon" required error={errors.surgeon}>
          <input
            type="text"
            value={values.surgeon}
            onChange={(e) => onChange("surgeon", e.target.value)}
            placeholder="e.g. Dr. Smith"
            className={INPUT_CLS}
          />
        </Field>

        <Field label="Site / Hospital" error={errors.site}>
          <input
            type="text"
            value={values.site}
            onChange={(e) => onChange("site", e.target.value)}
            placeholder="e.g. St. Mary's Medical Center"
            className={INPUT_CLS}
          />
        </Field>

        <Field label="Side" required error={errors.side}>
          <div className="flex gap-2">
            {(["left", "right"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChange("side", s)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all duration-150 border ${
                  values.side === s
                    ? "bg-accent text-surface-900 border-accent shadow-[0_0_12px_rgba(56,189,248,0.2)]"
                    : "bg-surface-800 text-slate-400 border-surface-600 hover:border-surface-500 hover:text-slate-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Procedure Type">
          <input
            type="text"
            value={values.procedureType}
            onChange={(e) => onChange("procedureType", e.target.value)}
            placeholder="Robotic TKA"
            className={INPUT_CLS}
          />
        </Field>

        <Field label="Implant System">
          <input
            type="text"
            value={values.implantSystem}
            onChange={(e) => onChange("implantSystem", e.target.value)}
            placeholder="Triathlon PS"
            className={INPUT_CLS}
          />
        </Field>
      </div>

      <Field label="Notes">
        <textarea
          rows={3}
          value={values.caseNotes}
          onChange={(e) => onChange("caseNotes", e.target.value)}
          placeholder="Optional case notes, observations, or technique comments…"
          className={`${INPUT_CLS} resize-none leading-relaxed`}
        />
      </Field>
    </div>
  );
}
