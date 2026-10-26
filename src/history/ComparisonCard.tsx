import { compareReadings, numberText } from './comparison';
import type { Reading } from '../shared/reading';
import styles from './ComparisonCard.module.css';

export function ComparisonCard({ readings, signalId, synthetic = false }: { readings: Reading[]; signalId: string; synthetic?: boolean }) {
  const result = compareReadings(readings, signalId);
  const prefix = synthetic ? '합성 날짜 비교 · 실제 기록 아님' : '저장된 두 날짜 비교';
  return <div className={styles.card} data-testid={synthetic ? 'synthetic-comparison' : 'daily-comparison'}>
    <h3>{prefix}</h3>
    {result.state === 'insufficient' ? <p>{result.count === 0 ? '첫 정상 기록을 저장하면 날짜별 비교를 준비합니다.' : '아직 한 날짜의 기록만 있습니다. 다른 실제 KST 날짜에 다시 조회하면 비교할 수 있습니다.'}</p>
      : result.state === 'unit_mismatch' ? <p>비교 불가: {result.before.record_date}의 {result.before.unit}와 {result.after.record_date}의 {result.after.unit}가 다릅니다. 단위를 맞추기 전에는 변화량을 계산하지 않습니다.</p>
      : <>
        <p className={styles.change}><span aria-hidden="true">{result.signed > 0 ? '↗' : result.signed < 0 ? '↘' : '→'}</span> {numberText(result.magnitude)} {result.after.unit} <span>{result.signed > 0 ? '증가' : result.signed < 0 ? '감소' : '변화 없음'}</span></p>
        <p>{result.before.record_date} → {result.after.record_date} · KST · {result.days}일 간격</p>
        {result.days > 1 ? <p>중간 날짜의 기록이 없어 위 두 날짜를 비교합니다.</p> : null}
        <details><summary>{synthetic ? '합성 변화량 계산 상세' : '변화량 계산 상세'}</summary>
          <dl><div><dt>이전 날짜 저장값</dt><dd>{result.before.record_date} · {numberText(result.before.normalized_value)} {result.before.unit}</dd></div>
            <div><dt>나중 날짜 저장값</dt><dd>{result.after.record_date} · {numberText(result.after.normalized_value)} {result.after.unit}</dd></div></dl>
          <p className={styles.formula}>{numberText(result.after.normalized_value)} − ({numberText(result.before.normalized_value)}) = {numberText(result.signed)} {result.after.unit}</p>
          <p>나중 날짜의 마지막 성공값 − 이전 날짜의 마지막 성공값입니다. 비율은 계산하지 않습니다.</p>
        </details>
      </>}
  </div>;
}
