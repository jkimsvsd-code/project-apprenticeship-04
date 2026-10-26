import 'server-only';
import { database } from './database';
import { reviewSummary } from './readings';
import { source, type ReviewSnapshot } from '../shared/reading';
import { isSnapshotId } from '../review/model';

export async function readReviewSnapshot(id: string, signalId = source.signal_id): Promise<ReviewSnapshot | null> {
  if (!isSnapshotId(id)) return null;
  const sql = database();
  const [row] = await sql`SELECT snapshot_id, record_id, reading, raw_payload, created_at
    FROM review_snapshots WHERE snapshot_id = ${id}::uuid AND signal_id = ${signalId}`;
  if (!row) return null;
  return { ...reviewSummary(row as ReviewSnapshot), raw_payload: row.raw_payload };
}
