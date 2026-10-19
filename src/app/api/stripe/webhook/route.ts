/** Stripe webhook: signature-verified, and idempotent via the stripe_events table. */
import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { markCheckoutExpired, markPaymentAuthorized } from "@/lib/booking/service";
import { getStripe, stripeGateway } from "@/lib/payments/stripe";
import { sendBookingEmail } from "@/lib/email/mailer";
import { getSql } from "@/lib/server/sql";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "not configured" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const sql = getSql();
  const [fresh] =
    await sql`INSERT INTO stripe_events (id, type) VALUES (${event.id}, ${event.type}) ON CONFLICT DO NOTHING RETURNING id`;
  if (!fresh) return NextResponse.json({ received: true, duplicate: true });

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object;
      if (typeof s.payment_intent === "string") {
        const res = await markPaymentAuthorized(sql, s.id, s.payment_intent);
        if (res.releaseNeeded) await stripeGateway.release(s.payment_intent);
        if (res.newlyAuthorized) {
          await sendBookingEmail(sql, "received", res.booking);
          await sendBookingEmail(sql, "owner_new_request", res.booking);
        }
      }
    } else if (event.type === "checkout.session.expired") {
      await markCheckoutExpired(sql, event.data.object.id);
    }
  } catch (e) {
    // Let Stripe retry: forget that we saw this event.
    await sql`DELETE FROM stripe_events WHERE id = ${event.id}`;
    console.error("webhook failed", event.type, e);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
