import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadConfig, configSchema } from '../config.js';
import { createToolset } from '../server.js';
import { ProjectFiles } from '../files.js';
import { Plans } from '../remote.js';
import { sha256 } from '../security.js';

async function fixture(run: (root: string, client: Client) => Promise<void>, allowFileWrites = true) {
  const root = await mkdtemp(path.join(tmpdir(), 'app-manager-'));
  await mkdir(path.join(root, 'config'));
  await mkdir(path.join(root, 'src'));
  await writeFile(path.join(root, 'README.md'), '# Test app\nLocal fixture.\n');
  await writeFile(path.join(root, 'package.json'), '{"name":"test-app"}');
  await writeFile(path.join(root, 'config', 'ai.local.json'), '{"enabled":true,"apiKey":"secret-for-status-test","model":"test-model"}');
  const file = path.join(root, 'config', 'manager.json');
  await writeFile(file, JSON.stringify({ version: 1, apps: { test: { label: 'Test', root: '..', allowFileWrites, tasks: {
    succeed: { description: 'Successful task', command: 'node', args: ['-e', 'console.log("task evidence")'], effect: 'read' },
    fail: { description: 'Failing task', command: 'node', args: ['-e', 'console.error("task failed");process.exit(2)'], effect: 'read' },
    slow: { description: 'Timeout task', command: 'node', args: ['-e', 'setTimeout(()=>{},30000)'], effect: 'read', timeoutMs: 150 },
    wait: { description: 'Cancellation task', command: 'node', args: ['-e', 'setTimeout(()=>{},30000)'], effect: 'read', timeoutMs: 30000 },
    deploy: { description: 'Configured remote task fixture', command: 'node', args: ['-e', 'console.log("deployment fixture")'], effect: 'remote-write' },
    redaction: { description: 'Referenced environment redaction', command: 'node', args: ['-e', 'process.stdout.write(process.env.CANARY.slice(0,4)); setTimeout(()=>console.log(process.env.CANARY.slice(4)),50)'], effect: 'read', env: { CANARY: 'MCP_CANARY_VALUE' } },
  } } } }));
  const manager = createToolset(await loadConfig(file));
  const [serverSide, clientSide] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '1' });
  try {
    await manager.server.connect(serverSide);
    await client.connect(clientSide);
    await run(root, client);
  } finally { await manager.close(); await client.close(); await manager.server.close(); await rm(root, { recursive: true, force: true }); }
}

async function call(client: Client, name: string, args: Record<string, unknown> = {}) {
  const response = await client.callTool({ name, arguments: args });
  return { response, data: (response.structuredContent as { data?: any } | undefined)?.data };
}
async function finished(client: Client, id: string) {
  const until = Date.now() + 10_000;
  while (Date.now() < until) {
    const result = await call(client, 'job_get', { jobId: id });
    if (result.data.state !== 'running') return result.data;
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  throw new Error('Job did not finish.');
}

test('MCP discovery, resources, prompts and app inspection use the real protocol', async () => fixture(async (_, client) => {
  const tools = await client.listTools();
  assert.equal(tools.tools.length, 20);
  assert.ok(tools.tools.find(tool => tool.name === 'remote_apply')?.annotations?.destructiveHint);
  assert.ok((await client.listResources()).resources.some(resource => resource.uri === 'app-manager://apps'));
  assert.ok((await client.readResource({ uri: 'app-manager://apps' })).contents.length);
  assert.ok((await client.getPrompt({ name: 'maintain_app', arguments: { appId: 'test', request: 'Check the app' } })).messages.length);
  assert.equal((await call(client, 'app_inspect', { appId: 'test' })).data.package.name, 'test-app');
  const status = await call(client, 'app_ai_status', { appId: 'test' });
  assert.equal(status.data.credentialConfigured, true);
  assert.ok(!JSON.stringify(status.response).includes('secret-for-status-test'));
}));

test('file edits reject stale hashes, expose changes and prevent new-file overwrites', async () => fixture(async (root, client) => {
  const original = (await call(client, 'project_read', { appId: 'test', path: 'README.md' })).data;
  await writeFile(path.join(root, 'README.md'), 'User concurrent edit');
  const stale = await call(client, 'project_write', { appId: 'test', path: 'README.md', expectedSha256: original.sha256, content: 'Agent edit' });
  assert.equal(stale.response.isError, true);
  assert.equal(await readFile(path.join(root, 'README.md'), 'utf8'), 'User concurrent edit');
  const current = (await call(client, 'project_read', { appId: 'test', path: 'README.md' })).data;
  assert.equal((await call(client, 'project_write', { appId: 'test', path: 'README.md', expectedSha256: current.sha256, content: 'Reviewed replacement' })).data.sha256, sha256('Reviewed replacement'));
  assert.equal((await call(client, 'project_write', { appId: 'test', path: 'src/new.ts', expectedSha256: null, content: 'export const a = 1;' })).data.created, true);
  assert.equal((await call(client, 'project_write', { appId: 'test', path: 'src/new.ts', expectedSha256: null, content: 'overwrite' })).response.isError, true);
  assert.ok((await call(client, 'project_search', { appId: 'test', query: 'export const' })).data.matches.some((row: { path: string }) => row.path === 'src/new.ts'));
}));

test('credential files, traversal, operator config and unknown apps cannot be read', async () => fixture(async (_, client) => {
  for (const file of ['config/ai.local.json', 'config/manager.json', '.env', '../outside.md', '..\\outside.md', '.mcp.json', 'README.md:stream']) {
    assert.equal((await call(client, 'project_read', { appId: 'test', path: file })).response.isError, true, file);
  }
  assert.equal((await call(client, 'project_files', { appId: '__proto__' })).response.isError, true);
  const listing = (await call(client, 'project_files', { appId: 'test' })).data;
  assert.ok(!listing.files.includes('config/ai.local.json'));
  const invalid = await call(client, 'project_read', { appId: 'test', path: 'README.md', arbitrary: 'ignored?' });
  assert.equal(invalid.response.isError, true, 'extra arguments are rejected');
}));

test('operator can disable file writes', async () => fixture(async (_, client) => {
  assert.equal((await call(client, 'project_write', { appId: 'test', path: 'new.md', expectedSha256: null, content: 'x' })).response.isError, true);
}, false));

test('tasks report success, failure, timeout, cancellation and audit metadata', async () => fixture(async (root, client) => {
  const started = (await call(client, 'task_start', { appId: 'test', taskId: 'succeed' })).data;
  const success = await finished(client, started.id);
  assert.equal(success.state, 'succeeded');
  assert.match(success.output, /task evidence/);
  assert.equal((await finished(client, (await call(client, 'task_start', { appId: 'test', taskId: 'fail' })).data.id)).exitCode, 2);
  assert.equal((await finished(client, (await call(client, 'task_start', { appId: 'test', taskId: 'slow' })).data.id)).state, 'timed-out');
  const waiting = (await call(client, 'task_start', { appId: 'test', taskId: 'wait' })).data;
  assert.equal((await call(client, 'task_start', { appId: 'test', taskId: 'succeed' })).response.isError, true, 'project group cannot overlap');
  await call(client, 'job_cancel', { jobId: waiting.id });
  assert.equal((await finished(client, waiting.id)).state, 'cancelled');
  assert.equal((await call(client, 'task_start', { appId: 'test', taskId: 'arbitrary-shell' })).response.isError, true);
  const log = await readFile(path.join(root, '.local/mcp/audit.jsonl'), 'utf8');
  assert.match(log, /succeeded/);
  assert.ok(!log.includes('task evidence'));
  assert.ok(!log.includes('secret-for-status-test'));
}));

test('symlink directories and files cannot escape project confinement', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'mcp-links-'));
  const outside = await mkdtemp(path.join(tmpdir(), 'mcp-outside-'));
  try {
    await writeFile(path.join(outside, 'outside.md'), 'outside');
    try { await symlink(outside, path.join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'EPERM') { t.skip('Host does not permit symlinks.'); return; } throw error; }
    const files = new ProjectFiles(root);
    await assert.rejects(files.read('linked/outside.md'), /Symbolic links/);
    assert.deepEqual((await files.list()).files, []);
  } finally { await rm(root, { recursive: true, force: true }); await rm(outside, { recursive: true, force: true }); }
});

test('remote plans bind exact arguments, require digest, expire and execute once', t => {
  let now = Date.now();
  t.mock.method(Date, 'now', () => now);
  const plans = new Plans();
  const action = { kind: 'http' as const, appId: 'test', endpointId: 'deploy', operationId: 'restart', body: { release: 'abc' } };
  const plan = plans.prepare(action, 'remote-write');
  action.body.release = 'changed';
  assert.throws(() => plans.take(plan.planId, 'bad'), /digest/);
  assert.deepEqual(plans.take(plan.planId, plan.digest), { ...action, body: { release: 'abc' } });
  assert.throws(() => plans.take(plan.planId, plan.digest), /consumed/);
  assert.throws(() => plans.prepare(action, 'read'), /Read operations/);
  const expiring = plans.prepare(action, 'remote-write');
  now += 300_001;
  assert.throws(() => plans.take(expiring.planId, expiring.digest), /expired/);
});

test('config rejects insecure remote URLs, unknown fields and GET write effects', () => {
  const base = { version: 1, apps: { test: { label: 'Test', root: '.' } } };
  assert.ok(configSchema.safeParse(base).success);
  for (const url of ['http://example.com', 'https://user:pass@example.com', 'https://example.com?token=secret']) {
    assert.equal(configSchema.safeParse({ ...base, apps: { test: { ...base.apps.test, endpoints: { bad: { description: 'bad', url, operations: {} } } } } }).success, false);
  }
  assert.equal(configSchema.safeParse({ ...base, arbitrary: true }).success, false);
  assert.equal(configSchema.safeParse({ ...base, apps: { test: { ...base.apps.test, endpoints: { bad: { description: 'bad', url: 'https://example.com', operations: { bad: { description: 'bad', method: 'GET', effect: 'remote-write' } } } } } } }).success, false);
});

test('the real stdio entrypoint runs from another working directory using the generated client command', async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const other = await mkdtemp(path.join(tmpdir(), 'mcp-client-cwd-'));
  const client = new Client({ name: 'entrypoint-test', version: '1' });
  const transport = new StdioClientTransport({ command: process.execPath, args: ['--import', pathToFileURL(path.join(root, 'node_modules/tsx/dist/loader.mjs')).href, path.join(root, 'mcp/cli.ts'), '--config', path.join(root, 'config/mcp.example.json')], cwd: other, stderr: 'pipe' });
  transport.stderr?.on('data', () => undefined);
  try {
    await client.connect(transport, { timeout: 10_000 });
    const result = await call(client, 'app_list');
    assert.equal(result.data[0].appId, 'architecture');
    assert.equal(result.data[0].root, root);
  } finally { await client.close(); await rm(other, { recursive: true, force: true }); }
});

test('concurrent starts cannot bypass exclusive project task groups', async () => fixture(async (_, client) => {
  const results = await Promise.all([call(client, 'task_start', { appId: 'test', taskId: 'wait' }), call(client, 'task_start', { appId: 'test', taskId: 'wait' })]);
  assert.equal(results.filter(row => row.response.isError).length, 1);
  const success = results.find(row => !row.response.isError)!;
  await call(client, 'job_cancel', { jobId: success.data.id });
  assert.equal((await finished(client, success.data.id)).state, 'cancelled');
}));

test('remote-write tasks require a prepared plan and expose the eventual job result', async () => fixture(async (_, client) => {
  assert.equal((await call(client, 'task_start', { appId: 'test', taskId: 'deploy' })).response.isError, true);
  const plan = (await call(client, 'remote_prepare', { action: { kind: 'task', appId: 'test', taskId: 'deploy' } })).data;
  const job = (await call(client, 'remote_apply', { planId: plan.planId, digest: plan.digest })).data;
  assert.equal((await finished(client, job.id)).state, 'succeeded');
}));

test('configured environment values are redacted even when logs split them across chunks', async () => {
  process.env.MCP_CANARY_VALUE = 'canary-value-for-redaction';
  try {
    await fixture(async (_, client) => {
      const job = (await call(client, 'task_start', { appId: 'test', taskId: 'redaction' })).data;
      const result = await finished(client, job.id);
      assert.equal(result.state, 'succeeded');
      assert.ok(!result.output.includes('canary-value-for-redaction'));
      assert.match(result.output, /REDACTED/);
    });
  } finally { delete process.env.MCP_CANARY_VALUE; }
});
