ALTER TABLE review_snapshots ADD COLUMN fetched_at timestamptz;
UPDATE review_snapshots SET fetched_at = (reading->>'fetched_at')::timestamptz;
ALTER TABLE review_snapshots ALTER COLUMN fetched_at SET NOT NULL;
ALTER TABLE review_snapshots DROP CONSTRAINT review_snapshots_signal_id_record_date_key;
ALTER TABLE review_snapshots ADD CONSTRAINT review_snapshots_signal_fetched_key UNIQUE (signal_id, fetched_at);
ALTER TABLE review_snapshots ADD CONSTRAINT review_snapshots_date_matches CHECK (record_date = (fetched_at AT TIME ZONE 'Asia/Seoul')::date);
ALTER TABLE review_snapshots ADD CONSTRAINT review_snapshots_reading_matches CHECK (
  reading->>'signal_id' = signal_id AND reading->>'record_date' = record_date::text
  AND reading->>'record_timezone' = 'Asia/Seoul'
  AND (reading->>'fetched_at')::timestamptz = fetched_at
);
INSERT INTO review_snapshots (record_id, signal_id, record_date, fetched_at, reading, raw_payload)
SELECT record_id, signal_id, record_date, fetched_at,
  jsonb_build_object('signal_id', signal_id, 'normalized_value', normalized_value, 'unit', unit,
    'source_name', source_name, 'source_url', source_url, 'source_time', source_time,
    'fetched_at', fetched_at, 'record_timezone', record_timezone, 'record_date', record_date), raw_payload
FROM daily_readings
ON CONFLICT (signal_id, fetched_at) DO NOTHING;
