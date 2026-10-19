/**
 * Sends booking emails through Gmail (SMTP with an app password).
 * Email is best-effort: a failure is logged but never breaks a booking or a staff action.
 * Without GMAIL_USER / GMAIL_APP_PASSWORD it does nothing (local development, tests).
 */
import nodemailer, { type Transporter } from "nodemailer";
import type { Sql } from "postgres";
import type { BookingRow } from "@/lib/booking/service";
import { getRules } from "@/lib/booking/service";
import { renderEmail, type EmailKind } from "./templates";

let transport: Transporter | null | undefined;

export function emailEnabled() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

function getTransport(): Transporter | null {
  if (transport !== undefined) return transport;
  transport = emailEnabled()
    ? nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "") },
        connectionTimeout: 8_000,
        greetingTimeout: 8_000,
        socketTimeout: 10_000,
      })
    : null;
  return transport;
}

/** For tests: inject a transport (e.g. nodemailer's jsonTransport). */
export function setTransportForTests(t: Transporter | null) {
  transport = t;
}

/** Sample data and purged records use reserved domains that must never receive mail. */
export function isDeliverable(email: string | null | undefined): email is string {
  if (!email) return false;
  return !/@(example\.(com|org|net)|[^@]+\.invalid)$/i.test(email);
}

export async function sendBookingEmail(sql: Sql, kind: EmailKind, booking: BookingRow): Promise<boolean> {
  const t = getTransport();
  if (!t || booking.kind !== "reservation") return false;
  const to = kind === "owner_new_request" ? process.env.OWNER_NOTIFY_EMAIL : booking.guest_email;
  if (!isDeliverable(to)) return false;
  try {
    const rules = await getRules(sql);
    const siteName = process.env.MAIL_FROM_NAME || "Lakeview Cabins";
    const dashboardUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined;
    const email = renderEmail(kind, booking, {
      checkInTime: rules.checkInTime,
      checkOutTime: rules.checkOutTime,
      siteName,
      dashboardUrl,
    });
    await t.sendMail({
      from: { name: siteName, address: process.env.GMAIL_USER ?? "no-reply@localhost" },
      to,
      replyTo: process.env.GMAIL_USER,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    return true;
  } catch (e) {
    console.error(`email "${kind}" for ${booking.reference} failed:`, e instanceof Error ? e.message : e);
    return false;
  }
}
