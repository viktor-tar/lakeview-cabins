"use client";
/**
 * Guest reviews, shown by the same Elfsight widget the original page used.
 * The script loads after the page is idle; Elfsight fills the placeholder div itself.
 */
import Script from "next/script";

const WIDGET_ID = "857c451b-99d7-4e78-a946-4b12c9139022";

export function ReviewsWidget() {
  return (
    <>
      <Script src="https://static.elfsight.com/platform/platform.js" strategy="lazyOnload" />
      <div className={`elfsight-app-${WIDGET_ID}`} data-elfsight-app-lazy />
    </>
  );
}
