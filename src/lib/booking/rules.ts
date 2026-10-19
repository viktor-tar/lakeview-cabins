/**
 * Booking rules — pure functions with no database access, so they are easy to test
 * and are shared by the API, the staff dashboard and the calendar UI.
 */
import { addDays, eachNight, isIsoDate, nightsBetween, todayIn, weekday, type IsoDate } from "./dates";

export interface Rules {
  currency: string;
  timezone: string;
  nightlyRateCents: number;
  weekendRateCents: number;
  cleaningFeeCents: number;
  breakfastCents: number; // per guest per night
  taxRateBp: number; // basis points, 1300 = 13%
  minNights: number;
  maxNights: number;
  maxGuests: number;
  bookingWindowDays: number;
}

export interface StayRequest {
  checkIn: IsoDate;
  checkOut: IsoDate;
  guests: number;
  breakfast: boolean;
}

export interface Quote {
  nights: number;
  weekendNights: number;
  accommodationCents: number;
  cleaningCents: number;
  breakfastCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
  lines: { label: string; amountCents: number }[];
}

export type RuleError =
  | { code: "invalid_dates"; message: string }
  | { code: "in_past"; message: string }
  | { code: "too_far_ahead"; message: string }
  | { code: "min_nights"; message: string }
  | { code: "max_nights"; message: string }
  | { code: "guests"; message: string };

/** Friday and Saturday nights are priced at the weekend rate. */
export function isWeekendNight(night: IsoDate): boolean {
  const day = weekday(night);
  return day === 5 || day === 6;
}

export function validateStay(req: StayRequest, rules: Rules, now: Date = new Date()): RuleError | null {
  if (!isIsoDate(req.checkIn) || !isIsoDate(req.checkOut) || req.checkOut <= req.checkIn) {
    return { code: "invalid_dates", message: "Choose a check-out date after the check-in date." };
  }
  const today = todayIn(rules.timezone, now);
  if (req.checkIn < today) {
    return { code: "in_past", message: "Check-in can't be in the past." };
  }
  if (req.checkIn > addDays(today, rules.bookingWindowDays)) {
    return { code: "too_far_ahead", message: `Bookings open up to ${rules.bookingWindowDays} days ahead.` };
  }
  const nights = nightsBetween(req.checkIn, req.checkOut);
  if (nights < rules.minNights) {
    return { code: "min_nights", message: `The minimum stay is ${rules.minNights} nights.` };
  }
  if (nights > rules.maxNights) {
    return { code: "max_nights", message: `The maximum stay is ${rules.maxNights} nights.` };
  }
  if (!Number.isInteger(req.guests) || req.guests < 1 || req.guests > rules.maxGuests) {
    return { code: "guests", message: `Choose between 1 and ${rules.maxGuests} guests.` };
  }
  return null;
}

/** Integer-cent pricing; tax is rounded half-up once, on the taxable subtotal. */
export function quoteStay(req: StayRequest, rules: Rules): Quote {
  const nightsList = eachNight(req.checkIn, req.checkOut);
  const weekendNights = nightsList.filter(isWeekendNight).length;
  const weekdayNights = nightsList.length - weekendNights;

  const accommodationCents = weekdayNights * rules.nightlyRateCents + weekendNights * rules.weekendRateCents;
  const cleaningCents = rules.cleaningFeeCents;
  const breakfastCents = req.breakfast ? rules.breakfastCents * req.guests * nightsList.length : 0;
  const subtotal = accommodationCents + cleaningCents + breakfastCents;
  const taxCents = Math.round((subtotal * rules.taxRateBp) / 10_000);
  const totalCents = subtotal + taxCents;

  const lines: Quote["lines"] = [];
  if (weekdayNights)
    lines.push({ label: `${weekdayNights} × weeknight`, amountCents: weekdayNights * rules.nightlyRateCents });
  if (weekendNights)
    lines.push({ label: `${weekendNights} × weekend night`, amountCents: weekendNights * rules.weekendRateCents });
  lines.push({ label: "Cleaning fee", amountCents: cleaningCents });
  if (breakfastCents)
    lines.push({ label: `Breakfast (${req.guests} × ${nightsList.length} nights)`, amountCents: breakfastCents });
  lines.push({ label: `Taxes (${rules.taxRateBp / 100}%)`, amountCents: taxCents });

  return {
    nights: nightsList.length,
    weekendNights,
    accommodationCents,
    cleaningCents,
    breakfastCents,
    taxCents,
    totalCents,
    currency: rules.currency,
    lines,
  };
}

/** Human-friendly booking reference, e.g. LV-7K3QPX (no ambiguous 0/O/1/I). */
export function makeReference(random: () => number = Math.random): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "LV-";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(random() * alphabet.length)];
  return out;
}
