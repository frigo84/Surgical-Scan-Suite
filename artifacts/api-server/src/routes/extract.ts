import { Router, type IRouter } from "express";
import multer from "multer";
import OpenAI from "openai";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface PromptConfig {
  system: string;
  user: string;
}

const PROMPTS: Record<string, PromptConfig> = {
  // ─── Plan & Anatomy (Plan0/Plan1 tab with Component Planning + Anatomical Info) ───
  preop: {
    system: `You are a medical data extraction assistant for robotic knee surgery (MAKO system).
This is the "Plan & Anatomy" screen showing Component Planning (left panel) and Anatomical Information (right panel).
Extract values and return ONLY a valid JSON object with exactly these keys:
- femurSize: femoral component size number (e.g. "6")
- tibiaSize: baseplate/tibial component size number (e.g. "6")
- insertSize: insert/poly size in mm (e.g. "9")
- sawblade: sawblade type (e.g. "Narrow", "Standard")
- planName: selected plan name (e.g. "Plan0", "Plan1")
- plannedAlignment: planned overall alignment (e.g. "1.0° valgus")
- femurRotCoronal: femoral coronal rotation (e.g. "1.0° valgus")
- femurRotTransverse: femoral transverse rotation (e.g. "1.5° internal")
- femurRotSagittal: femoral sagittal rotation (e.g. "5.0° flexion")
- tibiaRotCoronal: tibial coronal rotation (e.g. "0.0° varus")
- tibiaRotTransverse: tibial transverse rotation (e.g. "0.0° external")
- tibiaSlope: tibial sagittal posterior slope (e.g. "3.0° p.slope")
- femurResDistalLat: femur distal resection lateral (e.g. "4.5 mm")
- femurResDistalMed: femur distal resection medial (e.g. "9.0 mm")
- femurResPostLat: femur posterior resection lateral (e.g. "6.0 mm")
- femurResPostMed: femur posterior resection medial (e.g. "8.5 mm")
- tibiaResProxLat: tibia proximal resection lateral (e.g. "5.5 mm")
- tibiaResProxMed: tibia proximal resection medial (e.g. "4.0 mm")
- plannedLaxityExtLat: planned laxity extension lateral (e.g. "0.0 mm")
- plannedLaxityExtMed: planned laxity extension medial (e.g. "0.0 mm")
- plannedLaxityFlexLat: planned laxity flexion lateral (e.g. "1.0 mm")
- plannedLaxityFlexMed: planned laxity flexion medial (e.g. "1.0 mm")
- ldfa: LDFA angle (e.g. "85.1°")
- mpta: MPTA angle (e.g. "88.3°")
- ahka: aHKA angle (e.g. "3.2° valgus")
- jlo: JLO angle (e.g. "173.4°")
- femurJLA: Femur JLA (e.g. "4.9° valgus")
- tibiaJLA: Tibia JLA (e.g. "1.7° varus")
Rules: Include units. Use "" for any value not visible. Return only the JSON, no markdown.`,
    user: "Extract all Component Planning and Anatomical Information values from this MAKO Plan & Anatomy screenshot.",
  },

  // ─── Initial Assessment (laxity capture before bone cuts) ───
  initial_assessment: {
    system: `You are a medical data extraction assistant for robotic knee surgery (MAKO system).
This is the Initial Assessment screen — it shows laxity gaps and deformity before any bone cuts.
It may appear as a 3D bone model view OR as CT cross-section views labeled "Initial Assessment Laxity".
Extract values and return ONLY a valid JSON object with exactly these keys:
- valgus: overall valgus angle shown at top (e.g. "1.0°")
- flexion: overall flexion angle shown at top (e.g. "6°")
- laxityExtMed: extension laxity medial in mm (e.g. "0.0mm")
- laxityExtLat: extension laxity lateral in mm (e.g. "0.0mm")
- laxityFlexMed: flexion laxity medial in mm (e.g. "1.0mm")
- laxityFlexLat: flexion laxity lateral in mm (e.g. "1.0mm")
- deformityNative: native deformity (e.g. "4.0° val", "8.5° var")
- deformityCorrect: corrected deformity target (e.g. "1.0° val")
- tibiaExtRot: tibia external rotation in degrees (e.g. "5°")
Rules: Include units. Use "" for any value not visible. Return only the JSON, no markdown.`,
    user: "Extract all Initial Assessment laxity and deformity values from this MAKO screenshot.",
  },

  // ─── Intra-Op Implant Planning (CT views with cut depths + implant panel) ───
  intraop: {
    system: `You are a medical data extraction assistant for robotic knee surgery (MAKO system).
This is the Intra-Op Implant Planning screen — it shows CT cross-section views (coronal femur, axial tibia, sagittal) with colored implant overlays, alignment values at the top, cut depth values in mm boxes below each CT view, and an Implant Planning panel on the right.
Extract values and return ONLY a valid JSON object with exactly these keys:
- valgusAA: anatomical axis valgus at top-left (e.g. "8.1°")
- valgusMa: mechanical axis valgus at top-left (e.g. "1.5°")
- pcaExternal: PCA external rotation (e.g. "2.4°")
- teaInternal: TEA internal or external rotation (e.g. "1.5°")
- flexion: flexion angle at top (e.g. "6.0°")
- femurCutDistalMed: femur distal cut medial in mm (from left coronal view, M value top row, e.g. "6.0mm")
- femurCutDistalLat: femur distal cut lateral in mm (from left coronal view, L value top row, e.g. "6.0mm")
- femurCutPostMed: femur posterior cut medial in mm (from left coronal view, M value bottom row, e.g. "6.0mm")
- femurCutPostLat: femur posterior cut lateral in mm (from left coronal view, L value bottom row, e.g. "5.5mm")
- tibiaCutMed: tibia proximal cut medial in mm (from middle axial view, M value, e.g. "7.0mm")
- tibiaCutLat: tibia proximal cut lateral in mm (from middle axial view, L value, e.g. "5.0mm")
- varusBase: varus value shown at bottom-left (e.g. "4.0°")
- apExternal: AP external rotation at bottom-middle (e.g. "0.0°")
- pSlope: posterior slope at bottom-right (e.g. "1.0°")
- implantSystem: full implant system name from right panel (e.g. "Triathlon PS Saw Primary", "Triathlon CR Primary")
- femurSize: femur size from right panel (e.g. "5")
- tibiaSize: tibia size from right panel (e.g. "4")
- polySize: poly/insert size from right panel (e.g. "9")
- planName: plan name (e.g. "Plan0", "Plan1")
Rules: Include units where applicable. Use "" for any value not visible. Return only the JSON, no markdown.`,
    user: "Extract all intraoperative implant planning values including cut depths and implant sizes from this MAKO screenshot.",
  },

  // ─── Trialing (post-cut trial with final gaps) ───
  trial: {
    system: `You are a medical data extraction assistant for robotic knee surgery (MAKO system).
This is the Trialing screen — it shows a 3D bone model with trial components in place, laxity gaps at the bottom, deformity values, and alignment. The right panel shows poly size and planned sizes.
Extract values and return ONLY a valid JSON object with exactly these keys:
- polySize: poly/insert size from right panel (e.g. "11")
- constitutionalVarus: constitutional varus at top-left (e.g. "3.4°")
- varus: varus shown at top-center (e.g. "9.0°")
- flexion: flexion shown at top-right (e.g. "82°")
- laxityExtMed: extension laxity medial (M value, e.g. "0.5mm")
- laxityExtLat: extension laxity lateral (L value, e.g. "2.0mm")
- laxityFlexMed: flexion laxity medial (M value, e.g. "1.5mm")
- laxityFlexLat: flexion laxity lateral (L value, e.g. "1.0mm")
- deformityNative: native deformity (e.g. "8.5° var")
- deformityFinal: final deformity (e.g. "4.0° var")
- alignmentValue: alignment value (e.g. "4°")
- alignmentDir: alignment direction (e.g. "ext", "flx", "val", "var")
- finalFlexion: final flexion angle (e.g. "5°")
- plannedFemurSize: planned femur size from right panel text (e.g. "5")
- plannedBaseplateSize: planned baseplate size from right panel text (e.g. "4")
Rules: Include units. Use "" for any value not visible. Return only the JSON, no markdown.`,
    user: "Extract all trialing values including laxity gaps, deformity, alignment, and implant sizes from this MAKO screenshot.",
  },

  laxity: {
    system: `You are a medical data extraction assistant for robotic knee surgery (MAKO system).
Extract balancing and laxity values from this screenshot. Return ONLY a valid JSON object with exactly these keys:
- extensionMedial: medial laxity in extension (e.g. "1mm")
- extensionLateral: lateral laxity in extension (e.g. "2mm")
- flexionMedial: medial laxity in flexion (e.g. "3mm")
- flexionLateral: lateral laxity in flexion (e.g. "4mm")
- nativeAlignment: native/preoperative alignment (e.g. "5° varus")
- finalAlignment: final postoperative alignment (e.g. "0° neutral")
- maxFlexion: maximum flexion achieved (e.g. "125°")
Rules: Include units where applicable. Use "" for any value not visible. Return only the JSON, no markdown.`,
    user: "Extract all balancing and laxity values from this MAKO screenshot.",
  },

  alignment: {
    system: `You are a medical data extraction assistant for robotic knee surgery (MAKO system).
Extract final alignment values from this screenshot. Return ONLY a valid JSON object with exactly these keys:
- finalMechanicalAxis: final mechanical axis measurement
- componentAlignment: overall component alignment description
- tibialComponentSlope: final tibial component slope
- femurComponentFlexion: femoral component flexion angle
- finalVarusValgus: final varus/valgus alignment
- alignmentNotes: any other notable final alignment values visible
Rules: Include units where applicable. Use "" for any value not visible. Return only the JSON, no markdown.`,
    user: "Extract all final alignment values from this MAKO screenshot.",
  },

  implant_label: {
    system: `You are a medical data extraction assistant for robotic knee surgery.
Extract implant label data from this photo. Return ONLY a valid JSON object with exactly these keys:
- manufacturer: implant manufacturer name (e.g. "Stryker")
- implantSystem: implant system or product line (e.g. "Triathlon PS")
- femurComponent: femoral component name/description
- tibialComponent: tibial component name/description
- polyInsert: poly insert/liner name/description
- implantSize: component size designation
- ref: REF number (catalog/reference number)
- lot: LOT number (batch/lot number)
- expiryDate: expiry or use-by date
Rules: Use "" for any value not visible or legible. Return only the JSON, no markdown.`,
    user: "Extract all implant label data from this photo of an implant label or packaging.",
  },

  auto: {
    system: `You are a medical data extraction assistant for robotic knee surgery (MAKO/Stryker system).
Analyze this image and classify it as exactly one of these screen types, then extract the relevant fields.

SCREEN TYPE GUIDE:
- preop: "Plan & Anatomy" tab — tabbed sidebar interface with "Component Planning" and "Anatomical Information" panels side by side. Shows sizes, sawblade type, femoral/tibial rotations, distal/posterior/proximal resection values in mm, planned alignment, LDFA/MPTA/aHKA angles.
- initial_assessment: Initial Assessment screen — 3D bone model OR CT cross-sections labeled "Initial Assessment Laxity". Shows Extension/Flexion laxity (L and M values in mm) and Native/Corrected deformity. Has "Add Tensioning" button and "Initial Assessment" label.
- intraop: Intra-Op Implant Planning screen — CT cross-section views (coronal femur, axial tibia, sagittal) with pink/blue colored implant overlays. Shows Valgus AA/MA, PCA External, TEA Internal, Flexion at top. Cut depth boxes in mm below CT views. Right panel: "Implant Planning" with Femur/Tibia/Poly sizes.
- trial: Trialing screen — 3D bone model with grey trial components visible. Shows "Trialing" label. Bottom table: Laxity Extension/Flexion M/L values and Deformity Native/Final. Right panel: Poly size. Top: Constitutional Varus, Varus, Flexion.
- laxity: Balancing/laxity screen showing extension/flexion medial and lateral gap values in mm.
- alignment: Final alignment or case completion screen confirming surgical outcome.
- implant_label: Photo of implant packaging or label sticker showing REF, LOT, expiry.
- operative_record: Photo of a paper surgical case form/record sheet.

STEP 2 — EXTRACT fields based on the classified type:

For "preop": { femurSize, tibiaSize, insertSize, sawblade, planName, plannedAlignment, femurRotCoronal, femurRotTransverse, femurRotSagittal, tibiaRotCoronal, tibiaRotTransverse, tibiaSlope, femurResDistalLat, femurResDistalMed, femurResPostLat, femurResPostMed, tibiaResProxLat, tibiaResProxMed, plannedLaxityExtLat, plannedLaxityExtMed, plannedLaxityFlexLat, plannedLaxityFlexMed, ldfa, mpta, ahka, jlo, femurJLA, tibiaJLA }
For "initial_assessment": { valgus, flexion, laxityExtMed, laxityExtLat, laxityFlexMed, laxityFlexLat, deformityNative, deformityCorrect, tibiaExtRot }
For "intraop": { valgusAA, valgusMa, pcaExternal, teaInternal, flexion, femurCutDistalMed, femurCutDistalLat, femurCutPostMed, femurCutPostLat, tibiaCutMed, tibiaCutLat, varusBase, apExternal, pSlope, implantSystem, femurSize, tibiaSize, polySize, planName }
For "trial": { polySize, constitutionalVarus, varus, flexion, laxityExtMed, laxityExtLat, laxityFlexMed, laxityFlexLat, deformityNative, deformityFinal, alignmentValue, alignmentDir, finalFlexion, plannedFemurSize, plannedBaseplateSize }
For "laxity": { extensionMedial, extensionLateral, flexionMedial, flexionLateral, nativeAlignment, finalAlignment, maxFlexion }
For "alignment": { finalMechanicalAxis, componentAlignment, tibialComponentSlope, femurComponentFlexion, finalVarusValgus, alignmentNotes }
For "implant_label": { manufacturer, implantSystem, femurComponent, tibialComponent, polyInsert, implantSize, ref, lot, expiryDate }
For "operative_record": {
  caseDate, caseSurgeon, caseHospital, caseSide, caseProcedureType,
  femurSize, tibiaSize, polySize, varusValgus, flexion, posteriorSlope,
  medialResection, lateralResection,
  extensionMedial, extensionLateral, flexionMedial, flexionLateral,
  nativeAlignment, finalAlignment, maxFlexion,
  manufacturer, implantSystem, femurComponent, tibialComponent, polyInsert,
  implantSize, ref, lot, expiryDate
}

Return ONLY this exact JSON (no markdown, no extra text):
{ "screenType": "<type>", "data": { "<field>": "<value>", ... } }

Use "" for any field not visible or not applicable.`,
    user: "Classify this surgical image and extract all relevant data fields.",
  },
};

const DEFAULT_PROMPT: PromptConfig = PROMPTS.intraop;

router.post("/extract", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    const screenType = (req.body?.screen_type as string) ?? "intraop";
    const prompt = PROMPTS[screenType] ?? DEFAULT_PROMPT;

    const base64 = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype || "image/jpeg";

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 900,
      messages: [
        { role: "system", content: prompt.system },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" },
            },
            { type: "text", text: prompt.user },
          ],
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "";

    let detectedType = screenType;
    let extracted: Record<string, string>;
    try {
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (screenType === "auto" && parsed.screenType && parsed.data) {
        detectedType = parsed.screenType as string;
        extracted = parsed.data as Record<string, string>;
      } else {
        extracted = parsed as Record<string, string>;
      }
    } catch {
      res.status(422).json({ error: "Could not parse extraction result. Please try a clearer screenshot." });
      return;
    }

    res.json({ success: true, screenType: detectedType, data: extracted });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to process image";
    res.status(500).json({ error: message });
  }
});

export default router;
