"use client";
/** Guests, breakfast, price breakdown and contact details. Validated with the server's own Zod schema. */
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { nightsBetween, type IsoDate } from "@/lib/booking/dates";
import { bookingInput } from "@/lib/booking/input";
import type { Quote, Rules } from "@/lib/booking/rules";
import { fmtMoney } from "./format";
import { useRequestBooking } from "./queries";
import { useBooking } from "./store";
import styles from "./booking.module.css";

const guestSchema = bookingInput.pick({ name: true, email: true, phone: true, message: true, website: true });
type GuestFields = z.input<typeof guestSchema>;

const RETURN_PARAMS = ["booking", "session_id", "cancel"];
/** The current page without any Stripe return parameters: where the guest comes back to after paying. */
function returnUrl() {
  const url = new URL(window.location.href);
  RETURN_PARAMS.forEach((p) => url.searchParams.delete(p));
  return url.toString();
}

interface Props {
  checkIn: IsoDate;
  checkOut: IsoDate;
  rules: Rules;
  quote: Quote;
  wide: boolean;
}

export function GuestForm({ checkIn, checkOut, rules, quote, wide }: Props) {
  const guests = useBooking((s) => s.guests);
  const breakfast = useBooking((s) => s.breakfast);
  const setGuests = useBooking((s) => s.setGuests);
  const setBreakfast = useBooking((s) => s.setBreakfast);
  const send = useRequestBooking();

  // When the form was first shown (spam check: bots submit instantly). Set after mount, not during render.
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GuestFields>({
    resolver: zodResolver(guestSchema),
    defaultValues: { name: "", email: "", phone: "", message: "", website: "" },
  });

  function request(form: GuestFields) {
    send.mutate({
      checkIn,
      checkOut,
      guests,
      breakfast,
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      message: form.message || undefined,
      website: form.website,
      startedAt: startedAt.current,
      returnUrl: returnUrl(),
    });
  }
  // Stay disabled while the browser is leaving for Stripe.
  const busy = send.isPending || (send.isSuccess && "checkoutUrl" in send.data);

  return (
    <form className={styles.form} onSubmit={(e) => void handleSubmit(request)(e)} noValidate>
      <div className={`${styles.field} ${styles.inline}`}>
        <span id="booking-guests-label">Guests</span>
        <div className={styles.stepper} role="group" aria-labelledby="booking-guests-label">
          <button type="button" aria-label="Fewer guests" disabled={guests <= 1} onClick={() => setGuests(guests - 1)}>
            −
          </button>
          <output aria-live="polite">{guests}</output>
          <button
            type="button"
            aria-label="More guests"
            disabled={guests >= rules.maxGuests}
            onClick={() => setGuests(guests + 1)}
          >
            +
          </button>
        </div>
      </div>
      <label className={styles.check}>
        <input type="checkbox" checked={breakfast} onChange={(e) => setBreakfast(e.target.checked)} />
        <span>
          Breakfast basket{" "}
          <span className={styles.sub}>{fmtMoney(rules.breakfastCents, rules.currency)} / guest / night</span>
        </span>
      </label>

      <dl className={styles.price}>
        {quote.lines.map((l) => (
          <div key={l.label}>
            <dt>{l.label}</dt>
            <dd>{fmtMoney(l.amountCents, quote.currency)}</dd>
          </div>
        ))}
        <div className={styles.total}>
          <dt>Total ({quote.currency.toUpperCase()})</dt>
          <dd>{fmtMoney(quote.totalCents, quote.currency)}</dd>
        </div>
      </dl>

      <h4 className={styles.h}>Your details</h4>
      <div className={wide ? styles.fields2 : styles.fields}>
        <Field label="Full name" error={errors.name?.message}>
          <input
            type="text"
            autoComplete="name"
            maxLength={120}
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <input
            type="email"
            autoComplete="email"
            maxLength={200}
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
        </Field>
        <Field label="Phone (optional)">
          <input type="tel" autoComplete="tel" maxLength={40} {...register("phone")} />
        </Field>
      </div>
      <Field label="Message to the host (optional)">
        <textarea rows={wide ? 2 : 3} maxLength={1000} {...register("message")} />
      </Field>
      {/* Honeypot: hidden from people and screen readers; bots tend to fill it. */}
      <div className={styles.hp} aria-hidden="true">
        <label>
          Website
          <input type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
        </label>
      </div>

      <button type="submit" className={styles.submit} disabled={busy}>
        {busy ? "Sending…" : `Request to book · ${fmtMoney(quote.totalCents, quote.currency)}`}
      </button>
      <p className={styles.fine}>
        {nightsBetween(checkIn, checkOut)} nights. Your card is only authorised now and is charged once your stay is
        approved (within 48 hours).
      </p>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactElement }) {
  return (
    <label className={error ? `${styles.field} ${styles.invalid}` : styles.field}>
      <span>{label}</span>
      {children}
      {error && (
        <span className={styles.err} role="alert">
          {error}
        </span>
      )}
    </label>
  );
}
