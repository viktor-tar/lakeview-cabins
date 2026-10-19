import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { logout } from "../actions";
import { NavLink } from "./NavLink";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/staff/login");
  const user = session.user as { name?: string | null; email?: string | null; isDemo?: boolean };
  return (
    <div className="staff">
      <header className="topbar">
        <Link href="/staff" className="brand">
          Lakeview Cabins <span>Staff</span>
        </Link>
        <nav aria-label="Staff">
          <NavLink href="/staff">Requests</NavLink>
          <NavLink href="/staff/calendar">Calendar</NavLink>
          <NavLink href="/staff/new">New booking / block</NavLink>
        </nav>
        <div className="who">
          <span>{user.name ?? user.email}</span>
          <form action={logout}>
            <button className="btn btn-ghost btn-sm">Sign out</button>
          </form>
        </div>
      </header>
      {user.isDemo && (
        <p className="demo-strip">Demo account: data resets every night, and payments use Stripe test mode.</p>
      )}
      <main className="page">{children}</main>
    </div>
  );
}
