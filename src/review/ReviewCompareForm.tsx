'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { snapshotIdFromLink } from './model';
import styles from './Review.module.css';

export function ReviewCompareForm({ firstId }: { firstId: string }) {
  const router = useRouter();
  const [error, setError] = useState('');
  function compare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get('comparison-link') ?? '');
    const id = snapshotIdFromLink(value, window.location.origin);
    if (!id) { setError('이 정보판에서 연 고정 기록의 주소를 입력해 주세요.'); return; }
    if (id === firstId) { setError('현재 기록과 다른 보관본의 주소를 입력해 주세요.'); return; }
    setError('');
    router.push(`/review/${firstId}?compare=${id}`);
  }
  return <form className={styles.compareForm} onSubmit={compare}>
    <label htmlFor="comparison-link">비교할 다른 날짜의 고정 기록 주소</label>
    <p id="comparison-help">다른 날 저장해 둔 고정 기록을 열고, 주소창의 링크를 아래에 붙여 넣으세요. 두 링크의 값으로 계산하며, 최신 기온으로 바꾸지 않습니다.</p>
    <div><input id="comparison-link" name="comparison-link" type="url" required aria-describedby="comparison-help comparison-error" aria-invalid={Boolean(error)} placeholder="다른 고정 기록의 전체 주소" /><button type="submit">두 고정 기록 비교</button></div>
    <p id="comparison-error" role="alert">{error}</p>
  </form>;
}
