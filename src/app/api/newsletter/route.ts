/** Footer newsletter sign-up. Same-origin only (no CORS headers), rate limited per IP. */
import { NextResponse } from "next/server";
import { newsletterSchema } from "@/lib/newsletter/schema";
import { subscribe } from "@/lib/newsletter/service";
import { clientKey, rateLimit } from "@/lib/server/rate-limit";
import { getSql } from "@/lib/server/sql";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = newsletterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid", message: parsed.error.issues[0]?.message ?? "Invalid request." } },
      { status: 400 },
    );
  }
  // Bots that fill the hidden field get a normal-looking reply and nothing is stored.
  if (parsed.data.website) return NextResponse.json({ ok: true });

  try {
    const sql = getSql();
    if (!(await rateLimit(sql, clientKey(req, "newsletter"), 5, 3600))) {
      return NextResponse.json(
        { error: { code: "rate_limited", message: "Too many attempts. Please try again later." } },
        { status: 429 },
      );
    }
    await subscribe(sql, parsed.data.email);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: { code: "server_error", message: "Something went wrong. Please try again." } },
      { status: 500 },
    );
  }
}
