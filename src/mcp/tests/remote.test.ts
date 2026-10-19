import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { z } from 'zod';
import { loadConfig, configSchema } from '../config.js';
import { createToolset } from '../server.js';
import { httpOperation, discoverUpstream, callUpstream, readUpstreamResource, OperationError } from '../remote.js';

async function listen(server: Server) {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}
async function close(server: Server) { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
function configured(url: string, timeoutMs = 5_000) {
  return configSchema.parse({ version: 1, apps: { test: { label: 'Test', root: '.', endpoints: { deployment: {
    description: 'Fixture deployment', url, timeoutMs, operations: {
      status: { description: 'Status', method: 'GET', path: '/status', effect: 'read' },
      restart: { description: 'Restart', method: 'POST', path: '/restart', effect: 'remote-write' },
      redirect: { description: 'Redirect', method: 'GET', path: '/redirect', effect: 'read' },
      large: { description: 'Large', method: 'GET', path: '/large', effect: 'read' },
      drop: { description: 'Drop', method: 'POST', path: '/drop', effect: 'remote-write' },
    },
  } } } } }).apps.test;
}

test('HTTP reads and reviewed writes use exact targets, one-use plans and sanitized audit', async () => {
  let restarts = 0;
  let received: unknown;
  const remote = createServer((req, res) => {
    if (req.url === '/status') { res.setHeader('content-type', 'application/json'); res.end('{"healthy":true}'); return; }
    if (req.url === '/restart') {
      restarts++;
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => { received = JSON.parse(body); res.end('restarted'); });
      return;
    }
    res.writeHead(404); res.end();
  });
  const url = await listen(remote);
  const root = await mkdtemp(path.join(tmpdir(), 'mcp-http-'));
  const file = path.join(root, 'manager.json');
  await writeFile(file, JSON.stringify({ version: 1, auditFile: './audit.jsonl', apps: { test: configured(url) } }));
  const manager = createToolset(await loadConfig(file));
  const client = new Client({ name: 'test', version: '1' });
  const [serverSide, clientSide] = InMemoryTransport.createLinkedPair();
  const call = (name: string, args: Record<string, unknown>) => client.callTool({ name, arguments: args });
  try {
    await manager.server.connect(serverSide); await client.connect(clientSide);
    const result = await call('remote_http_read', { appId: 'test', endpointId: 'deployment', operationId: 'status' });
    assert.equal((result.structuredContent as any).data.body.healthy, true);
    assert.equal((await call('remote_http_read', { appId: 'test', endpointId: 'deployment', operationId: 'restart' })).isError, true);
    const prepared = await call('remote_prepare', { action: { kind: 'http', appId: 'test', endpointId: 'deployment', operationId: 'restart', body: { release: 'r42' } } });
    assert.equal(restarts, 0, 'prepare performs no network write');
    const plan = (prepared.structuredContent as any).data;
    assert.equal((await call('remote_apply', { planId: plan.planId, digest: plan.digest })).isError, undefined);
    assert.equal(restarts, 1);
    assert.deepEqual(received, { release: 'r42' });
    assert.equal((await call('remote_apply', { planId: plan.planId, digest: plan.digest })).isError, true);
    assert.equal(restarts, 1, 'consumed plan cannot replay a write');
    const audit = await call('audit_tail', {});
    assert.ok(!JSON.stringify(audit).includes('r42'), 'request body is not logged');
  } finally { await manager.close(); await client.close(); await manager.server.close(); await close(remote); await rm(root, { recursive: true, force: true }); }
});

test('HTTP denies redirects, caps responses and marks interrupted writes outcome_unknown without retry', async () => {
  let drops = 0;
  let redirectsFollowed = 0;
  const remote = createServer((req, res) => {
    if (req.url === '/redirect') { res.writeHead(302, { location: '/status' }); res.end(); }
    else if (req.url === '/status') { redirectsFollowed++; res.end('healthy'); }
    else if (req.url === '/large') res.end('x'.repeat(140_000));
    else if (req.url === '/restart') { res.writeHead(500); res.end('may have partially applied'); }
    else { drops++; req.socket.destroy(); }
  });
  const app = configured(await listen(remote));
  try {
    await assert.rejects(httpOperation(app, 'deployment', 'redirect'));
    assert.equal(redirectsFollowed, 0);
    await assert.rejects(httpOperation(app, 'deployment', 'large'), /128 KB/);
    await assert.rejects(httpOperation(app, 'deployment', 'drop'), error => error instanceof OperationError && error.outcome === 'outcome_unknown');
    assert.equal(drops, 1);
    assert.equal((await httpOperation(app, 'deployment', 'restart', {})).outcome, 'outcome_unknown');
    const controller = new AbortController(); controller.abort();
    await assert.rejects(httpOperation(app, 'deployment', 'restart', {}, controller.signal));
    assert.equal(drops, 1, 'already-cancelled request is never dispatched');
  } finally { await close(remote); }
});

test('stdio upstream uses SDK discovery, allowlists, resources and tool calls', async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const upstream = configSchema.parse({ version: 1, apps: { test: { label: 'Test', root, upstreams: { local: {
    description: 'Local MCP fixture', transport: 'stdio', command: 'node', args: ['--import', 'tsx', 'mcp/tests/fixtures/upstream.ts'],
    tools: { status: { effect: 'read' }, restart: { effect: 'local-write' } }, resources: ['fixture://status'], timeoutMs: 10_000,
  } } } } }).apps.test.upstreams.local;
  if (upstream.transport === 'stdio') upstream.cwd = root;
  const discovered = await discoverUpstream(upstream);
  assert.deepEqual(discovered.tools.map(tool => tool.name).sort(), ['restart', 'status']);
  assert.equal((await callUpstream(upstream, 'status', { label: 'remote-proof' })).outcome, 'completed');
  await assert.rejects(callUpstream(upstream, 'not_allowed', {}), /allowlist/);
  assert.ok((await readUpstreamResource(upstream, 'fixture://status')).contents.length);
  await assert.rejects(readUpstreamResource(upstream, 'fixture://private'), /allowlist/);
});

test('Streamable HTTP upstream supports discovery, arguments, resources and toolset-reviewed write execution', async () => {
  let writes = 0;
  const sessions: McpServer[] = [];
  const remote = createServer((req, res) => {
    const server = new McpServer({ name: 'http-fixture', version: '1' });
    server.registerTool('status', { inputSchema: { name: z.string() } }, ({ name }) => ({ content: [{ type: 'text', text: `hello ${name}` }] }));
    server.registerTool('restart', { inputSchema: {} }, () => { writes++; return { content: [{ type: 'text', text: 'done' }] }; });
    server.registerTool('hidden', { inputSchema: {} }, () => ({ content: [] }));
    server.registerResource('status', 'fixture://status', {}, uri => ({ contents: [{ uri: uri.href, text: 'remote status' }] }));
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    sessions.push(server);
    void server.connect(transport).then(() => transport.handleRequest(req, res)).catch(() => { res.writeHead(500); res.end(); });
    res.on('close', () => { void server.close(); });
  });
  const url = await listen(remote);
  const config = configSchema.parse({ version: 1, apps: { test: { label: 'Test', root: '.', upstreams: { remote: {
    description: 'HTTP fixture', transport: 'http', url, tools: { status: { effect: 'read' }, restart: { effect: 'remote-write' } }, resources: ['fixture://status'], timeoutMs: 5_000,
  } } } } });
  const upstream = config.apps.test.upstreams.remote;
  const root = await mkdtemp(path.join(tmpdir(), 'mcp-upstream-plan-'));
  const file = path.join(root, 'manager.json');
  await writeFile(file, JSON.stringify({ ...config, auditFile: './audit.jsonl' }));
  const manager = createToolset(await loadConfig(file));
  const client = new Client({ name: 'remote-plan-test', version: '1' });
  const [serverSide, clientSide] = InMemoryTransport.createLinkedPair();
  await manager.server.connect(serverSide); await client.connect(clientSide);
  try {
    assert.deepEqual((await discoverUpstream(upstream)).tools.map(tool => tool.name).sort(), ['restart', 'status']);
    const result = await callUpstream(upstream, 'status', { name: 'world' });
    assert.match(JSON.stringify(result), /hello world/);
    assert.ok((await readUpstreamResource(upstream, 'fixture://status')).contents.length);
    assert.equal((await client.callTool({ name: 'upstream_read', arguments: { appId: 'test', upstreamId: 'remote', toolName: 'restart', arguments: {} } })).isError, true);
    const prepared = await client.callTool({ name: 'remote_prepare', arguments: { action: { kind: 'mcp', appId: 'test', upstreamId: 'remote', toolName: 'restart', arguments: {} } } });
    const plan = (prepared.structuredContent as any).data;
    assert.equal(writes, 0);
    const applied = await client.callTool({ name: 'remote_apply', arguments: { planId: plan.planId, digest: plan.digest } });
    assert.equal((applied.structuredContent as any).data.outcome, 'completed');
    assert.equal(writes, 1);
  } finally { await manager.close(); await client.close(); await manager.server.close(); await Promise.all(sessions.map(server => server.close())); await close(remote); await rm(root, { recursive: true, force: true }); }
});
