import 'server-only';
import { neon } from '@neondatabase/serverless';

export class ConfigurationError extends Error {}

export function database() {
  const url = process.env.APP_DATABASE_URL;
  if (!url) throw new ConfigurationError('Runtime database not configured');
  return neon(url, { fetchOptions: { cache: 'no-store', signal: AbortSignal.timeout(10000) } });
}
