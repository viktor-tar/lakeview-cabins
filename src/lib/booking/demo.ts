/**
 * Demo data. The nightly cron wipes all reservations and recreates a believable
 * calendar relative to "today", so visitors always see a realistic, current schedule.
 * All guests are fictional; emails use the reserved example.com domain.
 */
import type { Sql } from "postgres";
import bcrypt from "bcryptjs";
import { addDays, todayIn, type IsoDate } from "./dates";
import { getRules } from "./service";
import { makeReference, quoteStay } from "./rules";

export const DEMO_STAFF = { email: "demo@lakeview-cabins.com", name: "Demo Staff", password: "lakeview-demo" };

type SeedStay = {
  start: number;
  nights: number;
  guests: number;
  breakfast: boolean;
  name: string;
  status: "approved" | "pending";
  message?: string;
};
type SeedBlock = { start: number; nights: number; note: string };

const STAYS: SeedStay[] = [
  { start: 3, nights: 3, guests: 2, breakfast: true, name: "Maya Thompson", status: "approved" },
  {
    start: 9,
    nights: 2,
    guests: 4,
    breakfast: false,
    name: "Liam & Chloe Bennett",
    status: "approved",
    message: "Travelling with two kids",
  },
  {
    start: 16,
    nights: 5,
    guests: 2,
    breakfast: true,
    name: "Noah Fischer",
    status: "pending",
    message: "Anniversary trip — is the canoe available?",
  },
  { start: 27, nights: 4, guests: 3, breakfast: false, name: "Sofia Alvarez", status: "approved" },
  { start: 38, nights: 2, guests: 2, breakfast: true, name: "Ethan Park", status: "pending" },
  { start: 47, nights: 7, guests: 4, breakfast: true, name: "The Okafor family", status: "approved" },
  {
    start: 62,
    nights: 3,
    guests: 1,
    breakfast: false,
    name: "Hannah Laurent",
    status: "approved",
    message: "Writing retreat, quiet week please",
  },
  { start: 75, nights: 2, guests: 2, breakfast: false, name: "Oliver Grant", status: "approved" },
];
const BLOCKS: SeedBlock[] = [
  { start: 22, nights: 2, note: "Dock maintenance" },
  { start: 56, nights: 3, note: "Owner stay" },
];

const emailFor = (name: string) =>
  name
    .toLowerCase()
    .replace(/^the /, "")
    .replace(/[^a-z]+/g, ".")
    .replace(/^\.|\.$/g, "") + "@example.com";

export async function ensureDemoStaff(sql: Sql) {
  const hash = await bcrypt.hash(DEMO_STAFF.password, 10);
  await sql`
    INSERT INTO staff_users (email, name, password_hash, role, is_demo)
    VALUES (${DEMO_STAFF.email}, ${DEMO_STAFF.name}, ${hash}, 'staff', true)
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, is_demo = true`;
}

/** Deletes every booking and recreates the demo calendar. Staff accounts and settings are kept. */
export async function resetDemoData(sql: Sql, now = new Date()) {
  const rules = await getRules(sql);
  const today = todayIn(rules.timezone, now);
  const at = (n: number): IsoDate => addDays(today, n);

  await sql.begin(async (tx) => {
    await tx`DELETE FROM bookings`;
    await tx`DELETE FROM rate_limits`;
    for (const s of STAYS) {
      const req = { checkIn: at(s.start), checkOut: at(s.start + s.nights), guests: s.guests, breakfast: s.breakfast };
      const q = quoteStay(req, rules);
      const pending = s.status === "pending";
      const [b] = await tx<{ id: string }[]>`
        INSERT INTO bookings (reference, kind, status, source, check_in, check_out, guests, breakfast,
          guest_name, guest_email, message, nights, accommodation_cents, cleaning_cents, breakfast_cents,
          tax_cents, total_cents, currency, payment_status, hold_expires_at, decided_at, decided_by, created_at)
        VALUES (${makeReference()}, 'reservation', ${s.status}, 'seed', ${req.checkIn}, ${req.checkOut}, ${s.guests},
          ${s.breakfast}, ${s.name}, ${emailFor(s.name)}, ${s.message ?? null}, ${q.nights}, ${q.accommodationCents},
          ${q.cleaningCents}, ${q.breakfastCents}, ${q.taxCents}, ${q.totalCents}, ${q.currency},
          ${pending ? "none" : "captured"},
          ${pending ? tx`now() + make_interval(hours => ${rules.holdHours})` : null},
          ${pending ? null : tx`now() - interval '2 days'`}, ${pending ? null : DEMO_STAFF.email},
          now() - make_interval(days => ${pending ? 1 : 12}))
        RETURNING id`;
      await tx`INSERT INTO booking_events (booking_id, type, actor) VALUES (${b.id}, 'requested', 'guest')`;
      if (!pending)
        await tx`INSERT INTO booking_events (booking_id, type, actor) VALUES (${b.id}, 'approved', ${DEMO_STAFF.email})`;
    }
    for (const bl of BLOCKS) {
      await tx`
        INSERT INTO bookings (reference, kind, status, source, check_in, check_out, note, decided_at, decided_by)
        VALUES (${makeReference()}, 'block', 'approved', 'seed', ${at(bl.start)}, ${at(bl.start + bl.nights)}, ${bl.note}, now(), ${DEMO_STAFF.email})`;
    }
  });
  return { stays: STAYS.length, blocks: BLOCKS.length };
}
