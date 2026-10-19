import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { DEMO_STAFF } from "@/lib/booking/demo";
import { connection } from "next/server";

export const metadata: Metadata = { title: "Staff login" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  await connection(); // staff data is always live
  const { callbackUrl } = await searchParams;
  // Only ever return to a staff page on this site (never an external URL).
  let next = "/staff";
  try {
    const u = new URL(callbackUrl ?? "/staff", "http://local");
    if (u.pathname.startsWith("/staff") && !u.pathname.startsWith("/staff/login")) next = u.pathname + u.search;
  } catch {}
  const showDemo = process.env.DEMO_MODE === "true";
  return (
    <main className="login">
      <div className="login-card">
        <p className="brand">Lakeview Cabins</p>
        <h1>Staff login</h1>
        <LoginForm next={next} demo={showDemo ? DEMO_STAFF : undefined} />
      </div>
    </main>
  );
}
