/**
 * Runs during each Vercel build: applies pending migrations and, in demo mode,
 * seeds sample data the first time (empty database). Safe to run repeatedly.
 * Skips quietly when DATABASE_URL isn't set (e.g. a local build without a database).
 */
import postgres from "postgres";
import { migrate } from "./migrate";
import { ensureDemoStaff, resetDemoData } from "../src/lib/booking/demo";

(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("deploy-db: DATABASE_URL not set, skipping");
    return;
  }
  await migrate(url);
  if (process.env.DEMO_MODE === "true") {
    const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
    try {
      await ensureDemoStaff(sql);
      const [{ count }] = await sql<{ count: number }[]>`SELECT count(*)::int FROM bookings`;
      if (count === 0) {
        const r = await resetDemoData(sql);
        console.log(`deploy-db: seeded ${r.stays} sample stays and ${r.blocks} blocks`);
      }
    } finally {
      await sql.end();
    }
  }
})().catch((e) => {
  console.error("deploy-db failed:", e);
  process.exit(1);
});
