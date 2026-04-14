import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { paymentIntents } from "@/db/schema";
import { and, gte, lte, eq, desc, count } from "drizzle-orm";
import { resolveDateRange, type DatePreset } from "@/lib/date-ranges";
import { PRESCRIBER_FEE_CENTS } from "@/lib/stripe";

export const runtime = "nodejs";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const preset = (searchParams.get("preset") ?? "this_month") as DatePreset;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const status = searchParams.get("status") ?? "all";

  const { start, end } = resolveDateRange(preset, from, to);

  const filters = [
    gte(paymentIntents.stripeCreatedAt, start),
    lte(paymentIntents.stripeCreatedAt, end),
    ...(status !== "all" ? [eq(paymentIntents.status, status)] : []),
  ];

  const [{ total }] = await db
    .select({ total: count() })
    .from(paymentIntents)
    .where(and(...filters));

  const rows = await db
    .select({
      id: paymentIntents.id,
      amountCents: paymentIntents.amountCents,
      stripeFee: paymentIntents.stripeFee,
      currency: paymentIntents.currency,
      status: paymentIntents.status,
      customerEmail: paymentIntents.customerEmail,
      customerName: paymentIntents.customerName,
      medicationName: paymentIntents.medicationName,
      prescriber: paymentIntents.prescriber,
      medCostCents: paymentIntents.medCostCents,
      orderId: paymentIntents.orderId,
      refillNumber: paymentIntents.refillNumber,
      stripeCreatedAt: paymentIntents.stripeCreatedAt,
    })
    .from(paymentIntents)
    .where(and(...filters))
    .orderBy(desc(paymentIntents.stripeCreatedAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const data = rows.map((r) => {
    const gross = Number(r.amountCents);
    const fee = Number(r.stripeFee);
    const medCost = Number(r.medCostCents);
    const net = gross - fee - medCost - PRESCRIBER_FEE_CENTS;
    return {
      ...r,
      prescriberFeeCents: PRESCRIBER_FEE_CENTS,
      netCents: net,
    };
  });

  return NextResponse.json({
    data,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total: Number(total),
      totalPages: Math.ceil(Number(total) / PAGE_SIZE),
    },
  });
}
