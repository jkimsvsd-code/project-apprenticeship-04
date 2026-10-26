'use client';

import { useRef, useState } from 'react';
import { formatKst, source, type BoardState } from '../shared/reading';
import { failureCopy } from '../shared/failures';
import { ReviewArchive } from '../review/ReviewArchive';
import { ComparisonCard } from '../history/ComparisonCard';
import { elapsedText, remainingSeconds } from '../shared/timing';
import { useClock } from './useClock';
import { SimulationPanel } from '../simulation/SimulationPanel';
import styles from './Board.module.css';

type Issue = 'configuration' | 'storage' | 'request' | 'network' | null;
const issues: Record<Exclude<Issue, null>, string> = {
  configuration: '조회 설정이 아직 준비되지 않았습니다. 잠시 후 다시 확인해 주세요.',
  storage: '저장된 기록을 확인하지 못했습니다. 새 기록이 저장됐다고 표시하지 않으며, 현재 화면의 값은 유지합니다.',
  request: '이 요청은 처리할 수 없습니다. 이 화면의 새로고침 버튼을 사용해 주세요.',
  network: '화면과 서버의 연결이 끊겼습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.',
};

export function Board({ initialState, initialIssue, initialNow = null }: { initialState: BoardState | null; initialIssue: Issue; initialNow?: number | null }) {
  const [state, setState] = useState(initialState);
  const [issue, setIssue] = useState<Issue>(initialIssue);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const inFlight = useRef(false);
  const [now, setNow] = useClock(initialNow);
  const wait = remainingSeconds(state?.next_allowed_at ?? null, now);
  const reading = state?.reading;
  const currentSnapshot = state?.snapshots?.find((row) => row.reading.fetched_at === reading?.fetched_at);
  const stale = state?.freshness === 'stale';
  const latest = state?.records.find((record) => record.reading.record_date === reading?.record_date);
  const sourceFailure = state?.error_code && state.error_code !== 'none' ? failureCopy[state.error_code] : null;

  async function refresh() {
    if (inFlight.current || wait > 0) return;
    inFlight.current = true;
    setPending(true);
    setIssue(null);
    setNotice('');
    try {
      const response = await fetch('/api/board', { method: 'POST', cache: 'no-store' });
      const result = await response.json();
      setNow(Date.now());
      if (result.state) {
        setState(result.state);
        setNotice(result.throttled ? '연속 조회를 줄이기 위해 잠시 기다린 뒤 다시 시도해 주세요.' : result.state.freshness === 'fresh' ? '기온을 조회하고 오늘의 기록에 저장했습니다.' : '새 값을 저장하지 못했습니다. 아래 안내를 확인해 주세요.');
      } else {
        setIssue(result.issue === 'configuration' || result.issue === 'storage' ? result.issue : 'request');
      }
    } catch { setIssue('network'); }
    finally { inFlight.current = false; setPending(false); }
  }

  return <main className={styles.shell}>
    <a className={styles.skipLink} href="#main-reading">기온과 새로고침으로 바로가기</a>
    <header className={styles.header}>
      <a href="#main-reading" className={styles.brand}><span className={styles.brandMark} aria-hidden="true">◒</span>날씨의 기록</a>
      <span className={styles.location}>서울 <span aria-hidden="true">/</span> Asia/Seoul</span>
    </header>

    <section className={styles.intro} aria-labelledby="page-title">
      <p className={styles.eyebrow}>SEOUL WEATHER JOURNAL</p>
      <h1 id="page-title">오늘의 기온,<br />시간까지 정확하게.</h1>
      <p className={styles.lead}>변하는 숫자에 출처와 시간을 더합니다.<br />새 값을 받지 못해도, 마지막으로 확인한 기록은 남습니다.</p>
      <a className={styles.reviewLink} href="#simulation">실패와 복구를 합성 데이터로 확인 <span aria-hidden="true">↓</span></a>
    </section>

    <div className={styles.grid}>
      <section id="main-reading" className={styles.readingCard} tabIndex={-1} aria-labelledby="reading-title" aria-busy={pending}>
        <div className={styles.cardTop}><h2 id="reading-title">서울 현재 기온</h2><span className={`${styles.status} ${stale || issue ? styles.warning : ''}`}>
          <span aria-hidden="true">{stale || issue ? '!' : pending ? '↻' : reading ? '✓' : '○'}</span> {issue ? '연결 확인 필요' : pending ? '조회 중' : stale ? (reading ? '오래된 값' : '조회 실패 · 값 없음') : reading ? '마지막 조회 성공' : '첫 조회 대기'}
        </span></div>
        <p className={styles.temperature} aria-label={reading ? `${reading.normalized_value}도 섭씨` : '아직 기온 기록이 없습니다'}>
          {reading ? reading.normalized_value.toLocaleString('ko-KR', { maximumFractionDigits: 2 }) : '—'}<span>°C</span>
        </p>
        <p className={styles.elapsed} data-testid="last-success-age">마지막 성공 · {elapsedText(reading?.fetched_at ?? null, now)}</p>
        {!reading && !issue ? <p className={styles.firstVisit}>첫 방문이신가요? 아래 버튼으로 기온을 불러오면 오늘의 기록을 시작합니다.</p> : null}
        <p className={styles.model}>모델 기반 · 지상 2m · 서울 고정 대표 지점</p>
        <div className={styles.readingDivider} />
        <dl className={styles.metadata}>
          <div><dt>원천 기준 시각</dt><dd>{formatKst(reading?.source_time ?? null)} <small>KST</small></dd></div>
          <div><dt>실제 조회 시각</dt><dd>{formatKst(reading?.fetched_at ?? null)} <small>KST</small></dd></div>
          <div><dt>데이터 출처</dt><dd><a href={source.source_url} target="_blank" rel="noreferrer">Open-Meteo <span aria-hidden="true">↗</span></a></dd></div>
          <div><dt>기록 시간대</dt><dd>Asia/Seoul <small>UTC+09:00</small></dd></div>
        </dl>
        <button type="button" className={styles.refresh} onClick={refresh} disabled={pending || wait > 0} aria-describedby="retry-wait">
          <span aria-hidden="true">↻</span> {pending ? '기온을 조회하고 있습니다…' : wait > 0 ? '대기 후 다시 조회할 수 있습니다' : reading ? '지금 기온 새로고침' : '첫 기온 불러오기'}
        </button>
        {currentSnapshot ? <p className={styles.notice}><a href={`/review/${currentSnapshot.snapshot_id}`} data-testid="current-snapshot-link">이 값의 고정 기록 보기 →</a></p> : null}
        <div id="retry-wait" className={styles.wait} data-testid="retry-wait">
          {state?.last_attempt_at ? <>
            <p>{state.retry_after_seconds !== null ? `원천 대기 안내: ${state.retry_after_seconds}초 (Retry-After).` : state.error_code === 'rate_limit' ? '원천이 대기 시간을 제공하지 않았습니다.' : '원천의 별도 대기 안내가 없습니다.'} 앱은 중복 조회를 줄이기 위해 최소 15초 간격을 둡니다.</p>
            {wait > 0 ? <p>다음 시도까지 약 <strong>{wait}초</strong> · 가능 시각 {formatKst(state.next_allowed_at)} KST. 원천 대기와 앱 간격 중 더 긴 제한을 적용합니다.</p> : <p>현재 다시 조회할 수 있습니다.</p>}
          </> : <p>조회는 버튼을 누를 때만 실행됩니다. 자동으로 갱신하지 않습니다.</p>}
        </div>
        <p className={styles.quiet}>성공한 조회만 기록합니다. 같은 KST 날짜의 기록은 한 줄로 갱신합니다.</p>
        <div role="status" aria-live="polite" aria-atomic="true"><span className={styles.srOnly}>{pending ? '조회 중입니다. 완료될 때까지 새 요청을 보내지 않습니다.' : wait > 0 ? '조회 대기 시간이 적용 중입니다.' : '조회 버튼을 사용할 수 있습니다.'}</span>
          {notice ? <p className={styles.notice}>{notice}</p> : null}
          {issue ? <p role="alert" className={styles.error}>{issues[issue]}</p> : null}
          {sourceFailure ? <p role="alert" className={styles.error}><strong>{sourceFailure.title}</strong><br />{sourceFailure.description} {sourceFailure.action} {reading ? '표시된 값은 마지막 정상값입니다.' : '아직 보존된 정상값이 없습니다.'}</p> : null}
        </div>
      </section>

      <aside className={styles.aside} aria-label="기록 안내">
        <span className={styles.asideIndex}>01 — ABOUT THIS SIGNAL</span>
        <h2>숫자보다 중요한,<br />믿을 수 있는 맥락.</h2>
        <p>이 값은 관측소의 실측값이 아닌 기상 모델의 현재 기온입니다. 서울 전체나 내 주변의 기온과는 차이가 있을 수 있습니다.</p>
        <ul className={styles.principles}>
          <li><span aria-hidden="true">↗</span><div><strong>출처를 열어 확인</strong><p>제공자의 원응답과 표시된 값을 대조할 수 있습니다.</p></div></li>
          <li><span aria-hidden="true">◷</span><div><strong>두 시각을 따로 기록</strong><p>값의 기준 시각과 실제 조회한 시각은 다를 수 있습니다.</p></div></li>
          <li><span aria-hidden="true">⌾</span><div><strong>개인 위치는 사용하지 않음</strong><p>항상 같은 서울 대표 지점을 조회합니다.</p></div></li>
        </ul>
      </aside>
    </div>

    <section className={styles.history} aria-labelledby="history-title">
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>DAILY RECORD</p><h2 id="history-title">하루 한 줄, 기온의 기록</h2></div><span>{state?.records.length ?? 0}개 날짜</span></div>
      <ComparisonCard readings={(state?.records ?? []).map((record) => record.reading)} signalId={source.signal_id} />
      <p className={styles.quiet}>최근 최대 14개 KST 날짜의 마지막 성공값입니다. 가장 최근 두 날짜를 비교하며, 조회 실패는 이 기록을 추가하거나 지우지 않습니다.</p>
      {state?.records.length ? <div className={styles.tableScroll} role="region" aria-label="실제 KST 일별 기록 표 · 가로 스크롤 가능" tabIndex={0}><table><caption className={styles.srOnly}>KST 날짜별 마지막 성공 기온과 실제 조회 시각</caption><thead><tr><th scope="col">기록 날짜 · KST</th><th scope="col">기온</th><th scope="col">마지막 성공 조회 · KST</th></tr></thead><tbody>
        {state.records.map((record) => <tr key={record.record_id}><td>{record.reading.record_date}</td><td>{record.reading.normalized_value} {record.reading.unit}</td><td>{formatKst(record.reading.fetched_at)}</td></tr>)}
      </tbody></table></div> : <div className={styles.empty}><span aria-hidden="true">＋</span><h3>첫 기록을 기다리고 있습니다.</h3><p>위 버튼으로 실제 기온을 불러오면 오늘의 기록이 시작됩니다.</p></div>}
      <p className={styles.quiet}>기록 날짜를 임의로 앞당기지 않습니다. 두 날짜가 표시돼도 플랫폼 영수증 대조 전에는 과제의 실제 이틀 검증 완료가 아닙니다.</p>
      {latest ? <details className={styles.raw}><summary>이 값의 원자료와 저장값 확인</summary><p>아래는 보존한 공개 원응답과 정규화 저장값입니다. 개인 위치나 인증 정보는 포함하지 않습니다.</p><h3>원자료</h3><pre>{JSON.stringify(latest.raw_payload, null, 2)}</pre><h3>저장값</h3><pre>{JSON.stringify(latest.reading, null, 2)}</pre></details> : null}
    </section>

    <ReviewArchive snapshots={state?.snapshots ?? []} />
    <SimulationPanel />
    <footer className={styles.footer}><span>날씨의 기록 <span aria-hidden="true">·</span> Seoul, KR</span><span>Weather data by <a href="https://open-meteo.com/">Open-Meteo.com</a> · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a></span></footer>
  </main>;
}
