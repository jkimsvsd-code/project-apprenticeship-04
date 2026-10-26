import { validateReading, type Reading, type ErrorCode } from '../shared/reading';
import { classifyTransport, parseRetryAfter } from '../shared/failures';

export type ReplayFixture = {
  fixture_id: string; contract_version: string; description_ko: string; virtual_now: string;
  transport: { mode: 'http' | 'timeout' | 'offline'; status: number | null; delay_ms: number; deadline_ms: number; headers: Record<string, string> };
  payload: unknown;
};
type ReplayRow = {
  record_id: string; signal_id: string; record_date: string; normalized_value: number; unit: string;
  first_fetched_at: string; last_fetched_at: string; reading: Reading;
};
type Comparison = { state: 'insufficient' | 'unit_mismatch' | 'comparable'; direction: 'increase' | 'decrease' | 'unchanged' | null; magnitude: number | null; unit: string | null };
export type ReplayState = {
  schema_version: 'aleph-t04-evaluation-state-v1'; daily_readings: ReplayRow[]; current_reading: Reading | null;
  status: { freshness: 'fresh' | 'stale'; error_code: ErrorCode | 'none' } | null;
  last_delta: number | null; last_comparison: Comparison;
  last_run: { fixture_id: string; virtual_now: string; outcome: 'success' | 'error'; error_code: ErrorCode | 'none'; retry_after_seconds: number | null } | null;
  sequence: number;
};

export function resetReplay(): ReplayState {
  return { schema_version: 'aleph-t04-evaluation-state-v1', daily_readings: [], current_reading: null, status: null, last_delta: null,
    last_comparison: { state: 'insufficient', direction: null, magnitude: null, unit: null }, last_run: null, sequence: 0 };
}

function comparison(rows: ReplayRow[], reading: Reading): Comparison {
  const previous = rows.filter((row) => row.signal_id === reading.signal_id && row.record_date < reading.record_date)
    .sort((left, right) => right.record_date.localeCompare(left.record_date))[0];
  if (!previous) return { state: 'insufficient', direction: null, magnitude: null, unit: null };
  if (previous.unit !== reading.unit) return { state: 'unit_mismatch', direction: null, magnitude: null, unit: null };
  const signed = reading.normalized_value - previous.normalized_value;
  return { state: 'comparable', direction: signed > 0 ? 'increase' : signed < 0 ? 'decrease' : 'unchanged', magnitude: Math.abs(signed), unit: reading.unit };
}

export function runReplay(input: ReplayState, fixture: ReplayFixture): ReplayState {
  if (fixture.contract_version !== '1.1.0' || !/^T04-[A-Z0-9-]+$/.test(fixture.fixture_id)) throw new Error('Unsupported fixture');
  const state = structuredClone(input);
  let failure = classifyTransport(fixture.transport);
  let reading: Reading | null = null;
  if (!failure) {
    try { reading = validateReading(fixture.payload); }
    catch { failure = 'schema_error'; }
  }
  if (failure) {
    state.status = { freshness: 'stale', error_code: failure };
  } else if (reading) {
    const index = state.daily_readings.findIndex((row) => row.signal_id === reading.signal_id && row.record_date === reading.record_date);
    const existing = index >= 0 ? state.daily_readings[index] : null;
    const row: ReplayRow = { record_id: existing?.record_id ?? `demo-${reading.signal_id}-${reading.record_date}`,
      signal_id: reading.signal_id, record_date: reading.record_date, normalized_value: reading.normalized_value, unit: reading.unit,
      first_fetched_at: existing?.first_fetched_at ?? reading.fetched_at, last_fetched_at: reading.fetched_at, reading };
    if (index >= 0) state.daily_readings[index] = row;
    else state.daily_readings.push(row);
    state.daily_readings.sort((left, right) => left.record_date.localeCompare(right.record_date));
    state.current_reading = reading;
    state.status = { freshness: 'fresh', error_code: 'none' };
    state.last_comparison = comparison(state.daily_readings, reading);
    state.last_delta = state.last_comparison.magnitude;
  }
  state.sequence += 1;
  state.last_run = { fixture_id: fixture.fixture_id, virtual_now: fixture.virtual_now,
    outcome: failure ? 'error' : 'success', error_code: failure ?? 'none',
    retry_after_seconds: failure ? parseRetryAfter(fixture.transport.headers['retry-after'] ?? null, fixture.virtual_now) : null };
  return state;
}
