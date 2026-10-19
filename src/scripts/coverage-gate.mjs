#!/usr/bin/env node
/**
 * Runs the unit tests with V8 coverage and enforces thresholds honestly:
 *
 *  - every source file in the covered set MUST appear in the report. Node only
 *    reports files that were loaded, so an untested module would otherwise
 *    silently inflate the percentage;
 *  - explicit baseline-based line/function/branch floors defined below;
 *  - no single file below the per-file floor.
 *
 * IWSDK runtime glue, browser-only adapters and retained scaffold examples
 * are excluded explicitly below. Pointer E2E and physical checks cover runtime.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const coveredDirs = ['src', 'server'];
// Runtime/DOM surfaces are exercised by pointer E2E and physical checks instead.
const runtimeFiles = new Set(['index.ts','assets.ts','components.ts','workspace.ts','diagram.ts','diagram-shapes.ts','diagram-component.ts','project-editor.ts','export-shelf.ts','dictation.ts','app-mark.ts','ui-host.ts','serve.ts','panel.ts','robot.ts','robot-component.ts']);
// Initial merged baseline: 96.7% lines, 87.9% functions, 89.7% branches;
// the optional AI service has 72% lines. Set explicit regression floors for
// this implementation rather than importing another app's percentages.
const thresholds = { lines: 95, functions: 85, branches: 85, perFileLines: 70 };

mkdirSync(join(root, 'coverage'), { recursive: true });
const lcovPath = join(root, 'coverage', 'lcov.info');
const tests = readdirSync(join(root, 'tests')).filter(f => f.endsWith('.test.ts')).map(f => join('tests', f));
const run = spawnSync(process.execPath, [
  '--import', 'tsx', '--experimental-test-coverage',
  '--test-reporter=spec', '--test-reporter-destination=stdout',
  '--test-reporter=lcov', `--test-reporter-destination=${lcovPath}`,
  '--test', ...tests,
], { stdio: ['ignore', 'inherit', 'inherit'], cwd: root });
if (run.status !== 0) { console.error('\nTests failed; coverage not evaluated.'); process.exit(run.status ?? 1); }

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith('.ts') && !full.endsWith('.d.ts') ? [relative(root, full).replace(/\\/g, '/')] : [];
  });
}
const expected = coveredDirs.flatMap(dir => walk(join(root, dir))).filter(file => !runtimeFiles.has(file.split('/').pop())).sort();

const records = new Map();
let current = null;
for (const line of readFileSync(lcovPath, 'utf8').split('\n')) {
  const separator = line.indexOf(':');
  const key = line.slice(0, separator), value = line.slice(separator + 1);
  if (key === 'SF') { current = { lf: 0, lh: 0, fnf: 0, fnh: 0, brf: 0, brh: 0 }; records.set(value.replace(/\\/g, '/'), current); }
  else if (current && ['LF', 'LH', 'FNF', 'FNH', 'BRF', 'BRH'].includes(key)) current[key.toLowerCase()] = Number(value);
}

const pct = (hit, found) => (found === 0 ? 100 : (hit / found) * 100);
const failures = [];
const totals = { lf: 0, lh: 0, fnf: 0, fnh: 0, brf: 0, brh: 0 };
console.log('\nCoverage (unit-testable modules)');
console.log('file'.padEnd(34) + 'lines'.padStart(9) + 'funcs'.padStart(9) + 'branch'.padStart(9));
for (const file of expected) {
  const r = records.get(file);
  if (!r) { failures.push(`${file} was never loaded by any test`); console.log(file.padEnd(34) + 'NOT LOADED'.padStart(27)); continue; }
  for (const k of Object.keys(totals)) totals[k] += r[k];
  const lines = pct(r.lh, r.lf);
  if (lines < thresholds.perFileLines) failures.push(`${file} line coverage ${lines.toFixed(1)}% is below the per-file floor of ${thresholds.perFileLines}%`);
  console.log(file.padEnd(34) + `${lines.toFixed(1)}%`.padStart(9) + `${pct(r.fnh, r.fnf).toFixed(1)}%`.padStart(9) + `${pct(r.brh, r.brf).toFixed(1)}%`.padStart(9));
}
const summary = { lines: pct(totals.lh, totals.lf), functions: pct(totals.fnh, totals.fnf), branches: pct(totals.brh, totals.brf) };
console.log('-'.repeat(61));
console.log('total'.padEnd(34) + `${summary.lines.toFixed(1)}%`.padStart(9) + `${summary.functions.toFixed(1)}%`.padStart(9) + `${summary.branches.toFixed(1)}%`.padStart(9));
for (const [metric, minimum] of Object.entries({ lines: thresholds.lines, functions: thresholds.functions, branches: thresholds.branches })) {
  if (summary[metric] < minimum) failures.push(`total ${metric} coverage ${summary[metric].toFixed(1)}% is below ${minimum}%`);
}
if (failures.length) { console.error('\nCoverage gate failed:\n - ' + failures.join('\n - ')); process.exit(1); }
console.log(`\nCoverage gate passed (lines >= ${thresholds.lines}%, functions >= ${thresholds.functions}%, branches >= ${thresholds.branches}%, every covered file loaded).`);
