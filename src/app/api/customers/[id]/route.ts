import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { customers, paymentIntents } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { PRESCRIBER_FEE_CENTS } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1);
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Aggregate KPIs
  const [kpi] = await db
    .select({
      txCount: sql<number>`count(case when ${paymentIntents.status} = 'succeeded' then 1 end)`,
      ltvCents: sql<number>`coalesce(sum(case when ${paymentIntents.status} = 'succeeded' then ${paymentIntents.amountCents} end), 0)`,
      totalFees: sql<number>`coalesce(sum(case when ${paymentIntents.status} = 'succeeded' then ${paymentIntents.stripeFee} end), 0)`,
      totalMedCost: sql<number>`coalesce(sum(case when ${paymentIntents.status} = 'succeeded' then ${paymentIntents.medCostCents} end), 0)`,
      firstOrderAt: sql<string>`min(case when ${paymentIntents.status} = 'succeeded' then ${paymentIntents.stripeCreatedAt} end)`,
      lastOrderAt: sql<string>`max(case when ${paymentIntents.status} = 'succeeded' then ${paymentIntents.stripeCreatedAt} end)`,
    })
    .from(paymentIntents)
    .where(eq(paymentIntents.customerId, id));

  const txCount = Number(kpi.txCount);
  const ltvCents = Number(kpi.ltvCents);
  const totalFees = Number(kpi.totalFees);
  const totalMedCost = Number(kpi.totalMedCost);
  const prescriberFees = txCount * PRESCRIBER_FEE_CENTS;
  const netCents = ltvCents - totalFees - totalMedCost - prescriberFees;

  // Top medications
  const medRows = await db
    .select({
      medicationName: paymentIntents.medicationName,
      cnt: sql<number>`count(*)`,
    })
    .from(paymentIntents)
    .where(eq(paymentIntents.customerId, id))
    .groupBy(paymentIntents.medicationName)
    .orderBy(desc(sql`count(*)`))
    .limit(5);

  // All transactions
  const txRows = await db
    .select({
      id: paymentIntents.id,
      amountCents: paymentIntents.amountCents,
      stripeFee: paymentIntents.stripeFee,
      medCostCents: paymentIntents.medCostCents,
      netCents: sql<number>`${paymentIntents.amountCents} - ${paymentIntents.stripeFee} - ${paymentIntents.medCostCents} - ${PRESCRIBER_FEE_CENTS}`,
      status: paymentIntents.status,
      medicationName: paymentIntents.medicationName,
      prescriber: paymentIntents.prescriber,
      orderId: paymentIntents.orderId,
      refillNumber: paymentIntents.refillNumber,
      stripeCreatedAt: paymentIntents.stripeCreatedAt,
    })
    .from(paymentIntents)
    .where(eq(paymentIntents.customerId, id))
    .orderBy(desc(paymentIntents.stripeCreatedAt));

  return NextResponse.json({
    customer,
    kpi: {
      txCount,
      ltvCents,
      netCents,
      avgOrderCents: txCount > 0 ? Math.round(ltvCents / txCount) : 0,
      firstOrderAt: kpi.firstOrderAt,
      lastOrderAt: kpi.lastOrderAt,
    },
    topMedications: medRows,
    transactions: txRows,
  });
}
