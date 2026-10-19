"use client";
import { startTransition, useActionState, useEffect, useRef, type FormEvent } from "react";
import { blockDatesAction, createBookingAction, type ActionState } from "../../actions";
import { cx } from "@/app/staff/cx";

export function NewForms({ today, maxGuests }: { today: string; maxGuests: number }) {
  const [bookState, book, booking] = useActionState<ActionState, FormData>(createBookingAction, undefined);
  const [blockState, block, blocking] = useActionState<ActionState, FormData>(blockDatesAction, undefined);
  const blockForm = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (blockState?.ok) blockForm.current?.reset();
  }, [blockState]);

  // Submit without React's automatic form reset, so a rejected form keeps what staff typed.
  const submitWith = (action: (fd: FormData) => void) => (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };

  return (
    <div className={cx("detail-grid")}>
      <section className={cx("card")}>
        <h2>Manual booking</h2>
        <p className={cx("sub")}>For phone or email reservations. Confirmed immediately, no online payment.</p>
        <form onSubmit={submitWith(book)} className={cx("stack")}>
          <div className={cx("row")}>
            <label className={cx("field")}>
              Check-in
              <input type="date" name="checkIn" min={today} required />
            </label>
            <label className={cx("field")}>
              Check-out
              <input type="date" name="checkOut" min={today} required />
            </label>
          </div>
          <div className={cx("row")}>
            <label className={cx("field")}>
              Guests
              <input type="number" name="guests" min={1} max={maxGuests} defaultValue={2} required />
            </label>
            <label className={cx("check")}>
              <input type="checkbox" name="breakfast" /> Breakfast
            </label>
          </div>
          <label className={cx("field")}>
            Guest name
            <input name="name" required maxLength={120} />
          </label>
          <label className={cx("field")}>
            Email
            <input type="email" name="email" required maxLength={200} />
          </label>
          <label className={cx("field")}>
            Phone (optional)
            <input type="tel" name="phone" maxLength={40} />
          </label>
          <label className={cx("field")}>
            Notes (optional)
            <textarea name="message" rows={2} maxLength={1000} />
          </label>
          {bookState?.error && (
            <p className={cx("alert alert-error")} role="alert">
              {bookState.error}
            </p>
          )}
          <button className={cx("btn btn-primary")} disabled={booking}>
            {booking ? "Saving…" : "Create booking"}
          </button>
        </form>
      </section>

      <section className={cx("card")}>
        <h2>Block dates</h2>
        <p className={cx("sub")}>
          Maintenance, owner stays or anything else. Blocked nights can&apos;t be booked on the website.
        </p>
        <form onSubmit={submitWith(block)} className={cx("stack")} ref={blockForm}>
          <div className={cx("row")}>
            <label className={cx("field")}>
              First night
              <input type="date" name="start" min={today} required />
            </label>
            <label className={cx("field")}>
              Until (morning of)
              <input type="date" name="end" min={today} required />
            </label>
          </div>
          <label className={cx("field")}>
            Reason (optional)
            <input name="reason" maxLength={500} placeholder="e.g. Dock maintenance" />
          </label>
          {blockState?.error && (
            <p className={cx("alert alert-error")} role="alert">
              {blockState.error}
            </p>
          )}
          {blockState?.message && (
            <p className={cx("alert alert-ok")} role="status">
              {blockState.message}
            </p>
          )}
          <button className={cx("btn btn-primary")} disabled={blocking}>
            {blocking ? "Blocking…" : "Block dates"}
          </button>
        </form>
      </section>
    </div>
  );
}
