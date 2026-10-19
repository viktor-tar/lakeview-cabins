"use client";
/**
 * Booking widget: availability calendar -> price -> guest details -> Stripe test checkout -> confirmation.
 * Used in the hero (compact layout) and the booking dialog (wide layout).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { nightsBetween, type IsoDate } from "@/lib/booking/dates";
import { canCheckIn, canCheckOut, selectDay, takenNights, type Selection } from "@/lib/booking/calendar";
import { quoteStay, type Rules } from "@/lib/booking/rules";
import { ApiError, createClient, type BookingStatus, type CalendarData } from "./api";
import { Calendar } from "./Calendar";
import { fmtMoney, fmtShort, fmtTime } from "./format";
import { ScrollPanel } from "./ScrollPanel";

export interface BookingWidgetProps {
  apiBase: string;
  /** Handle ?booking=… return parameters from Stripe (only one widget per page should). */
  handleReturn?: boolean;
  /** Used when the page has no stable URL to come back to. */
  returnUrl?: string;
  className?: string;
  /**
   * "compact": fixed-height panel with its own scroll (the hero slot).
   * "wide": no inner scroll; two months side by side with the form beside them on wide screens,
   * stacked on narrow screens (the "Book now" popup).
   */
  layout?: "compact" | "wide";
  /**
   * Compact layout only: when set, picking dates shows a "Continue" button that calls this
   * (e.g. to open the wide popup with the dates pre-filled) instead of showing the form inline.
   */
  onContinue?: (selection: { checkIn: IsoDate; checkOut: IsoDate }) => void;
}

/** Fired on window to hand selected dates to the wide widget. */
export const OPEN_EVENT = "lvb:open";

type View =
  { kind: "loading" } | { kind: "error"; message: string } | { kind: "book" } | { kind: "done"; status: BookingStatus };

const RETURN_PARAMS = ["booking", "session_id", "cancel"];

function cleanUrl() {
  const url = new URL(window.location.href);
  RETURN_PARAMS.forEach((p) => url.searchParams.delete(p));
  return url;
}

export function BookingWidget({
  apiBase,
  handleReturn = true,
  returnUrl,
  className,
  layout = "compact",
  onContinue,
}: BookingWidgetProps) {
  const client = useMemo(() => createClient(apiBase), [apiBase]);
  const [view, setView] = useState<View>({ kind: "loading" });
  const [data, setData] = useState<CalendarData | null>(null);
  const [selection, setSelection] = useState<Selection>({ checkIn: null, checkOut: null });
  const [guests, setGuests] = useState(2);
  const [breakfast, setBreakfast] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "", website: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [width, setWidth] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  // When the form was first shown (spam check: bots submit instantly). Set after mount, not during render.
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);
  const summaryRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const cal = await client.calendar();
    setData(cal);
    return cal;
  }, [client]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get("booking");
        if (handleReturn && ref) {
          window.history.replaceState(null, "", cleanUrl());
          const cancelToken = params.get("cancel");
          if (cancelToken) {
            await client.release(cancelToken).catch(() => null);
            if (alive)
              setBanner("Payment wasn't completed, so your dates were released. You can pick them again below.");
          } else {
            const status = await client.status(ref, params.get("session_id") ?? undefined);
            await load();
            if (alive) setView({ kind: "done", status });
            return;
          }
        }
        await load();
        if (alive) setView({ kind: "book" });
      } catch (e) {
        if (alive) setView({ kind: "error", message: e instanceof Error ? e.message : "Couldn't load availability." });
      }
    })();
    return () => {
      alive = false;
    };
  }, [client, handleReturn, load]);

  // Keep every widget on the page in sync (e.g. hero + "Book now" popup).
  useEffect(() => {
    const refresh = () => {
      load().catch(() => {});
    };
    window.addEventListener("lvb:changed", refresh);
    return () => window.removeEventListener("lvb:changed", refresh);
  }, [load]);

  // Wide layout adapts to the space it actually has (inside a popup the viewport width is misleading).
  useEffect(() => {
    const el = rootRef.current;
    if (!el || layout !== "wide") return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [layout]);

  const taken = useMemo(() => takenNights(data?.unavailable ?? []), [data]);

  // Wide widget: accept dates handed over from the compact one.
  useEffect(() => {
    if (layout !== "wide" || !data) return;
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent<{ checkIn: IsoDate; checkOut: IsoDate }>).detail;
      if (
        d &&
        canCheckIn(d.checkIn, taken, data.today, data.rules) &&
        canCheckOut(d.checkIn, d.checkOut, taken, data.rules)
      ) {
        setSelection({ checkIn: d.checkIn, checkOut: d.checkOut });
      }
      setBanner(null);
      setView((v) => (v.kind === "done" ? { kind: "book" } : v));
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, [layout, data, taken]);
  const rules: Rules | null = data ? ({ ...data.rules } as Rules) : null;
  const { checkIn, checkOut } = selection;
  const quote = rules && checkIn && checkOut ? quoteStay({ checkIn, checkOut, guests, breakfast }, rules) : null;

  function pick(date: IsoDate) {
    if (!data) return;
    const next = selectDay(selection, date, taken, data.today, data.rules);
    setSelection(next);
    setBanner(null);
    if (next.checkOut && layout === "compact") {
      // Scroll inside the panel only (never the page) to reveal the price and form.
      requestAnimationFrame(() => {
        const box = scrollRef.current,
          target = summaryRef.current;
        if (box && target) box.scrollTo({ top: target.offsetTop - 12, behavior: "smooth" });
      });
    }
  }

  function validate() {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = "Please enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Please enter a valid email.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!checkIn || !checkOut || submitting || !validate()) return;
    setSubmitting(true);
    setBanner(null);
    try {
      const res = await client.request({
        checkIn,
        checkOut,
        guests,
        breakfast,
        name: form.name,
        email: form.email,
        phone: form.phone,
        message: form.message,
        website: form.website,
        startedAt: startedAt.current,
        returnUrl: returnUrl ?? cleanUrl().toString(),
      });
      if (res.checkoutUrl) {
        window.location.assign(res.checkoutUrl);
        return; // keep the button disabled while the browser leaves
      }
      const status = await client.status(res.reference);
      setView({ kind: "done", status });
      window.dispatchEvent(new Event("lvb:changed"));
      scrollRef.current?.scrollTo({ top: 0 });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
      setBanner(msg);
      if (err instanceof ApiError && err.code === "unavailable") {
        setSelection({ checkIn: null, checkOut: null });
        await load().catch(() => {});
        scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      }
    } finally {
      setSubmitting(false);
    }
  }

  function bookAgain() {
    setSelection({ checkIn: null, checkOut: null });
    setForm({ name: "", email: "", phone: "", message: "", website: "" });
    startedAt.current = Date.now();
    setView({ kind: "book" });
  }

  const field = (name: keyof typeof form) => ({
    value: form[name],
    onChange: (e: { target: { value: string } }) => {
      setForm((f) => ({ ...f, [name]: e.target.value }));
      if (errors[name])
        setErrors((prev) => {
          const next = { ...prev };
          delete next[name];
          return next;
        });
    },
  });

  const wide = layout === "wide";
  const twoCols = wide && width >= 760;
  const months = wide && width >= 1000 ? 2 : 1;
  const handOff = !wide && Boolean(onContinue);

  let body: React.ReactNode = null;
  if (view.kind === "loading")
    body = (
      <div className="lvb-state" aria-busy="true">
        <span className="lvb-spinner" />
        Loading availability…
      </div>
    );
  if (view.kind === "error")
    body = (
      <div className="lvb-state" role="alert">
        <p>{view.message}</p>
        <button type="button" className="lvb-link" onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    );
  if (view.kind === "done") body = <Confirmation status={view.status} onBookAgain={bookAgain} />;

  if (view.kind === "book" && data && rules) {
    const calendar = (
      <>
        {banner && (
          <p className="lvb-banner" role="alert">
            {banner}
          </p>
        )}
        <Calendar
          today={data.today}
          rules={data.rules}
          taken={taken}
          selection={selection}
          onSelect={pick}
          months={months}
        />
        <p className="lvb-notice">{data.notice}</p>
      </>
    );

    const summary = (
      <div className="lvb-summary" ref={summaryRef} aria-live="polite">
        {!checkIn && (
          <p className="lvb-prompt">
            Select Dates
            {wide && (
              <span className="lvb-sub">
                Check-in from {fmtTime(data.rules.checkInTime)} · check-out by {fmtTime(data.rules.checkOutTime)}
              </span>
            )}
          </p>
        )}
        {checkIn && !checkOut && (
          <p className="lvb-prompt">
            Check-in {fmtShort(checkIn)}
            <br />
            <span className="lvb-sub">Now choose check-out (min {rules.minNights} nights)</span>
          </p>
        )}
        {checkIn && checkOut && (
          <div className="lvb-dates">
            <div>
              <span className="lvb-sub">Check-in</span>
              {fmtShort(checkIn)}
              <span className="lvb-sub">from {fmtTime(data.rules.checkInTime)}</span>
            </div>
            <div>
              <span className="lvb-sub">Check-out</span>
              {fmtShort(checkOut)}
              <span className="lvb-sub">by {fmtTime(data.rules.checkOutTime)}</span>
            </div>
            <button type="button" className="lvb-link" onClick={() => setSelection({ checkIn: null, checkOut: null })}>
              Clear dates
            </button>
          </div>
        )}
      </div>
    );

    const continueBox = handOff && checkIn && checkOut && quote && (
      <div className="lvb-continue">
        <p className="lvb-fine">
          {quote.nights} nights · {fmtMoney(quote.totalCents, quote.currency)} total for 2 guests, incl. cleaning and
          taxes
        </p>
        <button type="button" className="lvb-submit" onClick={() => onContinue?.({ checkIn, checkOut })}>
          Continue →
        </button>
      </div>
    );

    const form = !handOff && checkIn && checkOut && quote && (
      <form className="lvb-form" onSubmit={submit} noValidate>
        <div className="lvb-field lvb-inline">
          <span id="lvb-guests-label">Guests</span>
          <div className="lvb-stepper" role="group" aria-labelledby="lvb-guests-label">
            <button
              type="button"
              aria-label="Fewer guests"
              disabled={guests <= 1}
              onClick={() => setGuests((g) => g - 1)}
            >
              −
            </button>
            <output aria-live="polite">{guests}</output>
            <button
              type="button"
              aria-label="More guests"
              disabled={guests >= rules.maxGuests}
              onClick={() => setGuests((g) => g + 1)}
            >
              +
            </button>
          </div>
        </div>
        <label className="lvb-check">
          <input type="checkbox" checked={breakfast} onChange={(e) => setBreakfast(e.target.checked)} />
          <span>
            Breakfast basket{" "}
            <span className="lvb-sub">{fmtMoney(rules.breakfastCents, rules.currency)} / guest / night</span>
          </span>
        </label>

        <dl className="lvb-price">
          {quote.lines.map((l) => (
            <div key={l.label}>
              <dt>{l.label}</dt>
              <dd>{fmtMoney(l.amountCents, quote.currency)}</dd>
            </div>
          ))}
          <div className="lvb-total">
            <dt>Total ({quote.currency.toUpperCase()})</dt>
            <dd>{fmtMoney(quote.totalCents, quote.currency)}</dd>
          </div>
        </dl>

        <h4 className="lvb-h">Your details</h4>
        <div className={wide ? "lvb-fields-2" : "lvb-fields"}>
          <Field label="Full name" error={errors.name}>
            <input type="text" autoComplete="name" required maxLength={120} {...field("name")} />
          </Field>
          <Field label="Email" error={errors.email}>
            <input type="email" autoComplete="email" required maxLength={200} {...field("email")} />
          </Field>
          <Field label="Phone (optional)">
            <input type="tel" autoComplete="tel" maxLength={40} {...field("phone")} />
          </Field>
        </div>
        <Field label="Message to the host (optional)">
          <textarea rows={wide ? 2 : 3} maxLength={1000} {...field("message")} />
        </Field>
        {/* Honeypot: hidden from people and screen readers; bots tend to fill it. */}
        <div className="lvb-hp" aria-hidden="true">
          <label>
            Website
            <input type="text" tabIndex={-1} autoComplete="off" {...field("website")} />
          </label>
        </div>

        <button type="submit" className="lvb-submit" disabled={submitting}>
          {submitting ? "Sending…" : `Request to book · ${fmtMoney(quote.totalCents, quote.currency)}`}
        </button>
        <p className="lvb-fine">
          {nightsBetween(checkIn, checkOut)} nights. Your card is only authorised now and is charged once your stay is
          approved (within 48 hours).
        </p>
      </form>
    );

    body = wide ? (
      <div className={`lvb-cols${twoCols ? " lvb-cols-2" : ""}`}>
        <div className="lvb-col-cal">{calendar}</div>
        <div className="lvb-col-form">
          {summary}
          {form}
        </div>
      </div>
    ) : (
      <>
        {calendar}
        {summary}
        {continueBox}
        {form}
      </>
    );
  }

  return (
    <div className={`lvb ${wide ? "lvb-wide" : ""} ${className ?? ""}`} ref={rootRef}>
      {wide ? (
        <div className="lvb-panel lvb-panel-wide">
          <div className="lvb-content">{body}</div>
        </div>
      ) : (
        <ScrollPanel ref={scrollRef}>{body}</ScrollPanel>
      )}
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactElement<Record<string, unknown>>;
}) {
  return (
    <label className={`lvb-field${error ? " lvb-invalid" : ""}`}>
      <span>{label}</span>
      {children}
      {error && (
        <span className="lvb-err" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

const STATUS_TEXT: Record<BookingStatus["status"], { title: string; body: string }> = {
  pending: {
    title: "Request received",
    body: "We'll review your request and confirm within 48 hours. Your card has only been authorised.",
  },
  approved: { title: "Your stay is confirmed", body: "We look forward to welcoming you to the cabin." },
  declined: {
    title: "Request declined",
    body: "Sorry, we couldn't accept this request. Your card authorisation was released.",
  },
  cancelled: { title: "Booking cancelled", body: "This booking has been cancelled." },
  expired: { title: "Request expired", body: "This request was not completed in time and the dates were released." },
};

function Confirmation({ status, onBookAgain }: { status: BookingStatus; onBookAgain: () => void }) {
  const awaitingPayment = status.status === "pending" && status.paymentStatus === "awaiting";
  const t = awaitingPayment
    ? {
        title: "Payment not completed",
        body: "Your dates are held for a few minutes. Please finish checkout or choose dates again.",
      }
    : status.status === "pending" && status.paymentStatus === "none"
      ? { title: "Request received", body: "We'll review your request and confirm within 48 hours." }
      : STATUS_TEXT[status.status];
  return (
    <div className="lvb-done" role="status">
      <h3 className="lvb-month">{t.title}</h3>
      <p className="lvb-ref">
        Reference <strong>{status.reference}</strong>
      </p>
      <dl className="lvb-price">
        <div>
          <dt>Check-in</dt>
          <dd>{fmtShort(status.checkIn)}</dd>
        </div>
        <div>
          <dt>Check-out</dt>
          <dd>{fmtShort(status.checkOut)}</dd>
        </div>
        <div>
          <dt>Guests</dt>
          <dd>
            {status.guests}
            {status.breakfast ? " · breakfast" : ""}
          </dd>
        </div>
        <div className="lvb-total">
          <dt>Total</dt>
          <dd>{fmtMoney(status.totalCents, status.currency)}</dd>
        </div>
      </dl>
      <p className="lvb-fine">{t.body}</p>
      <p className="lvb-notice">{status.notice}</p>
      <button type="button" className="lvb-link" onClick={onBookAgain}>
        Back to calendar
      </button>
    </div>
  );
}
