import type { BookingRow } from "@/lib/booking/service";

const PAY: Record<BookingRow["payment_status"], string> = {
  none: "No payment",
  awaiting: "Awaiting checkout",
  authorized: "Card authorised",
  captured: "Paid",
  released: "Authorisation released",
  refunded: "Refunded",
  failed: "Checkout not completed",
};

export function StatusBadge({ b }: { b: Pick<BookingRow, "status" | "kind"> }) {
  if (b.kind === "block")
    return (
      <span className={`badge badge-${b.status === "approved" ? "block" : "muted"}`}>
        {b.status === "approved" ? "Blocked" : "Unblocked"}
      </span>
    );
  return <span className={`badge badge-${b.status}`}>{b.status[0].toUpperCase() + b.status.slice(1)}</span>;
}

export const paymentLabel = (s: BookingRow["payment_status"]) => PAY[s];
