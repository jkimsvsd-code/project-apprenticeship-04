import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { neon } from '@neondatabase/serverless';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { beginAttempt, readBoard, saveFailure, saveReading } from '../../src/server/readings';
import { readReviewSnapshot } from '../../src/server/reviews';
import { kstDate } from '../../src/shared/reading';
import { compareReadings } from '../../src/history/comparison';
import type { Reading } from '../../src/shared/reading';

const signal = `test-stage4-${randomUUID()}`;
const adminUrl = process.env.DATABASE_URL_UNPOOLED;
if (!adminUrl || !process.env.APP_DATABASE_URL) throw Error('Run npm run test:db with a configured development environment');
if (existsSync('.env.production.local')) {
  const production = parseEnv(readFileSync('.env.production.local', 'utf8')).DATABASE_URL_UNPOOLED;
  if (production && new URL(production).hostname === new URL(adminUrl).hostname) throw Error('Database tests must not target production');
}
const admin = neon(adminUrl);
function reading(value: number, time = '2026-10-26T01:00:00.000Z'): Reading {
  return { signal_id: signal, normalized_value: value, unit: '°C', source_name: 'Synthetic integration test', source_url: 'https://fixtures.aleph.invalid/test', source_time: null, fetched_at: time, record_timezone: 'Asia/Seoul', record_date: kstDate(time) };
}
async function unlock() { await admin`UPDATE signal_state SET next_allowed_at = now() - interval '1 second' WHERE signal_id = ${signal}`; }

describe('real development Postgres persistence (synthetic test signal only)', () => {
  beforeAll(async () => { expect((await readBoard(signal)).records).toHaveLength(0); });
  afterAll(async () => {
    await admin.transaction([
      admin`DELETE FROM review_snapshots WHERE signal_id = ${signal}`,
      admin`DELETE FROM signal_state WHERE signal_id = ${signal}`,
      admin`DELETE FROM daily_readings WHERE signal_id = ${signal}`,
    ]);
  });
  it('admits one concurrent attempt and persists a first success', async () => {
    const attempts = await Promise.all(Array.from({ length: 4 }, () => beginAttempt(signal)));
    const valid = attempts.filter((attempt) => attempt !== null);
    expect(valid).toHaveLength(1);
    await saveReading(reading(12.3), { synthetic: true, value: 12.3 }, valid[0]!);
    const state = await readBoard(signal);
    expect(state.reading?.normalized_value).toBe(12.3);
    expect(state.snapshots).toHaveLength(1);
    const archived = await readReviewSnapshot(state.snapshots[0].snapshot_id, signal);
    expect(archived?.raw_payload).toEqual({ synthetic: true, value: 12.3 });
  });
  it('updates the same date atomically and retains record identity', async () => {
    const before = await readBoard(signal);
    await unlock();
    const attempt = await beginAttempt(signal);
    await saveReading(reading(13.1, '2026-10-26T01:05:00.000Z'), { synthetic: true, value: 13.1 }, attempt!);
    const after = await readBoard(signal);
    expect(after.records).toHaveLength(1);
    expect(after.records[0].record_id).toBe(before.records[0].record_id);
    expect(after.reading?.normalized_value).toBe(13.1);
    expect(after.records[0].raw_payload).toEqual({ synthetic: true, value: 13.1 });
    expect(after.snapshots).toHaveLength(2);
    const old = await readReviewSnapshot(before.snapshots[0].snapshot_id, signal);
    expect(old?.reading.normalized_value).toBe(12.3);
    expect(old?.reading.fetched_at).toBe(before.reading!.fetched_at);
    expect(old?.raw_payload).toEqual({ synthetic: true, value: 12.3 });
  });
  it('retains last good value on failure and rejects an older attempt result', async () => {
    await unlock();
    const older = await beginAttempt(signal);
    await unlock();
    const newer = await beginAttempt(signal);
    await saveFailure(signal, 'timeout', newer!);
    await saveReading(reading(99), { synthetic: true }, older!);
    const state = await readBoard(signal);
    expect(state.freshness).toBe('stale');
    expect(state.error_code).toBe('timeout');
    expect(state.reading?.normalized_value).toBe(13.1);
    expect(state.records).toHaveLength(1);
    expect(state.snapshots).toHaveLength(2);
  });
  it('returns provider wait metadata and blocks another attempt until its deadline', async () => {
    await unlock();
    const attempt = await beginAttempt(signal);
    await saveFailure(signal, 'rate_limit', attempt!, 60);
    const state = await readBoard(signal);
    expect(state.retry_after_seconds).toBe(60);
    expect(Date.parse(state.next_allowed_at!) - Date.now()).toBeGreaterThan(50000);
    expect(await beginAttempt(signal)).toBeNull();
    expect(state.reading?.normalized_value).toBe(13.1);
  });
  it('adds a synthetic next-date row and computes comparison from persisted values', async () => {
    await unlock();
    const attempt = await beginAttempt(signal);
    await saveReading(reading(12.4, '2026-10-27T01:00:00.000Z'), { synthetic: true, value: 12.4 }, attempt!);
    const state = await readBoard(signal);
    expect(state.records).toHaveLength(2);
    expect(state.snapshots).toHaveLength(3);
    expect(state.retry_after_seconds).toBeNull();
    expect(compareReadings(state.records.map((record) => record.reading), signal)).toMatchObject({ state: 'comparable', signed: -0.7, direction: 'decrease', days: 1 });
    expect(compareReadings(state.snapshots.map((record) => record.reading), signal)).toMatchObject({ state: 'comparable', signed: -0.7, direction: 'decrease', days: 1 });
  });
  it('retains the same archive ID on concurrent duplicate saves, without rewriting raw evidence', async () => {
    const before = await readBoard(signal);
    await unlock();
    const attempt = await beginAttempt(signal);
    const value = reading(12.5, '2026-10-27T02:00:00.000Z');
    await Promise.all([saveReading(value, { synthetic: true, value: 12.5 }, attempt!), saveReading(value, { synthetic: true, value: 12.5 }, attempt!)]);
    const after = await readBoard(signal);
    expect(after.snapshots.length - before.snapshots.length).toBe(1);
    const archived = await readReviewSnapshot(after.snapshots[0].snapshot_id, signal);
    expect(archived?.raw_payload).toEqual({ synthetic: true, value: 12.5 });
    expect(await readReviewSnapshot(after.snapshots[0].snapshot_id, 'different-signal')).toBeNull();
    expect(await readReviewSnapshot('not-a-uuid', signal)).toBeNull();
  });
  it('runtime can append but cannot update or delete archived evidence', async () => {
    const runtime = neon(process.env.APP_DATABASE_URL!);
    const [rights] = await runtime`SELECT has_table_privilege(current_user, 'review_snapshots', 'INSERT') AS can_insert, has_table_privilege(current_user, 'review_snapshots', 'UPDATE') AS can_update, has_table_privilege(current_user, 'review_snapshots', 'DELETE') AS can_delete`;
    expect(rights).toEqual({ can_insert: true, can_update: false, can_delete: false });
    await expect(runtime`UPDATE review_snapshots SET raw_payload = '{}'::jsonb WHERE signal_id = ${signal}`).rejects.toThrow();
    await expect(runtime`DELETE FROM review_snapshots WHERE signal_id = ${signal}`).rejects.toThrow();
  });
  it('unserializable raw input is rejected without changing daily or archived evidence', async () => {
    await unlock();
    const attempt = await beginAttempt(signal);
    const before = await readBoard(signal);
    // JSON cannot encode BigInt, so serialization must fail before a DB write.
    await expect(saveReading(reading(88, '2026-10-27T03:00:00.000Z'), { invalid: BigInt(1) }, attempt!)).rejects.toThrow();
    const after = await readBoard(signal);
    expect(after.reading).toEqual(before.reading);
    expect(after.snapshots).toEqual(before.snapshots);
    expect(after.freshness).toBe(before.freshness);
  });
  it('keeps an old permalink readable after it leaves the recent twenty entries', async () => {
    const old = (await readBoard(signal)).snapshots.at(-1)!;
    await unlock();
    const attempt = await beginAttempt(signal);
    for (let index = 0; index < 21; index++) {
      const time = new Date(Date.parse('2026-10-27T04:00:00Z') + index * 1000).toISOString();
      await saveReading(reading(14 + index / 10, time), { synthetic: true, sequence: index }, attempt!);
    }
    const state = await readBoard(signal);
    expect(state.snapshots).toHaveLength(20);
    expect(state.snapshots.some((row) => row.snapshot_id === old.snapshot_id)).toBe(false);
    expect((await readReviewSnapshot(old.snapshot_id, signal))?.reading).toEqual(old.reading);
  });
  it('denies DELETE and schema creation to the runtime role', async () => {
    const runtime = neon(process.env.APP_DATABASE_URL!);
    const [rights] = await runtime`SELECT current_user AS role, has_table_privilege(current_user, 'daily_readings', 'DELETE') AS can_delete, has_schema_privilege(current_user, 'public', 'CREATE') AS can_create`;
    expect(rights.role).toBe('t04_app');
    expect(rights.can_delete).toBe(false);
    expect(rights.can_create).toBe(false);
  });
});
