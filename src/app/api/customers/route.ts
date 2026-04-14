import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { customers, paymentIntents } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const rawLimit = parseInt(searchParams.get("limit") ?? "50", 10);
  const limit = [25, 50, 100, 200].includes(rawLimit) ? rawLimit : 50;
  const offset = (page - 1) * limit;
  const search = searchParams.get("q") ?? "";

  // Aggregate stats per customer from payment_intents
  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      email: customers.email,
      phone: customers.phone,
      stripeCreatedAt: customers.stripeCreatedAt,
      txCount: sql<number>`count(case when ${paymentIntents.status} = 'succeeded' then 1 end)`,
      ltvCents: sql<number>`coalesce(sum(case when ${paymentIntents.status} = 'succeeded' then ${paymentIntents.amountCents} end), 0)`,
      lastOrderAt: sql<string>`max(case when ${paymentIntents.status} = 'succeeded' then ${paymentIntents.stripeCreatedAt} end)`,
      lastMedication: sql<string>`(array_agg(${paymentIntents.medicationName} order by ${paymentIntents.stripeCreatedAt} desc))[1]`,
    })
    .from(customers)
    .leftJoin(paymentIntents, eq(paymentIntents.customerId, customers.id))
    .where(
      search
        ? sql`(${customers.name} ilike ${"%" + search + "%"} or ${customers.email} ilike ${"%" + search + "%"})`
        : undefined
    )
    .groupBy(customers.id)
    .orderBy(
      desc(
        sql`coalesce(sum(case when ${paymentIntents.status} = 'succeeded' then ${paymentIntents.amountCents} end), 0)`
      )
    )
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(customers);

  return NextResponse.json({ data: rows, total: Number(total), page, limit });
}
