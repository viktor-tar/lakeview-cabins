"use client";
// TEMPORARY wrapper while the widget is being moved to CSS Modules + TanStack Query (next step).
import "./booking.css";
import { BookingWidget } from "./BookingWidget";

export default function BookingDialogContent() {
  return <BookingWidget apiBase="" layout="wide" handleReturn={false} />;
}
