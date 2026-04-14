import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-03-25.dahlia",
});

export const PRESCRIBER_FEE_CENTS = 3000; // $30.00 flat per transaction

/**
 * Calculate net revenue in cents for a single payment intent.
 * net = gross - stripe_fee - med_cost - prescriber_fee
 */
export function calcNet({
  amountCents,
  stripFeeCents,
  medCostCents,
}: {
  amountCents: number;
  stripFeeCents: number;
  medCostCents: number;
}): number {
  return amountCents - stripFeeCents - medCostCents - PRESCRIBER_FEE_CENTS;
}
