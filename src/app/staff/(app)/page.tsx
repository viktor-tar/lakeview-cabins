import type { Metadata } from "next";
import Link from "next/link";
import { listBookings, type ListFilters } from "@/lib/booking/service";
import { getSql } from "@/lib/server/sql";
import { fmtMoney, fmtShort } from "@/components/booking/format";
import { StatusBadge, paymentLabel } from "@/components/staff/StatusBadge";
import { todayIn } from "@/lib/booking/dates";
import { connection } from "next/server";

export const metadata: Metadata = { title: "Requests" };

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "upcoming", label: "Upcoming" },
  { key: "all", label: "All" },
] as const;

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  await connection(); // staff data is always live
  const { tab = "pending", q = "" } = await searchParams;
  const sql = getSql();
  const today = todayIn("America/Vancouver");
  const filters: ListFilters =
    tab === "pending"
      ? { status: "pending" }
      : tab === "upcoming"
        ? { status: "active", from: today }
        : { status: "all" };
  const rows = await listBookings(sql, { ...filters, search: q || undefined });
  const [{ count: pendingCount }] = await sql<{ count: number }[]>`
    SELECT count(*)::int FROM bookings WHERE status = 'pending' AND kind = 'reservation'
      AND NOT (hold_expires_at IS NOT NULL AND hold_expires_at < now())`;

  return (
    <>
      <div className="page-head">
        <h1>Booking requests</h1>
        <form className="search" role="search">
          <input type="hidden" name="tab" value={tab} />
          <input name="q" defaultValue={q} placeholder="Search name, email or reference" aria-label="Search bookings" />
          <button className="btn btn-sm">Search</button>
        </form>
      </div>
      <nav className="tabs" aria-label="Filter">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={{ pathname: "/staff", query: { tab: t.key, ...(q ? { q } : {}) } }}
            aria-current={tab === t.key ? "page" : undefined}
          >
            {t.label}
            {t.key === "pending" && pendingCount > 0 && <span className="count">{pendingCount}</span>}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="empty">
          {q
            ? `Nothing matches “${q}”.`
            : tab === "pending"
              ? "No requests waiting. You're all caught up."
              : "No bookings yet."}
        </p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Guest</th>
                <th>Dates</th>
                <th>Guests</th>
                <th>Total</th>
                <th>Status</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const lapsed = b.status === "pending" && b.hold_expires_at && b.hold_expires_at < new Date();
                return (
                  <tr key={b.id}>
                    <td>
                      <Link href={`/staff/bookings/${b.id}`} className="ref">
                        {b.reference}
                      </Link>
                    </td>
                    <td>
                      {b.kind === "block" ? (
                        <em>{b.note ?? "Blocked dates"}</em>
                      ) : (
                        <>
                          {b.guest_name}
                          <span className="sub">{b.guest_email}</span>
                        </>
                      )}
                    </td>
                    <td>
                      {fmtShort(b.check_in)} → {fmtShort(b.check_out)}
                      <span className="sub">
                        {b.nights ?? ""}
                        {b.nights ? " nights" : ""}
                      </span>
                    </td>
                    <td>{b.guests ?? "—"}</td>
                    <td>{b.total_cents != null ? fmtMoney(b.total_cents, b.currency) : "—"}</td>
                    <td>{lapsed ? <span className="badge badge-expired">Expiring</span> : <StatusBadge b={b} />}</td>
                    <td className="sub-cell">{b.kind === "block" ? "—" : paymentLabel(b.payment_status)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
