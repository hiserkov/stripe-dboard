import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Medications — source of truth for med costs (seeded from Stripe products)
// ---------------------------------------------------------------------------
export const medications = pgTable("medications", {
  id: text("id").primaryKey(), // Stripe product ID
  name: text("name").notNull(),
  costCents: integer("cost_cents").notNull().default(0), // cost in cents, edited inline
  active: boolean("active").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Payment intents — synced from Stripe via webhook + cron backfill
// ---------------------------------------------------------------------------
export const paymentIntents = pgTable(
  "payment_intents",
  {
    id: text("id").primaryKey(), // Stripe pi_xxx ID
    amountCents: integer("amount_cents").notNull(),
    stripeFee: integer("stripe_fee_cents").notNull().default(0), // populated from Stripe Balance Transaction
    currency: text("currency").notNull().default("usd"),
    status: text("status").notNull(), // succeeded | failed | canceled | requires_payment_method | ...
    customerEmail: text("customer_email"),
    customerName: text("customer_name"),
    medicationName: text("medication_name"), // raw string from Stripe metadata
    stripeCreatedAt: timestamp("stripe_created_at", { withTimezone: true }).notNull(),
    metadata: jsonb("metadata"), // full metadata blob for future use
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("pi_status_idx").on(t.status),
    index("pi_created_idx").on(t.stripeCreatedAt),
    index("pi_med_idx").on(t.medicationName),
  ]
);

// ---------------------------------------------------------------------------
// Sync log — tracks last successful sync cursor so cron only fetches new data
// ---------------------------------------------------------------------------
export const syncLog = pgTable("sync_log", {
  id: text("id").primaryKey().default("singleton"), // only ever one row
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  lastStripeCreatedAt: integer("last_stripe_created_at"), // unix timestamp cursor for Stripe API
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
