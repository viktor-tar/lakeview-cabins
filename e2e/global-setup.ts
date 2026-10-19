/**
 * Before the end-to-end run, clear rate-limit counters and earlier test data (example.com addresses only)
 * from the local/CI database, so repeated runs don't trip the per-IP limits or fill the calendar.
 */
import postgres from "postgres";

export default async function globalSetup() {
  const url = process.env.DATABASE_URL;
  if (!url || process.env.E2E_SKIP_DB_RESET) return;
  const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
  try {
    await sql`DELETE FROM rate_limits`;
    await sql`DELETE FROM bookings WHERE source = 'guest' AND guest_email LIKE '%@example.com'`;
    await sql`DELETE FROM newsletter_subscribers WHERE email LIKE '%@example.com'`;
  } finally {
    await sql.end();
  }
}
