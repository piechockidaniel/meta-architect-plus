#!/usr/bin/env node
/**
 * End-to-end tests against the real IWSDK runtime: builds (unless --no-build),
 * creates .local/e2e-build in test mode, serves it on loopback HTTP, drives
 * real Playwright pointer events through a read-only test hook, then closes
 * the browser and server. The ordinary production build has no test hook.
 */
import { spawn, spawnSync } from 'node:child_process';
import { readdirSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const vite = join(dirname(require.resolve('vite/package.json')), 'bin', 'vite.js');

const noBuild = process.argv.includes('--no-build');
if (!noBuild) {
  const build = spawnSync(process.execPath, [vite, 'build', '--mode', 'test', '--outDir', '.local/e2e-build'], { stdio: 'inherit' });
  if (build.status !== 0) process.exit(build.status ?? 1);
}
mkdirSync('.local/e2e', { recursive: true });
const server = spawn(process.execPath, ['--import', 'tsx', 'scripts/e2e-server.ts'], { stdio: ['ignore', 'pipe', 'pipe'] });
let exitCode = 1;
try {
  let url = '';
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('preview server did not start')), 60_000);
    server.stdout.on('data', chunk => { const m = /(https?:\/\/127\.0\.0\.1:4173\/)/.exec(String(chunk)); if (m && !url) { url = m[1]; clearTimeout(timer); resolve(); } });
    server.stderr.on('data', chunk => process.stderr.write(chunk));
    server.on('exit', code => { clearTimeout(timer); reject(new Error(`preview exited with ${code}`)); });
    server.on('error', error => { clearTimeout(timer); reject(error); });
  });
  const tests = readdirSync('tests-e2e').filter(f => f.endsWith('.e2e.ts')).map(f => join('tests-e2e', f));
  const run = spawnSync(process.execPath, ['--import', 'tsx', '--test', '--test-concurrency=1', ...tests], { stdio: 'inherit', env: { ...process.env, E2E_URL: url } });
  exitCode = run.status ?? 1;
} catch (error) {
  console.error(error);
} finally {
  server.kill();
}
process.exitCode = exitCode;
