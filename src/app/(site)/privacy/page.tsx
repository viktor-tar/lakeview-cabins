import type { Metadata } from "next";
import { ArrowLink } from "@/components/site/ArrowLink";
import styles from "./privacy.module.css";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What the Lakeview Cabins demo site collects, why, and how long it is kept.",
};

export default function PrivacyPage() {
  return (
    <article className={styles.page}>
      <div className={styles.back}>
        <ArrowLink href="/">Back to home page</ArrowLink>
      </div>
      <h1>Privacy policy</h1>
      <p className={styles.lead}>
        This site is a portfolio demo. Booking requests are not real reservations, and payments run in Stripe test mode,
        so no real card is ever charged.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Booking requests:</strong> your name, email, optional phone number and message, your dates, number of
          guests and whether you chose breakfast.
        </li>
        <li>
          <strong>Newsletter sign-ups:</strong> your email address.
        </li>
        <li>
          <strong>Spam protection:</strong> a one-way hash of your IP address, used only to limit repeated requests.
        </li>
      </ul>

      <h2>How it is used</h2>
      <p>
        Booking details are used to show the request to the host, to send you emails about its status, and to take a
        test card authorisation through Stripe. Card details are entered on Stripe&apos;s own checkout page and never
        reach this site.
      </p>

      <h2>How long it is kept</h2>
      <p>
        While the site runs in demo mode, all bookings are deleted every night and newsletter sign-ups are removed after
        30 days. Outside demo mode, guest contact details are anonymised 30 days after the stay ends. Rate-limit records
        are kept for one day.
      </p>

      <h2>Cookies</h2>
      <p>
        Visitors get no tracking or advertising cookies. The only cookie is a sign-in session for staff using the
        dashboard, which expires after 8 hours.
      </p>

      <h2>Services we rely on</h2>
      <ul>
        <li>Vercel (hosting) and Neon (database)</li>
        <li>Stripe (test-mode payments)</li>
        <li>Gmail (booking emails)</li>
        <li>
          Snazzy Maps (the embedded map) and Elfsight (the guest reviews widget), which load from their own servers
        </li>
      </ul>

      <h2>Questions</h2>
      <p>
        Email <a href="mailto:info@lakeviewcabins.com">info@lakeviewcabins.com</a> to ask about or delete your data.
      </p>
    </article>
  );
}
