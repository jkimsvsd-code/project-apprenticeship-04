import { formatKst, type ReviewSummary } from '../shared/reading';
import styles from './Review.module.css';

export function ReviewArchive({ snapshots }: { snapshots: ReviewSummary[] }) {
  const dates = new Set(snapshots.map((row) => row.reading.record_date)).size;
  return <section id="review-records" className={styles.archive} aria-labelledby="review-title">
    <p className={styles.eyebrow}>PRESERVED READINGS</p>
    <h2 id="review-title">영수증 대조용 고정 기록</h2>
    <p>실제 조회에 성공할 때마다 값·원자료·시각을 별도로 보관합니다. 같은 날짜에 다시 조회해도 아래 링크의 보관본은 바뀌지 않습니다.</p>
    <p className={styles.caution}>앱의 고정 보관본입니다. 플랫폼 영수증 발급·연결이나 실제 이틀 검증 완료를 뜻하지 않습니다.</p>
    {snapshots.length ? <>
      <p>최근 보관본 {snapshots.length}건 · {dates}개 KST 날짜 <span className={styles.muted}>(최대 20건 표시 · 이전 고유 링크도 유지)</span></p>
      <div className={styles.tableScroll} role="region" aria-label="고정 보관본 목록 · 가로 스크롤 가능" tabIndex={0}><table>
        <caption>같은 날짜에 여러 보관본이 있어도 실제 이틀 기록으로 세지 않습니다.</caption>
        <thead><tr><th scope="col">실제 조회 시각 · KST</th><th scope="col">고정값</th><th scope="col">보관본</th></tr></thead>
        <tbody>{snapshots.map((row) => <tr key={row.snapshot_id}><td>{formatKst(row.reading.fetched_at, true)}</td><td>{row.reading.normalized_value} {row.reading.unit}</td><td><a href={`/review/${row.snapshot_id}`}>고정 기록 열기<span className={styles.srOnly}> · {formatKst(row.reading.fetched_at, true)}</span></a></td></tr>)}</tbody>
      </table></div>
    </> : <p>위에서 기온을 처음 불러오면 고정 기록도 함께 보관합니다.</p>}
  </section>;
}
