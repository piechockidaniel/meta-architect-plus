import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { maskSecret, readLocalAiConfig, resolveAiConfig, resolveAllowedOrigins } from '../server/ai-config.ts';
import { aiMiddleware } from '../server/ai-middleware.ts';

async function withTempConfig(content: unknown | null, fn: (filePath: string) => Promise<void>) {
  const dir = await mkdtemp(path.join(tmpdir(), 'ai-config-'));
  const filePath = path.join(dir, 'ai.local.json');
  if (content !== null) await writeFile(filePath, JSON.stringify(content), 'utf8');
  try {
    await fn(filePath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('missing or corrupt local config falls back to environment variables', async () => {
  await withTempConfig(null, async (filePath) => {
    assert.equal(readLocalAiConfig(filePath), null);
    const config = resolveAiConfig({ AI_ENABLED: 'true', AI_PROVIDER: 'openai', AI_MODEL: 'env-model', OPENAI_API_KEY: 'env-key', AI_MAX_CALLS: '5' }, filePath);
    assert.deepEqual(config, { enabled: true, provider: 'openai', model: 'env-model', apiKey: 'env-key', baseURL: undefined, maxCalls: 5 });
  });
  const dir = await mkdtemp(path.join(tmpdir(), 'ai-config-'));
  const filePath = path.join(dir, 'ai.local.json');
  await writeFile(filePath, '{ not json', 'utf8');
  try {
    assert.equal(readLocalAiConfig(filePath), null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('the local wizard file is authoritative over environment variables and clamps maxCalls', async () => {
  await withTempConfig({ enabled: true, provider: 'anthropic', model: 'claude-test', apiKey: 'local-key', maxCalls: 9999, allowedOrigins: ['https://example.test'] }, async (filePath) => {
    const config = resolveAiConfig({ AI_ENABLED: 'false', AI_PROVIDER: 'openai', OPENAI_API_KEY: 'env-key' }, filePath);
    assert.equal(config.enabled, true);
    assert.equal(config.provider, 'anthropic');
    assert.equal(config.apiKey, 'local-key');
    assert.equal(config.maxCalls, 100, 'clamped to the documented 0-100 range');
    assert.deepEqual(resolveAllowedOrigins({}, filePath), ['https://example.test']);
  });
});

test('a partial local file only overrides the fields it sets', async () => {
  await withTempConfig({ enabled: true }, async (filePath) => {
    const config = resolveAiConfig({ AI_PROVIDER: 'google', AI_MODEL: 'gemini-test', GOOGLE_GENERATIVE_AI_API_KEY: 'g-key', AI_MAX_CALLS: '3' }, filePath);
    assert.equal(config.enabled, true); // from file
    assert.equal(config.provider, 'google'); // from env, file did not set it
    assert.equal(config.model, 'gemini-test');
    assert.equal(config.apiKey, 'g-key');
    assert.equal(config.maxCalls, 3);
  });
});

test('secrets are masked for display and never returned in full', () => {
  assert.equal(maskSecret(undefined), '(not set)');
  assert.equal(maskSecret('abc'), '***');
  assert.equal(maskSecret('sk-1234567890abcdef'), 'sk-**************ef');
  assert.ok(!maskSecret('sk-1234567890abcdef').includes('1234567890abcdef'));
});

test('the middleware re-reads the local config file on every request, no restart needed', async () => {
  await withTempConfig({ enabled: false }, async (filePath) => {
    const middleware = aiMiddleware({ getConfig: () => resolveAiConfig(process.env, filePath), getAllowedOrigins: () => resolveAllowedOrigins(process.env, filePath) });
    const server = createServer((request, response) => {
      void middleware(request, response, () => {
        response.writeHead(404);
        response.end();
      });
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      const before = await (await fetch(`${base}/api/ai/status`)).json();
      assert.equal(before.available, false);

      await writeFile(filePath, JSON.stringify({ enabled: true, provider: 'openai', model: 'm', apiKey: 'k', maxCalls: 10 }), 'utf8');

      const after = await (await fetch(`${base}/api/ai/status`)).json();
      assert.equal(after.available, true);
    } finally {
      server.close();
    }
  });
});

test('the status endpoint never leaks the configured API key', async () => {
  await withTempConfig({ enabled: true, provider: 'openai', model: 'm', apiKey: 'super-secret-key', maxCalls: 10 }, async (filePath) => {
    const middleware = aiMiddleware({ getConfig: () => resolveAiConfig(process.env, filePath), getAllowedOrigins: () => resolveAllowedOrigins(process.env, filePath) });
    const server = createServer((request, response) => {
      void middleware(request, response, () => {
        response.writeHead(404);
        response.end();
      });
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      const text = await (await fetch(`${base}/api/ai/status`)).text();
      assert.ok(!text.includes('super-secret-key'));
    } finally {
      server.close();
    }
  });
});
