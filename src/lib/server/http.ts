import { NextResponse } from "next/server";
import { BookingError } from "@/lib/booking/service";

/** Origins allowed to call the public API from the browser (the marketing site). */
export function allowedOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const h: Record<string, string> = { Vary: "Origin" };
  if (origin && allowedOrigins().includes(origin)) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    h["Access-Control-Allow-Headers"] = "Content-Type";
    h["Access-Control-Max-Age"] = "86400";
  }
  return h;
}

export function preflight(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export function json(req: Request, body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return NextResponse.json(body, { status: init.status ?? 200, headers: { ...corsHeaders(req), ...init.headers } });
}

export function errorResponse(req: Request, err: unknown) {
  if (err instanceof BookingError) {
    return json(req, { error: { code: err.code, message: err.message } }, { status: err.status });
  }
  console.error(err);
  return json(
    req,
    { error: { code: "server_error", message: "Something went wrong. Please try again." } },
    { status: 500 },
  );
}
