import { describe, expect, it } from 'vitest';
import { compareReadings } from '../../src/history/comparison';
import { fixtureById } from '../../src/simulation/fixtures';
import type { Reading } from '../../src/shared/reading';
const a = fixtureById['T04-NORMAL-D1-A'].payload as Reading;
const b = fixtureById['T04-NORMAL-D1-B'].payload as Reading;
const d2 = fixtureById['T04-NORMAL-D2'].payload as Reading;

describe('daily comparison uses the latest two distinct dates of one signal', () => {
  it('requires two dates and ignores other signals', () => {
    expect(compareReadings([], a.signal_id)).toEqual({ state: 'insufficient', count: 0 });
    expect(compareReadings([a, b, { ...d2, signal_id: 'other' }], a.signal_id)).toEqual({ state: 'insufficient', count: 1 });
  });
  it('deduplicates the same day by last success, sorts inputs, and never mutates them', () => {
    const rows = [d2, b, a]; const original = structuredClone(rows);
    expect(compareReadings(rows, a.signal_id)).toMatchObject({ state: 'comparable', before: b, after: d2, signed: 15, magnitude: 15, direction: 'increase', days: 1 });
    expect(rows).toEqual(original);
  });
  it.each([[120, 105, -15, 'decrease'], [105, 105, 0, 'unchanged'], [-3, -1, 2, 'increase'], [0, -5, -5, 'decrease']] as const)('compares %s to %s with direction and unit', (before, after, signed, direction) => {
    expect(compareReadings([{ ...b, normalized_value: before }, { ...d2, normalized_value: after }], a.signal_id)).toMatchObject({ state: 'comparable', signed, direction, magnitude: Math.abs(signed) });
  });
  it('labels gaps using actual comparison dates rather than assuming yesterday', () => {
    expect(compareReadings([b, { ...d2, record_date: '2026-08-28', fetched_at: '2026-08-28T01:00:00Z' }], a.signal_id)).toMatchObject({ state: 'comparable', days: 4 });
  });
  it('refuses unit changes rather than comparing incompatible values', () => {
    expect(compareReadings([b, { ...d2, unit: '°F' }], a.signal_id).state).toBe('unit_mismatch');
  });
  it('removes floating-point residue without treating zero as a missing reading', () => {
    expect(compareReadings([{ ...b, normalized_value: 0.1 }, { ...d2, normalized_value: 0.3 }], a.signal_id)).toMatchObject({ signed: 0.2 });
  });
});
