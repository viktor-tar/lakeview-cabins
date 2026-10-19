"use client";
import type { BookingStatus } from "./api";
import { fmtMoney, fmtShort } from "./format";
import styles from "./booking.module.css";

const STATUS_TEXT: Record<BookingStatus["status"], { title: string; body: string }> = {
  pending: {
    title: "Request received",
    body: "We'll review your request and confirm within 48 hours. Your card has only been authorised.",
  },
  approved: { title: "Your stay is confirmed", body: "We look forward to welcoming you to the cabin." },
  declined: {
    title: "Request declined",
    body: "Sorry, we couldn't accept this request. Your card authorisation was released.",
  },
  cancelled: { title: "Booking cancelled", body: "This booking has been cancelled." },
  expired: { title: "Request expired", body: "This request was not completed in time and the dates were released." },
};

export function Confirmation({ status, onBookAgain }: { status: BookingStatus; onBookAgain: () => void }) {
  const t =
    status.status === "pending" && status.paymentStatus === "awaiting"
      ? {
          title: "Payment not completed",
          body: "Your dates are held for a few minutes. Please finish checkout or choose dates again.",
        }
      : status.status === "pending" && status.paymentStatus === "none"
        ? { title: "Request received", body: "We'll review your request and confirm within 48 hours." }
        : STATUS_TEXT[status.status];
  return (
    <div className={styles.done} role="status">
      <h3 className={styles.month}>{t.title}</h3>
      <p className={styles.ref}>
        Reference <strong>{status.reference}</strong>
      </p>
      <dl className={styles.price}>
        <div>
          <dt>Check-in</dt>
          <dd>{fmtShort(status.checkIn)}</dd>
        </div>
        <div>
          <dt>Check-out</dt>
          <dd>{fmtShort(status.checkOut)}</dd>
        </div>
        <div>
          <dt>Guests</dt>
          <dd>
            {status.guests}
            {status.breakfast ? " · breakfast" : ""}
          </dd>
        </div>
        <div className={styles.total}>
          <dt>Total</dt>
          <dd>{fmtMoney(status.totalCents, status.currency)}</dd>
        </div>
      </dl>
      <p className={styles.fine}>{t.body}</p>
      <p className={styles.notice}>{status.notice}</p>
      <button type="button" className={styles.link} onClick={onBookAgain}>
        Back to calendar
      </button>
    </div>
  );
}
