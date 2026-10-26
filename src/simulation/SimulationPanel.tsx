'use client';

import { useReducer } from 'react';
import { ComparisonCard } from '../history/ComparisonCard';
import { formatKst } from '../shared/reading';
import { failureCopy } from '../shared/failures';
import { failureButtons, fixtureById, replayReducer } from './fixtures';
import { resetReplay } from './replay';
import styles from './SimulationPanel.module.css';

export function SimulationPanel() {
  const [state, dispatch] = useReducer(replayReducer, undefined, resetReplay);
  const code = state.status?.error_code;
  const failure = code && code !== 'none' ? failureCopy[code] : null;
  const lastFixture = state.last_run ? fixtureById[state.last_run.fixture_id] : null;
  const stale = state.status?.freshness === 'stale';

  return <section id="simulation" className={styles.panel} aria-labelledby="simulation-title" data-testid="replay-panel">
    <div className={styles.heading}>
      <div><p className={styles.eyebrow}>SYNTHETIC REVIEW</p><h2 id="simulation-title">데이터가 오지 않는다면?</h2></div>
      <span className={styles.badge}>합성 데이터 · 실제 기록과 분리</span>
    </div>
    <p className={styles.intro}>공식 시험값으로 장애와 복구를 확인합니다. 아래의 100·105·120pt와 8월 날짜는 합성 값이며, 위 서울 기온이나 실제 이틀 기록을 대신하지 않습니다.</p>
    <ol className={styles.steps}><li>정상 기준값 준비</li><li>실패 한 종류 재생</li><li>다시 시도해 복구 확인</li></ol>
    <div className={styles.toolbar}>
      <button type="button" className={styles.primary} onClick={() => dispatch({ type: 'baseline' })}>정상 기준값 105 준비</button>
      <button type="button" className={styles.secondary} onClick={() => dispatch({ type: 'reset' })}>합성 기록 초기화</button>
    </div>
    <div className={styles.failures} aria-label="실패 종류 선택">
      {failureButtons.map(({ id, label }) => <button type="button" key={id} aria-pressed={state.last_run?.fixture_id === id} onClick={() => dispatch({ type: 'fixture', id })}>{label}</button>)}
    </div>
    <div className={styles.result} aria-live="polite" aria-atomic="true">
      <dl className={styles.metrics}>
        <div><dt>마지막 정상값 · 합성</dt><dd data-testid="replay-value">{state.current_reading ? `${state.current_reading.normalized_value} ${state.current_reading.unit}` : '아직 없음'}</dd></div>
        <div><dt>일별 기록 · 합성</dt><dd data-testid="replay-row-count">{state.daily_readings.length}건</dd></div>
        <div><dt>현재 상태</dt><dd className={stale ? styles.stale : ''} data-testid="replay-freshness">{stale ? (state.current_reading ? '오래된 값' : '조회 실패 · 값 없음') : state.status ? '정상' : '재생 전'}</dd></div>
      </dl>
      {failure ? <div className={styles.failure} role="status"><h3>{failure.title}</h3><p>{failure.description}</p><p>{state.current_reading ? '마지막 정상값과 기존 일별 기록을 보존했습니다.' : '아직 정상값이 없어 표시할 값이 없습니다. 실패로 새 기록을 만들지 않았습니다.'}</p><strong>{failure.action}</strong>
        {state.last_run?.retry_after_seconds !== null && state.last_run?.retry_after_seconds !== undefined ? <p>원천이 안내한 대기: {state.last_run.retry_after_seconds}초 · 합성 시계 기준</p> : null}
      </div> : <p className={styles.success}>{state.last_run?.fixture_id === 'T04-RECOVER-D2' ? '복구 성공: 120pt를 저장하고 정상 상태로 돌아왔습니다. 아래에서 합성 날짜별 기록을 확인하세요.' : state.sequence ? '정상값이 저장됐습니다. 실패 종류를 선택해 보존 상태를 확인하세요.' : '정상 기준값을 준비하면 105pt와 합성 기록 한 건에서 시작합니다.'}</p>}
    </div>
    <button type="button" className={styles.recover} disabled={!stale} onClick={() => dispatch({ type: 'fixture', id: 'T04-RECOVER-D2' })}>다시 시도 · 합성 D2 복구</button>
    <p className={styles.note}>복구는 공식 가상 2일차로 이동합니다. 실제 대기 시간을 건너뛰는 시험이며, 실제 원천을 호출하지 않습니다. 이 창에서만 재생하고 페이지를 새로고침하면 초기화됩니다.</p>
    {state.daily_readings.length >= 2 ? <ComparisonCard readings={state.daily_readings.map((row) => row.reading)} signalId={state.current_reading!.signal_id} synthetic /> : null}
    <details className={styles.details}>
      <summary>정상 D1/D2를 순서대로 재생</summary>
      <div className={styles.normalButtons}>
        <button type="button" onClick={() => dispatch({ type: 'fixture', id: 'T04-NORMAL-D1-A' })}>정상 D1-A · 100</button>
        <button type="button" onClick={() => dispatch({ type: 'fixture', id: 'T04-NORMAL-D1-B' })}>동일 날짜 D1-B · 105</button>
        <button type="button" onClick={() => dispatch({ type: 'fixture', id: 'T04-NORMAL-D2' })}>다음 날짜 D2 · 120</button>
      </div>
    </details>
    <details className={styles.details}>
      <summary>판정 상태와 합성 일별 기록 확인</summary>
      <dl className={styles.contract}>
        <div><dt>freshness</dt><dd>{state.status?.freshness ?? 'null'}</dd></div>
        <div><dt>error_code</dt><dd data-testid="replay-error">{code ?? 'null'}</dd></div>
        <div><dt>마지막 fixture</dt><dd>{state.last_run?.fixture_id ?? '아직 없음'}</dd></div>
        <div><dt>가상 조회 시각 · KST</dt><dd>{formatKst(state.last_run?.virtual_now ?? null)}</dd></div>
        <div><dt>합성 변화</dt><dd>{state.last_delta === null ? '비교 기록 부족' : `${state.last_comparison.direction} / ${state.last_delta} ${state.last_comparison.unit}`}</dd></div>
        {lastFixture ? <div><dt>지연 / 제한</dt><dd>{lastFixture.transport.delay_ms} / {lastFixture.transport.deadline_ms} ms</dd></div> : null}
      </dl>
      <div className={styles.tableScroll} role="region" aria-label="합성 일별 기록 표 · 가로 스크롤 가능" tabIndex={0}><table><caption>합성 기록 — 실제 날짜 증거 아님</caption><thead><tr><th scope="col">가상 날짜</th><th scope="col">값</th><th scope="col">유지되는 record ID</th></tr></thead><tbody>
        {state.daily_readings.map((row) => <tr key={row.record_id}><td>{row.record_date}</td><td>{row.normalized_value} {row.unit}</td><td>{row.record_id}</td></tr>)}
      </tbody></table></div>
      <pre data-testid="replay-state">{JSON.stringify(state, null, 2)}</pre>
    </details>
  </section>;
}
