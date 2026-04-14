import Stripe from "stripe";
import { db } from "@/db/client";
import { paymentIntents, customers } from "@/db/schema";
import { stripe } from "./stripe";
import { sql } from "drizzle-orm";

// ── Fee map ────────────────────────────────────────────────────────────────
export async function buildFeeMap(
  stripeClient: Stripe,
  createdGte: number
): Promise<Map<string, number>> {
  const feeMap = new Map<string, number>();
  let cursor: string | undefined;
  do {
    const page = await stripeClient.charges.list({
      limit: 100,
      created: { gte: createdGte },
      expand: ["data.balance_transaction"],
      ...(cursor ? { starting_after: cursor } : {}),
    });
    for (const charge of page.data) {
      const piId =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;
      const bt = charge.balance_transaction as Stripe.BalanceTransaction | null;
      if (piId && bt && typeof bt === "object") {
        feeMap.set(piId, bt.fee);
      }
    }
    cursor = page.has_more ? page.data[page.data.length - 1]?.id : undefined;
  } while (cursor);
  return feeMap;
}

// ── Batch upsert ───────────────────────────────────────────────────────────
export async function upsertPaymentIntentBatch(
  pis: Stripe.PaymentIntent[],
  feeMap: Map<string, number>
) {
  if (pis.length === 0) return;
  const values = pis.map((pi) => {
    const meta = (pi.metadata ?? {}) as Record<string, string>;
    const { customerId, email, name } = extractCustomer(pi);
    return {
      id: pi.id,
      amountCents: pi.amount,
      stripeFee: feeMap.get(pi.id) ?? 0,
      currency: pi.currency,
      status: pi.status,
      customerId,
      customerEmail: email,
      customerName: name,
      medicationName: meta.med_name ?? null,
      prescriber: meta.handler ?? null,
      medCostCents: parseToCents(meta.med_cost),
      orderId: meta.order_id_rx ?? null,
      refillNumber: meta.refil_number ?? null,
      stripeCreatedAt: new Date(pi.created * 1000),
      metadata: meta,
    };
  });
  await db
    .insert(paymentIntents)
    .values(values)
    .onConflictDoUpdate({
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
        metadata: sql`excluded.metadata`,
        syncedAt: sql`now()`,
      },
    });
}

function parseToCents(val: string | undefined): number {
  if (!val) return 0;
  const n = parseFloat(val.replace(/[^0-9.]/g, ""));
  if (isNaN(n)) return 0;
  return n > 500 ? Math.round(n) : Math.round(n * 100);
}

function extractCustomer(pi: Stripe.PaymentIntent): { customerId: string | null; email: string | null; name: string | null } {
  if (pi.customer && typeof pi.customer === "object") {
    const c = pi.customer as Stripe.Customer;
    return {
      customerId: c.id ?? null,
      email: c.email ?? pi.receipt_email ?? null,
      name: c.name ?? (pi.shipping?.name ?? null),
    };
  }
  return {
    customerId: typeof pi.customer === "string" ? pi.customer : null,
    email: pi.receipt_email ?? null,
    name: pi.shipping?.name ?? null,
  };
}

/**
 * Upserts a single PaymentIntent (used by webhook handler).
 * Fetches fee from the charge's balance transaction.
 */
export async function upsertPaymentIntent(pi: Stripe.PaymentIntent) {
  let stripeFee = 0;

  if (pi.latest_charge && typeof pi.latest_charge === "string") {
    try {
      const charge = await stripe.charges.retrieve(pi.latest_charge, {
        expand: ["balance_transaction"],
      });
      const bt = charge.balance_transaction as Stripe.BalanceTransaction | null;
      if (bt && typeof bt === "object") stripeFee = bt.fee;
    } catch {
      // non-critical
    }
  }

  const meta = (pi.metadata ?? {}) as Record<string, string>;
  const { customerId, email, name } = extractCustomer(pi);

  // If the customer is expanded, upsert it
  if (pi.customer && typeof pi.customer === "object") {
    const c = pi.customer as Stripe.Customer;
    await db
      .insert(customers)
      .values({
        id: c.id,
        name: c.name ?? null,
        email: c.email ?? null,
        phone: c.phone ?? null,
        stripeCreatedAt: c.created ? new Date(c.created * 1000) : null,
        syncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: customers.id,
        set: { name: c.name ?? null, email: c.email ?? null, phone: c.phone ?? null, syncedAt: sql`now()` },
      });
  }

  await db
    .insert(paymentIntents)
    .values({
      id: pi.id,
      amountCents: pi.amount,
      stripeFee,
      currency: pi.currency,
      status: pi.status,
      customerId,
      customerEmail: email,
      customerName: name,
      medicationName: meta.med_name ?? null,
      prescriber: meta.handler ?? null,
      medCostCents: parseToCents(meta.med_cost),
      orderId: meta.order_id_rx ?? null,
      refillNumber: meta.refil_number ?? null,
      stripeCreatedAt: new Date(pi.created * 1000),
      metadata: meta,
    })
    .onConflictDoUpdate({
      target: paymentIntents.id,
      set: {
        amountCents: pi.amount,
        stripeFee,
        status: pi.status,
        customerId,
        customerEmail: email,
        customerName: name,
        medicationName: meta.med_name ?? null,
        prescriber: meta.handler ?? null,
        medCostCents: parseToCents(meta.med_cost),
        orderId: meta.order_id_rx ?? null,
        refillNumber: meta.refil_number ?? null,
        metadata: meta,
        syncedAt: sql`now()`,
      },
    });
}
