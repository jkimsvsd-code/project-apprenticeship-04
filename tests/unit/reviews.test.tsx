import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { receiptFields, isSnapshotId, snapshotIdFromLink } from '../../src/review/model';
import { SnapshotCard } from '../../src/review/SnapshotCard';
import { ReviewArchive } from '../../src/review/ReviewArchive';
import { fixtureById } from '../../src/simulation/fixtures';
import { formatKst, type Reading, type ReviewSnapshot } from '../../src/shared/reading';
const reading = fixtureById['T04-NORMAL-D1-B'].payload as Reading;
const id = '12345678-1234-4234-8234-123456789abc';
const origin = 'https://project-apprenticeship-04.vercel.app';
const snapshot: ReviewSnapshot = { snapshot_id: id, record_id: 'stored-daily-id', created_at: reading.fetched_at, reading, raw_payload: { synthetic: true } };

describe('immutable review links and receipt field display', () => {
  it('maps source time rather than fetched time to the official comparison fields', () => {
    expect(receiptFields({ ...reading, source_time: '2026-08-24T08:45:00Z' })).toEqual({ source_url: reading.source_url, source_observed_at: '2026-08-24T08:45:00Z', normalized_value: 105, unit: 'pt' });
    expect(receiptFields(reading).source_observed_at).toBeNull();
  });
  it('accepts only complete UUID identifiers', () => {
    expect(isSnapshotId(id)).toBe(true);
    for (const value of ['1', `${id}/more`, "' OR true", null, [id]]) expect(isSnapshotId(value)).toBe(false);
  });
  it('extracts only a same-origin review link, without arbitrary URL fetches', () => {
    expect(snapshotIdFromLink(`${origin}/review/${id}`, origin)).toBe(id);
    expect(snapshotIdFromLink(`${origin}/review/${id}?compare=ignored`, origin)).toBe(id);
    expect(snapshotIdFromLink(`/review/${id}`, origin)).toBe(id);
    for (const value of [`https://unrelated.invalid/review/${id}`, `https://user:pass@project-apprenticeship-04.vercel.app/review/${id}`, 'javascript:alert(1)', `${origin}/api/board`, `${origin}/review/invalid`]) expect(snapshotIdFromLink(value, origin)).toBeNull();
  });
  it('shows preserved raw/normalized values and keeps field names distinct from source and fetch time', () => {
    const html = renderToStaticMarkup(<SnapshotCard snapshot={snapshot} label="선택한 고정 기록" />);
    expect(html).toContain('105'); expect(html).toContain('source_observed_at'); expect(html).toContain('실제 조회 시각'); expect(html).toContain('고정 보관 시각'); expect(html).toContain('보관한 원자료');
  });
  it('counts several archived readings from one date as only one actual KST date', () => {
    const html = renderToStaticMarkup(<ReviewArchive snapshots={[snapshot, { ...snapshot, snapshot_id: 'another', reading: { ...reading, normalized_value: 106 } }]} />);
    expect(html).toContain('같은 날짜에 여러 보관본'); expect(html).toContain('플랫폼 영수증 발급·연결'); expect(html).toContain(`/review/${id}`);
    expect(html).toContain('1');
  });
  it('shows an honest empty state and includes seconds when requested', () => {
    expect(renderToStaticMarkup(<ReviewArchive snapshots={[]} />)).toContain('처음 불러오면 고정 기록');
    expect(formatKst('2026-10-26T03:11:56.212Z', true)).toContain('12:11:56');
  });
});
