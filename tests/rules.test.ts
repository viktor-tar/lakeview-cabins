import { describe, expect, it } from "vitest";
import { isWeekendNight, makeReference, quoteStay, validateStay, type Rules } from "../src/lib/booking/rules";
import { addDays, eachNight, isIsoDate, nightsBetween, todayIn } from "../src/lib/booking/dates";

const rules: Rules = {
  currency: "cad",
  timezone: "America/Vancouver",
  nightlyRateCents: 25_000,
  weekendRateCents: 29_000,
  cleaningFeeCents: 9_000,
  breakfastCents: 700,
  taxRateBp: 1300,
  minNights: 2,
  maxNights: 14,
  maxGuests: 4,
  bookingWindowDays: 365,
};
// Monday 19 Oct 2026, noon in Vancouver
const now = new Date("2026-10-19T19:00:00Z");
const stay = (checkIn: string, checkOut: string, guests = 2, breakfast = false) => ({
  checkIn,
  checkOut,
  guests,
  breakfast,
});

describe("dates", () => {
  it("validates real calendar dates only", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("26-01-01")).toBe(false);
    expect(isIsoDate(20260101)).toBe(false);
  });
  it("counts nights across month, year and DST boundaries", () => {
    expect(nightsBetween("2026-10-30", "2026-11-02")).toBe(3); // DST ends 1 Nov
    expect(nightsBetween("2026-12-30", "2027-01-02")).toBe(3);
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(eachNight("2026-03-07", "2026-03-10")).toEqual(["2026-03-07", "2026-03-08", "2026-03-09"]); // DST starts 8 Mar
  });
  it("computes today in the property time zone, not UTC", () => {
    // 05:00 UTC on 20 Oct is still 19 Oct in Vancouver
    expect(todayIn("America/Vancouver", new Date("2026-10-20T05:00:00Z"))).toBe("2026-10-19");
  });
});

describe("validateStay", () => {
  it("accepts a normal stay", () => {
    expect(validateStay(stay("2026-10-22", "2026-10-25"), rules, now)).toBeNull();
  });
  it("allows checking in today (Vancouver time) even when UTC is already tomorrow", () => {
    expect(validateStay(stay("2026-10-19", "2026-10-21"), rules, new Date("2026-10-20T05:00:00Z"))).toBeNull();
  });
  it.each([
    ["check-out before check-in", stay("2026-10-25", "2026-10-22"), "invalid_dates"],
    ["same-day check-out", stay("2026-10-22", "2026-10-22"), "invalid_dates"],
    ["impossible date", stay("2026-02-30", "2026-03-03"), "invalid_dates"],
    ["past check-in", stay("2026-10-18", "2026-10-21"), "in_past"],
    ["beyond booking window", stay("2027-10-21", "2027-10-24"), "too_far_ahead"],
    ["one night", stay("2026-10-22", "2026-10-23"), "min_nights"],
    ["fifteen nights", stay("2026-11-01", "2026-11-16"), "max_nights"],
    ["zero guests", stay("2026-10-22", "2026-10-25", 0), "guests"],
    ["five guests", stay("2026-10-22", "2026-10-25", 5), "guests"],
    ["fractional guests", stay("2026-10-22", "2026-10-25", 2.5), "guests"],
  ])("rejects %s", (_label, req, code) => {
    expect(validateStay(req, rules, now)?.code).toBe(code);
  });
  it("accepts the edges: last day of the window, min and max nights", () => {
    expect(validateStay(stay("2027-10-19", "2027-10-21"), rules, now)).toBeNull();
    expect(validateStay(stay("2026-11-01", "2026-11-15"), rules, now)).toBeNull();
  });
});

describe("quoteStay", () => {
  it("prices Friday and Saturday nights at the weekend rate", () => {
    expect(isWeekendNight("2026-10-23")).toBe(true); // Fri
    expect(isWeekendNight("2026-10-24")).toBe(true); // Sat
    expect(isWeekendNight("2026-10-25")).toBe(false); // Sun
    // Thu, Fri, Sat nights
    const q = quoteStay(stay("2026-10-22", "2026-10-25"), rules);
    expect(q).toMatchObject({
      nights: 3,
      weekendNights: 2,
      accommodationCents: 83_000,
      cleaningCents: 9_000,
      breakfastCents: 0,
    });
    expect(q.taxCents).toBe(11_960);
    expect(q.totalCents).toBe(103_960);
  });
  it("adds breakfast per guest per night before tax", () => {
    const q = quoteStay(stay("2026-10-22", "2026-10-25", 2, true), rules);
    expect(q.breakfastCents).toBe(4_200);
    expect(q.taxCents).toBe(12_506);
    expect(q.totalCents).toBe(108_706);
  });
  it("rounds tax once, to the nearest cent", () => {
    const q = quoteStay(stay("2026-10-19", "2026-10-21", 1), { ...rules, taxRateBp: 1 }); // 59,000 × 0.01% = 5.9
    expect(q.taxCents).toBe(6);
  });
  it("line items always add up to the total", () => {
    for (const [a, b, g, br] of [
      ["2026-10-19", "2026-11-02", 4, true],
      ["2026-12-30", "2027-01-02", 1, false],
    ] as const) {
      const q = quoteStay(stay(a, b, g, br), rules);
      expect(q.lines.reduce((s, l) => s + l.amountCents, 0)).toBe(q.totalCents);
    }
  });
});

describe("makeReference", () => {
  it("uses an unambiguous alphabet", () => {
    for (let i = 0; i < 200; i++) expect(makeReference()).toMatch(/^LV-[A-HJ-NP-Z2-9]{6}$/);
  });
});
