/** Staff authentication: email + password (bcrypt), checked against staff_users. */
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { getSql } from "@/lib/server/sql";
import { clientKey, rateLimit } from "@/lib/server/rate-limit";

class TooManyAttempts extends CredentialsSignin {
  code = "too_many_attempts";
}

// A real bcrypt hash of a random throwaway string, used for timing-safe comparisons.
const DUMMY_HASH = "$2b$10$0mes7jBh06UmQ5tEMIt8u.iRjLOLcZhNAeRbikyjHrokEgICE.xfS";

const creds = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) });

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: { label: "Email" }, password: { label: "Password", type: "password" } },
      async authorize(raw, request) {
        const parsed = creds.safeParse(raw);
        if (!parsed.success) return null;
        const sql = getSql();
        // 10 attempts per 15 minutes per visitor, and per account
        const okIp = await rateLimit(sql, clientKey(request, "login"), 10, 900);
        const okAcct = await rateLimit(sql, `login-acct:${parsed.data.email}`, 10, 900);
        if (!okIp || !okAcct) throw new TooManyAttempts();

        const [u] = await sql<
          { id: string; email: string; name: string; password_hash: string; role: string; is_demo: boolean }[]
        >`
          SELECT id, email, name, password_hash, role, is_demo FROM staff_users WHERE email = ${parsed.data.email}`;
        // Compare even when the user doesn't exist, so response time doesn't reveal valid emails.
        const hash = u?.password_hash ?? DUMMY_HASH;
        const ok = await bcrypt.compare(parsed.data.password, hash);
        if (!u || !ok) return null;
        return { id: u.id, email: u.email, name: u.name, role: u.role, isDemo: u.is_demo };
      },
    }),
  ],
});

/** For server actions and pages: the signed-in staff member, or throws. */
export async function requireStaff() {
  const session = await auth();
  if (!session?.user?.email) throw new Error("Not signed in");
  return session.user as { email: string; name?: string | null; role?: string; isDemo?: boolean };
}
