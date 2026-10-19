"use client";
import { useActionState, useState } from "react";
import { approveAction, cancelAction, declineAction, type ActionState } from "../../../actions";

interface Props {
  id: string;
  kind: string;
  status: string;
  paymentStatus: string;
  lapsed: boolean;
}

export function BookingActions({ id, kind, status, paymentStatus, lapsed }: Props) {
  const [approveState, approve, approving] = useActionState<ActionState, FormData>(approveAction, undefined);
  const [declineState, decline, declining] = useActionState<ActionState, FormData>(declineAction, undefined);
  const [cancelState, cancel, cancelling] = useActionState<ActionState, FormData>(cancelAction, undefined);
  const [mode, setMode] = useState<"none" | "decline" | "cancel">("none");
  const busy = approving || declining || cancelling;
  const result = approveState ?? declineState ?? cancelState;

  if (kind === "block") {
    return status === "approved" ? (
      <form action={cancel} className="stack">
        <input type="hidden" name="id" value={id} />
        <p className="sub">Unblocking makes these dates bookable on the website again.</p>
        <button className="btn" disabled={busy}>
          {cancelling ? "Unblocking…" : "Unblock dates"}
        </button>
        {cancelState?.error && <p className="alert alert-error">{cancelState.error}</p>}
      </form>
    ) : (
      <p className="sub">These dates are no longer blocked.</p>
    );
  }

  const canApprove = status === "pending" && !lapsed && paymentStatus !== "awaiting";
  const canDecline = status === "pending";
  const canCancel = status === "pending" || status === "approved";

  return (
    <div className="stack">
      {result?.message && (
        <p className="alert alert-ok" role="status">
          {result.message}
        </p>
      )}
      {result?.error && (
        <p className="alert alert-error" role="alert">
          {result.error}
        </p>
      )}
      {status === "pending" && paymentStatus === "awaiting" && !lapsed && (
        <p className="sub">The guest is still on the checkout page. You can approve once their card is authorised.</p>
      )}
      {lapsed && <p className="sub">This request&apos;s hold has lapsed, so the dates are free again.</p>}

      {mode === "none" && (
        <div className="row">
          {canApprove && (
            <form action={approve}>
              <input type="hidden" name="id" value={id} />
              <button className="btn btn-primary" disabled={busy}>
                {approving ? "Approving…" : paymentStatus === "authorized" ? "Approve & capture payment" : "Approve"}
              </button>
            </form>
          )}
          {canDecline && (
            <button className="btn" disabled={busy} onClick={() => setMode("decline")}>
              Decline
            </button>
          )}
          {canCancel && status === "approved" && (
            <button className="btn btn-danger" disabled={busy} onClick={() => setMode("cancel")}>
              Cancel booking
            </button>
          )}
          {!canApprove && !canDecline && !canCancel && (
            <p className="sub">No actions available for a {status} booking.</p>
          )}
        </div>
      )}

      {mode !== "none" && (
        <form
          action={mode === "decline" ? decline : cancel}
          className="stack"
          onSubmit={() => setTimeout(() => setMode("none"), 0)}
        >
          <input type="hidden" name="id" value={id} />
          <label className="field">
            {mode === "decline"
              ? "Reason for declining (optional, staff only)"
              : "Reason for cancelling (optional, staff only)"}
            <textarea name="reason" rows={2} maxLength={500} />
          </label>
          <p className="sub">
            {mode === "decline"
              ? "The card authorisation will be released and the dates freed."
              : paymentStatus === "captured"
                ? "The payment will be refunded in full and the dates freed."
                : "The dates will be freed."}
          </p>
          <div className="row">
            <button className={`btn ${mode === "cancel" ? "btn-danger" : "btn-primary"}`} disabled={busy}>
              {mode === "decline"
                ? declining
                  ? "Declining…"
                  : "Confirm decline"
                : cancelling
                  ? "Cancelling…"
                  : "Confirm cancellation"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setMode("none")}>
              Back
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
