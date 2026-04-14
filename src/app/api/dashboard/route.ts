import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { paymentIntents, medications } from "@/db/schema";
import { and, gte, lte, eq, sql } from "drizzle-orm";
import { resolveDateRange, type DatePreset } from "@/lib/date-ranges";
import { PRESCRIBER_FEE_CENTS } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const preset = (searchParams.get("preset") ?? "this_month") as DatePreset;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const granularity = (searchParams.get("granularity") ?? "daily") as "daily" | "weekly" | "monthly";

  const { start, end } = resolveDateRange(preset, from, to);

  const dateFilter = and(
    gte(paymentIntents.stripeCreatedAt, start),
    lte(paymentIntents.stripeCreatedAt, end),
    eq(paymentIntents.status, "succeeded")
  );

  // ── KPI aggregates ────────────────────────────────────────────────────
  const [kpi] = await db
    .select({
      grossCents: sql<number>`coalesce(sum(${paymentIntents.amountCents}), 0)`,
      totalFees: sql<number>`coalesce(sum(${paymentIntents.stripeFee}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(paymentIntents)
    .where(dateFilter);

  // Med costs — join medications on name
  const medCostRows = await db
    .select({
      medicationName: paymentIntents.medicationName,
      totalMedCost: sql<number>`coalesce(sum(m.cost_cents), 0)`,
      txCount: sql<number>`count(*)`,
    })
    .from(paymentIntents)
    .leftJoin(
      medications,
      eq(paymentIntents.medicationName, medications.name)
    )
    .where(dateFilter)
    .groupBy(paymentIntents.medicationName);

  const totalMedCostCents = medCostRows.reduce(
    (acc, r) => acc + Number(r.totalMedCost),
    0
  );
  const txCount = Number(kpi.count);
  const grossCents = Number(kpi.grossCents);
  const totalFeesCents = Number(kpi.totalFees);
  const prescriberFeesTotal = txCount * PRESCRIBER_FEE_CENTS;
  const netCents = grossCents - totalFeesCents - totalMedCostCents - prescriberFeesTotal;

  const kpiData = {
    grossCents,
    netCents,
    txCount,
    avgFeePercent: grossCents > 0 ? (totalFeesCents / grossCents) * 100 : 0,
    avgNetMarginPercent: grossCents > 0 ? (netCents / grossCents) * 100 : 0,
  };

  // ── Revenue over time chart ───────────────────────────────────────────
  const truncFn =
    granularity === "monthly"
      ? "month"
      : granularity === "weekly"
      ? "week"
      : "day";

  const revenueOverTime = await db
    .select({
      period: sql<string>`date_trunc(${truncFn}, ${paymentIntents.stripeCreatedAt})`,
      grossCents: sql<number>`sum(${paymentIntents.amountCents})`,
      count: sql<number>`count(*)`,
    })
    .from(paymentIntents)
    .where(dateFilter)
    .groupBy(sql`date_trunc(${truncFn}, ${paymentIntents.stripeCreatedAt})`)
    .orderBy(sql`date_trunc(${truncFn}, ${paymentIntents.stripeCreatedAt})`);

  // ── Fee % over time ───────────────────────────────────────────────────
  const feeOverTime = await db
    .select({
      period: sql<string>`date_trunc(${truncFn}, ${paymentIntents.stripeCreatedAt})`,
      grossCents: sql<number>`sum(${paymentIntents.amountCents})`,
      feeCents: sql<number>`sum(${paymentIntents.stripeFee})`,
    })
    .from(paymentIntents)
    .where(dateFilter)
    .groupBy(sql`date_trunc(${truncFn}, ${paymentIntents.stripeCreatedAt})`)
    .orderBy(sql`date_trunc(${truncFn}, ${paymentIntents.stripeCreatedAt})`);

  // ── Revenue by medication ─────────────────────────────────────────────
  const revenueByMed = await db
    .select({
      medicationName: paymentIntents.medicationName,
      grossCents: sql<number>`sum(${paymentIntents.amountCents})`,
      count: sql<number>`count(*)`,
    })
    .from(paymentIntents)
    .where(dateFilter)
    .groupBy(paymentIntents.medicationName)
    .orderBy(sql`sum(${paymentIntents.amountCents}) desc`)
    .limit(10);

  // ── Net margin over time ──────────────────────────────────────────────
  const netOverTime = await db
    .select({
      period: sql<string>`date_trunc(${truncFn}, ${paymentIntents.stripeCreatedAt})`,
      grossCents: sql<number>`sum(${paymentIntents.amountCents})`,
      feeCents: sql<number>`sum(${paymentIntents.stripeFee})`,
      count: sql<number>`count(*)`,
    })
    .from(paymentIntents)
    .leftJoin(medications, eq(paymentIntents.medicationName, medications.name))
    .where(dateFilter)
    .groupBy(sql`date_trunc(${truncFn}, ${paymentIntents.stripeCreatedAt})`)
    .orderBy(sql`date_trunc(${truncFn}, ${paymentIntents.stripeCreatedAt})`);

  return NextResponse.json({
    kpi: kpiData,
    charts: {
      revenueOverTime,
      feeOverTime: feeOverTime.map((r) => ({
        period: r.period,
        feePercent:
          Number(r.grossCents) > 0
            ? (Number(r.feeCents) / Number(r.grossCents)) * 100
            : 0,
      })),
      revenueByMed,
      netOverTime: netOverTime.map((r) => ({
        period: r.period,
        netMarginPercent:
          Number(r.grossCents) > 0
            ? ((Number(r.grossCents) - Number(r.feeCents) - Number(r.count) * PRESCRIBER_FEE_CENTS) /
                Number(r.grossCents)) *
              100
            : 0,
      })),
    },
  });
}
