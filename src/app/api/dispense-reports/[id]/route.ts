import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { dispenseReports, rxPrescriptions, rxShippingItems } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // Verify the report exists first
  const [report] = await db
    .select({ id: dispenseReports.id, reportNumber: dispenseReports.reportNumber })
    .from(dispenseReports)
    .where(eq(dispenseReports.id, id))
    .limit(1);

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  // Delete children first, then parent
  await db.delete(rxPrescriptions).where(eq(rxPrescriptions.reportId, id));
  await db.delete(rxShippingItems).where(eq(rxShippingItems.reportId, id));
  await db.delete(dispenseReports).where(eq(dispenseReports.id, id));

  return NextResponse.json({ ok: true, deleted: report.reportNumber });
}
