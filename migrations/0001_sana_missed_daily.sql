-- Sana missed-command shapes. Needs Mansur's OK before it is applied to production.
--
-- Stores only an anonymous "shape" (known command words plus [n], [surah], [theme], [w])
-- and a daily count. No raw text, user, email, IP, user agent, session, or exact time.
-- Rows older than 90 days are deleted by the app (see src/lib/sana-missed-store.ts).

CREATE TABLE IF NOT EXISTS schema_migrations (
  id text PRIMARY KEY,
  status text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sana_missed_daily (
  shape text NOT NULL CHECK (char_length(shape) BETWEEN 1 AND 80),
  day date NOT NULL,
  count integer NOT NULL DEFAULT 1 CHECK (count > 0),
  PRIMARY KEY (shape, day)
);

CREATE INDEX IF NOT EXISTS sana_missed_daily_day_idx ON sana_missed_daily (day);

INSERT INTO schema_migrations (id, status)
VALUES ('sana-missed-v1', 'done')
ON CONFLICT (id) DO NOTHING;
