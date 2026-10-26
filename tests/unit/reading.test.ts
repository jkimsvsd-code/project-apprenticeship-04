import { describe, expect, it } from 'vitest';
import { kstDate, normalizeWeather } from '../../src/shared/reading';

const fetched = '2026-10-26T01:01:00.000Z';
function payload() { return { timezone: 'Asia/Seoul', utc_offset_seconds: 32400, current_units: { time: 'unixtime', temperature_2m: '°C' }, current: { time: Date.parse('2026-10-26T01:00:00Z') / 1000, temperature_2m: 12.3 } }; }

describe('KST date and source normalization', () => {
  it('changes record date exactly at KST midnight', () => {
    expect(kstDate('2026-10-25T14:59:59.999Z')).toBe('2026-10-25');
    expect(kstDate('2026-10-25T15:00:00.000Z')).toBe('2026-10-26');
  });
  it('does not add the timezone offset to Unix time twice', () => {
    const reading = normalizeWeather(payload(), fetched);
    expect(reading.source_time).toBe('2026-10-26T01:00:00.000Z');
    expect(reading.fetched_at).toBe(fetched);
    expect(reading.normalized_value).toBe(12.3);
    expect(Object.keys(reading)).toHaveLength(9);
  });
  it.each([null, [], { ...payload(), current: { time: 1, temperature_2m: '12.3' } }, { ...payload(), current_units: { time: 'unixtime', temperature_2m: '°F' } }, { ...payload(), current: { time: 1, temperature_2m: Infinity } }])('rejects malformed or changed source values (%j)', (raw) => {
    expect(() => normalizeWeather(raw, fetched)).toThrow();
  });
  it('rejects missing or future source times', () => {
    expect(() => normalizeWeather({ ...payload(), current: { temperature_2m: 12.3 } }, fetched)).toThrow();
    expect(() => normalizeWeather(payload(), '2026-10-26T00:00:00Z')).toThrow();
    expect(() => kstDate('invalid')).toThrow();
  });
});
