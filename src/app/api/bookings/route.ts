/** Public: submit a booking request. Holds the dates and sends the guest to Stripe test Checkout. */
import { bookingInput, firstIssue } from "@/lib/booking/input";
import { BookingError, attachCheckoutSession, getRules, createGuestRequest } from "@/lib/booking/service";
import { allowedOrigins, errorResponse, json, preflight } from "@/lib/server/http";
import { clientKey, rateLimit } from "@/lib/server/rate-limit";
import { getSql } from "@/lib/server/sql";
import { stripeEnabled } from "@/lib/payments/stripe";
import { createCheckoutSession, DEMO_NOTICE } from "@/lib/payments/checkout";
import { sendBookingEmail } from "@/lib/email/mailer";

export const OPTIONS = preflight;
const MIN_FILL_MS = 3_000;

export async function POST(req: Request) {
  try {
    const sql = getSql();
    if (!(await rateLimit(sql, clientKey(req, "book"), 5, 600))) {
      throw new BookingError(
        "rate_limited",
        "Too many booking attempts. Please wait a few minutes and try again.",
        429,
      );
    }
    const parsed = bookingInput.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new BookingError("invalid_input", firstIssue(parsed.error));
    const input = parsed.data;

    // Bots fill hidden fields and submit instantly.
    if (input.website || (input.startedAt && Date.now() - input.startedAt < MIN_FILL_MS)) {
      throw new BookingError("rejected", "We couldn't submit your request. Please try again.");
    }

    // Guests return to the page they booked from, as long as it is on an allowed site
    // (the marketing site, or this app itself). Anything else falls back to the first allowed site.
    const origin = req.headers.get("origin") ?? "";
    const returnOrigins = [...allowedOrigins(), new URL(req.url).origin];
    const returnUrl =
      input.returnUrl && returnOrigins.includes(new URL(input.returnUrl).origin)
        ? input.returnUrl
        : returnOrigins.includes(origin)
          ? origin
          : allowedOrigins()[0];

    const usePayments = stripeEnabled();
    const { booking, quote } = await createGuestRequest(sql, input, { requirePayment: usePayments });
    const base = { reference: booking.reference, status: booking.status, quote, notice: DEMO_NOTICE };

    if (!usePayments) {
      await sendBookingEmail(sql, "received", booking);
      await sendBookingEmail(sql, "owner_new_request", booking);
      return json(req, base, { status: 201 });
    }

    const rules = await getRules(sql);
    try {
      const session = await createCheckoutSession(booking, quote, returnUrl, rules.checkoutHoldMinutes);
      await attachCheckoutSession(sql, booking.id, session.id);
      return json(req, { ...base, checkoutUrl: session.url }, { status: 201 });
    } catch (e) {
      // Free the dates if Stripe could not start checkout.
      await sql`UPDATE bookings SET status = 'expired', payment_status = 'failed' WHERE id = ${booking.id}`;
      throw e;
    }
  } catch (e) {
    return errorResponse(req, e);
  }
}
