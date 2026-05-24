export interface PlanningValues {
  femurSize: string;
  tibiaSize: string;
  polySize: string;
  varusValgus: string;
  flexion: string;
  externalRotation: string;
  posteriorSlope: string;
  medialResection: string;
  lateralResection: string;
}

export interface LaxityValues {
  extensionMedial: string;
  extensionLateral: string;
  flexionMedial: string;
  flexionLateral: string;
  nativeAlignment: string;
  finalAlignment: string;
  maxFlexion: string;
}

export interface ImplantData {
  manufacturer: string;
  implantSystem: string;
  femurComponent: string;
  tibialComponent: string;
  polyInsert: string;
  implantSize: string;
  ref: string;
  lot: string;
  expiryDate: string;
}

export interface PlanningTable {
  femurIntAx: string;
  femurVarValg: string;
  femurExtFlex: string;
  femurSize: string;
  tibiaIntAx: string;
  tibiaVarValg: string;
  tibiaSlope: string;
  tibiaSize: string;
  cutFemurDistalMed: string;
  cutFemurDistalLat: string;
  cutFemurPostMed: string;
  cutFemurPostLat: string;
  cutTibiaMed: string;
  cutTibiaLat: string;
  cutPcaIntExt: string;
}

export interface InitialAssessment {
  laxityExtLat: string;
  laxityExtMed: string;
  laxityFlexLat: string;
  laxityFlexMed: string;
  nativeAlignment: string;
  nativeFlexion: string;
  correctedAlignment: string;
  tibiaExtRot: string;
}

export interface TrialEntry {
  insertSizeMm: string;
  laxityExtLat: string;
  laxityExtMed: string;
  laxityFlexLat: string;
  laxityFlexMed: string;
  nativeAlignment: string;
  nativeFlexion: string;
  correctedAlignment: string;
  tibiaExtRot: string;
}

export type TimeLogStatus = "empty" | "recorded" | "needs_review";

export interface TimeLogEntry {
  time: string;
  status: TimeLogStatus;
}

export const TIME_LOG_KEYS = [
  "timeOut",
  "pinsIncision",
  "boneRegFemur",
  "boneRegTibia",
  "jointBal",
  "bonePrepFemur",
  "bonePrepTibia",
  "trial",
  "cement",
  "close",
  "cp",
] as const;

export type TimeLogKey = (typeof TIME_LOG_KEYS)[number];

export type TimeLogValues = Record<TimeLogKey, TimeLogEntry>;

export interface ImplantSticker {
  description: string;
  ref: string;
  lot: string;
  expiry: string;
}

export interface StoredCase {
  id: string;
  caseCode: string;
  createdAt: string;

  procedureDate: string;
  surgeon: string;
  site: string;
  side: "left" | "right" | "";
  procedureType: string;
  implantSystem: string;
  caseNotes: string;

  planning: PlanningValues;
  laxity: LaxityValues;
  implant: ImplantData;

  mps?: string;
  procedureVariant?: string;
  preOp?: PlanningTable;
  intraOp?: PlanningTable;
  timeLog?: TimeLogValues;
  initialAssessment?: InitialAssessment;
  trial1?: TrialEntry;
  sticker1?: ImplantSticker;
  sticker2?: ImplantSticker;
  sticker3?: ImplantSticker;
}

const STORAGE_KEY = "autodoc_cases_v2";

export function loadCases(): StoredCase[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredCase[];
  } catch {
    return [];
  }
}

export function saveCase(data: Omit<StoredCase, "id" | "createdAt">): StoredCase {
  const cases = loadCases();
  const newCase: StoredCase = {
    ...data,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([newCase, ...cases]));
  return newCase;
}

export function deleteCase(id: string): void {
  const cases = loadCases().filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
}

export function generateCaseCode(): string {
  const year = new Date().getFullYear();
  const cases = loadCases();
  const seq = (cases.length + 1).toString().padStart(4, "0");
  return `AD-${year}-${seq}`;
}
