import type { IsoDate } from "@/lib/booking/dates";

const utc = (d: IsoDate) => new Date(`${d}T12:00:00Z`);

export const fmtMonth = (month: string) =>
  new Intl.DateTimeFormat("en-CA", { month: "long", year: "numeric", timeZone: "UTC" }).format(utc(`${month}-01`));

export const fmtShort = (d: IsoDate) =>
  new Intl.DateTimeFormat("en-CA", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    utc(d),
  );

export const fmtLong = (d: IsoDate) =>
  new Intl.DateTimeFormat("en-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(utc(d));

export const fmtMoney = (cents: number, currency: string) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);

/** "16:00" -> "4:00 pm" */
export const fmtTime = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
};
