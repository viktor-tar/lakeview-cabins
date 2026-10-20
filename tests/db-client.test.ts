// Guards against a client that returns timestamps as strings (which silently breaks hold-expiry checks).
import { afterAll, expect, it } from "vitest";
import { createSql } from "../src/lib/server/sql";

const sql = createSql(process.env.TEST_DATABASE_URL ?? "postgres://app@localhost:5433/lakeview_test");
afterAll(() => sql.end());

it("the app's database client returns timestamps as Date objects and dates as strings", async () => {
  const [r] = await sql`SELECT now() AS ts, '2026-10-19'::date::text AS d`;
  expect(r.ts).toBeInstanceOf(Date);
  expect(r.d).toBe("2026-10-19");
});
