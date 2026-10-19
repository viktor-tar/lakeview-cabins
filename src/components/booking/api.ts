/** Browser-side client for the booking API. */
import type { Quote } from "@/lib/booking/rules";
import type { TakenRange } from "@/lib/booking/calendar";

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

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function createClient(apiBase: string) {
  const base = apiBase.replace(/\/$/, "");
  async function call<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await fetch(base + path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
    } catch {
      throw new ApiError("network", "Can't reach the booking service. Check your connection and try again.");
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok)
      throw new ApiError(
        body?.error?.code ?? "server_error",
        body?.error?.message ?? "Something went wrong. Please try again.",
      );
    return body as T;
  }
  return {
    calendar: () => call<CalendarData>("/api/calendar"),
    request: (body: object) =>
      call<{ reference: string; status: string; quote: Quote; checkoutUrl?: string }>("/api/bookings", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    status: (ref: string, sessionId?: string) =>
      call<BookingStatus>(
        `/api/bookings/status?ref=${encodeURIComponent(ref)}${sessionId ? `&session_id=${encodeURIComponent(sessionId)}` : ""}`,
      ),
    release: (token: string) =>
      call<{ released: boolean }>("/api/bookings/release", { method: "POST", body: JSON.stringify({ token }) }),
  };
}
export type BookingClient = ReturnType<typeof createClient>;
