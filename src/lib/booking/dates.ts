/**
 * Date helpers. Stays are stored as plain calendar dates (YYYY-MM-DD), never timestamps,
 * so a stay never shifts by a day because of a visitor's time zone.
 * "Today" is always computed in the property's time zone (America/Vancouver).
 */

export type IsoDate = string; // "YYYY-MM-DD"

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== "string" || !ISO.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function toUtc(d: IsoDate): Date {
  return new Date(`${d}T00:00:00Z`);
}

export function addDays(d: IsoDate, days: number): IsoDate {
  const t = toUtc(d);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
}

/** Number of nights between check-in and check-out. */
export function nightsBetween(checkIn: IsoDate, checkOut: IsoDate): number {
  return Math.round((toUtc(checkOut).getTime() - toUtc(checkIn).getTime()) / 86_400_000);
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(d: IsoDate): number {
  return toUtc(d).getUTCDay();
}

/** Every night of a stay, by the date the night starts. */
export function eachNight(checkIn: IsoDate, checkOut: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  for (let d = checkIn; d < checkOut; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Today's date in the given IANA time zone. */
export function todayIn(timeZone: string, now: Date = new Date()): IsoDate {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
