"use client";
/**
 * Booking state shared by the hero widget and the "Book now" popup, so dates picked in one
 * carry over to the other and a confirmation shows in both.
 */
import { create } from "zustand";
import type { Selection } from "@/lib/booking/calendar";
import type { BookingStatus } from "./api";

interface BookingState {
  selection: Selection;
  guests: number;
  breakfast: boolean;
  /** Error or notice shown above the calendar. */
  banner: string | null;
  /** Set after a request is sent (or when returning from Stripe). */
  confirmation: BookingStatus | null;
  setSelection: (s: Selection) => void;
  clearDates: () => void;
  setGuests: (n: number) => void;
  setBreakfast: (b: boolean) => void;
  setBanner: (b: string | null) => void;
  showConfirmation: (s: BookingStatus) => void;
  /** Back to an empty calendar after a confirmation. */
  startOver: () => void;
}

const EMPTY: Selection = { checkIn: null, checkOut: null };

export const useBooking = create<BookingState>()((set) => ({
  selection: EMPTY,
  guests: 2,
  breakfast: false,
  banner: null,
  confirmation: null,
  setSelection: (selection) => set({ selection, banner: null }),
  clearDates: () => set({ selection: EMPTY }),
  setGuests: (guests) => set({ guests }),
  setBreakfast: (breakfast) => set({ breakfast }),
  setBanner: (banner) => set({ banner }),
  showConfirmation: (confirmation) => set({ confirmation, banner: null }),
  startOver: () => set({ confirmation: null, selection: EMPTY, banner: null }),
}));
