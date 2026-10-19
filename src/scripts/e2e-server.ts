/** Loopback-only HTTP fixture server for production-pointer tests. No AI routes. */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { exportMiddleware } from '../server/export-middleware.js';
const directory = path.resolve('.local/e2e-build');
const types: Record<string, string> = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.uikitml': 'text/plain' };
const middleware = exportMiddleware();
const server = createServer((request, response) => {
  if (request.url === '/favicon.ico') { response.writeHead(204).end(); return; }
  if (request.url === '/api/ai/status') {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ available: false, reason: 'AI is disabled in the isolated test server.' })); return;
  }
  void middleware(request, response, () => {
    void (async () => {
      try {
        const url = new URL(request.url ?? '/', 'http://127.0.0.1:4173');
        const file = path.resolve(directory, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
        if (!file.startsWith(directory + path.sep)) { response.writeHead(403).end(); return; }
        const body = await readFile(file);
        response.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' }); response.end(body);
      } catch { response.writeHead(404).end(); }
    })();
  });
});
server.listen(4173, '127.0.0.1', () => console.log('http://127.0.0.1:4173/'));
