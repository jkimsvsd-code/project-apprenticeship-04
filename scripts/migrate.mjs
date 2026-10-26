import { neon } from '@neondatabase/serverless';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

try {
  const url = process.env.DATABASE_URL_UNPOOLED;
  if (!url) throw new Error('DATABASE_URL_UNPOOLED is required');
  const sql = neon(url);
  await sql`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`;
  for (const name of readdirSync('db/migrations').filter((file) => file.endsWith('.sql')).sort()) {
    const source = readFileSync(`db/migrations/${name}`, 'utf8');
    const digest = createHash('sha256').update(source).digest('hex');
    const previous = await sql`SELECT sha256 FROM schema_migrations WHERE name = ${name}`;
    if (previous.length) {
      if (previous[0].sha256 !== digest) throw new Error(`Applied migration changed: ${name}`);
      console.log(`${name}: already applied`);
      continue;
    }
    // These migrations contain plain DDL only, with no procedural bodies.
    const statements = source.split(';').map((value) => value.trim()).filter(Boolean);
    await sql.transaction([
      ...statements.map((statement) => sql.query(statement)),
      sql`INSERT INTO schema_migrations (name, sha256) VALUES (${name}, ${digest})`,
    ]);
    console.log(`${name}: applied`);
  }
} catch {
  console.error('Migration failed. Check the private connection and migration history; database details are not logged.');
  process.exitCode = 1;
}
