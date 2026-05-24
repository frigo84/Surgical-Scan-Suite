import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { casesTable } from "@workspace/db/schema";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/cases", async (_req, res) => {
  try {
    const cases = await db
      .select()
      .from(casesTable)
      .orderBy(desc(casesTable.createdAt))
      .limit(100);
    res.json({ success: true, data: cases });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch cases";
    res.status(500).json({ error: message });
  }
});

router.post("/cases", async (req, res) => {
  try {
    const body = req.body as Record<string, string>;

    const [saved] = await db
      .insert(casesTable)
      .values({
        femurSize: body.femurSize ?? "",
        tibiaSize: body.tibiaSize ?? "",
        polySize: body.polySize ?? "",
        flexion: body.flexion ?? "",
        varus: body.varus ?? "",
        valgus: body.valgus ?? "",
        externalRotation: body.externalRotation ?? "",
        posteriorSlope: body.posteriorSlope ?? "",
        notes: body.notes ?? "",
      })
      .returning();

    res.json({ success: true, data: saved });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save case";
    res.status(500).json({ error: message });
  }
});

export default router;
