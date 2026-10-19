import type { BookingRow } from "@/lib/booking/service";
import type { Quote } from "@/lib/booking/rules";
import { getStripe } from "./stripe";

export const DEMO_NOTICE = "Demo booking system — reservations are not real.";

/** Creates a Stripe Checkout session that authorises (does not charge) the card. */
export async function createCheckoutSession(booking: BookingRow, quote: Quote, returnUrl: string, holdMinutes: number) {
  const back = new URL(returnUrl);
  back.searchParams.set("booking", booking.reference);
  const success = new URL(back);
  success.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
  const cancel = new URL(back);
  // The booking id is an unguessable UUID, so it doubles as the token that lets this guest release the hold.
  cancel.searchParams.set("cancel", booking.id);

  return getStripe().checkout.sessions.create(
    {
      mode: "payment",
      customer_email: booking.guest_email ?? undefined,
      client_reference_id: booking.id,
      metadata: { booking_id: booking.id, reference: booking.reference },
      payment_intent_data: {
        capture_method: "manual", // charged only when staff approve
        description: `Lakeview Cabins ${booking.reference}`,
        metadata: { booking_id: booking.id, reference: booking.reference },
      },
      line_items: quote.lines.map((l) => ({
        quantity: 1,
        price_data: { currency: quote.currency, unit_amount: l.amountCents, product_data: { name: l.label } },
      })),
      custom_text: {
        submit: { message: `${DEMO_NOTICE} Your card is only authorised; it's charged once the stay is approved.` },
      },
      expires_at: Math.floor(Date.now() / 1000) + Math.max(30, holdMinutes) * 60,
      // Stripe puts the literal {CHECKOUT_SESSION_ID} placeholder back, so un-escape it
      success_url: success.toString().replace("%7BCHECKOUT_SESSION_ID%7D", "{CHECKOUT_SESSION_ID}"),
      cancel_url: cancel.toString(),
    },
    { idempotencyKey: `checkout-${booking.id}` },
  );
}
