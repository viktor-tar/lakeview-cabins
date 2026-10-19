/**
 * Database connection (postgres.js). One shared client per server instance.
 * Note: the booking service uses SQL directly so the critical logic (overlap constraint,
 * row locks, transactions) is explicit. src/db/schema.ts mirrors the tables for Drizzle Kit.
 */
import postgres, { type Sql } from "postgres";

export function createSql(url: string): Sql {
  return postgres(url, {
    max: process.env.NODE_ENV === "production" ? 5 : 10,
    prepare: false, // required for Neon's pooled (PgBouncer) connection string
    onnotice: () => {},
  });
}

const globalForDb = globalThis as unknown as { __lakeviewSql?: Sql };

export function getSql(): Sql {
  if (!globalForDb.__lakeviewSql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    globalForDb.__lakeviewSql = createSql(url);
  }
  return globalForDb.__lakeviewSql;
}
