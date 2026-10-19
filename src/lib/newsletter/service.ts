import type { Sql } from "postgres";

/** Adds an address; signing up twice is not an error. Returns true if it was new. */
export async function subscribe(sql: Sql, email: string): Promise<boolean> {
  const rows = await sql`
    INSERT INTO newsletter_subscribers (email) VALUES (${email.toLowerCase()})
    ON CONFLICT (email) DO NOTHING
    RETURNING email`;
  return rows.length > 0;
}

/** Demo housekeeping: sign-ups are not kept longer than the guest data. */
export async function purgeOldSubscribers(sql: Sql, retentionDays: number) {
  const rows = await sql`
    DELETE FROM newsletter_subscribers WHERE created_at < now() - make_interval(days => ${retentionDays})
    RETURNING email`;
  return rows.length;
}
