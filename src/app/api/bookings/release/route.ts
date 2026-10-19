/** Public: the guest cancelled on Stripe Checkout, so release their hold immediately. */
import { z } from "zod";
import { BookingError, releaseUnpaidHold } from "@/lib/booking/service";
import { errorResponse, json, preflight } from "@/lib/server/http";
import { clientKey, rateLimit } from "@/lib/server/rate-limit";
import { getSql } from "@/lib/server/sql";
import { getStripe, stripeEnabled } from "@/lib/payments/stripe";

export const OPTIONS = preflight;

export async function POST(req: Request) {
  try {
    const sql = getSql();
    if (!(await rateLimit(sql, clientKey(req, "release"), 20, 600)))
      throw new BookingError("rate_limited", "Too many requests.", 429);
    const parsed = z.object({ token: z.string().uuid() }).safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new BookingError("invalid_input", "Invalid request.");
    const released = await releaseUnpaidHold(sql, parsed.data.token);
    if (released?.stripe_session_id && stripeEnabled()) {
      await getStripe()
        .checkout.sessions.expire(released.stripe_session_id)
        .catch(() => {}); // already expired/completed
    }
    return json(req, { released: Boolean(released) });
  } catch (e) {
    return errorResponse(req, e);
  }
}
