import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { syncLog, medications } from "@/db/schema";
import { stripe } from "@/lib/stripe";
import { upsertPaymentIntentBatch, buildFeeMap } from "@/lib/sync-payment-intent";
import { eq, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = { paymentIntents: 0, medications: 0, errors: [] as string[] };

  // ── 1. Sync Stripe Products → medications ─────────────────────────────
  try {
    let productCursor: string | undefined;
    do {
      const products = await stripe.products.list({
        limit: 100,
        active: true,
        ...(productCursor ? { starting_after: productCursor } : {}),
      });

      for (const product of products.data) {
        await db
          .insert(medications)
          .values({
            id: product.id,
            name: product.name,
            costCents: 0,
            active: product.active,
            updatedAt: new Date(),
          })
          // Conflict on name — preserves cost_cents set by the user
          .onConflictDoUpdate({
            target: medications.name,
            set: { active: product.active, updatedAt: new Date() },
          });
        results.medications++;
      }

      productCursor = products.has_more
        ? products.data[products.data.length - 1]?.id
        : undefined;
    } while (productCursor);
  } catch (err) {
    results.errors.push(`products: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── 2. Backfill Payment Intents ────────────────────────────────────────
  try {
    const [log] = await db
      .select()
      .from(syncLog)
      .where(eq(syncLog.id, "singleton"))
      .limit(1);

    // Default: last 90 days on first run
    const createdGte = log?.lastStripeCreatedAt
      ?? Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 90;

    // Build fee map once for the whole date range (one paginated list call)
    const feeMap = await buildFeeMap(stripe, createdGte);

    let cursor: string | undefined;
    let newestCreated = createdGte;

    do {
      const page = await stripe.paymentIntents.list({
        limit: 100,
        created: { gte: createdGte },
        expand: ["data.customer"],
        ...(cursor ? { starting_after: cursor } : {}),
      });

      await upsertPaymentIntentBatch(page.data, feeMap);
      results.paymentIntents += page.data.length;

      for (const pi of page.data) {
        if (pi.created > newestCreated) newestCreated = pi.created;
      }

      cursor = page.has_more ? page.data[page.data.length - 1]?.id : undefined;
    } while (cursor);

    // Update cursor
    await db
      .insert(syncLog)
      .values({
        id: "singleton",
        lastSyncedAt: new Date(),
        lastStripeCreatedAt: newestCreated,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: syncLog.id,
        set: {
          lastSyncedAt: new Date(),
          lastStripeCreatedAt: newestCreated,
          updatedAt: sql`now()`,
        },
      });
  } catch (err) {
    results.errors.push(
      `payment_intents: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return NextResponse.json({
    ok: results.errors.length === 0,
    ...results,
    syncedAt: new Date().toISOString(),
  });
}
