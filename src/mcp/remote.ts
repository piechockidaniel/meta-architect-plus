import { randomUUID } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { type AppConfig, type UpstreamConfig, type Effect, baseEnvironment, resolveEnv } from './config.js';
import { boundedJson, sha256 } from './security.js';
import { executable } from './jobs.js';

export class OperationError extends Error {
  constructor(message: string, readonly outcome: 'not_executed' | 'failed' | 'outcome_unknown') { super(message); }
}

async function bodyText(response: Response, maxBytes = 131_072): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return Buffer.concat(chunks).toString('utf8');
      bytes += value.length;
      if (bytes > maxBytes) throw new Error('Remote response exceeds the 128 KB limit.');
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => undefined); }
}

export async function httpOperation(app: AppConfig, endpointId: string, operationId: string, body?: unknown, signal?: AbortSignal) {
  const endpoint = app.endpoints[endpointId];
  const operation = endpoint?.operations[operationId];
  if (!operation) throw new OperationError('Unknown configured HTTP operation.', 'not_executed');
  const url = new URL(operation.path, endpoint.url);
  if (url.origin !== new URL(endpoint.url).origin || url.username || url.password) throw new OperationError('Operation URL escapes the configured origin.', 'not_executed');
  if (operation.method === 'GET' && body !== undefined) throw new OperationError('GET does not accept a request body.', 'not_executed');
  boundedJson(body ?? null);
  const headers = { ...resolveEnv(endpoint.headersEnv), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) };
  let dispatched = false;
  try {
    signal?.throwIfAborted();
    dispatched = true;
    const response = await fetch(url, {
      method: operation.method, headers, body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'error', signal: AbortSignal.any([AbortSignal.timeout(endpoint.timeoutMs), ...(signal ? [signal] : [])]),
    });
    const text = await bodyText(response);
    let result: unknown = text;
    if (response.headers.get('content-type')?.includes('application/json')) { try { result = JSON.parse(text); } catch { /* retain text */ } }
    return { endpointId, operationId, status: response.status, ok: response.ok, outcome: response.ok ? 'completed' : operation.effect === 'read' ? 'failed' : 'outcome_unknown', untrusted: true, body: result };
  } catch (error) {
    throw new OperationError(error instanceof Error ? error.message : 'HTTP operation failed.', !dispatched ? 'not_executed' : operation.effect !== 'read' ? 'outcome_unknown' : 'failed');
  }
}

async function upstreamClient<T>(upstream: UpstreamConfig, action: (client: Client, signal: AbortSignal) => Promise<T>, callerSignal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const signal = AbortSignal.any([controller.signal, ...(callerSignal ? [callerSignal] : [])]);
  const client = new Client({ name: 'architecture-app-manager', version: '0.1.0' });
  const transport = upstream.transport === 'stdio'
    ? new StdioClientTransport({ ...executable(upstream.command, upstream.args), cwd: upstream.cwd, env: { ...baseEnvironment(), ...resolveEnv(upstream.env) }, stderr: 'pipe', maxBufferSize: 1_000_000 })
    : new StreamableHTTPClientTransport(new URL(upstream.url), {
      requestInit: { headers: resolveEnv(upstream.headersEnv), redirect: 'error' },
      // No transport retries for administrative calls.
      reconnectionOptions: { maxRetries: 0, initialReconnectionDelay: 1_000, maxReconnectionDelay: 1_000, reconnectionDelayGrowFactor: 1 },
      fetch: (url, init) => fetch(url, { ...init, redirect: 'error', signal: AbortSignal.any([signal, ...(init?.signal ? [init.signal] : [])]) }),
    });
  if (transport instanceof StdioClientTransport) transport.stderr?.on('data', () => { /* drain; never forward arbitrary upstream logs */ });
  let timer: NodeJS.Timeout | undefined;
  let abortListener: (() => void) | undefined;
  try {
    const abort = new Promise<never>((_, reject) => {
      abortListener = () => reject(new Error('Upstream request cancelled or timed out.'));
      signal.addEventListener('abort', abortListener, { once: true });
      timer = setTimeout(() => controller.abort(), upstream.timeoutMs);
      if (signal.aborted) abortListener();
    });
    const work = (async () => { signal.throwIfAborted(); await client.connect(transport); signal.throwIfAborted(); return action(client, signal); })();
    const result = await Promise.race([work, abort]);
    boundedJson(result, 131_072);
    return result;
  } finally {
    if (timer) clearTimeout(timer);
    if (abortListener) signal.removeEventListener('abort', abortListener);
    controller.abort();
    await client.close().catch(() => undefined);
    await transport.close().catch(() => undefined);
  }
}

export async function discoverUpstream(upstream: UpstreamConfig, signal?: AbortSignal) {
  return upstreamClient(upstream, async (client, deadline) => {
    const tools: (Tool & { configuredEffect: Effect })[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 20; page++) {
      const result = await client.listTools(cursor ? { cursor } : {}, { signal: deadline });
      tools.push(...result.tools.filter(tool => Object.hasOwn(upstream.tools, tool.name)).map(tool => ({ ...tool, configuredEffect: upstream.tools[tool.name].effect })));
      cursor = result.nextCursor;
      if (!cursor) break;
    }
    return { tools, missingTools: cursor ? null : Object.keys(upstream.tools).filter(name => !tools.some(tool => tool.name === name)), morePages: !!cursor, permittedResources: upstream.resources, untrusted: true };
  }, signal);
}

export async function callUpstream(upstream: UpstreamConfig, toolName: string, args: Record<string, unknown>, signal?: AbortSignal) {
  if (!Object.hasOwn(upstream.tools, toolName)) throw new OperationError('Tool is not in this upstream allowlist.', 'not_executed');
  boundedJson(args);
  let dispatched = false;
  try {
    return await upstreamClient(upstream, async (client, deadline) => {
      deadline.throwIfAborted();
      dispatched = true;
      const result = await client.callTool({ name: toolName, arguments: args }, undefined, { signal: deadline, timeout: upstream.timeoutMs });
      // An error response from a mutating tool can follow a partial side effect.
      return { toolName, untrusted: true, outcome: result.isError ? upstream.tools[toolName].effect === 'read' ? 'failed' : 'outcome_unknown' : 'completed', result };
    }, signal);
  } catch (error) {
    throw new OperationError(error instanceof Error ? error.message : 'Upstream call failed.', !dispatched ? 'not_executed' : upstream.tools[toolName].effect !== 'read' ? 'outcome_unknown' : 'failed');
  }
}

export async function readUpstreamResource(upstream: UpstreamConfig, uri: string, signal?: AbortSignal) {
  if (!upstream.resources.includes(uri)) throw new OperationError('Resource is not in this upstream allowlist.', 'not_executed');
  return upstreamClient(upstream, (client, deadline) => client.readResource({ uri }, { signal: deadline }), signal);
}

export type RemoteAction =
  | { kind: 'http'; appId: string; endpointId: string; operationId: string; body?: unknown }
  | { kind: 'task'; appId: string; taskId: string }
  | { kind: 'mcp'; appId: string; upstreamId: string; toolName: string; arguments: Record<string, unknown> };

/** A reviewable, one-use write request. Tokens are process-local and expire after five minutes. */
export class Plans {
  private plans = new Map<string, { action: RemoteAction; expiresAt: number; digest: string }>();
  prepare(action: RemoteAction, effect: Effect) {
    if (effect === 'read') throw new Error('Read operations run directly; no plan is needed.');
    boundedJson(action);
    for (const [id, plan] of this.plans) if (plan.expiresAt < Date.now()) this.plans.delete(id);
    if (this.plans.size >= 100) throw new Error('Too many pending plans.');
    const id = randomUUID();
    const digest = sha256(JSON.stringify(action));
    const expiresAt = Date.now() + 300_000;
    this.plans.set(id, { action: structuredClone(action), expiresAt, digest });
    return { planId: id, digest, expiresAt: new Date(expiresAt).toISOString(), effect, action, next: 'Review the exact target and arguments, then call remote_apply with planId and digest. This is not an authorization mechanism; the MCP host controls access.' };
  }
  take(id: string, digest: string): RemoteAction {
    const plan = this.plans.get(id);
    if (!plan || plan.expiresAt < Date.now()) { this.plans.delete(id); throw new Error('Plan is missing, expired or already consumed.'); }
    if (plan.digest !== digest) throw new Error('Plan digest does not match.');
    this.plans.delete(id);
    return plan.action;
  }
}
