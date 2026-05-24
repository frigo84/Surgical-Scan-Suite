"use client";

import type { PlanningValues, LaxityValues, ImplantData } from "@/lib/storage";

const INPUT_CLS =
  "w-full px-3 py-2 rounded-xl bg-surface-800 border border-surface-600 text-slate-100 text-sm font-medium placeholder:text-slate-600 focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20 hover:border-surface-500 transition-all duration-150 caret-accent";

function ReviewField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1 group">
      <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider group-focus-within:text-accent transition-colors pl-0.5">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
        className={INPUT_CLS}
      />
    </div>
  );
}

function SectionHeader({
  label,
  isMock,
  isLoaded,
}: {
  label: string;
  isMock: boolean;
  isLoaded: boolean;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-2 h-2 rounded-full ${isLoaded ? "bg-success" : "bg-surface-500"}`} />
      <span className="text-xs font-semibold text-slate-300 uppercase tracking-widest">
        {label}
      </span>
      {isMock && isLoaded && (
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-md bg-warning/10 border border-warning/20 text-warning">
          Mock
        </span>
      )}
    </div>
  );
}

interface ExtractionReviewProps {
  planning: PlanningValues;
  laxity: LaxityValues;
  implant: ImplantData;
  onPlanningChange: (key: keyof PlanningValues, v: string) => void;
  onLaxityChange: (key: keyof LaxityValues, v: string) => void;
  onImplantChange: (key: keyof ImplantData, v: string) => void;
  isMock: boolean;
  planningLoaded: boolean;
  laxityLoaded: boolean;
  implantLoaded: boolean;
}

export function ExtractionReview({
  planning,
  laxity,
  implant,
  onPlanningChange,
  onLaxityChange,
  onImplantChange,
  isMock,
  planningLoaded,
  laxityLoaded,
  implantLoaded,
}: ExtractionReviewProps) {
  return (
    <div className="grid grid-cols-3 gap-5">
      <div className="rounded-2xl border border-surface-600 bg-surface-800/40 p-4">
        <SectionHeader label="Planning Values" isMock={isMock} isLoaded={planningLoaded} />
        <div className="flex flex-col gap-3">
          <ReviewField label="Femur Size" value={planning.femurSize} onChange={(v) => onPlanningChange("femurSize", v)} />
          <ReviewField label="Tibia Size" value={planning.tibiaSize} onChange={(v) => onPlanningChange("tibiaSize", v)} />
          <ReviewField label="Poly Size" value={planning.polySize} onChange={(v) => onPlanningChange("polySize", v)} />
          <ReviewField label="Varus / Valgus" value={planning.varusValgus} onChange={(v) => onPlanningChange("varusValgus", v)} />
          <ReviewField label="Flexion / Extension" value={planning.flexion} onChange={(v) => onPlanningChange("flexion", v)} />
          <ReviewField label="External Rotation" value={planning.externalRotation} onChange={(v) => onPlanningChange("externalRotation", v)} />
          <ReviewField label="Posterior Slope" value={planning.posteriorSlope} onChange={(v) => onPlanningChange("posteriorSlope", v)} />
          <ReviewField label="Medial Resection" value={planning.medialResection} onChange={(v) => onPlanningChange("medialResection", v)} />
          <ReviewField label="Lateral Resection" value={planning.lateralResection} onChange={(v) => onPlanningChange("lateralResection", v)} />
        </div>
      </div>

      <div className="rounded-2xl border border-surface-600 bg-surface-800/40 p-4">
        <SectionHeader label="Laxity Values" isMock={isMock} isLoaded={laxityLoaded} />
        <div className="flex flex-col gap-3">
          <ReviewField label="Extension Medial" value={laxity.extensionMedial} onChange={(v) => onLaxityChange("extensionMedial", v)} />
          <ReviewField label="Extension Lateral" value={laxity.extensionLateral} onChange={(v) => onLaxityChange("extensionLateral", v)} />
          <ReviewField label="Flexion Medial" value={laxity.flexionMedial} onChange={(v) => onLaxityChange("flexionMedial", v)} />
          <ReviewField label="Flexion Lateral" value={laxity.flexionLateral} onChange={(v) => onLaxityChange("flexionLateral", v)} />
          <ReviewField label="Native Alignment" value={laxity.nativeAlignment} onChange={(v) => onLaxityChange("nativeAlignment", v)} />
          <ReviewField label="Final Alignment" value={laxity.finalAlignment} onChange={(v) => onLaxityChange("finalAlignment", v)} />
          <ReviewField label="Max Flexion" value={laxity.maxFlexion} onChange={(v) => onLaxityChange("maxFlexion", v)} />
        </div>
      </div>

      <div className="rounded-2xl border border-surface-600 bg-surface-800/40 p-4">
        <SectionHeader label="Implant Data" isMock={isMock} isLoaded={implantLoaded} />
        <div className="flex flex-col gap-3">
          <ReviewField label="Manufacturer" value={implant.manufacturer} onChange={(v) => onImplantChange("manufacturer", v)} />
          <ReviewField label="Implant System" value={implant.implantSystem} onChange={(v) => onImplantChange("implantSystem", v)} />
          <ReviewField label="Femur Component" value={implant.femurComponent} onChange={(v) => onImplantChange("femurComponent", v)} />
          <ReviewField label="Tibial Component" value={implant.tibialComponent} onChange={(v) => onImplantChange("tibialComponent", v)} />
          <ReviewField label="Poly Insert" value={implant.polyInsert} onChange={(v) => onImplantChange("polyInsert", v)} />
          <ReviewField label="Size" value={implant.implantSize} onChange={(v) => onImplantChange("implantSize", v)} />
          <ReviewField label="REF" value={implant.ref} onChange={(v) => onImplantChange("ref", v)} />
          <ReviewField label="LOT" value={implant.lot} onChange={(v) => onImplantChange("lot", v)} />
          <ReviewField label="Expiry Date" value={implant.expiryDate} onChange={(v) => onImplantChange("expiryDate", v)} />
        </div>
      </div>
    </div>
  );
}
