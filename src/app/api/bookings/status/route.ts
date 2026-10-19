/**
 * Public: confirmation details after returning from Checkout. Returns no personal data.
 * If the webhook hasn't arrived yet, it confirms the payment state directly with Stripe.
 */
import { connection } from "next/server";
import { BookingError, getBookingByReference, markPaymentAuthorized } from "@/lib/booking/service";
import { errorResponse, json, preflight } from "@/lib/server/http";
import { clientKey, rateLimit } from "@/lib/server/rate-limit";
import { getSql } from "@/lib/server/sql";
import { getStripe, stripeEnabled, stripeGateway } from "@/lib/payments/stripe";
import { DEMO_NOTICE } from "@/lib/payments/checkout";
import { sendBookingEmail } from "@/lib/email/mailer";

export const OPTIONS = preflight;

export async function GET(req: Request) {
  await connection(); // always run per request, never prerender
  try {
    const sql = getSql();
    if (!(await rateLimit(sql, clientKey(req, "status"), 60, 600))) {
      throw new BookingError("rate_limited", "Too many requests.", 429);
    }
    const params = new URL(req.url).searchParams;
    const ref = params.get("ref")?.toUpperCase() ?? "";
    const sessionId = params.get("session_id");
    let b = await getBookingByReference(sql, ref);
    if (!b) throw new BookingError("not_found", "Booking not found.", 404);

    if (sessionId && stripeEnabled() && b.stripe_session_id === sessionId && b.payment_status === "awaiting") {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      if (session.status === "complete" && typeof session.payment_intent === "string") {
        const res = await markPaymentAuthorized(sql, sessionId, session.payment_intent);
        if (res.releaseNeeded) await stripeGateway.release(session.payment_intent);
        if (res.newlyAuthorized) {
          await sendBookingEmail(sql, "received", res.booking);
          await sendBookingEmail(sql, "owner_new_request", res.booking);
        }
        b = (await getBookingByReference(sql, ref))!;
      }
    }

    return json(
      req,
      {
        reference: b.reference,
        status: b.status,
        paymentStatus: b.payment_status,
        checkIn: b.check_in,
        checkOut: b.check_out,
        guests: b.guests,
        breakfast: b.breakfast,
        nights: b.nights,
        totalCents: b.total_cents,
        currency: b.currency,
        notice: DEMO_NOTICE,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(req, e);
  }
}
