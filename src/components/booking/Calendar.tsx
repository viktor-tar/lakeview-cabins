"use client";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { addDays, type IsoDate } from "@/lib/booking/dates";
import {
  canCheckIn,
  canCheckOut,
  dayInfo,
  monthGrid,
  shiftMonth,
  type CalendarRules,
  type NightState,
  type Selection,
} from "@/lib/booking/calendar";
import { fmtLong, fmtMonth } from "./format";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface Props {
  today: IsoDate;
  rules: CalendarRules;
  taken: Map<IsoDate, NightState>;
  selection: Selection;
  onSelect: (date: IsoDate) => void;
  /** How many months to show side by side (wide layout shows 2). */
  months?: 1 | 2;
}

/** The bar drawn behind a day: which half/halves are filled, and with what. */
function barClasses(prev: NightState | null, night: NightState | null, selPrev: boolean, selNight: boolean) {
  const out: string[] = [];
  const kind = (s: NightState) => (s === "pending" ? "pending" : "taken");
  if (prev) out.push(`lvb-bar-l lvb-${kind(prev)}`);
  if (night) out.push(`lvb-bar-r lvb-${kind(night)}`);
  if (selPrev) out.push("lvb-sel-l");
  if (selNight) out.push("lvb-sel-r");
  return out;
}

export function Calendar({ today, rules, taken, selection, onSelect, months = 1 }: Props) {
  const firstMonth = today.slice(0, 7);
  const lastMonth = addDays(today, rules.bookingWindowDays).slice(0, 7);
  const lastStart = months === 2 && lastMonth > firstMonth ? shiftMonth(lastMonth, -1) : lastMonth;
  const [month, setMonth] = useState(() => {
    const m = selection.checkIn?.slice(0, 7) ?? firstMonth;
    return m > lastStart ? lastStart : m;
  });
  const shown = months === 2 ? [month, shiftMonth(month, 1)] : [month];

  // When dates arrive from outside (e.g. handed over from the hero), bring the check-in month into view.
  // Adjusted during render (React's "adjust state when a prop changes" pattern) so there's no extra paint.
  const checkInMonth = selection.checkIn?.slice(0, 7);
  const [seenCheckIn, setSeenCheckIn] = useState(checkInMonth);
  if (checkInMonth !== seenCheckIn) {
    setSeenCheckIn(checkInMonth);
    if (checkInMonth) {
      const visible = months === 2 ? [month, shiftMonth(month, 1)] : [month];
      if (!visible.includes(checkInMonth)) setMonth(checkInMonth > lastStart ? lastStart : checkInMonth);
    }
  }
  const [focus, setFocus] = useState<IsoDate>(selection.checkIn ?? today);
  const gridRef = useRef<HTMLDivElement>(null);

  const { checkIn, checkOut } = selection;
  const picking = Boolean(checkIn && !checkOut);
  const inSel = (night: IsoDate) => Boolean(checkIn && checkOut && night >= checkIn && night < checkOut);

  const selectable = (d: IsoDate) =>
    picking && checkIn && d > checkIn
      ? canCheckOut(checkIn, d, taken, rules) || canCheckIn(d, taken, today, rules)
      : canCheckIn(d, taken, today, rules);

  function moveFocus(to: IsoDate) {
    setFocus(to);
    const m = to.slice(0, 7);
    if (!shown.includes(m)) setMonth(m < month ? m : months === 2 ? shiftMonth(m, -1) : m);
    requestAnimationFrame(() => gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${to}"]`)?.focus());
  }

  function onKey(e: KeyboardEvent) {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (e.key in step) {
      e.preventDefault();
      const to = addDays(focus, step[e.key]);
      if (to.slice(0, 7) >= firstMonth && to.slice(0, 7) <= lastMonth) moveFocus(to);
    }
  }

  const focusTarget = shown.some((m) => focus.startsWith(m)) ? focus : `${month}-01`;

  return (
    <div className={`lvb-cal${months === 2 ? " lvb-cal-2" : ""}`}>
      <div className="lvb-cal-head">
        <button
          type="button"
          className="lvb-nav"
          aria-label="Previous month"
          disabled={month <= firstMonth}
          onClick={() => setMonth(shiftMonth(month, -1))}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        {shown.map((m) => (
          <h3 key={m} className="lvb-month" aria-live="polite">
            {fmtMonth(m)}
          </h3>
        ))}
        <button
          type="button"
          className="lvb-nav"
          aria-label="Next month"
          disabled={month >= lastStart}
          onClick={() => setMonth(shiftMonth(month, 1))}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="lvb-months" ref={gridRef} onKeyDown={onKey}>
        {shown.map((m) => (
          <MonthGrid
            key={m}
            month={m}
            today={today}
            taken={taken}
            picking={picking}
            checkIn={checkIn}
            checkOut={checkOut}
            inSel={inSel}
            selectable={selectable}
            focusTarget={focusTarget}
            setFocus={setFocus}
            onSelect={onSelect}
          />
        ))}
      </div>

      <ul className="lvb-legend" aria-label="Legend">
        <li>
          <span className="lvb-key lvb-key-taken">1</span>Unavailable
        </li>
        <li>
          <span className="lvb-key lvb-key-pending" aria-hidden="true" />
          Pending
        </li>
        <li>
          <span className="lvb-key lvb-key-free">1</span>Available
        </li>
      </ul>
      <p className="lvb-minstay">Minimum stay: {rules.minNights} nights</p>
    </div>
  );
}

interface MonthGridProps {
  month: string;
  today: IsoDate;
  taken: Map<IsoDate, NightState>;
  picking: boolean;
  checkIn: IsoDate | null;
  checkOut: IsoDate | null;
  inSel: (night: IsoDate) => boolean;
  selectable: (d: IsoDate) => boolean;
  focusTarget: IsoDate;
  setFocus: (d: IsoDate) => void;
  onSelect: (d: IsoDate) => void;
}

function MonthGrid({
  month,
  today,
  taken,
  picking,
  checkIn,
  checkOut,
  inSel,
  selectable,
  focusTarget,
  setFocus,
  onSelect,
}: MonthGridProps) {
  const weeks = useMemo(() => monthGrid(month), [month]);
  return (
    <div
      className="lvb-grid"
      role="grid"
      aria-label={`${fmtMonth(month)}. ${picking ? "Choose your check-out date" : "Choose your check-in date"}`}
    >
      <div className="lvb-row" role="row">
        {WEEKDAYS.map((w) => (
          <span key={w} className="lvb-wd" role="columnheader">
            {w}
          </span>
        ))}
      </div>
      {weeks.map((week, i) => (
        <div className="lvb-row" role="row" key={i}>
          {week.map((date, j) => {
            if (!date) return <span key={j} className="lvb-day lvb-empty" role="gridcell" />;
            const info = dayInfo(date, taken, today);
            const prevDate = addDays(date, -1);
            const ok = !info.past && selectable(date);
            const isIn = date === checkIn;
            const isOut = date === checkOut;
            const state =
              info.night === "pending" || (info.prevNight === "pending" && !info.night)
                ? "pending"
                : info.night || info.prevNight
                  ? "unavailable"
                  : "available";
            const label = `${fmtLong(date)}${info.night ? `, ${info.night === "pending" ? "pending" : "unavailable"}` : ""}${isIn ? ", check-in" : ""}${isOut ? ", check-out" : ""}`;
            const cls = [
              "lvb-day",
              info.past ? "lvb-past" : "",
              ok ? "lvb-ok" : "lvb-no",
              isIn ? "lvb-in" : "",
              isOut ? "lvb-out" : "",
              date === today ? "lvb-today" : "",
              ...barClasses(info.prevNight, info.night, inSel(prevDate), inSel(date)),
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <span role="gridcell" key={date} aria-selected={isIn || isOut || undefined}>
                <button
                  type="button"
                  data-date={date}
                  data-state={state}
                  className={cls}
                  tabIndex={date === focusTarget ? 0 : -1}
                  aria-label={label}
                  aria-disabled={!ok || undefined}
                  onFocus={() => setFocus(date)}
                  onClick={() => ok && onSelect(date)}
                >
                  <span className="lvb-num">{Number(date.slice(8))}</span>
                </button>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
