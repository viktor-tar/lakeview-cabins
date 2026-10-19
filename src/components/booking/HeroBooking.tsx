"use client";
/** The compact calendar in the hero. Picking dates offers "Continue", which opens the booking popup with them. */
import { useDialogs } from "@/components/site/DialogProvider";
import { BookingWidget } from "./BookingWidget";
import { useStripeReturn } from "./useStripeReturn";

export function HeroBooking() {
  const { open } = useDialogs();
  useStripeReturn();
  return <BookingWidget layout="compact" onContinue={() => open("booking")} />;
}
