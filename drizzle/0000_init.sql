-- Lakeview Cabins booking schema
-- Double bookings are prevented by the database itself (EXCLUDE constraint on date ranges),
-- so even two requests arriving at the same instant cannot both succeed.

CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE booking_kind AS ENUM ('reservation', 'block');
CREATE TYPE booking_status AS ENUM ('pending', 'approved', 'declined', 'cancelled', 'expired');
CREATE TYPE payment_status AS ENUM ('none', 'awaiting', 'authorized', 'captured', 'released', 'refunded', 'failed');
CREATE TYPE booking_source AS ENUM ('guest', 'staff', 'seed');

-- Single-row table holding every configurable rule. Changing prices or limits needs no deploy.
CREATE TABLE settings (
  id                     smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  currency               text     NOT NULL DEFAULT 'cad',
  timezone               text     NOT NULL DEFAULT 'America/Vancouver',
  nightly_rate_cents     integer  NOT NULL DEFAULT 25000 CHECK (nightly_rate_cents > 0),
  weekend_rate_cents     integer  NOT NULL DEFAULT 29000 CHECK (weekend_rate_cents > 0),
  cleaning_fee_cents     integer  NOT NULL DEFAULT 9000  CHECK (cleaning_fee_cents >= 0),
  breakfast_cents        integer  NOT NULL DEFAULT 700   CHECK (breakfast_cents >= 0), -- per guest per night
  tax_rate_bp            integer  NOT NULL DEFAULT 1300  CHECK (tax_rate_bp BETWEEN 0 AND 5000), -- basis points (1300 = 13%)
  min_nights             integer  NOT NULL DEFAULT 2     CHECK (min_nights >= 1),
  max_nights             integer  NOT NULL DEFAULT 14,
  max_guests             integer  NOT NULL DEFAULT 4     CHECK (max_guests >= 1),
  booking_window_days    integer  NOT NULL DEFAULT 365,
  hold_hours             integer  NOT NULL DEFAULT 48    CHECK (hold_hours >= 1),  -- pending request holds dates this long
  checkout_hold_minutes  integer  NOT NULL DEFAULT 30    CHECK (checkout_hold_minutes >= 30), -- while guest is on Stripe Checkout
  check_in_time          text     NOT NULL DEFAULT '16:00',
  check_out_time         text     NOT NULL DEFAULT '11:00',
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CHECK (max_nights >= min_nights)
);
INSERT INTO settings (id) VALUES (1);

CREATE TABLE bookings (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference                text NOT NULL UNIQUE,
  kind                     booking_kind   NOT NULL DEFAULT 'reservation',
  status                   booking_status NOT NULL DEFAULT 'pending',
  source                   booking_source NOT NULL DEFAULT 'guest',
  check_in                 date NOT NULL,
  check_out                date NOT NULL,
  stay                     daterange GENERATED ALWAYS AS (daterange(check_in, check_out, '[)')) STORED,
  guests                   integer,
  breakfast                boolean NOT NULL DEFAULT false,
  guest_name               text,
  guest_email              text,
  guest_phone              text,
  message                  text,
  nights                   integer,
  accommodation_cents      integer,
  cleaning_cents           integer,
  breakfast_cents          integer,
  tax_cents                integer,
  total_cents              integer,
  currency                 text NOT NULL DEFAULT 'cad',
  payment_status           payment_status NOT NULL DEFAULT 'none',
  stripe_session_id        text UNIQUE,
  stripe_payment_intent_id text UNIQUE,
  hold_expires_at          timestamptz,
  note                     text, -- staff note / block reason
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  decided_at               timestamptz,
  decided_by               text,
  CHECK (check_out > check_in),
  CHECK (kind = 'block' OR (guests IS NOT NULL AND guests >= 1)),
  CHECK (kind = 'block' OR (guest_name IS NOT NULL AND guest_email IS NOT NULL)),
  -- The core guarantee: no two active (pending or approved) bookings/blocks may overlap.
  CONSTRAINT bookings_no_overlap EXCLUDE USING gist (stay WITH &&)
    WHERE (status IN ('pending', 'approved'))
);
CREATE INDEX bookings_status_idx ON bookings (status);
CREATE INDEX bookings_check_in_idx ON bookings (check_in);
CREATE INDEX bookings_hold_idx ON bookings (hold_expires_at) WHERE status = 'pending';

-- History of everything that happened to a booking (shown in the staff dashboard).
CREATE TABLE booking_events (
  id          bigserial PRIMARY KEY,
  booking_id  uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  type        text NOT NULL,
  actor       text NOT NULL,
  data        jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX booking_events_booking_idx ON booking_events (booking_id, created_at);

CREATE TABLE staff_users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          text NOT NULL UNIQUE,
  name           text NOT NULL,
  password_hash  text NOT NULL,
  role           text NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'admin')),
  is_demo        boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Fixed-window rate limiting for the public request endpoint (no external service needed).
CREATE TABLE rate_limits (
  key           text NOT NULL,
  window_start  timestamptz NOT NULL,
  count         integer NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

-- Processed Stripe webhook events, so retries are handled exactly once.
CREATE TABLE stripe_events (
  id           text PRIMARY KEY,
  type         text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);
