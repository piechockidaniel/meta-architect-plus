/** Verify a prepared candidate without contacting a device or invoking AI. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DecisionSession } from '../src/session.js';
import { sample } from '../src/decision.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const argument = process.argv[2];
if (!argument) throw new Error('Usage: npm run device:verify -- <prepared-run-directory>');
const directory = path.resolve(argument);
const run = JSON.parse(await readFile(path.join(directory, 'run.json'), 'utf8'));
const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
async function verifyFiles(files: Record<string, string>) {
  for (const [name, hash] of Object.entries(files)) {
    const file = path.resolve(root, name);
    assert.ok(file.startsWith(root), `Manifest path outside workspace: ${name}`);
    assert.equal(digest(await readFile(file)), hash, `Candidate changed: ${name}`);
  }
}
await verifyFiles(run.sourceHashes);
assert.equal(digest(JSON.stringify(run.sourceHashes)), run.sourceFingerprint, 'Source fingerprint mismatch');
assert.ok(run.productionBuild?.files, 'No complete build manifest; build and prepare a new run');
await verifyFiles(run.productionBuild.files);
assert.equal(digest(JSON.stringify(run.productionBuild.files)), run.productionBuild.fingerprint, 'Build fingerprint mismatch');
assert.equal(Object.keys(run.fixtures).length, 6);
for (const fixture of Object.values(run.fixtures) as Array<{ file: string; expected: { states: unknown; recommendation: unknown } }>) {
  const file = path.resolve(directory, fixture.file);
  assert.ok(file.startsWith(directory + path.sep), 'Fixture path outside run');
  const session = new DecisionSession(sample('greenfield'));
  session.restore(JSON.parse(await readFile(file, 'utf8')));
  assert.equal(session.context.confirmed, false);
  assert.deepEqual(Object.fromEntries(session.snapshot.assessments.map(a => [a.variant.id, a.state])), fixture.expected.states);
  assert.deepEqual(session.snapshot.recommendation, fixture.expected.recommendation);
}
console.log(JSON.stringify({ verified: true, directory, sourceFingerprint: run.sourceFingerprint,
  buildFingerprint: run.productionBuild.fingerprint, buildFileCount: Object.keys(run.productionBuild.files).length,
  fixtureCount: 6, note: 'Candidate integrity verified; physical test results are unchanged.' }, null, 2));
