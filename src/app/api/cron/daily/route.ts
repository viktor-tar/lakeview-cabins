/** Daily housekeeping, run by Vercel Cron. Protected by CRON_SECRET. */
import { NextResponse, connection } from "next/server";
import { expireLapsedHolds, purgeOldGuestData } from "@/lib/booking/service";
import { resetDemoData } from "@/lib/booking/demo";
import { paymentGateway } from "@/lib/payments/stripe";
import { pruneRateLimits } from "@/lib/server/rate-limit";
import { getSql } from "@/lib/server/sql";
import { purgeOldSubscribers } from "@/lib/newsletter/service";

export async function GET(req: Request) {
  await connection(); // always run per request, never prerender
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const sql = getSql();
  const payments = paymentGateway();
  const expired = await expireLapsedHolds(sql, payments);
  const purged = await purgeOldGuestData(sql, 30);
  await pruneRateLimits(sql);
  const subscribersPurged = process.env.DEMO_MODE === "true" ? await purgeOldSubscribers(sql, 30) : 0;

  let reset = null;
  if (process.env.DEMO_MODE === "true") {
    // Release any open test authorisations before wiping, so nothing is left hanging in Stripe.
    const open = await sql<{ pi: string }[]>`
      SELECT stripe_payment_intent_id AS pi FROM bookings WHERE payment_status = 'authorized' AND stripe_payment_intent_id IS NOT NULL`;
    for (const { pi } of open) await payments.release(pi).catch(() => {});
    reset = await resetDemoData(sql);
  }
  return NextResponse.json({ expired, purged, subscribersPurged, reset });
}
