/**
 * Integration tests against a real Postgres (TEST_DATABASE_URL), because the
 * double-booking guarantee lives in the database constraint.
 */
import postgres from "postgres";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { addDays, todayIn } from "../src/lib/booking/dates";
import {
  approveBooking,
  blockDates,
  cancelBooking,
  createGuestRequest,
  createStaffBooking,
  declineBooking,
  expireLapsedHolds,
  getAvailability,
  getBooking,
  listBookings,
  markCheckoutExpired,
  markPaymentAuthorized,
  purgeOldGuestData,
  type PaymentGateway,
} from "../src/lib/booking/service";

const url = process.env.TEST_DATABASE_URL ?? "postgres://app@localhost:5433/lakeview_test";
const sql = postgres(url, { max: 20, onnotice: () => {}, prepare: false /* same as production (Neon pooler) */ });
afterAll(() => sql.end());

const today = todayIn("America/Vancouver");
const d = (n: number) => addDays(today, n);
const guest = (
  checkIn: string,
  checkOut: string,
  extra: Partial<{ guests: number; name: string; email: string }> = {},
) => ({
  checkIn,
  checkOut,
  guests: 2,
  breakfast: false,
  name: "Test Guest",
  email: "guest@example.com",
  ...extra,
});
const fakePayments = () =>
  ({
    capture: vi.fn(async () => {}),
    release: vi.fn(async () => {}),
    refund: vi.fn(async () => {}),
  }) satisfies PaymentGateway;

async function authorised(checkIn: string, checkOut: string) {
  const { booking } = await createGuestRequest(sql, guest(checkIn, checkOut), { requirePayment: true });
  await sql`UPDATE bookings SET stripe_session_id = ${"cs_" + booking.id} WHERE id = ${booking.id}`;
  await markPaymentAuthorized(sql, "cs_" + booking.id, "pi_" + booking.id);
  return booking.id;
}

beforeEach(async () => {
  await sql`TRUNCATE bookings, booking_events, stripe_events, rate_limits CASCADE`;
});

describe("double-booking protection", () => {
  it("lets exactly one of 15 simultaneous overlapping requests through", async () => {
    const attempts = Array.from({ length: 15 }, (_, i) =>
      createGuestRequest(sql, guest(d(10 + (i % 3)), d(14 + (i % 3)), { email: `g${i}@example.com` }), {
        requirePayment: true,
      }),
    );
    const results = await Promise.allSettled(attempts);
    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(ok).toHaveLength(1);
    expect(failed.every((r) => r.reason.code === "unavailable" && r.reason.status === 409)).toBe(true);
    const [{ count }] = await sql`SELECT count(*)::int FROM bookings WHERE status IN ('pending','approved')`;
    expect(count).toBe(1);
  });

  it("allows back-to-back stays (check-out day = next check-in day)", async () => {
    await createGuestRequest(sql, guest(d(10), d(12)), { requirePayment: false });
    await expect(createGuestRequest(sql, guest(d(12), d(14)), { requirePayment: false })).resolves.toBeTruthy();
    await expect(createGuestRequest(sql, guest(d(8), d(10)), { requirePayment: false })).resolves.toBeTruthy();
  });

  it("rejects a stay that overlaps by a single night", async () => {
    await createGuestRequest(sql, guest(d(10), d(12)), { requirePayment: false });
    await expect(createGuestRequest(sql, guest(d(11), d(13)), { requirePayment: false })).rejects.toMatchObject({
      code: "unavailable",
    });
  });

  it("blocked dates cannot be booked, and bookings cannot be blocked over", async () => {
    await blockDates(sql, d(20), d(25), "staff@test", "Maintenance");
    await expect(createGuestRequest(sql, guest(d(22), d(24)), { requirePayment: false })).rejects.toMatchObject({
      code: "unavailable",
    });
    await createGuestRequest(sql, guest(d(30), d(32)), { requirePayment: false });
    await expect(blockDates(sql, d(31), d(33), "staff@test")).rejects.toMatchObject({ code: "unavailable" });
    await expect(createStaffBooking(sql, guest(d(24), d(26)), "staff@test")).rejects.toMatchObject({
      code: "unavailable",
    });
  });

  it("server re-validates rules, never trusting the client", async () => {
    await expect(createGuestRequest(sql, guest(d(10), d(11)), { requirePayment: false })).rejects.toMatchObject({
      code: "min_nights",
    });
    await expect(createGuestRequest(sql, guest(d(-2), d(1)), { requirePayment: false })).rejects.toMatchObject({
      code: "in_past",
    });
    await expect(
      createGuestRequest(sql, guest(d(10), d(12), { guests: 9 }), { requirePayment: false }),
    ).rejects.toMatchObject({ code: "guests" });
  });
});

describe("holds", () => {
  it("an expired hold frees its dates for the next guest", async () => {
    const { booking: first } = await createGuestRequest(sql, guest(d(10), d(13)), { requirePayment: true });
    await sql`UPDATE bookings SET hold_expires_at = now() - interval '1 minute' WHERE id = ${first.id}`;
    expect(await getAvailability(sql, d(0), d(60))).toHaveLength(0);
    await expect(createGuestRequest(sql, guest(d(11), d(14)), { requirePayment: true })).resolves.toBeTruthy();
    const { booking } = await getBooking(sql, first.id);
    expect(booking.status).toBe("expired");
  });

  it("an abandoned Stripe checkout frees the dates immediately", async () => {
    const { booking } = await createGuestRequest(sql, guest(d(10), d(13)), { requirePayment: true });
    await sql`UPDATE bookings SET stripe_session_id = 'cs_abandoned' WHERE id = ${booking.id}`;
    await markCheckoutExpired(sql, "cs_abandoned");
    await expect(createGuestRequest(sql, guest(d(10), d(13)), { requirePayment: true })).resolves.toBeTruthy();
  });

  it("payment authorisation extends the hold to the 48 h review window, and webhook retries are harmless", async () => {
    const id = await authorised(d(10), d(13));
    const { booking } = await getBooking(sql, id);
    expect(booking.payment_status).toBe("authorized");
    const hours = (booking.hold_expires_at!.getTime() - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(47.9);
    const again = await markPaymentAuthorized(sql, "cs_" + id, "pi_" + id);
    expect(again.releaseNeeded).toBe(false);
  });

  it("an authorisation arriving after the hold lapsed is flagged for release", async () => {
    const { booking } = await createGuestRequest(sql, guest(d(10), d(13)), { requirePayment: true });
    await sql`UPDATE bookings SET stripe_session_id = 'cs_late', hold_expires_at = now() - interval '1 minute' WHERE id = ${booking.id}`;
    const res = await markPaymentAuthorized(sql, "cs_late", "pi_late");
    expect(res.releaseNeeded).toBe(true);
  });

  it("the daily job expires lapsed holds and releases their authorisations", async () => {
    const id = await authorised(d(10), d(13));
    await sql`UPDATE bookings SET hold_expires_at = now() - interval '1 minute' WHERE id = ${id}`;
    const payments = fakePayments();
    expect(await expireLapsedHolds(sql, payments)).toBe(1);
    expect(payments.release).toHaveBeenCalledWith("pi_" + id);
    expect((await getBooking(sql, id)).booking).toMatchObject({ status: "expired", payment_status: "released" });
  });
});

describe("staff decisions", () => {
  it("approve captures the authorised payment", async () => {
    const id = await authorised(d(10), d(13));
    const payments = fakePayments();
    const b = await approveBooking(sql, id, "staff@test", payments);
    expect(payments.capture).toHaveBeenCalledWith("pi_" + id);
    expect(b).toMatchObject({
      status: "approved",
      payment_status: "captured",
      decided_by: "staff@test",
      hold_expires_at: null,
    });
    const { events } = await getBooking(sql, id);
    expect(events.map((e) => e.type)).toEqual(["requested", "payment_authorized", "approved"]);
  });

  it("cannot approve before the guest has paid, or approve twice", async () => {
    const { booking } = await createGuestRequest(sql, guest(d(10), d(13)), { requirePayment: true });
    await expect(approveBooking(sql, booking.id, "s", fakePayments())).rejects.toMatchObject({ code: "unpaid" });
    const id = await authorised(d(20), d(23));
    await approveBooking(sql, id, "s", fakePayments());
    await expect(approveBooking(sql, id, "s", fakePayments())).rejects.toMatchObject({ code: "invalid_state" });
  });

  it("cannot approve an expired request", async () => {
    const id = await authorised(d(10), d(13));
    await sql`UPDATE bookings SET hold_expires_at = now() - interval '1 minute' WHERE id = ${id}`;
    await expect(approveBooking(sql, id, "s", fakePayments())).rejects.toMatchObject({ code: "expired" });
  });

  it("decline releases the authorisation and frees the dates", async () => {
    const id = await authorised(d(10), d(13));
    const payments = fakePayments();
    const b = await declineBooking(sql, id, "s", payments, "Dates reserved for owner");
    expect(payments.release).toHaveBeenCalledOnce();
    expect(b).toMatchObject({ status: "declined", payment_status: "released" });
    await expect(createGuestRequest(sql, guest(d(10), d(13)), { requirePayment: false })).resolves.toBeTruthy();
  });

  it("cancelling an approved booking refunds it and frees the dates", async () => {
    const id = await authorised(d(10), d(13));
    await approveBooking(sql, id, "s", fakePayments());
    const payments = fakePayments();
    const b = await cancelBooking(sql, id, "s", payments);
    expect(payments.refund).toHaveBeenCalledWith("pi_" + id);
    expect(b).toMatchObject({ status: "cancelled", payment_status: "refunded" });
    await expect(createGuestRequest(sql, guest(d(10), d(13)), { requirePayment: false })).resolves.toBeTruthy();
  });

  it("unblocking dates makes them bookable again", async () => {
    const block = await blockDates(sql, d(20), d(25), "s");
    await cancelBooking(sql, block.id, "s", fakePayments());
    await expect(createGuestRequest(sql, guest(d(20), d(25)), { requirePayment: false })).resolves.toBeTruthy();
  });

  it("staff bookings are approved immediately and may be a single night", async () => {
    const b = await createStaffBooking(sql, guest(d(5), d(6)), "s");
    expect(b).toMatchObject({ status: "approved", source: "staff", nights: 1 });
  });
});

describe("availability and listing", () => {
  it("public availability exposes only dates and state, no guest details", async () => {
    await createGuestRequest(sql, guest(d(10), d(12)), { requirePayment: false });
    const id = await authorised(d(20), d(23));
    await approveBooking(sql, id, "s", fakePayments());
    await blockDates(sql, d(30), d(31), "s");
    const ranges = await getAvailability(sql, d(0), d(60));
    expect(ranges).toEqual([
      { checkIn: d(10), checkOut: d(12), state: "pending" },
      { checkIn: d(20), checkOut: d(23), state: "booked" },
      { checkIn: d(30), checkOut: d(31), state: "blocked" },
    ]);
    expect(JSON.stringify(ranges)).not.toContain("example.com");
  });

  it("staff list supports status filters and search", async () => {
    await createGuestRequest(sql, guest(d(10), d(12), { name: "Ada Lovelace", email: "ada@example.com" }), {
      requirePayment: false,
    });
    const id = await authorised(d(20), d(23));
    await approveBooking(sql, id, "s", fakePayments());
    expect(await listBookings(sql, { status: "pending" })).toHaveLength(1);
    expect(await listBookings(sql, { status: "active" })).toHaveLength(2);
    expect((await listBookings(sql, { search: "lovelace" }))[0].guest_name).toBe("Ada Lovelace");
    expect(await listBookings(sql, { from: d(15), to: d(40) })).toHaveLength(1);
  });

  it("removes guest personal data from finished bookings after 30 days", async () => {
    const { booking } = await createGuestRequest(sql, guest(d(10), d(12)), { requirePayment: false });
    await sql`UPDATE bookings SET status = 'declined', created_at = now() - interval '31 days' WHERE id = ${booking.id}`;
    const { booking: upcoming } = await createGuestRequest(sql, guest(d(20), d(22)), { requirePayment: false });
    await sql`UPDATE bookings SET created_at = now() - interval '31 days' WHERE id = ${upcoming.id}`;
    expect(await purgeOldGuestData(sql)).toBe(1);
    expect((await getBooking(sql, booking.id)).booking.guest_email).toBe("removed@example.invalid");
    expect((await getBooking(sql, upcoming.id)).booking.guest_email).toBe("guest@example.com"); // still upcoming: kept
  });
});

describe("cancelled checkout", () => {
  it("releases an unpaid hold immediately, but never a paid one", async () => {
    const { releaseUnpaidHold } = await import("../src/lib/booking/service");
    const { booking } = await createGuestRequest(sql, guest(d(10), d(13)), { requirePayment: true });
    expect(await releaseUnpaidHold(sql, booking.id)).toBeTruthy();
    await expect(createGuestRequest(sql, guest(d(10), d(13)), { requirePayment: true })).resolves.toBeTruthy();
    const paid = await authorised(d(20), d(23));
    expect(await releaseUnpaidHold(sql, paid)).toBeNull();
    expect((await getBooking(sql, paid)).booking.status).toBe("pending");
  });
});
