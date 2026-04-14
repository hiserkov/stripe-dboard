import Stripe from "stripe";
import { db } from "@/db/client";
import { paymentIntents } from "@/db/schema";
import { stripe } from "./stripe";
import { sql } from "drizzle-orm";

/**
 * Upserts a single PaymentIntent into Postgres.
 * Fetches the associated BalanceTransaction to get the real Stripe fee.
 */
export async function upsertPaymentIntent(pi: Stripe.PaymentIntent) {
  let stripFeeCents = 0;

  // Retrieve fee from the latest charge's balance transaction
  if (pi.latest_charge && typeof pi.latest_charge === "string") {
    try {
      const charge = await stripe.charges.retrieve(pi.latest_charge, {
        expand: ["balance_transaction"],
      });
      const bt = charge.balance_transaction as Stripe.BalanceTransaction | null;
      if (bt && typeof bt === "object") {
        stripFeeCents = bt.fee; // already in cents
      }
    } catch {
      // non-critical — fee stays 0
    }
  }

  const metadata = pi.metadata ?? {};
  const medicationName =
    (metadata.medication_name as string | undefined) ??
    (metadata.medication as string | undefined) ??
    null;

  await db
    .insert(paymentIntents)
    .values({
      id: pi.id,
      amountCents: pi.amount,
      stripeFee: stripFeeCents,
      currency: pi.currency,
      status: pi.status,
      customerEmail:
        typeof pi.customer === "object" && pi.customer !== null
          ? (pi.customer as Stripe.Customer).email ?? null
          : null,
      customerName:
        typeof pi.customer === "object" && pi.customer !== null
          ? (pi.customer as Stripe.Customer).name ?? null
          : null,
      medicationName,
      stripeCreatedAt: new Date(pi.created * 1000),
      metadata,
    })
    .onConflictDoUpdate({
      target: paymentIntents.id,
      set: {
        amountCents: pi.amount,
        stripeFee: stripFeeCents,
        status: pi.status,
        medicationName,
        metadata,
        syncedAt: sql`now()`,
      },
    });
}
