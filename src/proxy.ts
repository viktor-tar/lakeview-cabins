/** Protects the staff dashboard: unauthenticated visitors are sent to the login page. */
import NextAuth from "next-auth";
import type { NextFetchEvent, NextRequest } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export function proxy(req: NextRequest, ctx: NextFetchEvent) {
  return (auth as unknown as (req: NextRequest, ctx: NextFetchEvent) => Promise<Response | undefined>)(req, ctx);
}

export const config = { matcher: ["/staff/:path*"] };
