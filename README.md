# Lakeview Cabins

A marketing site and booking system for a waterfront timber cabin on Howe Sound, near Squamish, BC.
Guests check availability, pick dates and request a stay; the card is authorised through Stripe and only
charged once staff approve the request in the dashboard.

**Live demo:** [lakeview-cabins.vercel.app](https://lakeview-cabins.vercel.app) · staff dashboard at
[/staff](https://lakeview-cabins.vercel.app/staff) (the demo login is shown on the sign-in page)

> **Portfolio project.** The booking system runs in demo mode: reservations are not real, payments use Stripe
> test mode, and the data resets every night.

## Highlights

- **Scroll-driven road animation.** A car drives down a winding road while the page scrolls, switching from day
  to night halfway down. It is a 330-frame WebP sequence drawn on a `<canvas>` with GSAP ScrollTrigger
  (10 MB, loaded progressively in passes), replacing 56 MB of Lottie JSON.
- **No double bookings, by construction.** A Postgres exclusion constraint
  (`EXCLUDE USING gist (stay WITH &&)`) rejects overlapping stays, even under concurrent requests.
- **Holds and payments.** A request holds the dates while the guest completes Stripe Checkout with
  manual capture. Webhooks are signature-verified and idempotent, and unpaid holds lapse on their own.
- **Staff dashboard.** Approve, decline or cancel requests (capturing or releasing the payment), add bookings or
  block dates, and see everything on a month calendar.
- **Booking emails.** Guests and the owner get status emails through Gmail SMTP.
- **One booking state, two layouts.** The hero calendar and the "Book now" popup share a TanStack Query cache and
  a small Zustand store, so dates picked in one carry over to the other.
- **Accessible UI.** Native `<dialog>` popups, keyboard navigation in the calendar and photo viewer,
  `prefers-reduced-motion` respected throughout.

## Tech stack

| Area                 | Tools                                                              |
| -------------------- | ------------------------------------------------------------------ |
| Framework            | Next.js 16 (App Router, Cache Components), React 19, TypeScript    |
| Styling              | CSS Modules, self-hosted fonts via Fontsource                      |
| Client data          | TanStack Query, Axios, Zustand                                     |
| Forms and validation | React Hook Form, Zod (one schema shared by client and server)      |
| Animation            | GSAP + ScrollTrigger                                               |
| Database             | Postgres on Neon, postgres.js, plain SQL migrations                |
| Auth                 | Auth.js (credentials, JWT sessions) for the staff dashboard        |
| Payments             | Stripe Checkout (test mode only; live keys are refused)            |
| Email                | Nodemailer over Gmail SMTP                                         |
| Testing              | Vitest (booking rules, service, database), Playwright (end-to-end) |
| Tooling              | ESLint, Prettier                                                   |
| Hosting              | Vercel (with a daily cron job)                                     |

## Getting started

Requirements: Node 20+ and a Postgres database (a free Neon database works).

```bash
npm install
cp .env.example .env.local   # then fill in DATABASE_URL and AUTH_SECRET at minimum
npm run db:migrate
npm run db:seed              # sample bookings + the demo staff account
npm run dev
```

Open http://localhost:3000 for the site and http://localhost:3000/staff for the dashboard. In demo mode the
login page shows the demo staff credentials.

Without Stripe keys, booking requests skip payment and are confirmed straight away. Without Gmail settings, no
emails are sent. Everything else works locally without either.

### Environment variables

See [`.env.example`](.env.example) for the full list with notes. The essentials:

| Variable                                     | Purpose                                                       |
| -------------------------------------------- | ------------------------------------------------------------- |
| `DATABASE_URL`                               | Postgres connection string (use Neon's pooled URL on Vercel)  |
| `AUTH_SECRET`                                | Signs staff sessions                                          |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe test-mode payments                                     |
| `CRON_SECRET`                                | Protects the daily maintenance job                            |
| `DEMO_MODE`                                  | `true` resets to sample data nightly and shows the demo login |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD`           | Booking emails (optional)                                     |

## Scripts

| Command                                  | What it does                                                   |
| ---------------------------------------- | -------------------------------------------------------------- |
| `npm run dev`                            | Start the dev server                                           |
| `npm run build`                          | Apply migrations (and seed an empty demo database), then build |
| `npm test`                               | Unit and integration tests (Vitest)                            |
| `npm run test:e2e`                       | End-to-end tests (Playwright, desktop and phone)               |
| `npm run lint` / `npm run typecheck`     | ESLint / TypeScript                                            |
| `npm run db:migrate` / `npm run db:seed` | Database setup                                                 |

## Project structure

```
src/
  app/
    (site)/          Public pages: home, gallery, customer reviews, privacy
    staff/           Staff dashboard (protected by src/proxy.ts)
    api/             Booking, calendar, Stripe webhook, newsletter and cron routes
  components/
    home/            Hero, info strip, story section with the road animation, closing scene
    booking/         Calendar, guest form, confirmation, queries and shared store
    gallery/         Mosaic, full gallery and photo viewer
    site/            Header and menu, footer, popups, shared pieces
  content/           Page text and image lists
  lib/
    booking/         Dates, pricing rules, availability and the booking service
    payments/        Stripe integration (test mode guard)
    email/           Email templates and sending
    server/          Database client, rate limiting, HTTP helpers
migrations/          SQL migrations
tests/               Vitest suites
e2e/                 Playwright tests
```

## How a booking works

1. The calendar loads public availability (dates only, never guest details) from `/api/calendar`.
2. Submitting the form creates a `pending` booking that holds the dates, then redirects to Stripe Checkout
   with manual capture.
3. Stripe's webhook marks the payment as authorised and the guest gets a "request received" email.
4. Staff approve (the payment is captured) or decline (the authorisation is released) in the dashboard.
5. A daily cron job expires lapsed holds, anonymises old guest details and, in demo mode, resets the data.
