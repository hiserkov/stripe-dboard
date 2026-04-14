import Stripe from "stripe";
import { db } from "@/db/client";
import { paymentIntents } from "@/db/schema";
import { stripe } from "./stripe";
import { sql } from "drizzle-orm";

function parseToCents(val: string | undefined): number {
  if (!val) return 0;
  const n = parseFloat(val.replace(/[^0-9.]/g, ""));
  if (isNaN(n)) return 0;
  return n > 500 ? Math.round(n) : Math.round(n * 100);
}

function extractCustomer(pi: Stripe.PaymentIntent): { email: string | null; name: string | null } {
  if (pi.customer && typeof pi.customer === "object") {
    const c = pi.customer as Stripe.Customer;
    return {
      email: c.email ?? pi.receipt_email ?? null,
      name: c.name ?? (pi.shipping?.name ?? null),
    };
  }
  return {
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
  const { email, name } = extractCustomer(pi);

  await db
    .insert(paymentIntents)
    .values({
      id: pi.id,
      amountCents: pi.amount,
      stripeFee,
      currency: pi.currency,
      status: pi.status,
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
