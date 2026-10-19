/** Booking API calls (Axios via the shared client) and the shapes they return. */
import { http } from "@/lib/http/client";
import type { TakenRange } from "@/lib/booking/calendar";
import type { Quote } from "@/lib/booking/rules";

export interface PublicRules {
  currency: string;
  nightlyRateCents: number;
  weekendRateCents: number;
  cleaningFeeCents: number;
  breakfastCents: number;
  taxRateBp: number;
  minNights: number;
  maxNights: number;
  maxGuests: number;
  bookingWindowDays: number;
  timezone: string;
  checkInTime: string;
  checkOutTime: string;
}

export interface CalendarData {
  today: string;
  rules: PublicRules;
  unavailable: TakenRange[];
  notice: string;
}

export interface BookingStatus {
  reference: string;
  status: "pending" | "approved" | "declined" | "cancelled" | "expired";
  paymentStatus: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  breakfast: boolean;
  nights: number;
  totalCents: number;
  currency: string;
  notice: string;
}

export interface BookingRequest {
  checkIn: string;
  checkOut: string;
  guests: number;
  breakfast: boolean;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  website?: string;
  startedAt: number;
  returnUrl: string;
}

export interface BookingCreated {
  reference: string;
  status: string;
  quote: Quote;
  checkoutUrl?: string;
}

export const bookingApi = {
  calendar: () => http.get<CalendarData>("/calendar").then((r) => r.data),
  request: (body: BookingRequest) => http.post<BookingCreated>("/bookings", body).then((r) => r.data),
  status: (ref: string, sessionId?: string) =>
    http.get<BookingStatus>("/bookings/status", { params: { ref, session_id: sessionId } }).then((r) => r.data),
  release: (token: string) => http.post<{ released: boolean }>("/bookings/release", { token }).then((r) => r.data),
};
