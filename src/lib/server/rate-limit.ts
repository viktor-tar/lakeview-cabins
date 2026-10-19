/**
 * Fixed-window rate limiting stored in Postgres (works across serverless instances,
 * no extra service needed). IPs are hashed before storage.
 */
import { createHash } from "node:crypto";
import type { Sql } from "postgres";

export function clientKey(req: Request, scope: string) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const salt = process.env.AUTH_SECRET ?? "dev";
  return `${scope}:${createHash("sha256")
    .update(salt + ip)
    .digest("hex")
    .slice(0, 32)}`;
}

/** Returns true if the request is allowed. */
export async function rateLimit(sql: Sql, key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const [row] = await sql<{ count: number }[]>`
    INSERT INTO rate_limits (key, window_start, count)
    VALUES (${key}, to_timestamp(floor(extract(epoch FROM now()) / ${windowSeconds}) * ${windowSeconds}), 1)
    ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limits.count + 1
    RETURNING count`;
  return row.count <= limit;
}

export async function pruneRateLimits(sql: Sql) {
  await sql`DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'`;
}
