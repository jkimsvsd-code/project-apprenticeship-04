import { neon } from '@neondatabase/serverless';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const filename = process.argv[2];
if (!filename || !/^\.env\.[a-z.]+$/.test(filename)) throw new Error('Pass a Git-ignored local environment filename');
process.loadEnvFile(filename);
try {
  const admin = process.env.DATABASE_URL_UNPOOLED;
  if (!admin) throw new Error('Missing migration connection');
  const sql = neon(admin);
  const roles = await sql`SELECT 1 FROM pg_roles WHERE rolname = 't04_app'`;
  let runtime = process.env.APP_DATABASE_URL;
  if (roles.length && !runtime) throw new Error('Runtime role exists; restore its connection instead of rotating it');
  if (!roles.length) {
    const password = randomBytes(32).toString('base64url');
    await sql.query(`CREATE ROLE t04_app WITH LOGIN PASSWORD '${password}'`);
    const url = new URL(process.env.DATABASE_URL ?? admin);
    url.username = 't04_app';
    url.password = password;
    runtime = url.toString();
  }
  if (!runtime || new URL(runtime).username !== 't04_app') throw new Error('Invalid runtime role connection');
  await sql.transaction([
    sql`GRANT USAGE ON SCHEMA public TO t04_app`,
    sql`GRANT SELECT, INSERT, UPDATE ON daily_readings, signal_state TO t04_app`,
    sql`GRANT SELECT ON review_snapshots TO t04_app`,
  ]);
  const client = neon(runtime);
  const [check] = await client`SELECT current_user AS role, has_table_privilege(current_user, 'daily_readings', 'INSERT') AS can_insert, has_table_privilege(current_user, 'daily_readings', 'DELETE') AS can_delete`;
  if (check.role !== 't04_app' || !check.can_insert || check.can_delete) throw new Error('Runtime privilege check failed');
  const original = readFileSync(filename, 'utf8').replace(/^APP_DATABASE_URL=.*\r?\n?/gm, '');
  writeFileSync(filename, `${original.trimEnd()}\nAPP_DATABASE_URL=${JSON.stringify(runtime)}\n`, { mode: 0o600 });
  console.log('APP_DATABASE_URL ready; runtime SELECT/INSERT/UPDATE verified; DELETE denied. Secret value not printed.');
} catch {
  console.error('Runtime role setup failed. Credentials and database error details are not logged.');
  process.exitCode = 1;
}
