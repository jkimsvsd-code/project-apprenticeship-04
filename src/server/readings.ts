import 'server-only';
import { database } from './database';
import { source, validateReading, type Reading, type DailyReading, type BoardState, type ErrorCode } from '../shared/reading';

export type Attempt = { number: string; startedAt: string };

export async function beginAttempt(signalId = source.signal_id): Promise<Attempt | null> {
  const sql = database();
  const rows = await sql`
    INSERT INTO signal_state (signal_id, last_attempt_no, last_attempt_at, next_allowed_at)
    VALUES (${signalId}, 1, now(), now() + interval '15 seconds')
    ON CONFLICT (signal_id) DO UPDATE
    SET last_attempt_no = signal_state.last_attempt_no + 1, last_attempt_at = now(), next_allowed_at = now() + interval '15 seconds'
    WHERE signal_state.next_allowed_at <= now()
    RETURNING last_attempt_no::text, last_attempt_at::text`;
  return rows.length ? { number: rows[0].last_attempt_no, startedAt: rows[0].last_attempt_at } : null;
}

export async function saveReading(reading: Reading, raw: unknown, attempt: Attempt): Promise<void> {
  validateReading(reading);
  const sql = database();
  await sql.transaction([
    sql`SELECT signal_id FROM signal_state WHERE signal_id = ${reading.signal_id} FOR UPDATE`,
    sql`INSERT INTO daily_readings (signal_id, record_date, normalized_value, unit, source_name, source_url, source_time, fetched_at, first_fetched_at, record_timezone, raw_payload)
      SELECT ${reading.signal_id}, ${reading.record_date}::date, ${reading.normalized_value}, ${reading.unit}, ${reading.source_name}, ${reading.source_url}, ${reading.source_time}::timestamptz,
        ${reading.fetched_at}::timestamptz, ${reading.fetched_at}::timestamptz, ${reading.record_timezone}, ${JSON.stringify(raw)}::jsonb
      FROM signal_state WHERE signal_id = ${reading.signal_id} AND last_attempt_no = ${attempt.number}::bigint
      ON CONFLICT (signal_id, record_date) DO UPDATE SET
        normalized_value = EXCLUDED.normalized_value, unit = EXCLUDED.unit, source_name = EXCLUDED.source_name,
        source_url = EXCLUDED.source_url, source_time = EXCLUDED.source_time, fetched_at = EXCLUDED.fetched_at, raw_payload = EXCLUDED.raw_payload
      WHERE daily_readings.fetched_at <= EXCLUDED.fetched_at`,
    sql`UPDATE signal_state SET last_good_record_id = (SELECT record_id FROM daily_readings WHERE signal_id = ${reading.signal_id} AND record_date = ${reading.record_date}::date),
      freshness = 'fresh', error_code = 'none', retry_after_seconds = NULL
      WHERE signal_id = ${reading.signal_id} AND last_attempt_no = ${attempt.number}::bigint`,
  ]);
}

export async function saveFailure(signalId: string, code: ErrorCode, attempt: Attempt, retryAfter: number | null = null) {
  const sql = database();
  await sql`UPDATE signal_state SET freshness = 'stale', error_code = ${code}, retry_after_seconds = ${retryAfter},
    next_allowed_at = GREATEST(next_allowed_at, now() + (${retryAfter ?? 0} * interval '1 second'))
    WHERE signal_id = ${signalId} AND last_attempt_no = ${attempt.number}::bigint`;
}

type StoredRow = {
  record_id: string; signal_id: string; record_date: string; normalized_value: string | number;
  unit: string; source_name: string; source_url: string; source_time: string | null;
  fetched_at: string; record_timezone: 'Asia/Seoul'; raw_payload: unknown;
};

function daily(row: StoredRow): DailyReading {
  return { record_id: row.record_id, raw_payload: row.raw_payload, reading: {
    signal_id: row.signal_id, record_date: row.record_date, normalized_value: Number(row.normalized_value),
    unit: row.unit, source_name: row.source_name, source_url: row.source_url,
    source_time: row.source_time ? new Date(row.source_time).toISOString() : null,
    fetched_at: new Date(row.fetched_at).toISOString(), record_timezone: row.record_timezone,
  } };
}

export async function readBoard(signalId = source.signal_id): Promise<BoardState> {
  const sql = database();
  const [result] = await sql`SELECT
    (SELECT row_to_json(s) FROM signal_state s WHERE s.signal_id = ${signalId}) AS state,
    (SELECT row_to_json(d) FROM daily_readings d JOIN signal_state s ON s.last_good_record_id = d.record_id WHERE s.signal_id = ${signalId}) AS current,
    COALESCE((SELECT json_agg(d ORDER BY d.record_date DESC) FROM (SELECT * FROM daily_readings WHERE signal_id = ${signalId} ORDER BY record_date DESC LIMIT 14) d), '[]'::json) AS records`;
  const records = (result.records as StoredRow[]).map(daily);
  return {
    reading: result.current ? daily(result.current as StoredRow).reading : null, records,
    freshness: result.state?.freshness ?? null, error_code: result.state?.error_code ?? null,
    next_allowed_at: result.state?.next_allowed_at ? new Date(result.state.next_allowed_at).toISOString() : null,
    last_attempt_at: result.state?.last_attempt_at ? new Date(result.state.last_attempt_at).toISOString() : null,
  };
}
