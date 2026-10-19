/**
 * Production/alpha server: serves the built `dist/` over HTTP or HTTPS with the
 * export inbox and optional AI middleware, so a hosted origin offers the same
 * features as `npm run dev`. Run after `npm run build`:
 *
 *   PORT=8081 npx tsx server/serve.ts
 *   SSL_CERT=cert.pem SSL_KEY=key.pem npx tsx server/serve.ts   # HTTPS
 *
 * Static hosts (Vercel, Pages) can serve `dist/` alone; the app then reports the
 * export inbox as unavailable and falls back to browser downloads.
 */
import { createServer as createHttpServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { aiMiddleware } from './ai-middleware.js';
import { exportMiddleware } from './export-middleware.js';

const root = path.resolve(process.env.DIST_DIR ?? 'dist');
const port = Number(process.env.PORT ?? 8081);
const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.uikitml': 'text/plain; charset=utf-8',
  '.gltf': 'model/gltf+json',
  '.glb': 'model/gltf-binary',
  '.bin': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

const exportsApi = exportMiddleware();
const aiApi = aiMiddleware();

async function serveStatic(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url ?? '/', 'http://localhost');
  let relative = decodeURIComponent(url.pathname);
  if (relative.endsWith('/')) relative += 'index.html';
  const file = path.normalize(path.join(root, relative));
  if (!file.startsWith(root)) {
    response.writeHead(403);
    response.end();
    return;
  }
  let target = file;
  try {
    const info = await stat(target);
    if (info.isDirectory()) target = path.join(target, 'index.html');
  } catch {
    // SPA fallback only for navigations; assets that are missing stay 404.
    if (path.extname(relative) !== '') {
      response.writeHead(404);
      response.end();
      return;
    }
    target = path.join(root, 'index.html');
  }
  try {
    const body = await readFile(target);
    const type = types[path.extname(target)] ?? 'application/octet-stream';
    const immutable = /\/assets\/.+-[A-Za-z0-9_-]{8,}\./.test(target);
    response.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Permissions-Policy': 'xr-spatial-tracking=(self)',
    });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end();
  }
}

function handler(request: IncomingMessage, response: ServerResponse): void {
  void exportsApi(request, response, () => {
    void aiApi(request, response, () => {
      void serveStatic(request, response);
    });
  });
}

async function start(): Promise<void> {
  try {
    await stat(path.join(root, 'index.html'));
  } catch {
    console.error(`No build found at ${root}. Run "npm run build" first.`);
    process.exit(1);
  }
  const { SSL_CERT, SSL_KEY } = process.env;
  const server =
    SSL_CERT && SSL_KEY
      ? createHttpsServer({ cert: await readFile(SSL_CERT), key: await readFile(SSL_KEY) }, handler)
      : createHttpServer(handler);
  server.listen(port, () => {
    console.log(`Architecture decision workspace serving ${root} on ${SSL_CERT && SSL_KEY ? 'https' : 'http'}://0.0.0.0:${port}`);
    console.log('Export inbox: enabled (in-memory, 24 h). AI: ' + (process.env.AI_ENABLED === 'true' ? 'configured' : 'disabled'));
  });
}

void start();
