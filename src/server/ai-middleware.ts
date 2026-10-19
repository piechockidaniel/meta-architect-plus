import type { IncomingMessage, ServerResponse } from 'node:http';
import { assist, aiAvailability } from './ai-service.js';
import type { AiConfig } from './ai-service.js';
import { resolveAiConfig, resolveAllowedOrigins } from './ai-config.js';

export interface AiMiddlewareOptions {
  /** Re-evaluated on every request so `npm run ai:setup` takes effect without a server restart. */
  getConfig?: () => AiConfig;
  getAllowedOrigins?: () => string[];
}

export function aiMiddleware(options: AiMiddlewareOptions = {}) {
  const getConfig = options.getConfig ?? (() => resolveAiConfig());
  const getAllowedOrigins = options.getAllowedOrigins ?? (() => resolveAllowedOrigins());
  let calls = 0, busy = false;
  return async (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    const path = request.url?.split('?')[0];
    if (path !== '/api/ai/status' && path !== '/api/ai/assist') { next(); return; }
    const config = getConfig();
    const send = (status: number, body: unknown) => { response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); response.end(JSON.stringify(body)); };
    if (request.method === 'GET' && path === '/api/ai/status') { send(200, { ...aiAvailability(config), remainingRequests: Math.max(0, config.maxCalls - calls) }); return; }
    if (request.method !== 'POST' || path !== '/api/ai/assist') { send(405, { error: 'Method not allowed.' }); return; }
    // Reject cross-origin browser requests; hosts are administrator-owned configuration, never request-controlled provider endpoints.
    const origin = request.headers.origin;
    const allowedOrigins = getAllowedOrigins();
    if (!origin || !allowedOrigins.includes(origin)) { send(403, { error: 'Origin is not permitted for AI requests.' }); return; }
    if (!aiAvailability(config).available) { send(503, { error: aiAvailability(config).reason }); return; }
    if (busy || calls >= config.maxCalls) { send(429, { error: 'AI request allowance exhausted or another request is running.' }); return; }
    if (!request.headers['content-type']?.startsWith('application/json')) { send(415, { error: 'JSON is required.' }); return; }
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 30_000);
    const disconnected = () => { if (!response.writableEnded) controller.abort(); };
    response.on('close', disconnected);
    busy = true;
    try {
      let body = '';
      for await (const chunk of request) { body += chunk.toString(); if (Buffer.byteLength(body) > 30_000) { send(413, { error: 'Request too large.' }); return; } }
      const parsed = JSON.parse(body);
      calls++;
      const result = await assist(config, parsed, controller.signal); send(200, result);
    } catch { send(502, { error: 'AI request failed or returned invalid data. Confirmed project inputs were not changed.' }); }
    finally { clearTimeout(timeout); response.off('close', disconnected); busy = false; }
  };
}
