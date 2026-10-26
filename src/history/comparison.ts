import type { Reading } from '../shared/reading';

export type Comparison =
  | { state: 'insufficient'; count: number }
  | { state: 'unit_mismatch'; before: Reading; after: Reading }
  | { state: 'comparable'; before: Reading; after: Reading; days: number; signed: number; magnitude: number; direction: 'increase' | 'decrease' | 'unchanged' };

// Compare the latest two distinct KST dates for one signal. Never mutate stored rows.
export function compareReadings(readings: Reading[], signalId: string): Comparison {
  const dates = new Map<string, Reading>();
  for (const reading of readings) {
    if (reading.signal_id !== signalId) continue;
    const previous = dates.get(reading.record_date);
    if (!previous || Date.parse(reading.fetched_at) > Date.parse(previous.fetched_at)) dates.set(reading.record_date, reading);
  }
  const ordered = [...dates.values()].sort((a, b) => b.record_date.localeCompare(a.record_date));
  if (ordered.length < 2) return { state: 'insufficient', count: ordered.length };
  const [after, before] = ordered;
  if (before.unit !== after.unit) return { state: 'unit_mismatch', before, after };
  // Remove binary floating-point residue while retaining 12 significant digits.
  const signed = Number((after.normalized_value - before.normalized_value).toPrecision(12));
  const days = Math.round((Date.parse(after.record_date + 'T00:00:00Z') - Date.parse(before.record_date + 'T00:00:00Z')) / 86400000);
  return { state: 'comparable', before, after, days, signed, magnitude: Math.abs(signed), direction: signed > 0 ? 'increase' : signed < 0 ? 'decrease' : 'unchanged' };
}

export function numberText(value: number): string {
  return value.toLocaleString('ko-KR', { maximumSignificantDigits: 12 });
}
