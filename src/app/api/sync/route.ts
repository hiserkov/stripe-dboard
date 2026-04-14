import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { syncLog, medications } from "@/db/schema";
import { stripe } from "@/lib/stripe";
import { upsertPaymentIntent } from "@/lib/sync-payment-intent";
import { eq, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const maxDuration = 60; // Railway cron gives us plenty of time

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * GET /api/sync
 * Called by Railway Cron (with ?secret=xxx) or manually.
 * Backfills Payment Intents from Stripe since last sync cursor.
 * Also syncs Stripe Products → medications table.
 */
export async function GET(req: NextRequest) {
  // Simple secret guard so only Railway cron (or you) can trigger this
  const secret = req.nextUrl.searchParams.get("secret");
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = { paymentIntents: 0, medications: 0, errors: [] as string[] };

  // ── 1. Sync Stripe Products → medications ──────────────────────────────
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
            costCents: 0, // user fills this in via the UI
            active: product.active,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: medications.id,
            set: {
              name: product.name,
              active: product.active,
              // Do NOT overwrite costCents — user manages that
            },
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

  // ── 2. Backfill Payment Intents since last cursor ──────────────────────
  try {
    // Get the sync cursor
    const [log] = await db
      .select()
      .from(syncLog)
      .where(eq(syncLog.id, "singleton"))
      .limit(1);

    const createdGte = log?.lastStripeCreatedAt
      ? log.lastStripeCreatedAt
      : Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 90; // default: last 90 days

    let cursor: string | undefined;
    let newestCreated = createdGte;

    do {
      const page = await stripe.paymentIntents.list({
        limit: 100,
        created: { gte: createdGte },
        ...(cursor ? { starting_after: cursor } : {}),
      });

      for (const pi of page.data) {
        try {
          await upsertPaymentIntent(pi);
          results.paymentIntents++;
          if (pi.created > newestCreated) newestCreated = pi.created;
        } catch (err) {
          results.errors.push(
            `pi ${pi.id}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
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
