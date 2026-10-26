import { describe, expect, it } from 'vitest';
import { classifyTransport, failureCopy, parseRetryAfter } from '../../src/shared/failures';
import { validateReading } from '../../src/shared/reading';
import normal from '../../public/task-assets/t04/fixtures/normal-d1-a.json';

describe('shared live/replay failure boundary', () => {
  it.each([[401, 'auth'], [403, 'auth'], [429, 'rate_limit'], [503, 'offline'], [200, null]] as const)('classifies HTTP %s as %s', (status, expected) => {
    expect(classifyTransport({ mode: 'http', status })).toBe(expected);
  });
  it('distinguishes timeout, offline, and a response arriving after its deadline', () => {
    expect(classifyTransport({ mode: 'timeout', status: null })).toBe('timeout');
    expect(classifyTransport({ mode: 'offline', status: null })).toBe('offline');
    expect(classifyTransport({ mode: 'http', status: 200, delay_ms: 5000, deadline_ms: 1500 })).toBe('timeout');
  });
  it('uses distinct explanations and next actions for all five failures', () => {
    expect(new Set(Object.values(failureCopy).map((copy) => copy.title)).size).toBe(5);
    expect(new Set(Object.values(failureCopy).map((copy) => copy.action)).size).toBe(5);
    expect(failureCopy.auth.action).not.toContain('로그인');
  });
  it('parses seconds and HTTP dates, rejecting malformed wait times', () => {
    const now = '2026-08-24T10:02:00Z';
    expect(parseRetryAfter('60', now)).toBe(60);
    expect(parseRetryAfter('Mon, 24 Aug 2026 10:03:00 GMT', now)).toBe(60);
    expect(parseRetryAfter('-1', now)).toBeNull();
    expect(parseRetryAfter('invalid', now)).toBeNull();
    expect(parseRetryAfter(null, now)).toBeNull();
    expect(parseRetryAfter('999999999', now)).toBe(86400);
  });
  it('accepts the official normalized shape and rejects dates, types, extra keys, and unsafe sources', () => {
    expect(validateReading(normal.payload)).toEqual(normal.payload);
    for (const change of [{ normalized_value: '100' }, { source_time: 123 }, { record_date: '2026-08-23' }, { source_url: 'http://unrelated.invalid' }, { extra: 'not in contract' }]) {
      expect(() => validateReading({ ...normal.payload, ...change })).toThrow();
    }
  });
});
