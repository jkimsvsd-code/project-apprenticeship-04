import { expect, it } from 'vitest';
import { elapsedText, remainingSeconds } from '../../src/shared/timing';
const now = Date.parse('2026-10-26T02:00:00Z');
it('handles empty, initial hydration and a future device clock mismatch honestly', () => {
  expect(elapsedText(null, now)).toContain('아직');
  expect(elapsedText('2026-10-26T01:00:00Z', null)).toContain('확인 중');
  expect(elapsedText('2026-10-26T03:00:00Z', now)).toContain('기기 시각보다 뒤');
});
it.each([[5, '방금 전'], [60, '1분 전'], [3660, '1시간 1분 전'], [90000, '1일 1시간 전']] as const)('formats %s elapsed seconds', (seconds, text) => {
  expect(elapsedText(new Date(now - seconds * 1000).toISOString(), now)).toBe(text);
});
it('rounds remaining wait up and enables retry at the exact deadline', () => {
  const deadline = '2026-10-26T02:00:15Z';
  expect(remainingSeconds(deadline, now + 1)).toBe(15);
  expect(remainingSeconds(deadline, now + 14999)).toBe(1);
  expect(remainingSeconds(deadline, now + 15000)).toBe(0);
  expect(remainingSeconds(deadline, now + 60000)).toBe(0);
  expect(remainingSeconds(null, now)).toBe(0);
  expect(remainingSeconds('bad date', now)).toBe(0);
});
