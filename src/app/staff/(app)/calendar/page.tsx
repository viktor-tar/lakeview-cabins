import type { Metadata } from "next";
import Link from "next/link";
import { addDays, todayIn, type IsoDate } from "@/lib/booking/dates";
import { monthGrid, shiftMonth } from "@/lib/booking/calendar";
import { listBookings } from "@/lib/booking/service";
import { getSql } from "@/lib/server/sql";
import { fmtMonth } from "@/components/booking/format";
import { connection } from "next/server";
import { cx } from "@/app/staff/cx";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await connection(); // staff data is always live
  const today = todayIn("America/Vancouver");
  const { month: m } = await searchParams;
  const month = m && /^\d{4}-\d{2}$/.test(m) ? m : today.slice(0, 7);
  const weeks = monthGrid(month);
  const first = `${month}-01`;
  const last = addDays(`${shiftMonth(month, 1)}-01`, 0);
  const rows = (await listBookings(getSql(), { status: "active", from: first, to: last })).filter(
    (b) => !(b.status === "pending" && b.hold_expires_at && b.hold_expires_at < new Date()),
  );

  // Which stay occupies each night?
  const byNight = new Map<IsoDate, (typeof rows)[number]>();
  for (const b of rows) for (let d = b.check_in; d < b.check_out; d = addDays(d, 1)) byNight.set(d, b);

  return (
    <>
      <div className={cx("page-head")}>
        <h1>{fmtMonth(month)}</h1>
        <div className={cx("row")}>
          <Link className={cx("btn btn-sm")} href={`/staff/calendar?month=${shiftMonth(month, -1)}`}>
            ← Previous
          </Link>
          <Link className={cx("btn btn-sm")} href="/staff/calendar">
            Today
          </Link>
          <Link className={cx("btn btn-sm")} href={`/staff/calendar?month=${shiftMonth(month, 1)}`}>
            Next →
          </Link>
        </div>
      </div>
      <ul className={cx("legend-row")}>
        <li>
          <span className={cx("dot dot-approved")} />
          Confirmed
        </li>
        <li>
          <span className={cx("dot dot-pending")} />
          Pending
        </li>
        <li>
          <span className={cx("dot dot-block")} />
          Blocked
        </li>
      </ul>
      <div className={cx("month")} role="table" aria-label={fmtMonth(month)}>
        <div className={cx("month-row month-head")} role="row">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <span key={d} role="columnheader">
              {d}
            </span>
          ))}
        </div>
        {weeks.map((w, i) => (
          <div className={cx("month-row")} role="row" key={i}>
            {w.map((d, j) => {
              if (!d) return <span key={j} className={cx("month-cell month-out")} role="cell" />;
              const b = byNight.get(d);
              const starts = b && (b.check_in === d || d.endsWith("-01") || j === 0);
              const kind = b ? (b.kind === "block" ? "block" : b.status) : null;
              return (
                <span
                  key={d}
                  role="cell"
                  className={cx(`month-cell${d === today ? " month-today" : ""}${d < today ? " month-past" : ""}`)}
                >
                  <span className={cx("month-num")}>{Number(d.slice(8))}</span>
                  {b && (
                    <Link
                      href={`/staff/bookings/${b.id}`}
                      className={cx(
                        `stay stay-${kind}${b.check_in === d ? " stay-start" : ""}${addDays(d, 1) === b.check_out ? " stay-end" : ""}`,
                      )}
                      title={`${b.kind === "block" ? (b.note ?? "Blocked") : b.guest_name} · ${b.reference}`}
                    >
                      {starts ? (b.kind === "block" ? (b.note ?? "Blocked") : b.guest_name) : " "}
                    </Link>
                  )}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}
