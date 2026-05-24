import type { PlanningValues, LaxityValues, ImplantData } from "./storage";

export const MOCK_PLANNING: PlanningValues = {
  femurSize: "5",
  tibiaSize: "4",
  polySize: "11",
  varusValgus: "4° varus",
  flexion: "7°",
  externalRotation: "5°",
  posteriorSlope: "1°",
  medialResection: "8 mm",
  lateralResection: "6 mm",
};

export const MOCK_LAXITY: LaxityValues = {
  extensionMedial: "1 mm",
  extensionLateral: "2 mm",
  flexionMedial: "3 mm",
  flexionLateral: "4 mm",
  nativeAlignment: "5° varus",
  finalAlignment: "0° neutral",
  maxFlexion: "125°",
};

export const MOCK_IMPLANT: ImplantData = {
  manufacturer: "Stryker",
  implantSystem: "Triathlon PS",
  femurComponent: "Triathlon Femoral Component",
  tibialComponent: "Triathlon Tibial Tray",
  polyInsert: "PS Tibial Insert",
  implantSize: "Size 5",
  ref: "TRI-FEM-05",
  lot: "2024011234",
  expiryDate: "2027-01",
};
