import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { BookingError, getBooking } from "@/lib/booking/service";
import { getSql } from "@/lib/server/sql";
import { fmtLong, fmtMoney } from "@/components/booking/format";
import { StatusBadge, paymentLabel } from "@/components/staff/StatusBadge";
import { BookingActions } from "./BookingActions";
import { connection } from "next/server";
import { cx } from "@/app/staff/cx";

export const metadata: Metadata = { title: "Booking" };

const EVENT_LABEL: Record<string, string> = {
  requested: "Request submitted",
  payment_authorized: "Card authorised",
  approved: "Approved",
  declined: "Declined",
  cancelled: "Cancelled",
  expired: "Hold expired",
  checkout_expired: "Checkout expired",
  checkout_cancelled: "Guest left checkout",
  payment_released: "Authorisation released",
  created_by_staff: "Created by staff",
  blocked: "Dates blocked",
  unblocked: "Dates unblocked",
};

const dt = new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Vancouver" });

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  await connection(); // staff data is always live
  const { id } = await params;
  const { created } = await searchParams;
  if (!z.string().uuid().safeParse(id).success) notFound();
  let data;
  try {
    data = await getBooking(getSql(), id);
  } catch (e) {
    if (e instanceof BookingError && e.code === "not_found") notFound();
    throw e;
  }
  const { booking: b, events } = data;
  const isBlock = b.kind === "block";
  const lapsed = b.status === "pending" && b.hold_expires_at != null && b.hold_expires_at < new Date();

  return (
    <>
      <p className={cx("crumbs")}>
        <Link href="/staff">← All requests</Link>
      </p>
      {created && <p className={cx("alert alert-ok")}>Booking created and confirmed.</p>}
      <div className={cx("page-head")}>
        <h1>
          {isBlock ? "Blocked dates" : b.guest_name} <span className={cx("ref")}>{b.reference}</span>
        </h1>
        <StatusBadge b={b} />
      </div>

      <div className={cx("detail-grid")}>
        <section className={cx("card")}>
          <h2>Stay</h2>
          <dl className={cx("kv")}>
            <dt>Check-in</dt>
            <dd>{fmtLong(b.check_in)}</dd>
            <dt>Check-out</dt>
            <dd>{fmtLong(b.check_out)}</dd>
            {!isBlock && (
              <>
                <dt>Nights</dt>
                <dd>{b.nights}</dd>
                <dt>Guests</dt>
                <dd>
                  {b.guests}
                  {b.breakfast ? " · with breakfast" : ""}
                </dd>
              </>
            )}
            {b.note && (
              <>
                <dt>{isBlock ? "Reason" : "Staff note"}</dt>
                <dd>{b.note}</dd>
              </>
            )}
            {b.hold_expires_at && b.status === "pending" && (
              <>
                <dt>Hold until</dt>
                <dd>
                  {dt.format(b.hold_expires_at)}
                  {lapsed ? " (lapsed)" : ""}
                </dd>
              </>
            )}
          </dl>
        </section>

        {!isBlock && (
          <section className={cx("card")}>
            <h2>Guest</h2>
            <dl className={cx("kv")}>
              <dt>Name</dt>
              <dd>{b.guest_name}</dd>
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${b.guest_email}`}>{b.guest_email}</a>
              </dd>
              <dt>Phone</dt>
              <dd>{b.guest_phone ? <a href={`tel:${b.guest_phone}`}>{b.guest_phone}</a> : "—"}</dd>
              <dt>Source</dt>
              <dd>{b.source === "guest" ? "Website" : b.source === "staff" ? "Added by staff" : "Sample data"}</dd>
            </dl>
            {b.message && <blockquote className={cx("message")}>{b.message}</blockquote>}
          </section>
        )}

        {!isBlock && (
          <section className={cx("card")}>
            <h2>Payment</h2>
            <dl className={cx("kv")}>
              <dt>Total</dt>
              <dd>
                <strong>{b.total_cents != null ? fmtMoney(b.total_cents, b.currency) : "—"}</strong>
              </dd>
              <dt>Status</dt>
              <dd>{paymentLabel(b.payment_status)}</dd>
              {b.stripe_payment_intent_id && (
                <>
                  <dt>Stripe</dt>
                  <dd>
                    <code>{b.stripe_payment_intent_id}</code>
                  </dd>
                </>
              )}
            </dl>
          </section>
        )}

        <section className={cx("card")}>
          <h2>Actions</h2>
          <BookingActions id={b.id} kind={b.kind} status={b.status} paymentStatus={b.payment_status} lapsed={lapsed} />
        </section>

        <section className={cx("card span-2")}>
          <h2>History</h2>
          <ol className={cx("timeline")}>
            {events.map((e, i) => (
              <li key={i}>
                <strong>{EVENT_LABEL[e.type] ?? e.type}</strong>
                <span className={cx("sub")}>
                  {dt.format(e.created_at)} · {e.actor}
                </span>
                {(e.data as { reason?: string } | null)?.reason && (
                  <span className={cx("sub")}>“{(e.data as { reason: string }).reason}”</span>
                )}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
