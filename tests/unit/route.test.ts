import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('../../src/server/weather', () => ({ refreshWeather: vi.fn() }));
vi.mock('../../src/server/readings', () => ({ readBoard: vi.fn() }));
import { POST, GET } from '../../src/app/api/board/route';
import { refreshWeather } from '../../src/server/weather';
import { readBoard } from '../../src/server/readings';

beforeEach(() => { vi.clearAllMocks(); });

it('accepts browser origin matching Host even when Next uses an internal localhost URL', async () => {
  vi.mocked(refreshWeather).mockResolvedValue({ state: { reading: null, records: [], snapshots: [], freshness: null, error_code: null, next_allowed_at: null, last_attempt_at: null, retry_after_seconds: null }, throttled: false });
  const response = await POST(new Request('http://localhost:3000/api/board', { method: 'POST', headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000' } }));
  expect(response.status).toBe(200);
  expect(refreshWeather).toHaveBeenCalledOnce();
});

it('rejects foreign and malformed origins without calling the source', async () => {
  for (const origin of ['https://unrelated.invalid', 'null']) {
    const response = await POST(new Request('http://localhost:3000/api/board', { method: 'POST', headers: { host: 'localhost:3000', origin } }));
    expect(response.status).toBe(403);
  }
  expect(refreshWeather).not.toHaveBeenCalled();
});

it('rejects client-supplied source URLs and arbitrary reading bodies', async () => {
  expect((await POST(new Request('http://localhost:3000/api/board?url=https://unrelated.invalid', { method: 'POST' }))).status).toBe(400);
  expect((await POST(new Request('http://localhost:3000/api/board', { method: 'POST', body: '{"normalized_value":99}' }))).status).toBe(400);
  expect(refreshWeather).not.toHaveBeenCalled();
});

it('does not expose database error details to the public API', async () => {
  vi.mocked(readBoard).mockRejectedValue(new Error('private database detail'));
  const response = await GET();
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ issue: 'storage' });
});
