import postgres from "postgres";
import bcrypt from "bcryptjs";
import { afterAll, describe, expect, it } from "vitest";
import { DEMO_STAFF, ensureDemoStaff, resetDemoData } from "../src/lib/booking/demo";

const sql = postgres(process.env.TEST_DATABASE_URL ?? "postgres://app@localhost:5433/lakeview_test", {
  onnotice: () => {},
  prepare: false /* same as production (Neon pooler) */,
});
afterAll(() => sql.end());

describe("demo reset", () => {
  it("can run repeatedly and always produces a conflict-free calendar", async () => {
    await resetDemoData(sql);
    const r = await resetDemoData(sql); // second run must not hit the overlap constraint
    const [{ count }] = await sql`SELECT count(*)::int FROM bookings`;
    expect(count).toBe(r.stays + r.blocks);
    const [{ upcoming }] = await sql`SELECT bool_and(check_in >= CURRENT_DATE) AS upcoming FROM bookings`;
    expect(upcoming).toBe(true);
  });
  it("demo staff password verifies against the stored hash", async () => {
    await ensureDemoStaff(sql);
    const [u] = await sql`SELECT password_hash FROM staff_users WHERE email = ${DEMO_STAFF.email}`;
    expect(await bcrypt.compare(DEMO_STAFF.password, u.password_hash)).toBe(true);
  });
});
