"use client";
// TEMPORARY wrapper while the widget is being moved to CSS Modules + TanStack Query (next step).
import "./booking.css";
import { useDialogs } from "@/components/site/DialogProvider";
import { BookingWidget } from "./BookingWidget";

export function HeroBooking() {
  const { open } = useDialogs();
  return <BookingWidget apiBase="" layout="compact" handleReturn onContinue={() => open("booking")} />;
}
