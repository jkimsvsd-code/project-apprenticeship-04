import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { resetReplay, runReplay, type ReplayFixture } from '../../src/simulation/replay';
import { fixtureById, replayReducer } from '../../src/simulation/fixtures';
import contract from '../../public/task-assets/t04/public-contract.json';
import manifest from '../../public/task-assets/t04/asset-manifest.json';

const code = readFileSync('public/task-assets/t04/adapter-reset.example.js');
expect(createHash('sha256').update(code).digest('hex')).toBe(manifest.files.find((file) => file.path === 'adapter-reset.example.js')?.sha256);
type Reference = { resetEvaluationState: () => unknown; runFixture: (state: unknown, fixture: ReplayFixture) => unknown };
const referenceModule = { exports: {} as Reference };
runInNewContext(code.toString('utf8'), { module: referenceModule, URL, Intl }, { timeout: 1000 });
const reference = referenceModule.exports;
const baseline = () => replayReducer(resetReplay(), { type: 'baseline' });

describe('product replay against immutable official fixtures and reference adapter', () => {
  it('matches the full official state after every normal success, including same record ID', () => {
    let state = resetReplay();
    let expected = reference.resetEvaluationState();
    const ids: string[] = [];
    for (const id of contract.fixture_contract.success_sequence) {
      state = runReplay(state, fixtureById[id]);
      expected = reference.runFixture(expected, fixtureById[id]);
      expect(state).toEqual(JSON.parse(JSON.stringify(expected)));
      ids.push(state.daily_readings[0].record_id);
    }
    expect(new Set(ids).size).toBe(1);
    expect(state.daily_readings).toHaveLength(2);
    expect(state.last_delta).toBe(15);
  });
  it.each(contract.fixture_contract.failure_fixtures)('%s preserves 105 and one row, then recovers with exactly one next-date row', (id) => {
    const before = baseline();
    const original = structuredClone(before);
    const failed = runReplay(before, fixtureById[id]);
    let expected = reference.resetEvaluationState();
    for (const step of [...contract.fixture_contract.failure_baseline_sequence, id]) expected = reference.runFixture(expected, fixtureById[step]);
    expect(failed).toEqual(JSON.parse(JSON.stringify(expected)));
    expect(before).toEqual(original);
    expect(failed.status?.freshness).toBe('stale');
    expect(failed.current_reading?.normalized_value).toBe(105);
    expect(failed.daily_readings).toEqual(before.daily_readings);
    const recovered = runReplay(failed, fixtureById['T04-RECOVER-D2']);
    expected = reference.runFixture(expected, fixtureById['T04-RECOVER-D2']);
    expect(recovered).toEqual(JSON.parse(JSON.stringify(expected)));
    expect(recovered.status).toEqual({ freshness: 'fresh', error_code: 'none' });
    expect(recovered.daily_readings.length - failed.daily_readings.length).toBe(1);
    expect(recovered.daily_readings.filter((row) => row.record_date === '2026-08-25')).toHaveLength(1);
    expect(recovered.current_reading?.normalized_value).toBe(120);
  });
  it.each(contract.fixture_contract.failure_fixtures)('first-load failure %s never invents a good value or a daily row', (id) => {
    const failed = runReplay(resetReplay(), fixtureById[id]);
    expect(failed.current_reading).toBeNull();
    expect(failed.daily_readings).toHaveLength(0);
    expect(failed.status?.freshness).toBe('stale');
  });
  it('does not read expected answers from fixtures, and never mutates a separate session', () => {
    const otherSession = baseline();
    const tamperedExpected = Object.assign(structuredClone(fixtureById['T04-NORMAL-D1-A']), { expected: { stored_value: 999, row_count: 88 } });
    expect(runReplay(resetReplay(), tamperedExpected).current_reading?.normalized_value).toBe(100);
    expect(replayReducer(otherSession, { type: 'reset' })).toEqual(resetReplay());
    expect(otherSession.current_reading?.normalized_value).toBe(105);
    expect(otherSession.daily_readings).toHaveLength(1);
  });
  it('records Retry-After=60, clears it on recovery, and keeps recovery idempotent', () => {
    const failed = runReplay(baseline(), fixtureById['T04-RATE-429']);
    expect(failed.last_run?.retry_after_seconds).toBe(60);
    const recovered = runReplay(failed, fixtureById['T04-RECOVER-D2']);
    expect(recovered.last_run?.retry_after_seconds).toBeNull();
    const again = runReplay(recovered, fixtureById['T04-RECOVER-D2']);
    expect(again.daily_readings).toEqual(recovered.daily_readings);
  });
});
