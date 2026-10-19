import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createServer } from 'node:http';
import { createServer as createHttp2Server, connect } from 'node:http2';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { ExportInbox, exportMiddleware, generateCode, retrievalPage, validateBundle } from '../server/export-middleware.ts';
import { DecisionSession } from '../src/session.ts';
import { sample } from '../src/decision.ts';
import { decisionBundle } from '../src/exports.ts';

test('HTTP/2 exports accept same authority and reject unrelated origins', async () => {
  const middleware = exportMiddleware(new ExportInbox(), { allowedOrigins: [] });
  const server = createHttp2Server((request, response) => {
    void middleware(request as unknown as IncomingMessage, response as unknown as ServerResponse, () => response.end());
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const client = connect(base);
  const post = (origin: string) => new Promise<number>((resolve, reject) => {
    const request = client.request({ ':method': 'POST', ':path': '/api/exports', origin, 'content-type': 'application/json' });
    let status = 0;
    request.on('response', headers => { status = Number(headers[':status']); });
    request.on('data', () => undefined);
    request.on('end', () => resolve(status));
    request.on('error', reject);
    request.end(JSON.stringify(decisionBundle(new DecisionSession(sample('greenfield')))));
  });
  try {
    assert.equal(await post(base), 201);
    assert.equal(await post('https://evil.example'), 403);
    assert.equal(await post('null'), 403);
  } finally {
    client.close();
    server.close();
  }
});

test('codes use an unambiguous alphabet and bundles are validated before storage', () => {
  assert.match(generateCode(), /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.ok(!generateCode(Buffer.alloc(8, 0)).includes('0'));
  assert.throws(() => validateBundle({ schema: 'nope' }), /Unsupported bundle schema/);
  assert.throws(() => validateBundle({ schema: 'architecture-decision-bundle.v2', markdown: 'x', diagrams: { cloud: '<script>' } }), /Invalid diagram/);
  const bundle = decisionBundle(new DecisionSession(sample('greenfield')));
  assert.equal(validateBundle(bundle).version, 1);
});

test('inbox expires entries and bounds its size', () => {
  let now = 1_000;
  const inbox = new ExportInbox({ ttlMs: 100, maxEntries: 2, now: () => now });
  const bundle = decisionBundle(new DecisionSession(sample('greenfield')));
  const first = inbox.store(bundle, JSON.stringify(bundle));
  assert.ok(inbox.get(first.code.toLowerCase()));
  inbox.store(bundle, JSON.stringify(bundle));
  inbox.store(bundle, JSON.stringify(bundle));
  assert.equal(inbox.get(first.code), undefined, 'oldest entry evicted when full');
  now += 200;
  const later = inbox.store(bundle, JSON.stringify(bundle));
  now += 101;
  assert.equal(inbox.get(later.code), undefined, 'expired');
});

test('retrieval page escapes user text and lists every artifact', () => {
  const session = new DecisionSession(sample('greenfield'));
  session.setContext({ ...session.context, title: '<b>Evil</b>', inputOrigin: 'user' });
  const bundle = decisionBundle(session);
  const entry = new ExportInbox().store(bundle, JSON.stringify(bundle));
  const page = retrievalPage(entry);
  assert.ok(page.includes('&lt;b&gt;Evil&lt;/b&gt;'));
  assert.ok(!page.includes('<b>Evil</b>'));
  for (const name of ['decision.md', 'cloud.svg', 'on-premise.svg', 'hybrid.svg', 'bundle.json']) assert.ok(page.includes(`/${name}"`), name);
});

test('middleware round trip: post bundle, fetch page and files, reject cross-origin and garbage', async () => {
  const middleware = exportMiddleware(new ExportInbox(), { allowedOrigins: ['https://localhost:8081'] });
  const server = createServer((request, response) => {
    void middleware(request, response, () => {
      response.writeHead(404);
      response.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const bundle = decisionBundle(new DecisionSession(sample('organization')));
    const posted = await fetch(`${base}/api/exports`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://localhost:8081' }, body: JSON.stringify(bundle) });
    assert.equal(posted.status, 201);
    const receipt = (await posted.json()) as { code: string; path: string; expiresAt: string };
    assert.match(receipt.code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    assert.equal(receipt.path, `/exports/${receipt.code}`);
    const page = await fetch(`${base}${receipt.path}`);
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-type') ?? '', /text\/html/);
    assert.ok((await page.text()).includes('decision v1'));
    const markdown = await fetch(`${base}/api/exports/${receipt.code}/decision.md`);
    assert.equal(markdown.status, 200);
    assert.match(markdown.headers.get('content-disposition') ?? '', /decision\.md/);
    assert.ok((await markdown.text()).startsWith('# Architecture decision v1'));
    const svg = await fetch(`${base}/api/exports/${receipt.code}/hybrid.svg`);
    assert.equal(svg.headers.get('content-type'), 'image/svg+xml');
    assert.equal((await fetch(`${base}/api/exports/${receipt.code}/nope.svg`)).status, 404);
    assert.equal((await fetch(`${base}/exports/ZZZZ-ZZZZ`)).status, 404);
    const crossOrigin = await fetch(`${base}/api/exports`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' }, body: JSON.stringify(bundle) });
    assert.equal(crossOrigin.status, 403);
    const sameHost = await fetch(`${base}/api/exports`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify(bundle) });
    assert.equal(sameHost.status, 201, 'headset on the LAN origin is accepted');
    const garbage = await fetch(`${base}/api/exports`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://localhost:8081' }, body: '{"schema":"x"}' });
    assert.equal(garbage.status, 400);
    assert.equal((await fetch(`${base}/api/exports`, { method: 'DELETE' })).status, 405);
    assert.equal((await fetch(`${base}/unrelated`)).status, 404);
  } finally {
    server.close();
  }
});

test('a stored export can be deleted before it expires', async () => {
  const inbox = new ExportInbox();
  const middleware = exportMiddleware(inbox, { allowedOrigins: ['https://localhost:8081'] });
  const server = createServer((request, response) => {
    void middleware(request, response, () => {
      response.writeHead(404);
      response.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const bundle = decisionBundle(new DecisionSession(sample('greenfield')));
    const entry = inbox.store(bundle, JSON.stringify(bundle));
    assert.equal((await fetch(`${base}/api/exports/${entry.code}`, { method: 'DELETE' })).status, 200);
    assert.equal((await fetch(`${base}/exports/${entry.code}`)).status, 404);
    assert.equal((await fetch(`${base}/api/exports/${entry.code}`, { method: 'DELETE' })).status, 404);
  } finally {
    server.close();
  }
});
