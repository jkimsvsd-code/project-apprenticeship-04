import { formatKst, type ReviewSnapshot } from '../shared/reading';
import { receiptFields } from './model';
import styles from './Review.module.css';

export function SnapshotCard({ snapshot, label }: { snapshot: ReviewSnapshot; label: string }) {
  const reading = snapshot.reading;
  return <section className={styles.card} aria-label={label} data-testid="snapshot-card">
    <h2>{label} · {reading.record_date} KST</h2>
    <p className={styles.value} data-testid="snapshot-value">{reading.normalized_value} <span>{reading.unit}</span></p>
    <dl className={styles.metadata}>
      <div><dt>출처</dt><dd><a href={reading.source_url} target="_blank" rel="noreferrer">{reading.source_name}</a> · 모델 기반 기온</dd></div>
      <div><dt>원천 기준 시각</dt><dd>{formatKst(reading.source_time, true)} KST</dd></div>
      <div><dt>실제 조회 시각</dt><dd>{formatKst(reading.fetched_at, true)} KST</dd></div>
      <div><dt>고정 보관 시각</dt><dd>{formatKst(snapshot.created_at, true)} KST</dd></div>
      <div><dt>기록 시간대</dt><dd>{reading.record_timezone} · UTC+09:00</dd></div>
    </dl>
    <h3>영수증 대조 항목</h3>
    <p>아래 값은 플랫폼의 영수증 항목과 대조할 자료입니다. 원천 시각은 UTC ISO 형식이며 실제 조회 시각과 구분합니다.</p>
    <pre data-testid="receipt-fields">{JSON.stringify(receiptFields(reading), null, 2)}</pre>
    <details><summary>{label}의 원자료·저장값 확인</summary><h3>보관한 원자료</h3><pre data-testid="snapshot-raw">{JSON.stringify(snapshot.raw_payload, null, 2)}</pre><h3>보관한 정규화 값</h3><pre data-testid="snapshot-reading">{JSON.stringify(reading, null, 2)}</pre></details>
  </section>;
}
