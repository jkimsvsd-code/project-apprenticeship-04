import Link from 'next/link';
import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { readReviewSnapshot } from '../../../server/reviews';
import { source, type ReviewSnapshot } from '../../../shared/reading';
import { isSnapshotId } from '../../../review/model';
import { SnapshotCard } from '../../../review/SnapshotCard';
import { ReviewCompareForm } from '../../../review/ReviewCompareForm';
import { ComparisonCard } from '../../../history/ComparisonCard';
import styles from '../../../review/Review.module.css';

export const metadata: Metadata = { title: '영수증 대조용 고정 기록 · 날씨의 기록' };

export default async function ReviewPage({ params, searchParams }: {
  params: Promise<{ snapshotId: string }>;
  searchParams: Promise<{ compare?: string | string[] }>;
}) {
  await connection();
  const { snapshotId } = await params;
  if (!isSnapshotId(snapshotId)) notFound();
  const { compare } = await searchParams;
  const compareId = isSnapshotId(compare) ? compare : null;
  let first: ReviewSnapshot | null;
  let second: ReviewSnapshot | null;
  try {
    [first, second] = await Promise.all([readReviewSnapshot(snapshotId), compareId ? readReviewSnapshot(compareId) : Promise.resolve(null)]);
  } catch {
    return <main className={styles.shell}><h1>고정 기록을 불러오지 못했습니다.</h1><p role="alert">저장소 연결을 확인한 뒤 잠시 후 다시 열어 주세요. 보관본이 삭제됐다는 뜻은 아닙니다.</p><Link href="/">정보판으로 돌아가기</Link></main>;
  }
  if (!first) notFound();
  const invalidCompare = compare !== undefined && (!compareId || !second);
  const sameDate = second && first.reading.record_date === second.reading.record_date;
  return <main className={styles.shell}>
    <header className={styles.header}><Link href="/">← 실제 기온 정보판</Link><Link href="/#review-records">고정 기록 목록</Link></header>
    <p className={styles.eyebrow}>PRESERVED READING · ASIA/SEOUL</p>
    <h1>영수증 대조용 고정 기록</h1>
    <p>이 주소의 값·원자료·시각은 이후 새로고침과 같은 날짜 재조회에도 바뀌지 않습니다. 영수증에 사용할 보관본은 주소창의 이 링크를 보관해 주세요.</p>
    <p className={styles.caution}>앱의 실제 조회 보관본 · 플랫폼 영수증 미연결. 고정 보관 시각은 플랫폼의 영수증 발급 시각이 아닙니다. 실제 이틀 검증은 공식 영수증 2건과 별도로 대조해야 합니다.</p>
    {invalidCompare ? <p role="alert">비교할 고정 기록을 찾지 못했습니다. 이 정보판의 다른 고정 기록 주소를 확인해 주세요.</p> : null}
    {sameDate ? <p role="status">두 보관본의 KST 날짜가 같습니다. 같은 날짜의 여러 조회는 실제 이틀 확인으로 계산하지 않습니다.</p> : null}
    {second ? <ComparisonCard readings={[first.reading, second.reading]} signalId={source.signal_id} /> : null}
    <div className={styles.cards}><SnapshotCard snapshot={first} label="선택한 고정 기록" />{second ? <SnapshotCard snapshot={second} label="비교할 고정 기록" /> : null}</div>
    <ReviewCompareForm firstId={first.snapshot_id} />
  </main>;
}
