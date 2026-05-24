import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { SimpleCaseInfo } from "@/app/cases/new/page";
import type {
  PlanningTable, InitialAssessment, TrialEntry, TimeLogValues, TimeLogKey,
} from "@/lib/storage";
import { TIME_LOG_KEYS } from "@/lib/storage";

export interface ScreenshotItem {
  id: string;
  file: File;
  preview: string;
  name: string;
}

// ── Colour palette ─────────────────────────────────────────────────────────────
const DARK   = [15,  23,  42]  as const;
const ACCENT = [56, 189, 248]  as const;
const MID    = [30,  41,  59]  as const;
const BORDER = [51,  65,  85]  as const;
const TEXT   = [226, 232, 240] as const;
const MUTED  = [100, 116, 139] as const;
const AMBER  = [251, 191,  36] as const;

const c3 = (...rgb: readonly [number, number, number]): [number, number, number] => [...rgb];

// ── Screenshot ordering ────────────────────────────────────────────────────────
const SCREENSHOT_ORDER = [
  "Pre-OP Screenshot",
  "Intra-OP Screenshot",
  "Initial Assessment Screenshot",
  "Trial Screenshot",
];

function sortScreenshots(shots: ScreenshotItem[]): ScreenshotItem[] {
  const pinned = SCREENSHOT_ORDER
    .map(label => shots.find(s => s.name === label))
    .filter((s): s is ScreenshotItem => s !== undefined);
  const extras = shots.filter(s => !SCREENSHOT_ORDER.includes(s.name));
  return [...pinned, ...extras];
}

// ── Timeline labels (compact) ─────────────────────────────────────────────────
const TL_LABELS: Record<string, string> = {
  timeOut:       "Time Out",
  pinsIncision:  "Pins/Inc.",
  boneRegFemur:  "BoneReg F.",
  boneRegTibia:  "BoneReg T.",
  jointBal:      "Joint Bal.",
  bonePrepFemur: "BonePrep F.",
  bonePrepTibia: "BonePrep T.",
  trial:         "Trial",
  cement:        "Cement",
  close:         "Close",
};

function parseMins(t: string): number | null {
  const m = t.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1]), min = parseInt(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function fmtDur(a: string, b: string): string | null {
  const ma = parseMins(a), mb = parseMins(b);
  if (ma === null || mb === null) return null;
  let d = mb - ma;
  if (d < 0) d += 24 * 60;
  if (d > 12 * 60) return null;
  if (d >= 60) return `${Math.floor(d / 60)}h${d % 60 ? ` ${d % 60}m` : ""}`;
  return `${d}m`;
}

async function imgToBase64(src: string): Promise<{ data: string; fmt: string } | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); img.src = src; });
    const cv = document.createElement("canvas");
    cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    cv.getContext("2d")!.drawImage(img, 0, 0);
    return { data: cv.toDataURL("image/jpeg", 0.88), fmt: "JPEG" };
  } catch { return null; }
}

export async function generateCasePDF(
  caseInfo: SimpleCaseInfo,
  mps: string,
  procedureVariant: string,
  preOp: PlanningTable,
  intraOp: PlanningTable,
  timeLog: TimeLogValues,
  initialAssessment: InitialAssessment,
  trial1: TrialEntry,
  screenshots: ScreenshotItem[],
): Promise<Blob> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, H = 297, M = 13;
  const CW = W - M * 2;
  const HALF = (CW - 4) / 2;

  const fillPage = () => { doc.setFillColor(...c3(...DARK)); doc.rect(0, 0, W, H, "F"); };

  function drawHeader(title: string) {
    fillPage();
    doc.setFillColor(...c3(...MID));
    doc.roundedRect(M, 8, CW, 16, 2, 2, "F");
    doc.setFontSize(13); doc.setFont("helvetica", "bold"); doc.setTextColor(...c3(...ACCENT));
    doc.text("AutoDoc", M + 4, 18);
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...c3(...MUTED));
    doc.text(title.toUpperCase(), M + 28, 18);
    doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(...c3(...ACCENT));
    doc.text(caseInfo.caseCode, W - M - 4, 18, { align: "right" });
  }

  function drawFooter(pg: number, total: number) {
    doc.setFillColor(...c3(...MID));
    doc.rect(0, H - 9, W, 9, "F");
    doc.setFontSize(6.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...c3(...MUTED));
    doc.text("AutoDoc · Robotic Knee Surgery · No patient data stored", M, H - 3.5);
    const ts = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    doc.text(`${ts}  ·  Page ${pg} of ${total}`, W - M, H - 3.5, { align: "right" });
  }

  function sectionHead(label: string, y: number): number {
    doc.setFillColor(...c3(...BORDER));
    doc.roundedRect(M, y, 3, 3.5, 0.5, 0.5, "F");
    doc.setFontSize(7.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...c3(...ACCENT));
    doc.text(label.toUpperCase(), M + 6, y + 2.8);
    return y + 7;
  }

  function planningTableData(pt: PlanningTable) {
    const v = (s: string) => s || "—";
    const medlat = (m: string, l: string) => (m || l) ? `M ${m || "—"} / L ${l || "—"}` : "—";
    return [
      ["Int. / Ax.",     v(pt.femurIntAx),   v(pt.tibiaIntAx)],
      ["Var. / Valg.",   v(pt.femurVarValg), v(pt.tibiaVarValg)],
      ["Ext. / Flex.",   v(pt.femurExtFlex), v(pt.tibiaSlope)],
      ["Size",           v(pt.femurSize),    v(pt.tibiaSize)],
      ["Cut Fem. Distal", medlat(pt.cutFemurDistalMed, pt.cutFemurDistalLat), ""],
      ["Cut Fem. Post.",  medlat(pt.cutFemurPostMed,   pt.cutFemurPostLat),   ""],
      ["Cut Tibia",      "",                  medlat(pt.cutTibiaMed, pt.cutTibiaLat)],
      ["PCA Int/Ext",    v(pt.cutPcaIntExt), ""],
    ];
  }

  function drawPlanningTable(label: string, startX: number, startY: number, pt: PlanningTable): number {
    autoTable(doc, {
      startY, margin: { left: startX }, tableWidth: HALF,
      head: [[{ content: label, colSpan: 3 }]],
      body: planningTableData(pt),
      theme: "plain",
      headStyles: { fillColor: c3(...BORDER), textColor: c3(...ACCENT), fontSize: 7.5, fontStyle: "bold", cellPadding: { top: 2, bottom: 2, left: 3, right: 3 } },
      styles: { fillColor: c3(...MID), textColor: c3(...TEXT), fontSize: 7.5, cellPadding: { top: 1.6, bottom: 1.6, left: 3, right: 3 } },
      columnStyles: {
        0: { textColor: c3(...MUTED), cellWidth: HALF * 0.38 },
        1: { fontStyle: "bold", cellWidth: HALF * 0.31 },
        2: { fontStyle: "bold", cellWidth: HALF * 0.31 },
      },
      tableLineColor: c3(...BORDER), tableLineWidth: 0.2,
    });
    return (doc as any).lastAutoTable.finalY as number;
  }

  // ── PDF Timeline ──────────────────────────────────────────────────────────────
  const TL_ROW1 = TIME_LOG_KEYS.slice(0, 6) as unknown as TimeLogKey[];
  const TL_ROW2 = TIME_LOG_KEYS.slice(6, 10) as unknown as TimeLogKey[];

  function drawTimelineRow(keys: TimeLogKey[], startY: number): number {
    const n = keys.length;
    const nodeY = startY + 7;

    for (let i = 0; i < n - 1; i++) {
      const x1 = M + (i / (n - 1)) * CW;
      const x2 = M + ((i + 1) / (n - 1)) * CW;
      const e1 = timeLog[keys[i]];
      const e2 = timeLog[keys[i + 1]];
      const bothRec = e1.status === "recorded" && e1.time && e2.status === "recorded" && e2.time;

      doc.setDrawColor(...c3(...BORDER)); doc.setLineWidth(0.3);
      doc.line(x1 + 2.4, nodeY, x2 - 2.4, nodeY);

      if (bothRec) {
        doc.setDrawColor(...c3(...ACCENT)); doc.setLineWidth(0.7);
        doc.line(x1 + 2.4, nodeY, x2 - 2.4, nodeY);
        if (e1.time && e2.time) {
          const dur = fmtDur(e1.time, e2.time);
          if (dur) {
            const mx = (x1 + x2) / 2;
            doc.setFontSize(4.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...c3(...ACCENT));
            doc.text(dur, mx, nodeY - 1.8, { align: "center" });
          }
        }
      }
    }

    for (let i = 0; i < n; i++) {
      const x = M + (i / Math.max(n - 1, 1)) * CW;
      const e = timeLog[keys[i]];
      const recorded = e.status === "recorded" && !!e.time;
      const review   = e.status === "needs_review";

      doc.setFontSize(5); doc.setFont("helvetica", "normal"); doc.setTextColor(...c3(...MUTED));
      doc.text(TL_LABELS[keys[i]] ?? keys[i], x, startY + 3, { align: "center" });

      if (recorded)     doc.setFillColor(...c3(...ACCENT));
      else if (review)  doc.setFillColor(251, 146, 60);
      else              doc.setFillColor(...c3(...BORDER));
      doc.circle(x, nodeY, 2, "F");

      if (e.time) {
        doc.setFontSize(5.5); doc.setFont("helvetica", "bold");
        if (recorded) doc.setTextColor(...c3(...ACCENT));
        else          doc.setTextColor(...c3(...MUTED));
        doc.text(e.time, x, nodeY + 4.5, { align: "center" });
      }
    }
    return nodeY + 7;
  }

  // ═══════════════════════════════════════════════════
  // PAGE 1 — Case info + timeline + extraction sections
  // ═══════════════════════════════════════════════════
  drawHeader("Operative Record");
  let y = 30;

  const sideLabel    = caseInfo.side ? caseInfo.side.charAt(0).toUpperCase() + caseInfo.side.slice(1) + " Knee" : "—";
  const implantLabel = caseInfo.implantType ? `Triathlon ${caseInfo.implantType}` : "—";
  const infoRows: string[][] = [
    ["Date",    caseInfo.procedureDate || "—", "Surgeon", caseInfo.surgeon || "—"],
    ["Side",    sideLabel,                      "Implant", implantLabel],
    ["Site",    caseInfo.site || "—",           "MPS",     mps || "—"],
  ];
  if (procedureVariant) infoRows.push(["Variant", procedureVariant, "", ""]);
  if (caseInfo.notes)   infoRows.push(["Notes",   caseInfo.notes,   "", ""]);

  autoTable(doc, {
    startY: y, margin: { left: M },
    body: infoRows, theme: "plain",
    styles: { fillColor: c3(...MID), textColor: c3(...TEXT), fontSize: 8, cellPadding: { top: 2, bottom: 2, left: 4, right: 4 } },
    columnStyles: {
      0: { textColor: c3(...MUTED), cellWidth: 26 },
      1: { fontStyle: "bold", cellWidth: CW / 2 - 26 },
      2: { textColor: c3(...MUTED), cellWidth: 26 },
      3: { fontStyle: "bold", cellWidth: CW / 2 - 26 },
    },
    tableLineColor: c3(...BORDER), tableLineWidth: 0.25,
  });
  y = (doc as any).lastAutoTable.finalY + 5;

  // ── Time badges ──────────────────────────────────────
  const tlRecorded = [...TIME_LOG_KEYS].filter(k => timeLog[k].status === "recorded" && timeLog[k].time);
  const totalTime  = tlRecorded.length >= 2
    ? fmtDur(timeLog[tlRecorded[0]].time, timeLog[tlRecorded[tlRecorded.length - 1]].time)
    : null;
  const pinEntry   = timeLog["pinsIncision"];
  const trEntry    = timeLog["trial"];
  const roboticTime = (pinEntry.status === "recorded" && pinEntry.time && trEntry.status === "recorded" && trEntry.time)
    ? fmtDur(pinEntry.time, trEntry.time)
    : null;

  y = sectionHead("Milestones", y);

  let badgeX = M;
  if (totalTime) {
    doc.setFillColor(...c3(...MID));
    doc.roundedRect(badgeX, y, 40, 5.5, 1, 1, "F");
    doc.setFontSize(6.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...c3(...ACCENT));
    doc.text(`Total: ${totalTime}`, badgeX + 20, y + 3.8, { align: "center" });
    badgeX += 43;
  }
  if (roboticTime) {
    doc.setFillColor(...c3(...MID));
    doc.roundedRect(badgeX, y, 48, 5.5, 1, 1, "F");
    doc.setFontSize(6.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...c3(...AMBER));
    doc.text(`Robotic: ${roboticTime}`, badgeX + 24, y + 3.8, { align: "center" });
    badgeX += 51;
  }
  const cpEntry = timeLog["cp"];
  if (cpEntry.status === "recorded") {
    doc.setFillColor(...c3(...MID));
    doc.roundedRect(W - M - 52, y, 52, 5.5, 1, 1, "F");
    doc.setFontSize(6.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...c3(...ACCENT));
    doc.text("✓ CP Confirmed Removed", W - M - 26, y + 3.8, { align: "center" });
  }
  y += 8;

  // Row 1
  const r1Bottom = drawTimelineRow(TL_ROW1, y);
  y = r1Bottom + 3;

  doc.setDrawColor(...c3(...BORDER)); doc.setLineWidth(0.2);
  doc.line(M, y, M + CW, y);
  y += 3;

  // Row 2
  const r2Bottom = drawTimelineRow(TL_ROW2, y);
  y = r2Bottom + 6;

  // ── Four extraction areas ─────────────────────────────
  y = sectionHead("Pre-OP & Intra-OP Planning", y);
  const preY   = drawPlanningTable("Pre-OP",   M,           y, preOp);
  const intraY = drawPlanningTable("Intra-OP", M + HALF + 4, y, intraOp);
  y = Math.max(preY, intraY) + 5;

  // ── Initial Assessment + Trial side by side ──────────
  const LEFT_W  = CW * 0.52;
  const RIGHT_W = CW - LEFT_W - 4;
  const trialX  = M + LEFT_W + 4;
  const v = (s: string) => s || "—";
  const ia = initialAssessment;
  const t  = trial1;

  // Shared section heading row
  doc.setFillColor(...c3(...BORDER));
  doc.roundedRect(M, y, 3, 3.5, 0.5, 0.5, "F");
  doc.setFontSize(7.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...c3(...ACCENT));
  doc.text("INITIAL ASSESSMENT", M + 6, y + 2.8);
  doc.text("TRIAL", trialX, y + 2.8);
  if (t.insertSizeMm) {
    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(...c3(...MUTED));
    doc.text(`${t.insertSizeMm} mm insert`, trialX + 14, y + 2.8);
  }
  y += 7;

  let iaY    = y;
  let trialY = y;

  // IA — Laxity
  doc.setFontSize(6); doc.setFont("helvetica", "bold"); doc.setTextColor(...c3(...MUTED));
  doc.text("LAXITY (mm)", M, iaY); iaY += 3.5;
  autoTable(doc, {
    startY: iaY, margin: { left: M }, tableWidth: LEFT_W,
    head: [["", "Lateral", "Medial"]],
    body: [
      ["Extension", v(ia.laxityExtLat), v(ia.laxityExtMed)],
      ["Flexion",   v(ia.laxityFlexLat), v(ia.laxityFlexMed)],
    ],
    theme: "plain",
    headStyles: { fillColor: c3(...BORDER), textColor: c3(...ACCENT), fontSize: 6.5, fontStyle: "bold", cellPadding: { top: 1.2, bottom: 1.2, left: 3, right: 3 } },
    styles: { fillColor: c3(...MID), textColor: c3(...TEXT), fontSize: 7.5, cellPadding: { top: 1.5, bottom: 1.5, left: 3, right: 3 } },
    columnStyles: {
      0: { textColor: c3(...MUTED), cellWidth: LEFT_W * 0.38 },
      1: { fontStyle: "bold", cellWidth: LEFT_W * 0.31 },
      2: { fontStyle: "bold", cellWidth: LEFT_W * 0.31 },
    },
    tableLineColor: c3(...BORDER), tableLineWidth: 0.2,
  });
  iaY = (doc as any).lastAutoTable.finalY + 3;

  // IA — Deformity
  doc.setFontSize(6); doc.setFont("helvetica", "bold"); doc.setTextColor(...c3(...MUTED));
  doc.text("DEFORMITY", M, iaY); iaY += 3.5;
  autoTable(doc, {
    startY: iaY, margin: { left: M }, tableWidth: LEFT_W,
    head: [["", "Alignment", "Flexion"]],
    body: [
      ["Native",    v(ia.nativeAlignment),   v(ia.nativeFlexion)],
      ["Corrected", v(ia.correctedAlignment), ""],
    ],
    theme: "plain",
    headStyles: { fillColor: c3(...BORDER), textColor: c3(...ACCENT), fontSize: 6.5, fontStyle: "bold", cellPadding: { top: 1.2, bottom: 1.2, left: 3, right: 3 } },
    styles: { fillColor: c3(...MID), textColor: c3(...TEXT), fontSize: 7.5, cellPadding: { top: 1.5, bottom: 1.5, left: 3, right: 3 } },
    columnStyles: {
      0: { textColor: c3(...MUTED), cellWidth: LEFT_W * 0.38 },
      1: { fontStyle: "bold", cellWidth: LEFT_W * 0.31 },
      2: { fontStyle: "bold", cellWidth: LEFT_W * 0.31 },
    },
    tableLineColor: c3(...BORDER), tableLineWidth: 0.2,
  });
  iaY = (doc as any).lastAutoTable.finalY + 2;
  autoTable(doc, {
    startY: iaY, margin: { left: M }, tableWidth: LEFT_W,
    body: [["Tibia Ext. Rotation", v(ia.tibiaExtRot)]],
    theme: "plain",
    styles: { fillColor: c3(...MID), textColor: c3(...TEXT), fontSize: 7.5, cellPadding: { top: 1.5, bottom: 1.5, left: 3, right: 3 } },
    columnStyles: {
      0: { textColor: c3(...MUTED), cellWidth: LEFT_W * 0.38 },
      1: { fontStyle: "bold", cellWidth: LEFT_W * 0.62 },
    },
    tableLineColor: c3(...BORDER), tableLineWidth: 0.2,
  });
  const iaEndY = (doc as any).lastAutoTable.finalY;

  // Trial — Laxity
  doc.setFontSize(6); doc.setFont("helvetica", "bold"); doc.setTextColor(...c3(...MUTED));
  doc.text("LAXITY (mm)", trialX, trialY); trialY += 3.5;
  autoTable(doc, {
    startY: trialY, margin: { left: trialX }, tableWidth: RIGHT_W,
    head: [["", "Lat", "Med"]],
    body: [
      ["Extension", v(t.laxityExtLat), v(t.laxityExtMed)],
      ["Flexion",   v(t.laxityFlexLat), v(t.laxityFlexMed)],
    ],
    theme: "plain",
    headStyles: { fillColor: c3(...BORDER), textColor: c3(...ACCENT), fontSize: 6.5, fontStyle: "bold", cellPadding: { top: 1.2, bottom: 1.2, left: 3, right: 3 } },
    styles: { fillColor: c3(...MID), textColor: c3(...TEXT), fontSize: 7.5, cellPadding: { top: 1.5, bottom: 1.5, left: 3, right: 3 } },
    columnStyles: {
      0: { textColor: c3(...MUTED), cellWidth: RIGHT_W * 0.38 },
      1: { fontStyle: "bold", cellWidth: RIGHT_W * 0.31 },
      2: { fontStyle: "bold", cellWidth: RIGHT_W * 0.31 },
    },
    tableLineColor: c3(...BORDER), tableLineWidth: 0.2,
  });
  trialY = (doc as any).lastAutoTable.finalY + 3;

  // Trial — Deformity
  doc.setFontSize(6); doc.setFont("helvetica", "bold"); doc.setTextColor(...c3(...MUTED));
  doc.text("DEFORMITY", trialX, trialY); trialY += 3.5;
  autoTable(doc, {
    startY: trialY, margin: { left: trialX }, tableWidth: RIGHT_W,
    head: [["", "Alignment", "Flexion"]],
    body: [
      ["Native",    v(t.nativeAlignment),   v(t.nativeFlexion)],
      ["Corrected", v(t.correctedAlignment), ""],
    ],
    theme: "plain",
    headStyles: { fillColor: c3(...BORDER), textColor: c3(...ACCENT), fontSize: 6.5, fontStyle: "bold", cellPadding: { top: 1.2, bottom: 1.2, left: 3, right: 3 } },
    styles: { fillColor: c3(...MID), textColor: c3(...TEXT), fontSize: 7.5, cellPadding: { top: 1.5, bottom: 1.5, left: 3, right: 3 } },
    columnStyles: {
      0: { textColor: c3(...MUTED), cellWidth: RIGHT_W * 0.38 },
      1: { fontStyle: "bold", cellWidth: RIGHT_W * 0.31 },
      2: { fontStyle: "bold", cellWidth: RIGHT_W * 0.31 },
    },
    tableLineColor: c3(...BORDER), tableLineWidth: 0.2,
  });
  trialY = (doc as any).lastAutoTable.finalY + 2;
  autoTable(doc, {
    startY: trialY, margin: { left: trialX }, tableWidth: RIGHT_W,
    body: [["Tibia Ext. Rotation", v(t.tibiaExtRot)]],
    theme: "plain",
    styles: { fillColor: c3(...MID), textColor: c3(...TEXT), fontSize: 7.5, cellPadding: { top: 1.5, bottom: 1.5, left: 3, right: 3 } },
    columnStyles: {
      0: { textColor: c3(...MUTED), cellWidth: RIGHT_W * 0.52 },
      1: { fontStyle: "bold", cellWidth: RIGHT_W * 0.48 },
    },
    tableLineColor: c3(...BORDER), tableLineWidth: 0.2,
  });
  const trialEndY = (doc as any).lastAutoTable.finalY;

  y = Math.max(iaEndY, trialEndY) + 4;

  // ═══════════════════════════════════════════════════
  // Screenshot pages — sorted: pre, intra, ia, trial, extras
  // ═══════════════════════════════════════════════════
  const sortedShots = sortScreenshots(screenshots);
  const totalPages  = 1 + sortedShots.length;

  doc.setPage(1); drawFooter(1, totalPages);

  for (let i = 0; i < sortedShots.length; i++) {
    const sc = sortedShots[i];
    doc.addPage();
    fillPage();

    doc.setFillColor(...c3(...MID));
    doc.roundedRect(M, 8, CW, 12, 2, 2, "F");
    doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(...c3(...ACCENT));
    doc.text("AutoDoc", M + 4, 15.5);
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...c3(...MUTED));
    doc.text(`Screenshot ${i + 1} of ${sortedShots.length}  ·  ${caseInfo.caseCode}`, M + 28, 15.5);
    doc.setTextColor(...c3(...TEXT));
    doc.text(sc.name.replace(/\.[^.]+$/, ""), W - M - 4, 15.5, { align: "right" });

    const imgTop = 24, imgBottom = H - 13;
    const maxImgH = imgBottom - imgTop, maxImgW = CW;

    const imgData = await imgToBase64(sc.preview);
    if (imgData) {
      const tmpImg = new Image();
      await new Promise<void>((res) => { tmpImg.onload = () => res(); tmpImg.src = imgData.data; });
      const nw = tmpImg.naturalWidth || 1920, nh = tmpImg.naturalHeight || 1080;
      const ratio = nw / nh;
      let iw = maxImgW, ih = iw / ratio;
      if (ih > maxImgH) { ih = maxImgH; iw = ih * ratio; }
      doc.addImage(imgData.data, "JPEG", M + (maxImgW - iw) / 2, imgTop + (maxImgH - ih) / 2, iw, ih, undefined, "MEDIUM");
    } else {
      doc.setFontSize(9); doc.setTextColor(...c3(...MUTED));
      doc.text("Image could not be loaded", W / 2, H / 2, { align: "center" });
    }

    drawFooter(1 + i + 1, totalPages);
  }

  return doc.output("blob");
}
