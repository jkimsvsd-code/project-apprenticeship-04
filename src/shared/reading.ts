import source from '../../config/live-source.json';

export { source };
export const errorCodes = ['timeout', 'auth', 'rate_limit', 'offline', 'schema_error'] as const;
export type ErrorCode = typeof errorCodes[number];
export type Reading = {
  signal_id: string; normalized_value: number; unit: string; source_name: string;
  source_url: string; source_time: string | null; fetched_at: string;
  record_timezone: 'Asia/Seoul'; record_date: string;
};
export type DailyReading = { record_id: string; reading: Reading; raw_payload: unknown };
export type ReviewSummary = { snapshot_id: string; record_id: string; reading: Reading; created_at: string };
export type ReviewSnapshot = ReviewSummary & { raw_payload: unknown };
export type BoardState = {
  reading: Reading | null; records: DailyReading[]; snapshots: ReviewSummary[];
  freshness: 'fresh' | 'stale' | null; error_code: ErrorCode | 'none' | null;
  next_allowed_at: string | null; last_attempt_at: string | null; retry_after_seconds: number | null;
};

export function kstDate(instant: string): string {
  const date = new Date(instant);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid date');
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function formatKst(instant: string | null, seconds = false): string {
  if (!instant) return '아직 없음';
  return new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: seconds ? '2-digit' : undefined, hour12: false }).format(new Date(instant));
}

function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid response object');
  return value as Record<string, unknown>;
}

const readingKeys = ['signal_id', 'normalized_value', 'unit', 'source_name', 'source_url', 'source_time', 'fetched_at', 'record_timezone', 'record_date'].sort();

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    && Number.isFinite(Date.parse(value));
}

// Live and replay inputs pass this same boundary before either repository writes.
export function validateReading(raw: unknown): Reading {
  const value = object(raw);
  const keys = Object.keys(value).sort();
  if (keys.length !== readingKeys.length || keys.some((key, index) => key !== readingKeys[index])) throw new Error('Invalid reading keys');
  if (typeof value.signal_id !== 'string' || value.signal_id.length > 100 || !/^[a-z0-9][a-z0-9._-]*$/.test(value.signal_id)
    || typeof value.normalized_value !== 'number' || !Number.isFinite(value.normalized_value)
    || typeof value.unit !== 'string' || !value.unit.trim() || value.unit.length > 24
    || typeof value.source_name !== 'string' || !value.source_name.trim() || value.source_name.length > 120
    || typeof value.source_url !== 'string'
    || (value.source_time !== null && !isTimestamp(value.source_time))
    || !isTimestamp(value.fetched_at) || value.record_timezone !== 'Asia/Seoul'
    || value.record_date !== kstDate(value.fetched_at)) throw new Error('Invalid normalized reading');
  const url = new URL(value.source_url);
  if (url.protocol !== 'https:') throw new Error('Source must use HTTPS');
  return { ...value } as Reading;
}

export function normalizeWeather(raw: unknown, fetchedAt: string): Reading {
  const payload = object(raw);
  const current = object(payload.current);
  const units = object(payload.current_units);
  if (payload.timezone !== 'Asia/Seoul' || payload.utc_offset_seconds !== 32400
    || units.time !== 'unixtime' || units.temperature_2m !== '°C'
    || typeof current.temperature_2m !== 'number' || !Number.isFinite(current.temperature_2m)
    || typeof current.time !== 'number' || !Number.isSafeInteger(current.time)) throw new Error('Weather schema changed');
  const observed = new Date(current.time * 1000);
  if (!Number.isFinite(observed.getTime()) || observed.getTime() > new Date(fetchedAt).getTime()) throw new Error('Invalid source time');
  return validateReading({
    signal_id: source.signal_id, normalized_value: current.temperature_2m, unit: '°C',
    source_name: source.source_name, source_url: source.source_url,
    source_time: observed.toISOString(), fetched_at: fetchedAt,
    record_timezone: 'Asia/Seoul', record_date: kstDate(fetchedAt),
  });
}
