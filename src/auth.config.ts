/** Edge-safe Auth.js config (used by middleware). No database access here. */
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: { signIn: "/staff/login" },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // 8-hour staff sessions
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLogin = request.nextUrl.pathname === "/staff/login";
      if (isLogin) return true;
      return Boolean(auth?.user);
    },
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.isDemo = (user as { isDemo?: boolean }).isDemo;
      }
      return token;
    },
    session({ session, token }) {
      Object.assign(session.user, { role: token.role, isDemo: token.isDemo });
      return session;
    },
  },
} satisfies NextAuthConfig;
