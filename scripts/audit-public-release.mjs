import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { parseEnv, isDeepStrictEqual } from 'node:util';
import { createHash } from 'node:crypto';
import path from 'node:path';

// Only fixed public project destinations are requested. Credentials are read
// locally for comparison and are never sent, echoed, or included in the report.
const origin = 'https://project-apprenticeship-04.vercel.app';
const repository = 'jkimsvsd-code/project-apprenticeship-04';
const requireSecurityHeaders = !process.argv.includes('--baseline');
const sha = execFileSync('git', ['rev-parse', 'HEAD']).toString().trim();
const exactSecrets = new Set();
for (const file of ['.env.local', '.env.production.local']) {
  if (!existsSync(file)) continue;
  for (const [key, value] of Object.entries(parseEnv(readFileSync(file, 'utf8')))) {
    if (/PASSWORD|TOKEN|_URL$/.test(key) && value.length >= 12) exactSecrets.add(value);
    try { const password = decodeURIComponent(new URL(value).password); if (password.length >= 8) exactSecrets.add(password); } catch { /* Not a URL. */ }
  }
}
const patterns = [
  ['private_key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['github_token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})\b/],
  ['aws_access_key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['database_uri_with_password', /postgres(?:ql)?:\/\/[^\s'"`<>:]+:[^\s'"`<>@]+@/],
  ['jwt_literal', /\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b/],
];
let dynamicUriTemplates = 0;
function scan(data, label) {
  for (const value of exactSecrets) if (data.includes(Buffer.from(value))) throw new Error(`Secret match in ${label}; value suppressed`);
  const text = data.toString('utf8');
  for (const [rule, regex] of patterns) {
    for (const match of text.matchAll(new RegExp(regex.source, 'g'))) {
      // A runtime URI builder with two complete JS interpolations contains no
      // literal credential. Exact known-secret comparison above still applies.
      if (rule === 'database_uri_with_password') {
        const pair = match[0].slice(match[0].indexOf('://') + 3, -1).split(':');
        if (pair.length === 2 && pair.every((part) => /^\$\{[^{}]+\}$/.test(part))) { dynamicUriTemplates++; continue; }
      }
      throw new Error(`Credential pattern ${rule} in ${label}; value suppressed`);
    }
  }
}
function git(...args) { return execFileSync('git', args, { maxBuffer: 30 * 1024 * 1024 }); }
function walk(dir) { return existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]) : []; }
const files = git('ls-files', '--cached', '--others', '--exclude-standard', '-z').toString().split('\0').filter((file) => file && existsSync(file) && statSync(file).isFile());
for (const file of files) scan(readFileSync(file), file);
const objectIds = git('rev-list', '--objects', '--all').toString().trim().split('\n').map((line) => line.split(' ')[0]);
let blobs = 0;
let metadataObjects = 0;
for (const id of objectIds) {
  const type = git('cat-file', '-t', id).toString().trim();
  scan(git('cat-file', type, id), `git ${type} ${id}`);
  if (type === 'blob') blobs++;
  else metadataObjects++;
}
const buildFiles = walk('.next/static');
for (const file of buildFiles) scan(readFileSync(file), file);
const serverBuildFiles = walk('.next/server');
for (const file of serverBuildFiles) scan(readFileSync(file), file);
const ignored = ['.env.local', '.env.production.local', '.vercel/project.json'].map((file) => {
  git('check-ignore', '--quiet', file); return file;
});
const trackedEnv = files.filter((file) => /^\.env(?:\.|$)/.test(file));
if (trackedEnv.some((file) => file !== '.env.example')) throw Error('Secret env file in repository candidates');

const requests = [];
async function request(url, options = {}) {
  const response = await fetch(url, { ...options, redirect: 'manual', signal: AbortSignal.timeout(20000) });
  const data = Buffer.from(await response.arrayBuffer()); scan(data, url);
  requests.push({ url, method: options.method ?? 'GET', status: response.status });
  return { response, data, text: data.toString('utf8') };
}
function assert(condition, reason) { if (!condition) throw Error(reason); }
const page = await request(origin + '/');
assert(page.response.status === 200 && page.text.includes('날씨의 기록'), 'Public page unavailable');
assert(!page.response.headers.has('www-authenticate') && !page.response.headers.has('set-cookie'), 'Unexpected authentication response');
assert(!page.response.headers.has('x-powered-by'), 'Framework version header exposed');
assert(/^max-age=[1-9]\d*/.test(page.response.headers.get('strict-transport-security') ?? ''), 'HSTS missing');
const redirect = await request(origin.replace('https:', 'http:') + '/');
assert([301, 302, 307, 308].includes(redirect.response.status) && redirect.response.headers.get('location') === origin + '/', 'HTTPS redirect mismatch');
const api = await request(origin + '/api/board');
assert(api.response.status === 200 && api.response.headers.get('cache-control')?.includes('no-store'), 'Public API missing no-store');
const before = JSON.parse(api.text);
const actual = before.state;
assert(actual.reading && actual.records.some((row) => row.reading.normalized_value === actual.reading.normalized_value), 'Saved reading missing');
const failures = [
  { name: 'foreign_origin', options: { method: 'POST', headers: { origin: 'https://unrelated.invalid' } }, status: 403 },
  { name: 'malformed_origin', options: { method: 'POST', headers: { origin: 'null' } }, status: 403 },
  { name: 'cross_site', options: { method: 'POST', headers: { 'sec-fetch-site': 'cross-site' } }, status: 403 },
  { name: 'arbitrary_payload', options: { method: 'POST', body: '{"normalized_value":999,"record_date":"2099-01-01"}' }, status: 400 },
  { name: 'arbitrary_source_url', suffix: '?url=https%3A%2F%2Funrelated.invalid', options: { method: 'POST' }, status: 400 },
  { name: 'unsupported_method', options: { method: 'DELETE' }, status: 405 },
];
for (const test of failures) {
  const result = await request(origin + '/api/board' + (test.suffix ?? ''), test.options);
  assert(result.response.status === test.status, `Unexpected rejection for ${test.name}`);
  if (test.status !== 405) assert(isDeepStrictEqual(JSON.parse(result.text), { issue: 'request' }), `Detailed error exposed for ${test.name}`);
}
const after = await request(origin + '/api/board');
assert(isDeepStrictEqual(before, JSON.parse(after.text)), 'Rejected requests changed actual records');
const privatePaths = ['/.env', '/.env.local', '/.env.production.local', '/.git/config', '/.vercel/project.json'];
for (const pathname of privatePaths) {
  const result = await request(origin + pathname); assert(result.response.status === 404, `Private file accessible: ${pathname}`);
}
const assets = [...new Set([...page.text.matchAll(/(?:src|href)="([^"]+\.(?:js|css)(?:\?[^"]*)?)"/g)].map((m) => m[1]))]
  .map((asset) => new URL(asset.replaceAll('&amp;', '&'), origin)).filter((url) => url.origin === origin && url.pathname.startsWith('/_next/static/'));
assert(assets.length > 0, 'No deployed browser assets found');
for (const asset of assets) {
  const result = await request(asset.href); assert(result.response.status === 200, 'Browser asset unavailable');
}
const repo = await request('https://api.github.com/repos/' + repository, { headers: { 'user-agent': 't04-public-access-audit' } });
assert(repo.response.status === 200 && JSON.parse(repo.text).private === false, 'Repository is not anonymously public');
const sourceUrl = `https://github.com/${repository}/tree/${sha}`;
const source = await request(sourceUrl); assert(source.response.status === 200 && source.text.includes(sha), 'Commit source URL unavailable');
const raw = await request(`https://raw.githubusercontent.com/${repository}/${sha}/src/server/weather.ts`);
assert(raw.response.status === 200 && raw.data.equals(git('show', `${sha}:src/server/weather.ts`)), 'Commit-pinned source differs');
const archive = await request(`https://codeload.github.com/${repository}/zip/${sha}`);
assert(archive.response.status === 200 && archive.data[0] === 0x50 && archive.data[1] === 0x4b, 'Source archive not restorable');
const headerNames = ['strict-transport-security', 'x-content-type-options', 'x-frame-options', 'referrer-policy', 'permissions-policy', 'content-security-policy'];
if (requireSecurityHeaders) {
  assert(page.response.headers.get('x-content-type-options') === 'nosniff', 'MIME protection header missing');
  assert(page.response.headers.get('x-frame-options') === 'DENY', 'Frame protection missing');
  assert(page.response.headers.get('referrer-policy') === 'strict-origin-when-cross-origin', 'Referrer policy missing');
  assert(page.response.headers.get('permissions-policy') === 'camera=(), microphone=(), geolocation=()', 'Permissions policy missing');
  assert(page.response.headers.get('content-security-policy')?.includes("frame-ancestors 'none'"), 'CSP embedding policy missing');
}
const result = {
  verified_at: new Date().toISOString(), scope: 'anonymous_public_access_and_bounded_security_checks', code_commit: sha,
  artifact_url: origin + '/', source_url: sourceUrl, authenticated_requests: false, security_headers_required: requireSecurityHeaders,
  source_archive_sha256: createHash('sha256').update(archive.data).digest('hex'),
  checks: { public_page: 'pass', https_redirect: 'pass', hsts: 'pass', framework_version_header_absent: true, public_read_api_no_store: 'pass', public_repository: 'pass', commit_pinned_source_and_archive: 'pass', rejected_inputs: failures.map(({ name, status }) => ({ name, status })), rejected_inputs_actual_board_unchanged: true, private_paths_404: privatePaths, secret_matches: 0, credential_pattern_matches: 0, known_local_secret_values_used: exactSecrets.size, non_secret_dynamic_uri_templates: dynamicUriTemplates, repository_candidate_files_scanned: files.length, reachable_git_blobs_scanned: blobs, reachable_git_metadata_objects_scanned: metadataObjects, local_browser_build_files_scanned: buildFiles.length, local_server_build_files_scanned: serverBuildFiles.length, deployed_browser_assets_scanned: assets.length, ignored_local_files: ignored },
  response_headers: Object.fromEntries(headerNames.map((name) => [name, page.response.headers.get(name)])),
  requests, sealed_t04_day_receipts: 0, actual_two_day_verification_complete: false,
  limits: ['Exact known local secrets plus credential patterns; not proof of absence of every unknown secret.', 'Public client assets plus local client/server build files are scanned; the remote server bundle is not downloadable.', 'No destructive tests, authentication bypass, or arbitrary upstream requests.'],
};
console.log(JSON.stringify(result, null, 2));
