import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  index,
  date,
  numeric,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Medications — source of truth for med costs (seeded from Stripe products)
// ---------------------------------------------------------------------------
export const medications = pgTable("medications", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  costCents: integer("cost_cents").notNull().default(0),
  active: boolean("active").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Payment intents — synced from Stripe via webhook + cron backfill
// ---------------------------------------------------------------------------
export const paymentIntents = pgTable(
  "payment_intents",
  {
    id: text("id").primaryKey(),
    amountCents: integer("amount_cents").notNull(),
    stripeFee: integer("stripe_fee_cents").notNull().default(0),
    currency: text("currency").notNull().default("usd"),
    status: text("status").notNull(),

    // Customer
    customerEmail: text("customer_email"),
    customerName: text("customer_name"),

    // Metadata fields
    medicationName: text("medication_name"),   // metadata.med_name
    prescriber: text("prescriber"),            // metadata.handler
    medCostCents: integer("med_cost_cents").notNull().default(0), // metadata.med_cost (parsed to cents)
    orderId: text("order_id"),                 // metadata.order_id_rx
    refillNumber: text("refill_number"),       // metadata.refil_number

    stripeCreatedAt: timestamp("stripe_created_at", { withTimezone: true }).notNull(),
    metadata: jsonb("metadata"),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("pi_status_idx").on(t.status),
    index("pi_created_idx").on(t.stripeCreatedAt),
    index("pi_med_idx").on(t.medicationName),
    index("pi_prescriber_idx").on(t.prescriber),
    index("pi_order_idx").on(t.orderId),
  ]
);

// ---------------------------------------------------------------------------
// RXCS Dispense Reports — written by rxsc-sverka PDF parser
// ---------------------------------------------------------------------------
export const dispenseReports = pgTable("dispense_reports", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  reportNumber: text("report_number").notNull().unique(),
  invoiceNumber: text("invoice_number"),
  clinic: text("clinic"),
  dateRangeStart: date("date_range_start"),
  dateRangeEnd: date("date_range_end"),
  prescriptionCount: integer("prescription_count"),
  subtotal: numeric("subtotal"),
  shipping: numeric("shipping"),
  total: numeric("total"),
  generatedDate: date("generated_date"),
  sourceFilename: text("source_filename"),
  importedAt: timestamp("imported_at", { withTimezone: true }).defaultNow(),
});

export const rxPrescriptions = pgTable(
  "prescriptions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    reportId: integer("report_id"),
    lineNumber: integer("line_number"),
    rxNumber: text("rx_number"),
    patientName: text("patient_name"),
    drugName: text("drug_name"),
    quantity: integer("quantity"),
    fillDate: date("fill_date"),
    pickup: text("pickup"),
    trackingNumber: text("tracking_number"),
    prescriberName: text("prescriber_name"),
    prescriberClinic: text("prescriber_clinic"),
    clinicName: text("clinic_name"),
    price: numeric("price"),
  },
  (t) => [
    index("rx_fill_date_idx").on(t.fillDate),
    index("rx_patient_idx").on(t.patientName),
    index("rx_drug_idx").on(t.drugName),
    index("rx_prescriber_idx").on(t.prescriberName),
    index("rx_report_id_idx").on(t.reportId),
  ]
);

export const rxShippingItems = pgTable("shipping_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  reportId: integer("report_id"),
  trackingNumber: text("tracking_number"),
  shippingMethod: text("shipping_method"),
  inOutState: text("in_out_state"),
  items: integer("items"),
  price: numeric("price"),
});

// ---------------------------------------------------------------------------
// Sync log — tracks last successful sync cursor so cron only fetches new data
// ---------------------------------------------------------------------------
export const syncLog = pgTable("sync_log", {
  id: text("id").primaryKey().default("singleton"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  lastStripeCreatedAt: integer("last_stripe_created_at"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
