"use client";
/** The wide calendar + form in the "Book now" popup. Loaded on demand by the dialog provider. */
import { BookingWidget } from "./BookingWidget";
import styles from "./booking.module.css";

export default function BookingDialogContent() {
  return (
    <div className={styles.dialogWrap}>
      <BookingWidget layout="wide" />
    </div>
  );
}
