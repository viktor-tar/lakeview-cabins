/**
 * Stripe integration — TEST MODE ONLY.
 * The app refuses to start payments with a live key, so no real card can ever be charged.
 */
import Stripe from "stripe";
import type { PaymentGateway } from "@/lib/booking/service";

let client: Stripe | null = null;

export function stripeEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  if (!key.startsWith("sk_test_") && !key.startsWith("rk_test_")) {
    throw new Error("Refusing to use a live Stripe key: this project only runs in Stripe test mode.");
  }
  client ??= new Stripe(key, { maxNetworkRetries: 2, appInfo: { name: "lakeview-booking" } });
  return client;
}

/** Capture, release and refund, each idempotent so retries can never double-charge. */
export const stripeGateway: PaymentGateway = {
  async capture(id) {
    const pi = await getStripe().paymentIntents.retrieve(id);
    if (pi.status === "succeeded") return;
    await getStripe().paymentIntents.capture(id, {}, { idempotencyKey: `capture-${id}` });
  },
  async release(id) {
    const pi = await getStripe().paymentIntents.retrieve(id);
    if (pi.status === "canceled" || pi.status === "succeeded") return;
    await getStripe().paymentIntents.cancel(id, {}, { idempotencyKey: `cancel-${id}` });
  },
  async refund(id) {
    await getStripe().refunds.create({ payment_intent: id }, { idempotencyKey: `refund-${id}` });
  },
};

/** Gateway used when Stripe isn't configured (local development without keys). */
export const noPayments: PaymentGateway = {
  async capture() {},
  async release() {},
  async refund() {},
};

export const paymentGateway = (): PaymentGateway => (stripeEnabled() ? stripeGateway : noPayments);
