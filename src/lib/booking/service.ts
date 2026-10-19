/**
 * Booking service: every operation that reads or changes reservations.
 *
 * Concurrency model
 * - The database's bookings_no_overlap EXCLUDE constraint is the final authority:
 *   two active (pending/approved) stays can never overlap, even under simultaneous requests.
 * - Holds expire lazily: an expired pending hold is ignored by availability queries and is
 *   marked 'expired' inside the same transaction that needs its dates. A daily cron tidies up.
 * - Payment side effects (capture/release/refund) go through an injected PaymentGateway so the
 *   logic is testable without Stripe.
 */
import type { Sql, TransactionSql } from "postgres";
import { makeReference, quoteStay, validateStay, type Quote, type Rules, type StayRequest } from "./rules";
import type { IsoDate } from "./dates";

type Tx = Sql | TransactionSql;

export interface PaymentGateway {
  capture(paymentIntentId: string): Promise<void>;
  release(paymentIntentId: string): Promise<void>; // cancel an uncaptured authorisation
  refund(paymentIntentId: string): Promise<void>;
}

export class BookingError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export interface BookingRow {
  id: string;
  reference: string;
  kind: "reservation" | "block";
  status: "pending" | "approved" | "declined" | "cancelled" | "expired";
  source: "guest" | "staff" | "seed";
  check_in: IsoDate;
  check_out: IsoDate;
  guests: number | null;
  breakfast: boolean;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  message: string | null;
  nights: number | null;
  total_cents: number | null;
  currency: string;
  payment_status: "none" | "awaiting" | "authorized" | "captured" | "released" | "refunded" | "failed";
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  hold_expires_at: Date | null;
  note: string | null;
  created_at: Date;
  decided_at: Date | null;
  decided_by: string | null;
}

const EXCLUSION_VIOLATION = "23P01";

function isOverlapError(err: unknown) {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === EXCLUSION_VIOLATION;
}

// Dates come back from postgres.js as strings because we cast with ::text in every select.
const BOOKING_COLUMNS = `
  id, reference, kind, status, source, check_in::text AS check_in, check_out::text AS check_out,
  guests, breakfast, guest_name, guest_email, guest_phone, message, nights, total_cents, currency,
  payment_status, stripe_session_id, stripe_payment_intent_id, hold_expires_at, note,
  created_at, decided_at, decided_by`;

export async function getRules(
  sql: Tx,
): Promise<Rules & { holdHours: number; checkoutHoldMinutes: number; checkInTime: string; checkOutTime: string }> {
  const [s] = await sql`SELECT * FROM settings WHERE id = 1`;
  return {
    currency: s.currency,
    timezone: s.timezone,
    nightlyRateCents: s.nightly_rate_cents,
    weekendRateCents: s.weekend_rate_cents,
    cleaningFeeCents: s.cleaning_fee_cents,
    breakfastCents: s.breakfast_cents,
    taxRateBp: s.tax_rate_bp,
    minNights: s.min_nights,
    maxNights: s.max_nights,
    maxGuests: s.max_guests,
    bookingWindowDays: s.booking_window_days,
    holdHours: s.hold_hours,
    checkoutHoldMinutes: s.checkout_hold_minutes,
    checkInTime: s.check_in_time,
    checkOutTime: s.check_out_time,
  };
}

async function logEvent(sql: Tx, bookingId: string, type: string, actor: string, data?: object) {
  await sql`INSERT INTO booking_events (booking_id, type, actor, data) VALUES (${bookingId}, ${type}, ${actor}, ${data ? JSON.stringify(data) : null}::jsonb)`;
}

/** Marks expired holds that overlap a date range as 'expired', freeing their dates. */
async function expireStaleHoldsIn(sql: Tx, checkIn: IsoDate, checkOut: IsoDate) {
  const rows = await sql<{ id: string }[]>`
    UPDATE bookings SET status = 'expired', updated_at = now()
    WHERE status = 'pending' AND hold_expires_at IS NOT NULL AND hold_expires_at < now()
      AND stay && daterange(${checkIn}::date, ${checkOut}::date, '[)')
    RETURNING id`;
  for (const r of rows) await logEvent(sql, r.id, "expired", "system");
  return rows.map((r) => r.id);
}

export interface AvailabilityRange {
  checkIn: IsoDate;
  checkOut: IsoDate;
  state: "booked" | "pending" | "blocked";
}

/** Public availability: only date ranges and their state, never guest details. */
export async function getAvailability(sql: Tx, from: IsoDate, to: IsoDate): Promise<AvailabilityRange[]> {
  const rows = await sql<{ check_in: string; check_out: string; kind: string; status: string }[]>`
    SELECT check_in::text, check_out::text, kind, status FROM bookings
    WHERE status IN ('pending', 'approved')
      AND NOT (status = 'pending' AND hold_expires_at IS NOT NULL AND hold_expires_at < now())
      AND stay && daterange(${from}::date, ${to}::date, '[)')
    ORDER BY check_in`;
  return rows.map((r) => ({
    checkIn: r.check_in,
    checkOut: r.check_out,
    state: r.kind === "block" ? "blocked" : r.status === "approved" ? "booked" : "pending",
  }));
}

export interface GuestRequestInput extends StayRequest {
  name: string;
  email: string;
  phone?: string;
  message?: string;
}

/** Creates a pending request that holds the dates while the guest completes test checkout. */
export async function createGuestRequest(
  sql: Sql,
  input: GuestRequestInput,
  opts: { requirePayment: boolean; now?: Date } = { requirePayment: true },
): Promise<{ booking: BookingRow; quote: Quote }> {
  const rules = await getRules(sql);
  const err = validateStay(input, rules, opts.now);
  if (err) throw new BookingError(err.code, err.message);
  const quote = quoteStay(input, rules);

  try {
    return await sql.begin(async (tx) => {
      await expireStaleHoldsIn(tx, input.checkIn, input.checkOut);
      // A couple of spare minutes so the hold outlives the Stripe Checkout session it covers.
      const holdMinutes = opts.requirePayment ? rules.checkoutHoldMinutes + 2 : rules.holdHours * 60;
      const [booking] = await tx<BookingRow[]>`
        INSERT INTO bookings (
          reference, kind, status, source, check_in, check_out, guests, breakfast,
          guest_name, guest_email, guest_phone, message,
          nights, accommodation_cents, cleaning_cents, breakfast_cents, tax_cents, total_cents, currency,
          payment_status, hold_expires_at)
        VALUES (
          ${makeReference()}, 'reservation', 'pending', 'guest', ${input.checkIn}, ${input.checkOut},
          ${input.guests}, ${input.breakfast}, ${input.name}, ${input.email}, ${input.phone ?? null}, ${input.message ?? null},
          ${quote.nights}, ${quote.accommodationCents}, ${quote.cleaningCents}, ${quote.breakfastCents}, ${quote.taxCents},
          ${quote.totalCents}, ${quote.currency}, ${opts.requirePayment ? "awaiting" : "none"},
          now() + make_interval(mins => ${holdMinutes}))
        RETURNING ${tx.unsafe(BOOKING_COLUMNS)}`;
      await logEvent(tx, booking.id, "requested", "guest", { totalCents: quote.totalCents });
      return { booking, quote };
    });
  } catch (e) {
    if (isOverlapError(e)) {
      throw new BookingError("unavailable", "Sorry, those dates were just taken. Please choose different dates.", 409);
    }
    throw e;
  }
}

/** Guest left Stripe Checkout without paying: free the dates now. Returns the session to expire, if any. */
export async function releaseUnpaidHold(sql: Sql, bookingId: string) {
  const rows = await sql<{ id: string; stripe_session_id: string | null }[]>`
    UPDATE bookings SET status = 'expired', payment_status = 'failed', updated_at = now()
    WHERE id = ${bookingId} AND status = 'pending' AND payment_status = 'awaiting'
    RETURNING id, stripe_session_id`;
  for (const r of rows) await logEvent(sql, r.id, "checkout_cancelled", "guest");
  return rows[0] ?? null;
}

export async function attachCheckoutSession(sql: Tx, bookingId: string, sessionId: string) {
  await sql`UPDATE bookings SET stripe_session_id = ${sessionId}, updated_at = now() WHERE id = ${bookingId}`;
}

/**
 * Called from the Stripe webhook once the card is authorised (not charged).
 * Extends the hold to the staff review window. If the hold had already lapsed,
 * the authorisation must be released by the caller.
 */
export async function markPaymentAuthorized(sql: Sql, sessionId: string, paymentIntentId: string) {
  return sql.begin(async (tx) => {
    const rules = await getRules(tx);
    const [b] = await tx<BookingRow[]>`
      SELECT ${tx.unsafe(BOOKING_COLUMNS)} FROM bookings WHERE stripe_session_id = ${sessionId} FOR UPDATE`;
    if (!b) throw new BookingError("not_found", "Booking not found for this checkout session.", 404);
    if (b.payment_status === "authorized") return { booking: b, releaseNeeded: false, newlyAuthorized: false }; // webhook retry

    const stillHeld = b.status === "pending" && (!b.hold_expires_at || b.hold_expires_at > new Date());
    if (!stillHeld) {
      await tx`UPDATE bookings SET stripe_payment_intent_id = ${paymentIntentId}, payment_status = 'released', updated_at = now() WHERE id = ${b.id}`;
      await logEvent(tx, b.id, "payment_released", "system", { reason: "hold_lapsed" });
      return { booking: b, releaseNeeded: true, newlyAuthorized: false };
    }
    const [updated] = await tx<BookingRow[]>`
      UPDATE bookings SET stripe_payment_intent_id = ${paymentIntentId}, payment_status = 'authorized',
        hold_expires_at = now() + make_interval(hours => ${rules.holdHours}), updated_at = now()
      WHERE id = ${b.id} RETURNING ${tx.unsafe(BOOKING_COLUMNS)}`;
    await logEvent(tx, b.id, "payment_authorized", "guest");
    return { booking: updated, releaseNeeded: false, newlyAuthorized: true };
  });
}

/** Guest abandoned or Stripe expired the checkout session: free the dates immediately. */
export async function markCheckoutExpired(sql: Sql, sessionId: string) {
  const rows = await sql<{ id: string }[]>`
    UPDATE bookings SET status = 'expired', payment_status = 'failed', updated_at = now()
    WHERE stripe_session_id = ${sessionId} AND status = 'pending' AND payment_status = 'awaiting'
    RETURNING id`;
  for (const r of rows) await logEvent(sql, r.id, "checkout_expired", "system");
}

async function lockBooking(tx: Tx, id: string): Promise<BookingRow> {
  const [b] = await tx<BookingRow[]>`SELECT ${tx.unsafe(BOOKING_COLUMNS)} FROM bookings WHERE id = ${id} FOR UPDATE`;
  if (!b) throw new BookingError("not_found", "Booking not found.", 404);
  return b;
}

export async function approveBooking(sql: Sql, id: string, actor: string, payments: PaymentGateway) {
  return sql.begin(async (tx) => {
    const b = await lockBooking(tx, id);
    if (b.status !== "pending")
      throw new BookingError("invalid_state", `Only pending requests can be approved (this one is ${b.status}).`, 409);
    if (b.hold_expires_at && b.hold_expires_at < new Date()) {
      await tx`UPDATE bookings SET status = 'expired', updated_at = now() WHERE id = ${id}`;
      await logEvent(tx, id, "expired", "system");
      throw new BookingError("expired", "This request's hold has expired, so it can no longer be approved.", 409);
    }
    if (b.payment_status === "awaiting")
      throw new BookingError("unpaid", "The guest hasn't completed checkout yet.", 409);
    if (b.payment_status === "authorized" && b.stripe_payment_intent_id) {
      await payments.capture(b.stripe_payment_intent_id);
    }
    const [updated] = await tx<BookingRow[]>`
      UPDATE bookings SET status = 'approved', hold_expires_at = NULL, decided_at = now(), decided_by = ${actor},
        payment_status = CASE WHEN payment_status = 'authorized' THEN 'captured'::payment_status ELSE payment_status END,
        updated_at = now()
      WHERE id = ${id} RETURNING ${tx.unsafe(BOOKING_COLUMNS)}`;
    await logEvent(tx, id, "approved", actor);
    return updated;
  });
}

export async function declineBooking(sql: Sql, id: string, actor: string, payments: PaymentGateway, reason?: string) {
  return sql.begin(async (tx) => {
    const b = await lockBooking(tx, id);
    if (b.status !== "pending")
      throw new BookingError("invalid_state", `Only pending requests can be declined (this one is ${b.status}).`, 409);
    if (b.payment_status === "authorized" && b.stripe_payment_intent_id) {
      await payments.release(b.stripe_payment_intent_id);
    }
    const [updated] = await tx<BookingRow[]>`
      UPDATE bookings SET status = 'declined', hold_expires_at = NULL, decided_at = now(), decided_by = ${actor},
        payment_status = CASE WHEN payment_status = 'authorized' THEN 'released'::payment_status ELSE payment_status END,
        note = COALESCE(${reason ?? null}, note), updated_at = now()
      WHERE id = ${id} RETURNING ${tx.unsafe(BOOKING_COLUMNS)}`;
    await logEvent(tx, id, "declined", actor, reason ? { reason } : undefined);
    return updated;
  });
}

export async function cancelBooking(sql: Sql, id: string, actor: string, payments: PaymentGateway, reason?: string) {
  return sql.begin(async (tx) => {
    const b = await lockBooking(tx, id);
    if (b.status !== "pending" && b.status !== "approved") {
      throw new BookingError("invalid_state", `This booking is already ${b.status}.`, 409);
    }
    let paymentStatus = b.payment_status;
    if (b.stripe_payment_intent_id) {
      if (b.payment_status === "authorized") {
        await payments.release(b.stripe_payment_intent_id);
        paymentStatus = "released";
      }
      if (b.payment_status === "captured") {
        await payments.refund(b.stripe_payment_intent_id);
        paymentStatus = "refunded";
      }
    }
    const [updated] = await tx<BookingRow[]>`
      UPDATE bookings SET status = 'cancelled', hold_expires_at = NULL, decided_at = now(), decided_by = ${actor},
        payment_status = ${paymentStatus}, note = COALESCE(${reason ?? null}, note), updated_at = now()
      WHERE id = ${id} RETURNING ${tx.unsafe(BOOKING_COLUMNS)}`;
    await logEvent(tx, id, b.kind === "block" ? "unblocked" : "cancelled", actor, reason ? { reason } : undefined);
    return updated;
  });
}

/** Staff-created booking (phone/email reservation). Skips payment, respects the overlap rule. */
export async function createStaffBooking(sql: Sql, input: GuestRequestInput, actor: string) {
  const rules = await getRules(sql);
  // Staff may book any future dates, but basic validation still applies.
  const err = validateStay(input, { ...rules, minNights: 1 });
  if (err) throw new BookingError(err.code, err.message);
  const quote = quoteStay(input, rules);
  try {
    return await sql.begin(async (tx) => {
      await expireStaleHoldsIn(tx, input.checkIn, input.checkOut);
      const [b] = await tx<BookingRow[]>`
        INSERT INTO bookings (reference, kind, status, source, check_in, check_out, guests, breakfast,
          guest_name, guest_email, guest_phone, message, nights, accommodation_cents, cleaning_cents,
          breakfast_cents, tax_cents, total_cents, currency, decided_at, decided_by)
        VALUES (${makeReference()}, 'reservation', 'approved', 'staff', ${input.checkIn}, ${input.checkOut},
          ${input.guests}, ${input.breakfast}, ${input.name}, ${input.email}, ${input.phone ?? null}, ${input.message ?? null},
          ${quote.nights}, ${quote.accommodationCents}, ${quote.cleaningCents}, ${quote.breakfastCents}, ${quote.taxCents},
          ${quote.totalCents}, ${quote.currency}, now(), ${actor})
        RETURNING ${tx.unsafe(BOOKING_COLUMNS)}`;
      await logEvent(tx, b.id, "created_by_staff", actor);
      return b;
    });
  } catch (e) {
    if (isOverlapError(e))
      throw new BookingError("unavailable", "Those dates overlap an existing booking, request or block.", 409);
    throw e;
  }
}

export async function blockDates(sql: Sql, checkIn: IsoDate, checkOut: IsoDate, actor: string, reason?: string) {
  if (!(checkOut > checkIn)) throw new BookingError("invalid_dates", "The end date must be after the start date.");
  try {
    return await sql.begin(async (tx) => {
      await expireStaleHoldsIn(tx, checkIn, checkOut);
      const [b] = await tx<BookingRow[]>`
        INSERT INTO bookings (reference, kind, status, source, check_in, check_out, note, decided_at, decided_by)
        VALUES (${makeReference()}, 'block', 'approved', 'staff', ${checkIn}, ${checkOut}, ${reason ?? null}, now(), ${actor})
        RETURNING ${tx.unsafe(BOOKING_COLUMNS)}`;
      await logEvent(tx, b.id, "blocked", actor, reason ? { reason } : undefined);
      return b;
    });
  } catch (e) {
    if (isOverlapError(e))
      throw new BookingError("unavailable", "Those dates overlap an existing booking, request or block.", 409);
    throw e;
  }
}

/** Daily housekeeping: expire lapsed holds and release their card authorisations. */
export async function expireLapsedHolds(sql: Sql, payments: PaymentGateway) {
  const rows = await sql<{ id: string; stripe_payment_intent_id: string | null; payment_status: string }[]>`
    UPDATE bookings SET status = 'expired', updated_at = now()
    WHERE status = 'pending' AND hold_expires_at IS NOT NULL AND hold_expires_at < now()
    RETURNING id, stripe_payment_intent_id, payment_status`;
  for (const r of rows) {
    if (r.payment_status === "authorized" && r.stripe_payment_intent_id) {
      try {
        await payments.release(r.stripe_payment_intent_id);
        await sql`UPDATE bookings SET payment_status = 'released' WHERE id = ${r.id}`;
      } catch {
        /* Stripe auto-releases uncaptured authorisations after ~7 days anyway */
      }
    }
    await logEvent(sql, r.id, "expired", "system");
  }
  return rows.length;
}

/** Privacy: remove guest personal data from finished bookings older than the retention period. */
export async function purgeOldGuestData(sql: Sql, retentionDays = 30) {
  const rows = await sql`
    UPDATE bookings SET guest_name = 'Removed guest', guest_email = 'removed@example.invalid', guest_phone = NULL, message = NULL
    WHERE kind = 'reservation' AND source = 'guest' AND guest_email <> 'removed@example.invalid'
      AND created_at < now() - make_interval(days => ${retentionDays})
      AND (status NOT IN ('pending', 'approved') OR check_out < CURRENT_DATE)
    RETURNING id`;
  return rows.length;
}

export interface ListFilters {
  status?: BookingRow["status"] | "active" | "all";
  search?: string;
  from?: IsoDate;
  to?: IsoDate;
  limit?: number;
}

export async function listBookings(sql: Tx, f: ListFilters = {}) {
  const status = f.status ?? "all";
  const search = f.search?.trim() ? `%${f.search.trim()}%` : null;
  return sql<BookingRow[]>`
    SELECT ${sql.unsafe(BOOKING_COLUMNS)} FROM bookings
    WHERE (${status} = 'all'
        OR (${status} = 'active' AND status IN ('pending','approved'))
        OR status::text = ${status})
      AND (${search}::text IS NULL OR reference ILIKE ${search} OR guest_name ILIKE ${search} OR guest_email ILIKE ${search})
      AND (${f.from ?? null}::date IS NULL OR check_out > ${f.from ?? null}::date)
      AND (${f.to ?? null}::date IS NULL OR check_in < ${f.to ?? null}::date)
    ORDER BY CASE WHEN status = 'pending' THEN 0 ELSE 1 END, check_in
    LIMIT ${f.limit ?? 200}`;
}

export async function getBooking(sql: Tx, id: string) {
  const [b] = await sql<BookingRow[]>`SELECT ${sql.unsafe(BOOKING_COLUMNS)} FROM bookings WHERE id = ${id}`;
  if (!b) throw new BookingError("not_found", "Booking not found.", 404);
  const events = await sql<{ type: string; actor: string; data: unknown; created_at: Date }[]>`
    SELECT type, actor, data, created_at FROM booking_events WHERE booking_id = ${id} ORDER BY created_at`;
  return { booking: b, events };
}

export async function getBookingByReference(sql: Tx, reference: string) {
  const [b] = await sql<
    BookingRow[]
  >`SELECT ${sql.unsafe(BOOKING_COLUMNS)} FROM bookings WHERE reference = ${reference}`;
  return b ?? null;
}
