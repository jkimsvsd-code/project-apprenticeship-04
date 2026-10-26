import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Board } from '../../src/board/Board';
import { ComparisonCard } from '../../src/history/ComparisonCard';
import { fixtureById } from '../../src/simulation/fixtures';
import { source, type BoardState, type Reading } from '../../src/shared/reading';
const reading: Reading = { ...(fixtureById['T04-NORMAL-D1-B'].payload as Reading), signal_id: source.signal_id, unit: '°C' };
const second: Reading = { ...(fixtureById['T04-NORMAL-D2'].payload as Reading), signal_id: source.signal_id, unit: '°C' };
const now = Date.parse(reading.fetched_at) + 3600000;
const empty: BoardState = { reading: null, records: [], freshness: null, error_code: null, next_allowed_at: null, last_attempt_at: null, retry_after_seconds: null };
function html(state = empty) { return renderToStaticMarkup(<Board initialState={state} initialIssue={null} initialNow={now} />); }
it('renders first visit instructions, an accessible skip link and no invented value', () => {
  const rendered = html();
  expect(rendered).toContain('첫 방문이신가요?'); expect(rendered).toContain('기온과 새로고침으로 바로가기');
  expect(rendered).toContain('아직 기온 기록이 없습니다'); expect(rendered).not.toContain('1개 날짜');
});
it('keeps a stored value visible with age and one-date guidance after source failure', () => {
  const rendered = html({ ...empty, reading, records: [{ record_id: 'synthetic', reading, raw_payload: {} }], freshness: 'stale', error_code: 'offline' });
  expect(rendered).toContain('105'); expect(rendered).toContain('1시간 0분 전'); expect(rendered).toContain('오래된 값');
  expect(rendered).toContain('아직 한 날짜'); expect(rendered).toContain('마지막 정상값');
});
it('does not describe an initial failure as an old value that never existed', () => {
  const rendered = html({ ...empty, freshness: 'stale', error_code: 'offline' });
  expect(rendered).toContain('조회 실패 · 값 없음');
});
it('distinguishes provider Retry-After from app interval and disables waiting requests', () => {
  const state: BoardState = { ...empty, last_attempt_at: reading.fetched_at, next_allowed_at: new Date(now + 60000).toISOString(), retry_after_seconds: 60, error_code: 'rate_limit', freshness: 'stale' };
  const rendered = html(state);
  expect(rendered).toContain('원천 대기 안내: 60초 (Retry-After)'); expect(rendered).toContain('최소 15초');
  expect(rendered).toMatch(/<button[^>]*disabled=""[^>]*aria-describedby="retry-wait"/);
  const missing = html({ ...state, retry_after_seconds: null });
  expect(missing).toContain('원천이 대기 시간을 제공하지 않았습니다');
  const ready = html({ ...state, next_allowed_at: new Date(now).toISOString() });
  expect(ready).toContain('현재 다시 조회할 수 있습니다'); expect(ready).not.toMatch(/<button[^>]*disabled=""[^>]*aria-describedby="retry-wait"/);
});
it('renders real comparison date labels, calculation details and nonconsecutive-day wording', () => {
  const rendered = renderToStaticMarkup(<ComparisonCard readings={[reading, { ...second, record_date: '2026-08-28' }]} signalId={reading.signal_id} />);
  expect(rendered).toContain('15'); expect(rendered).toContain('증가'); expect(rendered).toContain('4일 간격');
  expect(rendered).toContain('중간 날짜의 기록이 없어'); expect(rendered).toContain('120 − (105) = 15 °C');
  expect(rendered).not.toContain('어제 대비');
});
it('marks shared comparison UI as synthetic when used for replay', () => {
  const rendered = renderToStaticMarkup(<ComparisonCard readings={[reading, second]} signalId={reading.signal_id} synthetic />);
  expect(rendered).toContain('합성 날짜 비교 · 실제 기록 아님'); expect(rendered).toContain('합성 변화량 계산 상세');
});
