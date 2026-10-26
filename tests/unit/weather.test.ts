import { beforeEach, afterEach, expect, it, vi } from 'vitest';
vi.mock('../../src/server/readings', () => ({ beginAttempt: vi.fn(), readBoard: vi.fn(), saveReading: vi.fn(), saveFailure: vi.fn() }));
import { refreshWeather } from '../../src/server/weather';
import { beginAttempt, readBoard, saveReading, saveFailure } from '../../src/server/readings';

const attempt = { number: '1', startedAt: '2026-08-24T10:00:00Z' };
const empty = { reading: null, records: [], snapshots: [], freshness: null, error_code: null, next_allowed_at: null, last_attempt_at: null, retry_after_seconds: null };
beforeEach(() => { vi.clearAllMocks(); vi.mocked(beginAttempt).mockResolvedValue(attempt); vi.mocked(readBoard).mockResolvedValue(empty); vi.stubGlobal('fetch', vi.fn()); });
afterEach(() => { vi.unstubAllGlobals(); });

it.each([[401, 'auth'], [403, 'auth'], [429, 'rate_limit']] as const)('live HTTP %s goes through the shared %s classification', async (status, code) => {
  vi.mocked(fetch).mockResolvedValue(new Response('{}', { status, headers: { 'retry-after': '60' } }));
  await refreshWeather();
  expect(saveFailure).toHaveBeenCalledWith('seoul-temperature-2m', code, attempt, 60);
  expect(saveReading).not.toHaveBeenCalled();
});
it.each([['TimeoutError', 'timeout'], ['TypeError', 'offline']] as const)('live %s preserves the last good reading via %s', async (name, code) => {
  const error = new Error('synthetic network failure'); error.name = name;
  vi.mocked(fetch).mockRejectedValue(error);
  await refreshWeather();
  expect(saveFailure).toHaveBeenCalledWith('seoul-temperature-2m', code, attempt, null);
  expect(saveReading).not.toHaveBeenCalled();
});
it('never saves malformed successful responses', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response('{"current":{"temperature_2m":"105"}}', { status: 200 }));
  await refreshWeather();
  expect(saveFailure).toHaveBeenCalledWith('seoul-temperature-2m', 'schema_error', attempt, null);
  expect(saveReading).not.toHaveBeenCalled();
});
it('does not contact the source while the database cooldown is active', async () => {
  vi.mocked(beginAttempt).mockResolvedValue(null);
  expect((await refreshWeather()).throttled).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
});
it('does not misclassify storage failure as an upstream failure', async () => {
  const raw = { timezone: 'Asia/Seoul', utc_offset_seconds: 32400, current_units: { time: 'unixtime', temperature_2m: '°C' }, current: { time: Math.floor(Date.now() / 1000) - 60, temperature_2m: 12.3 } };
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(raw)));
  vi.mocked(saveReading).mockRejectedValueOnce(new Error('synthetic storage failure'));
  await expect(refreshWeather()).rejects.toThrow('synthetic storage failure');
  expect(saveFailure).not.toHaveBeenCalled();
});
