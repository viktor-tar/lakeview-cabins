-- Newsletter sign-ups from the site footer. Emails are stored lower-cased; one row per address.
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  email text PRIMARY KEY CHECK (email = lower(email) AND length(email) <= 200),
  created_at timestamptz NOT NULL DEFAULT now()
);
