/** Public: booking rules and unavailable date ranges for the calendar. No guest data. */
import { connection } from "next/server";
import { addDays, todayIn } from "@/lib/booking/dates";
import { getAvailability, getRules } from "@/lib/booking/service";
import { errorResponse, json, preflight } from "@/lib/server/http";
import { getSql } from "@/lib/server/sql";
import { DEMO_NOTICE } from "@/lib/payments/checkout";

export const OPTIONS = preflight;

export async function GET(req: Request) {
  await connection(); // always run per request, never prerender
  try {
    const sql = getSql();
    const rules = await getRules(sql);
    const today = todayIn(rules.timezone);
    const ranges = await getAvailability(
      sql,
      addDays(today, -1),
      addDays(today, rules.bookingWindowDays + rules.maxNights),
    );
    return json(
      req,
      {
        today,
        rules: {
          currency: rules.currency,
          nightlyRateCents: rules.nightlyRateCents,
          weekendRateCents: rules.weekendRateCents,
          cleaningFeeCents: rules.cleaningFeeCents,
          breakfastCents: rules.breakfastCents,
          taxRateBp: rules.taxRateBp,
          minNights: rules.minNights,
          maxNights: rules.maxNights,
          maxGuests: rules.maxGuests,
          bookingWindowDays: rules.bookingWindowDays,
          timezone: rules.timezone,
          checkInTime: rules.checkInTime,
          checkOutTime: rules.checkOutTime,
        },
        // Dates and state only (booked / pending / blocked). Never guest details.
        unavailable: ranges,
        notice: DEMO_NOTICE,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(req, e);
  }
}
