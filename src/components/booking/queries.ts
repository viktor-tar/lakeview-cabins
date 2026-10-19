"use client";
/** TanStack Query hooks for the booking widget. Both widgets on the page share this cache. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/http/client";
import { bookingApi, type BookingRequest, type BookingStatus } from "./api";

type RequestResult = { checkoutUrl: string } | { status: BookingStatus };
import { useBooking } from "./store";

export const calendarKey = ["booking", "calendar"] as const;

export function useCalendar() {
  return useQuery({ queryKey: calendarKey, queryFn: bookingApi.calendar, staleTime: 60_000 });
}

/** Submits a request. Without payments it shows the confirmation; with payments it goes to Stripe Checkout. */
export function useRequestBooking() {
  const qc = useQueryClient();
  const { showConfirmation, setBanner, clearDates } = useBooking.getState();
  return useMutation({
    mutationFn: async (body: BookingRequest): Promise<RequestResult> => {
      const { checkoutUrl, reference } = await bookingApi.request(body);
      if (checkoutUrl) return { checkoutUrl };
      return { status: await bookingApi.status(reference) };
    },
    onMutate: () => setBanner(null),
    onSuccess: (res) => {
      if ("checkoutUrl" in res) {
        window.location.assign(res.checkoutUrl);
        return;
      }
      showConfirmation(res.status);
      void qc.invalidateQueries({ queryKey: calendarKey });
    },
    onError: (err) => {
      setBanner(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      if (err instanceof ApiError && err.code === "unavailable") {
        clearDates();
        void qc.invalidateQueries({ queryKey: calendarKey });
      }
    },
  });
}
