import { config } from "dotenv";
config({ path: ".env.local" });

import Stripe from "stripe";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { pgTable, text, integer, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { eq, sql } from "drizzle-orm";

// ── Schema ─────────────────────────────────────────────────────────────
const medications = pgTable("medications", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  costCents: integer("cost_cents").notNull().default(0),
  active: boolean("active").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

const paymentIntents = pgTable("payment_intents", {
  id: text("id").primaryKey(),
  amountCents: integer("amount_cents").notNull(),
  stripeFee: integer("stripe_fee_cents").notNull().default(0),
  currency: text("currency").notNull().default("usd"),
  status: text("status").notNull(),
  customerId: text("customer_id"),
  customerEmail: text("customer_email"),
  customerName: text("customer_name"),
  medicationName: text("medication_name"),
  prescriber: text("prescriber"),
  medCostCents: integer("med_cost_cents").notNull().default(0),
  orderId: text("order_id"),
  refillNumber: text("refill_number"),
  rxUserId: text("rx_user_id"),
  productSku: text("product_sku"),
  visitId: text("visit_id"),
  trackingNumber: text("tracking_number"),
  stripeCreatedAt: timestamp("stripe_created_at", { withTimezone: true }).notNull(),
  metadata: jsonb("metadata"),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});

const syncLog = pgTable("sync_log", {
  id: text("id").primaryKey().default("singleton"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  lastStripeCreatedAt: integer("last_stripe_created_at"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Setup ──────────────────────────────────────────────────────────────
const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/** Parse a dollar string like "45.00" or "4500" into cents */
function parseToCents(val) {
  if (!val) return 0;
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ""));
  if (isNaN(n)) return 0;
  // If the value looks like it's already in cents (> 500 for a reasonable med cost), keep it
  // Otherwise treat as dollars
  return n > 500 ? Math.round(n) : Math.round(n * 100);
}

/** Extract customer email + name + id from PI, falling back to receipt_email / shipping */
function extractCustomer(pi) {
  if (pi.customer && typeof pi.customer === "object") {
    return {
      customerId: pi.customer.id ?? null,
      email: pi.customer.email ?? pi.receipt_email ?? null,
      name: pi.customer.name ?? pi.shipping?.name ?? null,
    };
  }
  return {
    customerId: typeof pi.customer === "string" ? pi.customer : null,
    email: pi.receipt_email ?? null,
    name: pi.shipping?.name ?? null,
  };
}

const customersTable = pgTable("customers", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  stripeCreatedAt: timestamp("stripe_created_at", { withTimezone: true }),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});

const results = { paymentIntents: 0, medications: 0, customers: 0, fees: 0, errors: [] };

// ── 1. Sync Stripe Products → medications ─────────────────────────────
console.log("Syncing products...");
try {
  let cursor;
  do {
    const page = await stripe.products.list({
      limit: 100,
      active: true,
      ...(cursor ? { starting_after: cursor } : {}),
    });
    for (const p of page.data) {
      await db.insert(medications).values({
        id: p.id, name: p.name, costCents: 0, active: p.active, updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: medications.id,
        set: { name: p.name, active: p.active },
      });
      results.medications++;
    }
    cursor = page.has_more ? page.data.at(-1)?.id : undefined;
  } while (cursor);
  console.log(`  ✓ ${results.medications} medications`);
} catch (e) {
  results.errors.push(`products: ${e.message}`);
  console.error("  ✗", e.message);
}

// ── 2. Sync Stripe Customers ───────────────────────────────────────────
console.log("Syncing customers...");
let customerCount = 0;
try {
  let cursor;
  do {
    const page = await stripe.customers.list({
      limit: 100,
      ...(cursor ? { starting_after: cursor } : {}),
    });
    for (const c of page.data) {
      await db.insert(customersTable).values({
        id: c.id,
        name: c.name ?? null,
        email: c.email ?? null,
        phone: c.phone ?? null,
        stripeCreatedAt: c.created ? new Date(c.created * 1000) : null,
        syncedAt: new Date(),
      }).onConflictDoUpdate({
        target: customersTable.id,
        set: { name: c.name ?? null, email: c.email ?? null, phone: c.phone ?? null, syncedAt: new Date() },
      });
      customerCount++;
    }
    cursor = page.has_more ? page.data.at(-1)?.id : undefined;
  } while (cursor);
  results.customers = customerCount;
  console.log(`  ✓ ${customerCount} customers`);
} catch (e) {
  results.errors.push(`customers: ${e.message}`);
  console.error("  ✗ customers:", e.message);
}

// ── 3. Build fee map via Charges (reliable PI → fee mapping) ──────────console.log("Building fee map via charges...");
const [log] = await db.select().from(syncLog).where(eq(syncLog.id, "singleton")).limit(1);
const createdGte = log?.lastStripeCreatedAt
  ?? Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 90;

const feeMap = new Map(); // pi_id → fee_cents

try {
  let cursor;
  do {
    const page = await stripe.charges.list({
      limit: 100,
      created: { gte: createdGte },
      expand: ["data.balance_transaction"],
      ...(cursor ? { starting_after: cursor } : {}),
    });

    for (const charge of page.data) {
      const piId = typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id;
      const bt = charge.balance_transaction;
      if (piId && bt && typeof bt === "object") {
        feeMap.set(piId, bt.fee);
        results.fees++;
      }
    }

    cursor = page.has_more ? page.data.at(-1)?.id : undefined;
    process.stdout.write(`\r  charges scanned: ${results.fees} fees mapped`);
  } while (cursor);
  console.log(`\n  ✓ ${feeMap.size} fees mapped`);
} catch (e) {
  results.errors.push(`fees: ${e.message}`);
  console.error("\n  ✗ fee map:", e.message);
}

// ── 3. Backfill Payment Intents ────────────────────────────────────────
console.log("Syncing payment intents...");
let newestCreated = createdGte;

try {
  let cursor;
  do {
    const page = await stripe.paymentIntents.list({
      limit: 100,
      created: { gte: createdGte },
      expand: ["data.customer"],
      ...(cursor ? { starting_after: cursor } : {}),
    });

    const values = page.data.map((pi) => {
      const meta = pi.metadata ?? {};
      const { customerId, email, name } = extractCustomer(pi);
      if (pi.created > newestCreated) newestCreated = pi.created;

      return {
        id: pi.id,
        amountCents: pi.amount,
        stripeFee: feeMap.get(pi.id) ?? 0,
        currency: pi.currency,
        status: pi.status,
        customerId,
        customerEmail: email,
        customerName: name,
        medicationName: meta.med_name ?? meta.product_name ?? null,
        prescriber: meta.handler ?? null,
        medCostCents: parseToCents(meta.med_cost),
        orderId: meta.order_id_rx ?? null,
        refillNumber: meta.refil_number ?? null,
        rxUserId: meta.rx_user_id ?? null,
        productSku: meta.product_sku ?? null,
        visitId: meta.visitId ?? null,
        trackingNumber: meta.tracking_number ?? null,
        stripeCreatedAt: new Date(pi.created * 1000),
        metadata: meta,
      };
    });

    if (values.length > 0) {
      await db.insert(paymentIntents).values(values).onConflictDoUpdate({
        target: paymentIntents.id,
        set: {
          amountCents: sql`excluded.amount_cents`,
          stripeFee: sql`excluded.stripe_fee_cents`,
          status: sql`excluded.status`,
          customerId: sql`excluded.customer_id`,
          customerEmail: sql`excluded.customer_email`,
          customerName: sql`excluded.customer_name`,
          medicationName: sql`excluded.medication_name`,
          prescriber: sql`excluded.prescriber`,
          medCostCents: sql`excluded.med_cost_cents`,
          orderId: sql`excluded.order_id`,
          refillNumber: sql`excluded.refill_number`,
          rxUserId: sql`excluded.rx_user_id`,
          productSku: sql`excluded.product_sku`,
          visitId: sql`excluded.visit_id`,
          trackingNumber: sql`excluded.tracking_number`,
          metadata: sql`excluded.metadata`,
          syncedAt: sql`now()`,
        },
      });
    }

    results.paymentIntents += values.length;
    process.stdout.write(`\r  synced: ${results.paymentIntents} payment intents`);
    cursor = page.has_more ? page.data.at(-1)?.id : undefined;
  } while (cursor);
  console.log(`\n  ✓ ${results.paymentIntents} payment intents`);
} catch (e) {
  results.errors.push(`payment_intents: ${e.message}`);
  console.error("  ✗", e.message);
}

// ── 4. Update sync cursor ──────────────────────────────────────────────
await db.insert(syncLog).values({
  id: "singleton",
  lastSyncedAt: new Date(),
  lastStripeCreatedAt: newestCreated,
  updatedAt: new Date(),
}).onConflictDoUpdate({
  target: syncLog.id,
  set: {
    lastSyncedAt: new Date(),
    lastStripeCreatedAt: newestCreated,
    updatedAt: sql`now()`,
  },
});

console.log(
  "\nDone.",
  results.errors.length ? `Errors: ${results.errors.join(", ")}` : "No errors."
);
await client.end();
