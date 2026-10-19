/**
 * Drizzle table definitions (typed query layer).
 * The source of truth for constraints is drizzle/*.sql — notably the
 * bookings_no_overlap EXCLUDE constraint, which Drizzle cannot express.
 */
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  date,
  integer,
  boolean,
  timestamp,
  smallint,
  bigserial,
  jsonb,
  primaryKey,
} from "drizzle-orm/pg-core";

export const bookingKind = pgEnum("booking_kind", ["reservation", "block"]);
export const bookingStatus = pgEnum("booking_status", ["pending", "approved", "declined", "cancelled", "expired"]);
export const paymentStatus = pgEnum("payment_status", [
  "none",
  "awaiting",
  "authorized",
  "captured",
  "released",
  "refunded",
  "failed",
]);
export const bookingSource = pgEnum("booking_source", ["guest", "staff", "seed"]);

export const settings = pgTable("settings", {
  id: smallint("id").primaryKey().default(1),
  currency: text("currency").notNull(),
  timezone: text("timezone").notNull(),
  nightlyRateCents: integer("nightly_rate_cents").notNull(),
  weekendRateCents: integer("weekend_rate_cents").notNull(),
  cleaningFeeCents: integer("cleaning_fee_cents").notNull(),
  breakfastCents: integer("breakfast_cents").notNull(),
  taxRateBp: integer("tax_rate_bp").notNull(),
  minNights: integer("min_nights").notNull(),
  maxNights: integer("max_nights").notNull(),
  maxGuests: integer("max_guests").notNull(),
  bookingWindowDays: integer("booking_window_days").notNull(),
  holdHours: integer("hold_hours").notNull(),
  checkoutHoldMinutes: integer("checkout_hold_minutes").notNull(),
  checkInTime: text("check_in_time").notNull(),
  checkOutTime: text("check_out_time").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  reference: text("reference").notNull().unique(),
  kind: bookingKind("kind").notNull().default("reservation"),
  status: bookingStatus("status").notNull().default("pending"),
  source: bookingSource("source").notNull().default("guest"),
  checkIn: date("check_in").notNull(),
  checkOut: date("check_out").notNull(),
  guests: integer("guests"),
  breakfast: boolean("breakfast").notNull().default(false),
  guestName: text("guest_name"),
  guestEmail: text("guest_email"),
  guestPhone: text("guest_phone"),
  message: text("message"),
  nights: integer("nights"),
  accommodationCents: integer("accommodation_cents"),
  cleaningCents: integer("cleaning_cents"),
  breakfastCents: integer("breakfast_cents"),
  taxCents: integer("tax_cents"),
  totalCents: integer("total_cents"),
  currency: text("currency").notNull().default("cad"),
  paymentStatus: paymentStatus("payment_status").notNull().default("none"),
  stripeSessionId: text("stripe_session_id").unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
  holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  decidedBy: text("decided_by"),
});

export const bookingEvents = pgTable("booking_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  actor: text("actor").notNull(),
  data: jsonb("data"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const staffUsers = pgTable("staff_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("staff"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);

export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Settings = typeof settings.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
