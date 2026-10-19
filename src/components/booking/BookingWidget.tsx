"use client";
/**
 * Booking widget: availability calendar -> price -> guest details -> Stripe test checkout -> confirmation.
 * "compact" sits in the hero (fixed height, own scroll); "wide" fills the "Book now" popup.
 * Dates, guests and the confirmation live in a shared store, so both layouts always agree.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { selectDay, takenNights } from "@/lib/booking/calendar";
import { quoteStay, type Rules } from "@/lib/booking/rules";
import { Calendar } from "./Calendar";
import { Confirmation } from "./Confirmation";
import { fmtMoney, fmtShort, fmtTime } from "./format";
import { GuestForm } from "./GuestForm";
import { useCalendar } from "./queries";
import { ScrollPanel } from "./ScrollPanel";
import { useBooking } from "./store";
import styles from "./booking.module.css";

export interface BookingWidgetProps {
  layout?: "compact" | "wide";
  /** Compact layout: when set, picking dates shows a "Continue" button instead of the form inline. */
  onContinue?: () => void;
  className?: string;
}

export function BookingWidget({ layout = "compact", onContinue, className }: BookingWidgetProps) {
  const wide = layout === "wide";
  const handOff = !wide && Boolean(onContinue);
  const calendar = useCalendar();
  const selection = useBooking((s) => s.selection);
  const guests = useBooking((s) => s.guests);
  const breakfast = useBooking((s) => s.breakfast);
  const banner = useBooking((s) => s.banner);
  const confirmation = useBooking((s) => s.confirmation);
  const setSelection = useBooking((s) => s.setSelection);
  const clearDates = useBooking((s) => s.clearDates);
  const startOver = useBooking((s) => s.startOver);

  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  // The wide layout adapts to the space it actually has (inside a popup the viewport width is misleading).
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !wide) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [wide]);

  // Back to the top of the compact panel when a confirmation (or error) appears.
  useEffect(() => {
    if (confirmation || banner) scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [confirmation, banner]);

  const data = calendar.data;
  const taken = useMemo(() => takenNights(data?.unavailable ?? []), [data]);
  const rules = data ? (data.rules as unknown as Rules) : null;
  const { checkIn, checkOut } = selection;
  const quote = rules && checkIn && checkOut ? quoteStay({ checkIn, checkOut, guests, breakfast }, rules) : null;

  function pick(date: string) {
    if (!data) return;
    const next = selectDay(selection, date, taken, data.today, data.rules);
    setSelection(next);
    if (next.checkOut && !wide) {
      // Scroll inside the panel only (never the page) to reveal the price and next step.
      requestAnimationFrame(() => {
        const box = scrollRef.current,
          target = summaryRef.current;
        if (box && target) box.scrollTo({ top: target.offsetTop - 12, behavior: "smooth" });
      });
    }
  }

  let body: React.ReactNode;
  if (confirmation) {
    body = <Confirmation status={confirmation} onBookAgain={startOver} />;
  } else if (calendar.isPending) {
    body = (
      <div className={styles.state} aria-busy="true">
        <span className={styles.spinner} />
        Loading availability…
      </div>
    );
  } else if (calendar.isError || !data || !rules) {
    body = (
      <div className={styles.state} role="alert">
        <p>{calendar.error?.message ?? "Couldn't load availability."}</p>
        <button type="button" className={styles.link} onClick={() => calendar.refetch()}>
          Try again
        </button>
      </div>
    );
  } else {
    const twoCols = wide && width >= 760;
    const cal = (
      <>
        {banner && (
          <p className={styles.banner} role="alert">
            {banner}
          </p>
        )}
        <Calendar
          today={data.today}
          rules={data.rules}
          taken={taken}
          selection={selection}
          onSelect={pick}
          months={wide && width >= 1000 ? 2 : 1}
        />
        <p className={styles.notice}>{data.notice}</p>
      </>
    );

    const summary = (
      <div className={styles.summary} ref={summaryRef} aria-live="polite">
        {!checkIn && (
          <p className={styles.prompt}>
            Select Dates
            {wide && (
              <span className={styles.sub}>
                Check-in from {fmtTime(data.rules.checkInTime)} · check-out by {fmtTime(data.rules.checkOutTime)}
              </span>
            )}
          </p>
        )}
        {checkIn && !checkOut && (
          <p className={styles.prompt}>
            Check-in {fmtShort(checkIn)}
            <br />
            <span className={styles.sub}>Now choose check-out (min {rules.minNights} nights)</span>
          </p>
        )}
        {checkIn && checkOut && (
          <div className={styles.dates}>
            <div>
              <span className={styles.sub}>Check-in</span>
              {fmtShort(checkIn)}
              <span className={styles.sub}>from {fmtTime(data.rules.checkInTime)}</span>
            </div>
            <div>
              <span className={styles.sub}>Check-out</span>
              {fmtShort(checkOut)}
              <span className={styles.sub}>by {fmtTime(data.rules.checkOutTime)}</span>
            </div>
            <button type="button" className={styles.link} onClick={clearDates}>
              Clear dates
            </button>
          </div>
        )}
      </div>
    );

    const next =
      checkIn && checkOut && quote ? (
        handOff ? (
          <div className={styles.continue}>
            <p className={styles.fine}>
              {quote.nights} nights · {fmtMoney(quote.totalCents, quote.currency)} total for {guests} guests, incl.
              cleaning and taxes
            </p>
            <button type="button" className={styles.submit} onClick={onContinue} aria-haspopup="dialog">
              Continue →
            </button>
          </div>
        ) : (
          <GuestForm checkIn={checkIn} checkOut={checkOut} rules={rules} quote={quote} wide={wide} />
        )
      ) : null;

    body = wide ? (
      <div className={twoCols ? `${styles.cols} ${styles.cols2}` : styles.cols}>
        <div>{cal}</div>
        <div className={styles.colForm}>
          {summary}
          {next}
        </div>
      </div>
    ) : (
      <>
        {cal}
        {summary}
        {next}
      </>
    );
  }

  return (
    <div
      ref={rootRef}
      className={[styles.root, wide && styles.wide, className].filter(Boolean).join(" ")}
      role="region"
      aria-label="Check availability and book"
    >
      {wide ? (
        <div className={`${styles.panel} ${styles.panelWide}`}>
          <div className={styles.content}>{body}</div>
        </div>
      ) : (
        <ScrollPanel ref={scrollRef}>{body}</ScrollPanel>
      )}
    </div>
  );
}
