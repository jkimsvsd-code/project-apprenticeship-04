import normalA from '../../public/task-assets/t04/fixtures/normal-d1-a.json';
import normalB from '../../public/task-assets/t04/fixtures/normal-d1-b.json';
import normalD2 from '../../public/task-assets/t04/fixtures/normal-d2.json';
import timeout from '../../public/task-assets/t04/fixtures/timeout.json';
import auth from '../../public/task-assets/t04/fixtures/auth-401.json';
import rate from '../../public/task-assets/t04/fixtures/rate-429.json';
import offline from '../../public/task-assets/t04/fixtures/offline.json';
import schema from '../../public/task-assets/t04/fixtures/schema-break.json';
import recovery from '../../public/task-assets/t04/fixtures/recover-d2.json';
import { resetReplay, runReplay, type ReplayFixture, type ReplayState } from './replay';

export const fixtures = [normalA, normalB, normalD2, timeout, auth, rate, offline, schema, recovery] as ReplayFixture[];
export const fixtureById = Object.fromEntries(fixtures.map((fixture) => [fixture.fixture_id, fixture]));
export const failureButtons = [
  { id: 'T04-TIMEOUT', label: '느린 응답' }, { id: 'T04-AUTH-401', label: '원천 401 거절' },
  { id: 'T04-RATE-429', label: '호출 제한' }, { id: 'T04-OFFLINE', label: '오프라인' }, { id: 'T04-SCHEMA-BREAK', label: '형식 변경' },
];

export type ReplayAction = { type: 'reset' } | { type: 'baseline' } | { type: 'fixture'; id: string };
export function replayReducer(state: ReplayState, action: ReplayAction): ReplayState {
  if (action.type === 'reset') return resetReplay();
  if (action.type === 'baseline') return runReplay(runReplay(resetReplay(), fixtureById['T04-NORMAL-D1-A']), fixtureById['T04-NORMAL-D1-B']);
  const fixture = fixtureById[action.id];
  return fixture ? runReplay(state, fixture) : state;
}
