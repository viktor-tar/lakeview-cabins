/**
 * Guest and owner emails. Plain HTML with inline styles (what email clients support),
 * plus a text version. Every email carries the demo notice.
 */
import type { BookingRow } from "@/lib/booking/service";
import { fmtLong, fmtMoney, fmtTime } from "@/components/booking/format";

export const DEMO_NOTICE = "Demo booking system — reservations are not real.";

export type EmailKind = "received" | "approved" | "declined" | "cancelled" | "owner_new_request";

export interface Email {
  subject: string;
  html: string;
  text: string;
}

interface Ctx {
  checkInTime: string;
  checkOutTime: string;
  siteName: string;
  dashboardUrl?: string;
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const COPY: Record<
  Exclude<EmailKind, "owner_new_request">,
  { subject: string; title: string; intro: string; outro: string }
> = {
  received: {
    subject: "We received your booking request",
    title: "Request received",
    intro: "Thank you for your request to stay at the cabin. We'll review it and reply within 48 hours.",
    outro: "Your card has only been authorised. It is charged once we approve your stay, and released if we can't.",
  },
  approved: {
    subject: "Your stay is confirmed",
    title: "Your stay is confirmed",
    intro: "Great news: your booking is confirmed. We look forward to welcoming you to the cabin.",
    outro: "Your payment has now been taken. Reply to this email if you have any questions before your arrival.",
  },
  declined: {
    subject: "About your booking request",
    title: "We couldn't accept your request",
    intro: "Sorry, we aren't able to accept this booking request.",
    outro: "The authorisation on your card has been released, so you won't be charged.",
  },
  cancelled: {
    subject: "Your booking has been cancelled",
    title: "Booking cancelled",
    intro: "Your booking has been cancelled.",
    outro: "If you were charged, a full refund has been issued; it can take a few days to appear on your statement.",
  },
};

function detailsRows(b: BookingRow, ctx: Ctx) {
  const rows: [string, string][] = [
    ["Reference", b.reference],
    ["Check-in", `${fmtLong(b.check_in)}, from ${fmtTime(ctx.checkInTime)}`],
    ["Check-out", `${fmtLong(b.check_out)}, by ${fmtTime(ctx.checkOutTime)}`],
    ["Guests", `${b.guests ?? "—"}${b.breakfast ? " · breakfast included" : ""}`],
  ];
  if (b.total_cents != null) rows.push(["Total", fmtMoney(b.total_cents, b.currency)]);
  return rows;
}

function layout(
  title: string,
  paragraphs: string[],
  rows: [string, string][],
  siteName: string,
  cta?: { href: string; label: string },
) {
  const table = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 0;color:#5b6b78;width:120px;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;color:#0d1d2e;font-weight:600">${esc(v)}</td></tr>`,
    )
    .join("");
  const ps = paragraphs.map((p) => `<p style="margin:0 0 14px;line-height:1.55;color:#22313f">${esc(p)}</p>`).join("");
  const button = cta
    ? `<p style="margin:20px 0 0"><a href="${esc(cta.href)}" style="display:inline-block;background:#46899d;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:700">${esc(cta.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#eef3f6;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f6;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden">
<tr><td style="background:#08131f;padding:18px 24px;color:#a9dbe9;font-weight:700;font-size:17px;letter-spacing:.02em">${esc(siteName)}</td></tr>
<tr><td style="padding:26px 24px 8px">
<h1 style="margin:0 0 16px;font-size:21px;color:#0d1d2e">${esc(title)}</h1>${ps}
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #dfe7ec;border-bottom:1px solid #dfe7ec;margin:6px 0 14px;font-size:14px">${table}</table>
${button}</td></tr>
<tr><td style="padding:14px 24px 22px;font-size:12px;color:#7a8a96">${esc(DEMO_NOTICE)}</td></tr>
</table></td></tr></table></body></html>`;
}

function textVersion(
  title: string,
  paragraphs: string[],
  rows: [string, string][],
  cta?: { href: string; label: string },
) {
  return [
    title,
    "",
    ...paragraphs,
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    ...(cta ? ["", `${cta.label}: ${cta.href}`] : []),
    "",
    DEMO_NOTICE,
  ].join("\n");
}

export function renderEmail(kind: EmailKind, b: BookingRow, ctx: Ctx): Email {
  const rows = detailsRows(b, ctx);
  if (kind === "owner_new_request") {
    const paragraphs = [
      `${b.guest_name} (${b.guest_email}) has requested ${b.nights} nights. Their card is authorised and the dates are held for 48 hours.`,
    ];
    if (b.message) paragraphs.push(`Message from the guest: "${b.message}"`);
    const cta = ctx.dashboardUrl
      ? { href: `${ctx.dashboardUrl}/staff/bookings/${b.id}`, label: "Review request" }
      : undefined;
    return {
      subject: `New booking request ${b.reference}`,
      html: layout("New booking request", paragraphs, rows, ctx.siteName, cta),
      text: textVersion("New booking request", paragraphs, rows, cta),
    };
  }
  const c = COPY[kind];
  const first = b.guest_name ? `Hi ${b.guest_name.split(" ")[0]},` : "Hello,";
  const paragraphs = [first, c.intro, c.outro];
  return {
    subject: `${c.subject} · ${b.reference}`,
    html: layout(c.title, paragraphs, rows, ctx.siteName),
    text: textVersion(c.title, paragraphs, rows),
  };
}
