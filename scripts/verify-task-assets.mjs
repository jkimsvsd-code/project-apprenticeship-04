import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

// Pin the manifest obtained from the official HTTPS endpoint on 2026-10-26.
// This checks the reviewed download; it is not an upstream digital signature.
const pinnedManifestHash = '8adc0f6caea09e45c8fcdd42e239653e942227e306f688c780a18d441a6b7b41';
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assetRoot = resolve(process.argv[2] ?? join(projectRoot, 'public/task-assets/t04'));
const hash = (data) => createHash('sha256').update(data).digest('hex');
const read = (name) => readFileSync(join(assetRoot, name));
const json = (name) => JSON.parse(read(name));

function listFiles(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const name = prefix + entry.name;
    assert(!entry.isSymbolicLink(), `Unexpected symlink: ${name}`);
    return entry.isDirectory()
      ? listFiles(join(directory, entry.name), `${name}/`)
      : [name];
  });
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

const manifestBytes = read('asset-manifest.json');
assert.equal(hash(manifestBytes), pinnedManifestHash, 'Official manifest has changed');
const manifest = JSON.parse(manifestBytes);
assert.equal(manifest.hash_algorithm, 'sha256');
assert.equal(manifest.files.length, 17);
for (const item of manifest.files) {
  assert(!item.path.startsWith('/') && !item.path.split('/').includes('..'));
  const bytes = read(item.path);
  assert.equal(bytes.length, item.bytes, `Size mismatch: ${item.path}`);
  assert.equal(hash(bytes), item.sha256, `SHA-256 mismatch: ${item.path}`);
}
assert.deepEqual(
  listFiles(assetRoot).sort(),
  [...manifest.files.map((item) => item.path), 'asset-manifest.json'].sort(),
  'Unexpected or missing official asset',
);

const contract = json('public-contract.json');
const registry = json('criterion-registry.json');
assert.equal(contract.package_id, manifest.package_id);
assert.equal(contract.contract_version, '2.0.0');
assert.equal(contract.fixture_contract.version, '1.1.0');
assert.equal(contract.condition_count, 35);
assert.equal(registry.required_count, 35);
assert.deepEqual(registry.criteria.map((item) => item.id),
  Array.from({ length: 35 }, (_, index) => `T04-C${String(index + 1).padStart(2, '0')}`));
assert(registry.criteria.every((item) => item.required === true));

const fixtures = new Map();
for (const item of json('fixture-manifest.json').fixtures) {
  const fixture = json(`fixtures/${item.file}`);
  assert.equal(fixture.fixture_id, item.fixture_id);
  assert.equal(fixture.contract_version, '1.1.0');
  assert.equal(`sha256-${hash(JSON.stringify(canonical(fixture)))}`, item.canonical_sha256,
    `Canonical hash mismatch: ${item.file}`);
  fixtures.set(fixture.fixture_id, fixture);
}
assert.equal(fixtures.size, 9);

// Execute only the hash-verified, reviewed reference adapter. No app code is
// being tested here. The CommonJS example stays byte-for-byte unchanged.
const referenceModule = { exports: {} };
runInNewContext(read('adapter-reset.example.js').toString('utf8'),
  { module: referenceModule, URL, Intl }, { timeout: 1000 });
const adapter = referenceModule.exports;

function apply(state, fixtureId) {
  const fixture = fixtures.get(fixtureId);
  assert(fixture, `Missing fixture: ${fixtureId}`);
  const next = adapter.runFixture(state, fixture);
  const expected = fixture.expected;
  assert.equal(next.status.freshness, expected.freshness, fixtureId);
  assert.equal(next.status.error_code, expected.error_code, fixtureId);
  assert.equal(next.daily_readings.length, expected.row_count, fixtureId);
  assert.equal(next.current_reading?.normalized_value ?? null, expected.stored_value, fixtureId);
  assert.equal(next.last_delta, expected.delta, fixtureId);
  if (expected.preserve_last_good && expected.freshness === 'stale') {
    assert.equal(JSON.stringify(next.daily_readings), JSON.stringify(state.daily_readings));
    assert.equal(JSON.stringify(next.current_reading), JSON.stringify(state.current_reading));
  }
  return next;
}

function baseline() {
  const first = apply(adapter.resetEvaluationState(), 'T04-NORMAL-D1-A');
  const second = apply(first, 'T04-NORMAL-D1-B');
  assert.equal(first.daily_readings[0].record_id, second.daily_readings[0].record_id);
  return second;
}

apply(baseline(), 'T04-NORMAL-D2');
for (const fixtureId of contract.fixture_contract.failure_fixtures) {
  const failed = apply(baseline(), fixtureId);
  const recovered = apply(failed, 'T04-RECOVER-D2');
  assert.equal(recovered.daily_readings.filter((row) => row.record_date === '2026-08-25').length, 1);
  assert.equal(recovered.last_comparison.direction, 'increase');
  assert.equal(recovered.last_comparison.magnitude, 15);
}

console.log(JSON.stringify({
  package_id: contract.package_id,
  contract_version: contract.contract_version,
  fixture_contract_version: contract.fixture_contract.version,
  manifest_sha256: pinnedManifestHash,
  verified_asset_hashes: manifest.files.length,
  verified_canonical_fixture_hashes: fixtures.size,
  registry_conditions: registry.criteria.length,
  reference_sequences: { normal: 1, failure: 5, recovery: 5 },
  result: 'pass',
  scope: 'official_asset_integrity_and_reference_adapter_only',
  product_implemented: false,
  product_criteria_evaluated: false,
  real_day_receipts_created: 0,
}, null, 2));
