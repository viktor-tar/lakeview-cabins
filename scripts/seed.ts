/**
 * Seeds the demo staff account and a fresh demo calendar.
 * Usage: DATABASE_URL=... npx tsx scripts/seed.ts
 */
import postgres from "postgres";
import { ensureDemoStaff, resetDemoData, DEMO_STAFF } from "../src/lib/booking/demo";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });

(async () => {
  await ensureDemoStaff(sql);
  const r = await resetDemoData(sql);
  console.log(
    `Seeded ${r.stays} stays and ${r.blocks} blocks. Demo login: ${DEMO_STAFF.email} / ${DEMO_STAFF.password}`,
  );
  await sql.end();
})();
