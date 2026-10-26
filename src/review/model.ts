import type { Reading } from '../shared/reading';

export function isSnapshotId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function receiptFields(reading: Reading) {
  return { source_url: reading.source_url, source_observed_at: reading.source_time, normalized_value: reading.normalized_value, unit: reading.unit };
}

// Extract an identifier from a same-app link only. This never fetches a URL.
export function snapshotIdFromLink(value: string, origin: string): string | null {
  try {
    const url = new URL(value.trim(), origin);
    if (url.origin !== origin || url.username || url.password) return null;
    const id = url.pathname.match(/^\/review\/([^/]+)\/?$/)?.[1];
    return isSnapshotId(id) ? id.toLowerCase() : null;
  } catch { return null; }
}
