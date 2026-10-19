/**
 * Minimal migration runner: applies every migrations/*.sql file once, in name order,
 * inside a transaction, and records it in _migrations.
 * Usage: DATABASE_URL=... npx tsx scripts/migrate.ts
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

export async function migrate(databaseUrl: string, log = console.log) {
  const sql = postgres(databaseUrl, { max: 1, prepare: false, onnotice: () => {} });
  try {
    await sql`CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
    const dir = join(process.cwd(), "migrations");
    const files = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    const done = new Set((await sql<{ name: string }[]>`SELECT name FROM _migrations`).map((r) => r.name));
    for (const file of files) {
      if (done.has(file)) continue;
      const body = readFileSync(join(dir, file), "utf8");
      await sql.begin(async (tx) => {
        await tx.unsafe(body);
        await tx`INSERT INTO _migrations (name) VALUES (${file})`;
      });
      log(`applied ${file}`);
    }
  } finally {
    await sql.end();
  }
}

if (process.argv[1]?.endsWith("migrate.ts")) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  migrate(url).then(() => console.log("migrations complete"));
}
