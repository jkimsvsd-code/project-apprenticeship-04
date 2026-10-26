export function elapsedText(fetchedAt: string | null, now: number | null): string {
  if (!fetchedAt) return '아직 성공한 조회가 없습니다';
  if (now === null) return '경과 시간 확인 중';
  const elapsed = now - Date.parse(fetchedAt);
  if (!Number.isFinite(elapsed)) return '조회 시각 확인 필요';
  if (elapsed < -1000) return '조회 시각이 기기 시각보다 뒤입니다';
  const seconds = Math.max(0, Math.floor(elapsed / 1000));
  if (seconds < 60) return '방금 전';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 ${Math.floor((seconds % 3600) / 60)}분 전`;
  return `${Math.floor(seconds / 86400)}일 ${Math.floor((seconds % 86400) / 3600)}시간 전`;
}

export function remainingSeconds(deadline: string | null, now: number | null): number {
  if (!deadline || now === null) return 0;
  const difference = Date.parse(deadline) - now;
  return Number.isFinite(difference) ? Math.max(0, Math.ceil(difference / 1000)) : 0;
}
