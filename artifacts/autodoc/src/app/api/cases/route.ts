import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { casesTable } from "@workspace/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const db = getDb();
    const cases = await db
      .select()
      .from(casesTable)
      .orderBy(desc(casesTable.createdAt))
      .limit(100);
    return NextResponse.json({ success: true, data: cases });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch cases";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const db = getDb();
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
      })
      .returning();

    return NextResponse.json({ success: true, data: saved });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save case";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
