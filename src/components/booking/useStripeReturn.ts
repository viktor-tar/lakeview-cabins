"use client";
/**
 * Handles the guest coming back from Stripe Checkout (?booking=…&session_id=… or ?cancel=…):
 * shows the booking's status, or releases the held dates if payment was abandoned.
 * Used by one widget per page (the hero).
 */
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { bookingApi } from "./api";
import { calendarKey } from "./queries";
import { useBooking } from "./store";

const RETURN_PARAMS = ["booking", "session_id", "cancel"];

export function useStripeReturn() {
  const qc = useQueryClient();
  useEffect(() => {
    const url = new URL(window.location.href);
    const ref = url.searchParams.get("booking");
    if (!ref) return;
    const sessionId = url.searchParams.get("session_id") ?? undefined;
    const cancelToken = url.searchParams.get("cancel");
    RETURN_PARAMS.forEach((p) => url.searchParams.delete(p));
    window.history.replaceState(null, "", url);

    const { setBanner, showConfirmation } = useBooking.getState();
    (async () => {
      if (cancelToken) {
        await bookingApi.release(cancelToken).catch(() => null);
        setBanner("Payment wasn't completed, so your dates were released. You can pick them again below.");
      } else {
        try {
          showConfirmation(await bookingApi.status(ref, sessionId));
        } catch {
          setBanner(`We couldn't load booking ${ref}. If you completed payment, you'll receive an email shortly.`);
        }
      }
      await qc.invalidateQueries({ queryKey: calendarKey });
    })();
  }, [qc]);
}
