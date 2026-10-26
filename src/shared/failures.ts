import type { ErrorCode } from './reading';

export const failureCopy: Record<ErrorCode, { title: string; description: string; action: string }> = {
  timeout: { title: '응답 시간 초과', description: '외부 원천이 제한 시간 안에 응답하지 않았습니다.', action: '잠시 후 다시 시도해 주세요.' },
  auth: { title: '외부 원천 접근 거절', description: '데이터 제공자가 401/403으로 조회를 거절했습니다.', action: '제공자의 접근 상태가 복구된 뒤 다시 시도해 주세요.' },
  rate_limit: { title: '호출 제한', description: '데이터 제공자의 호출 한도에 도달했습니다.', action: '제공자가 안내한 대기 시간 이후 다시 시도해 주세요.' },
  offline: { title: '원천 연결 불가', description: '외부 원천과 연결하지 못했습니다.', action: '네트워크 연결을 확인한 뒤 다시 시도해 주세요.' },
  schema_error: { title: '응답 형식 변경', description: '필수 필드나 값의 형식이 바뀌어 새 값을 저장하지 않았습니다.', action: '원천 응답 형식을 확인하고 수정한 뒤 다시 시도해야 합니다.' },
};

export function classifyTransport(transport: { mode: 'http' | 'timeout' | 'offline'; status: number | null; delay_ms?: number; deadline_ms?: number }): ErrorCode | null {
  if (transport.mode === 'timeout' || (transport.delay_ms !== undefined && transport.deadline_ms !== undefined && transport.delay_ms > transport.deadline_ms)) return 'timeout';
  if (transport.mode === 'offline') return 'offline';
  if (transport.status === 401 || transport.status === 403) return 'auth';
  if (transport.status === 429) return 'rate_limit';
  if (transport.status === null || transport.status < 200 || transport.status >= 300) return 'offline';
  return null;
}

export function parseRetryAfter(header: string | null, now: string): number | null {
  if (header === null || !header.trim()) return null;
  const text = header.trim();
  const seconds = /^\d+$/.test(text) ? Number(text) : Math.ceil((Date.parse(text) - Date.parse(now)) / 1000);
  return Number.isFinite(seconds) && seconds >= 0 ? Math.min(seconds, 86400) : null;
}
