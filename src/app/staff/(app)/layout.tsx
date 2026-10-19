import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { logout } from "../actions";
import { NavLink } from "./NavLink";
import { cx } from "@/app/staff/cx";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/staff/login");
  const user = session.user as { name?: string | null; email?: string | null; isDemo?: boolean };
  return (
    <div className={cx("staff")}>
      <header className={cx("topbar")}>
        <Link href="/staff" className={cx("brand")}>
          Lakeview Cabins <span>Staff</span>
        </Link>
        <nav aria-label="Staff">
          <NavLink href="/staff">Requests</NavLink>
          <NavLink href="/staff/calendar">Calendar</NavLink>
          <NavLink href="/staff/new">New booking / block</NavLink>
        </nav>
        <div className={cx("who")}>
          <span>{user.name ?? user.email}</span>
          <form action={logout}>
            <button className={cx("btn btn-ghost btn-sm")}>Sign out</button>
          </form>
        </div>
      </header>
      {user.isDemo && (
        <p className={cx("demo-strip")}>Demo account: data resets every night, and payments use Stripe test mode.</p>
      )}
      <main className={cx("page")}>{children}</main>
    </div>
  );
}
