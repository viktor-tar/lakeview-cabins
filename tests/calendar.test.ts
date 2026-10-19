import { describe, expect, it } from "vitest";
import {
  canCheckIn,
  canCheckOut,
  dayInfo,
  lastCheckOut,
  monthGrid,
  selectDay,
  shiftMonth,
  takenNights,
} from "../src/lib/booking/calendar";

const rules = { minNights: 2, maxNights: 14, bookingWindowDays: 365 };
const today = "2026-10-19";
// booked nights 22, 23, 24 (check-out 25); pending nights 27, 28
const taken = takenNights([
  { checkIn: "2026-10-22", checkOut: "2026-10-25", state: "booked" },
  { checkIn: "2026-10-27", checkOut: "2026-10-29", state: "pending" },
]);

describe("calendar grid", () => {
  it("starts weeks on Sunday and pads the month", () => {
    const g = monthGrid("2026-10"); // 1 Oct 2026 is a Thursday
    expect(g[0]).toEqual([null, null, null, null, "2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(g.flat().filter(Boolean)).toHaveLength(31);
    expect(g.every((w) => w.length === 7)).toBe(true);
  });
  it("moves between months and years", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
  it("describes check-in and check-out days of taken stays", () => {
    expect(dayInfo("2026-10-22", taken, today)).toMatchObject({ night: "booked", prevNight: null }); // arrival day
    expect(dayInfo("2026-10-23", taken, today)).toMatchObject({ night: "booked", prevNight: "booked" });
    expect(dayInfo("2026-10-25", taken, today)).toMatchObject({ night: null, prevNight: "booked" }); // departure day
    expect(dayInfo("2026-10-18", taken, today).past).toBe(true);
  });
});

describe("date selection rules", () => {
  it("blocks check-in on taken nights, in the past, or without room for the minimum stay", () => {
    expect(canCheckIn("2026-10-23", taken, today, rules)).toBe(false);
    expect(canCheckIn("2026-10-18", taken, today, rules)).toBe(false);
    expect(canCheckIn("2026-10-21", taken, today, rules)).toBe(false); // only 1 free night before the 22nd
    expect(canCheckIn("2026-10-20", taken, today, rules)).toBe(true);
    expect(canCheckIn("2026-10-25", taken, today, rules)).toBe(true); // a departure day is a valid arrival
    expect(canCheckIn("2026-10-26", taken, today, rules)).toBe(false); // pending from the 27th
  });
  it("allows check-out on the morning another stay arrives, but never across a taken night", () => {
    expect(canCheckOut("2026-10-20", "2026-10-22", taken, rules)).toBe(true);
    expect(canCheckOut("2026-10-20", "2026-10-23", taken, rules)).toBe(false);
    expect(canCheckOut("2026-10-25", "2026-10-26", taken, rules)).toBe(false); // 1 night < min
    expect(lastCheckOut("2026-10-20", taken, rules)).toBe("2026-10-22");
    expect(lastCheckOut("2026-11-01", taken, rules)).toBe("2026-11-15"); // max 14 nights
  });
  it("first click picks check-in, second picks check-out, invalid second click restarts", () => {
    let s = selectDay({ checkIn: null, checkOut: null }, "2026-10-29", taken, today, rules);
    expect(s).toEqual({ checkIn: "2026-10-29", checkOut: null });
    s = selectDay(s, "2026-11-02", taken, today, rules);
    expect(s).toEqual({ checkIn: "2026-10-29", checkOut: "2026-11-02" });
    s = selectDay(s, "2026-11-05", taken, today, rules); // complete selection -> new check-in
    expect(s).toEqual({ checkIn: "2026-11-05", checkOut: null });
    expect(selectDay(s, "2026-11-06", taken, today, rules)).toEqual({ checkIn: "2026-11-06", checkOut: null }); // 1 night: restart
    expect(selectDay({ checkIn: null, checkOut: null }, "2026-10-23", taken, today, rules)).toEqual({
      checkIn: null,
      checkOut: null,
    });
  });
});
