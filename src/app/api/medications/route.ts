import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { medications } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET() {
  const rows = await db
    .select()
    .from(medications)
    .orderBy(medications.name);

  return NextResponse.json(rows);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, costCents } = body as { id: string; costCents: number };

  if (!id || typeof costCents !== "number" || costCents < 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const [updated] = await db
    .update(medications)
    .set({ costCents, updatedAt: new Date() })
    .where(eq(medications.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
