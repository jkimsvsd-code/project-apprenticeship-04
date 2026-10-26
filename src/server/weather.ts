import 'server-only';
import { source, normalizeWeather, type ErrorCode } from '../shared/reading';
import { classifyTransport, parseRetryAfter } from '../shared/failures';
import { beginAttempt, readBoard, saveReading, saveFailure } from './readings';

class SourceError extends Error {
  constructor(public code: ErrorCode, public retryAfter: number | null = null) { super(code); }
}

export async function refreshWeather() {
  const attempt = await beginAttempt();
  if (!attempt) return { state: await readBoard(), throttled: true };
  let raw: unknown;
  let reading;
  try {
    let response: Response;
    try {
      response = await fetch(source.source_url, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(7000) });
    } catch (error) {
      throw new SourceError(error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name) ? 'timeout' : 'offline');
    }
    const failure = classifyTransport({ mode: 'http', status: response.status });
    if (failure) throw new SourceError(failure, parseRetryAfter(response.headers.get('retry-after'), new Date().toISOString()));
    try {
      raw = await response.json();
      reading = normalizeWeather(raw, new Date().toISOString());
    } catch (error) {
      if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)) throw new SourceError('timeout');
      throw new SourceError('schema_error');
    }
  } catch (error) {
    if (!(error instanceof SourceError)) throw error;
    await saveFailure(source.signal_id, error.code, attempt, error.retryAfter);
    return { state: await readBoard(), throttled: false };
  }
  await saveReading(reading, raw, attempt);
  return { state: await readBoard(), throttled: false };
}
