CREATE TABLE daily_readings (
  record_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id text NOT NULL CHECK (signal_id ~ '^[a-z0-9][a-z0-9._-]*$' AND length(signal_id) <= 100),
  record_date date NOT NULL,
  normalized_value numeric NOT NULL CHECK (normalized_value NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)),
  unit text NOT NULL CHECK (length(unit) BETWEEN 1 AND 24),
  source_name text NOT NULL,
  source_url text NOT NULL CHECK (source_url LIKE 'https://%'),
  source_time timestamptz,
  fetched_at timestamptz NOT NULL,
  first_fetched_at timestamptz NOT NULL,
  record_timezone text NOT NULL CHECK (record_timezone = 'Asia/Seoul'),
  raw_payload jsonb NOT NULL,
  UNIQUE (signal_id, record_date),
  CHECK (record_date = (fetched_at AT TIME ZONE 'Asia/Seoul')::date)
);

CREATE TABLE signal_state (
  signal_id text PRIMARY KEY,
  last_attempt_no bigint NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  next_allowed_at timestamptz NOT NULL DEFAULT '-infinity',
  last_good_record_id uuid REFERENCES daily_readings(record_id),
  freshness text,
  error_code text,
  retry_after_seconds integer CHECK (retry_after_seconds >= 0),
  CHECK ((freshness IS NULL AND error_code IS NULL)
    OR (freshness = 'fresh' AND error_code = 'none' AND last_good_record_id IS NOT NULL)
    OR (freshness = 'stale' AND error_code IN ('timeout', 'auth', 'rate_limit', 'offline', 'schema_error')))
);

CREATE TABLE review_snapshots (
  snapshot_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES daily_readings(record_id),
  signal_id text NOT NULL,
  record_date date NOT NULL,
  reading jsonb NOT NULL,
  raw_payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (signal_id, record_date)
);
