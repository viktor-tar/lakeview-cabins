import nodemailer from "nodemailer";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createSql } from "../src/db";
import { addDays, todayIn } from "../src/lib/booking/dates";
import { createGuestRequest, markPaymentAuthorized } from "../src/lib/booking/service";
import { isDeliverable, sendBookingEmail, setTransportForTests } from "../src/lib/email/mailer";
import { DEMO_NOTICE, renderEmail } from "../src/lib/email/templates";

const sql = createSql(process.env.TEST_DATABASE_URL ?? "postgres://app@localhost:5433/lakeview_test");
afterAll(() => sql.end());

const d = (n: number) => addDays(todayIn("America/Vancouver"), n);
const transport = nodemailer.createTransport({ jsonTransport: true });
const sendSpy = vi.spyOn(transport, "sendMail");

beforeEach(async () => {
  await sql`TRUNCATE bookings, booking_events CASCADE`;
  sendSpy.mockClear();
  setTransportForTests(transport);
});

describe("booking emails", () => {
  it("sends 'request received' exactly once even if the payment webhook is retried", async () => {
    const { booking } = await createGuestRequest(
      sql,
      {
        checkIn: d(10),
        checkOut: d(12),
        guests: 2,
        breakfast: true,
        name: "Ada Lovelace",
        email: "ada@guest-mail.test",
      },
      { requirePayment: true },
    );
    await sql`UPDATE bookings SET stripe_session_id = 'cs_mail' WHERE id = ${booking.id}`;
    for (let i = 0; i < 2; i++) {
      const res = await markPaymentAuthorized(sql, "cs_mail", "pi_mail");
      if (res.newlyAuthorized) await sendBookingEmail(sql, "received", res.booking);
    }
    expect(sendSpy).toHaveBeenCalledTimes(1);
    const mail = sendSpy.mock.calls[0][0] as { to: string; subject: string; text: string; html: string };
    expect(mail.to).toBe("ada@guest-mail.test");
    expect(mail.subject).toContain(booking.reference);
    expect(mail.text).toContain("Hi Ada,");
    expect(mail.text).toContain("breakfast included");
    expect(mail.text).toContain(DEMO_NOTICE);
  });

  it("never emails sample-data or purged addresses", async () => {
    expect(isDeliverable("maya.thompson@example.com")).toBe(false);
    expect(isDeliverable("removed@example.invalid")).toBe(false);
    expect(isDeliverable("guest@gmail.com")).toBe(true);
    const { booking } = await createGuestRequest(
      sql,
      {
        checkIn: d(20),
        checkOut: d(22),
        guests: 1,
        breakfast: false,
        name: "Sample",
        email: "sample@example.com",
      },
      { requirePayment: false },
    );
    expect(await sendBookingEmail(sql, "received", booking)).toBe(false);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("does nothing when email isn't configured", async () => {
    setTransportForTests(null);
    const { booking } = await createGuestRequest(
      sql,
      {
        checkIn: d(30),
        checkOut: d(32),
        guests: 1,
        breakfast: false,
        name: "No Mail",
        email: "guest@gmail.com",
      },
      { requirePayment: false },
    );
    expect(await sendBookingEmail(sql, "approved", booking)).toBe(false);
  });

  it("escapes guest-provided text in the HTML", async () => {
    const { booking } = await createGuestRequest(
      sql,
      {
        checkIn: d(40),
        checkOut: d(42),
        guests: 1,
        breakfast: false,
        name: "<script>x</script>",
        email: "guest@gmail.com",
        message: "<b>hi</b>",
      },
      { requirePayment: false },
    );
    const owner = renderEmail("owner_new_request", booking, {
      checkInTime: "16:00",
      checkOutTime: "11:00",
      siteName: "Lakeview Cabins",
    });
    expect(owner.html).not.toContain("<script>");
    expect(owner.html).toContain("&lt;b&gt;hi&lt;/b&gt;");
  });
});
