/**
 * Calendar logic shared by the booking widget (no React, no DOM — easy to test).
 *
 * A stay occupies NIGHTS [checkIn, checkOut). A day can therefore be:
 *  - a check-out day for one stay and a check-in day for the next (both allowed),
 *  - fully taken (its night and the previous night are taken).
 */
import { addDays, eachNight, nightsBetween, weekday, type IsoDate } from "./dates";

export type NightState = "booked" | "pending" | "blocked";

export interface TakenRange {
  checkIn: IsoDate;
  checkOut: IsoDate;
  state?: NightState;
}

export interface CalendarRules {
  minNights: number;
  maxNights: number;
  bookingWindowDays: number;
}

/** Night date -> state, for fast lookups. */
export function takenNights(ranges: TakenRange[]): Map<IsoDate, NightState> {
  const map = new Map<IsoDate, NightState>();
  for (const r of ranges) for (const n of eachNight(r.checkIn, r.checkOut)) map.set(n, r.state ?? "booked");
  return map;
}

export interface DayInfo {
  date: IsoDate;
  inMonth: boolean;
  past: boolean;
  /** state of the night starting on this day (null = free) */
  night: NightState | null;
  /** state of the night ending on this morning (null = free) */
  prevNight: NightState | null;
}

export function dayInfo(date: IsoDate, taken: Map<IsoDate, NightState>, today: IsoDate, month?: string): DayInfo {
  return {
    date,
    inMonth: month ? date.startsWith(month) : true,
    past: date < today,
    night: taken.get(date) ?? null,
    prevNight: taken.get(addDays(date, -1)) ?? null,
  };
}

/** Weeks (Sunday first) covering the given month, "YYYY-MM". Days outside the month are null. */
export function monthGrid(month: string): (IsoDate | null)[][] {
  const first = `${month}-01`;
  const lead = weekday(first);
  const days: (IsoDate | null)[] = Array(lead).fill(null);
  for (let d = first; d.startsWith(month); d = addDays(d, 1)) days.push(d);
  while (days.length % 7) days.push(null);
  const weeks: (IsoDate | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + delta, 1));
  return t.toISOString().slice(0, 7);
}

/** Can a stay start on this day? */
export function canCheckIn(
  date: IsoDate,
  taken: Map<IsoDate, NightState>,
  today: IsoDate,
  rules: CalendarRules,
): boolean {
  if (date < today || date > addDays(today, rules.bookingWindowDays)) return false;
  if (taken.has(date)) return false;
  // there must be room for the minimum stay
  for (let i = 0; i < rules.minNights; i++) if (taken.has(addDays(date, i))) return false;
  return true;
}

/** Can a stay that starts on checkIn end on this day? */
export function canCheckOut(
  checkIn: IsoDate,
  date: IsoDate,
  taken: Map<IsoDate, NightState>,
  rules: CalendarRules,
): boolean {
  const nights = nightsBetween(checkIn, date);
  if (nights < rules.minNights || nights > rules.maxNights) return false;
  for (let d = checkIn; d < date; d = addDays(d, 1)) if (taken.has(d)) return false;
  return true;
}

/** Latest valid check-out for a check-in (stops at the first taken night). */
export function lastCheckOut(checkIn: IsoDate, taken: Map<IsoDate, NightState>, rules: CalendarRules): IsoDate {
  let end = checkIn;
  for (let i = 0; i < rules.maxNights; i++) {
    if (taken.has(end)) break;
    end = addDays(end, 1);
  }
  return end;
}

export interface Selection {
  checkIn: IsoDate | null;
  checkOut: IsoDate | null;
}

/**
 * Applies a click on a day to the current selection:
 * first click picks check-in, second picks check-out; clicking an invalid
 * check-out that is a valid check-in starts a new selection.
 */
export function selectDay(
  sel: Selection,
  date: IsoDate,
  taken: Map<IsoDate, NightState>,
  today: IsoDate,
  rules: CalendarRules,
): Selection {
  if (sel.checkIn && !sel.checkOut && date > sel.checkIn && canCheckOut(sel.checkIn, date, taken, rules)) {
    return { checkIn: sel.checkIn, checkOut: date };
  }
  if (canCheckIn(date, taken, today, rules)) return { checkIn: date, checkOut: null };
  return sel;
}
