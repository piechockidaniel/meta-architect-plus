/**
 * Export inbox: a hands-only retrieval route for decision artifacts.
 *
 * The headset posts the frozen bundle here and receives a short code; the
 * user opens /exports/<code> on any device (phone, desktop, the Quest browser
 * after leaving immersive mode) to read or download the Markdown, SVG
 * diagrams and JSON. Entries live in memory only, expire after 24 hours and
 * are private to whoever holds the code. This is a development/judging
 * convenience, not a sharing or publishing service.
 */
import { randomBytes } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

export interface StoredExport {
  code: string;
  createdAt: number;
  expiresAt: number;
  markdown: string;
  diagrams: Record<string, string>;
  bundle: string;
  version: number;
  title: string;
}

export interface ExportInboxOptions {
  ttlMs?: number;
  maxEntries?: number;
  maxBodyBytes?: number;
  allowedOrigins?: string[];
  now?: () => number;
}

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateCode(bytes: Buffer = randomBytes(8)): string {
  let code = '';
  for (let index = 0; index < 8; index++) {
    code += CODE_ALPHABET[bytes[index] % CODE_ALPHABET.length];
    if (index === 3) code += '-';
  }
  return code;
}

const escapeHtml = (text: string): string =>
  text.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[c]!);

export function validateBundle(raw: unknown): { markdown: string; diagrams: Record<string, string>; version: number; title: string } {
  if (!raw || typeof raw !== 'object') throw new Error('Bundle must be an object.');
  const data = raw as Record<string, unknown>;
  if (data.schema !== 'architecture-decision-bundle.v2') throw new Error('Unsupported bundle schema.');
  if (typeof data.markdown !== 'string' || data.markdown.length === 0) throw new Error('Bundle is missing Markdown.');
  if (!data.diagrams || typeof data.diagrams !== 'object') throw new Error('Bundle is missing diagrams.');
  const diagrams: Record<string, string> = {};
  for (const [key, value] of Object.entries(data.diagrams as Record<string, unknown>)) {
    if (!/^[a-z-]{1,20}$/.test(key) || typeof value !== 'string' || !value.startsWith('<svg')) throw new Error('Invalid diagram.');
    diagrams[key] = value;
  }
  const snapshot = data.snapshot as Record<string, unknown> | undefined;
  const version = typeof snapshot?.version === 'number' ? snapshot.version : 0;
  const context = data.context as Record<string, unknown> | undefined;
  const title = typeof context?.title === 'string' ? context.title.slice(0, 160) : 'Architecture decision';
  return { markdown: data.markdown, diagrams, version, title };
}

export class ExportInbox {
  private entries = new Map<string, StoredExport>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly now: () => number;

  constructor(options: ExportInboxOptions = {}) {
    this.ttlMs = options.ttlMs ?? 24 * 60 * 60 * 1000;
    this.maxEntries = options.maxEntries ?? 50;
    this.now = options.now ?? Date.now;
  }

  store(raw: unknown, bundleText: string): StoredExport {
    const validated = validateBundle(raw);
    this.evict();
    if (this.entries.size >= this.maxEntries) {
      const oldest = [...this.entries.values()].sort((a, b) => a.createdAt - b.createdAt)[0];
      if (oldest) this.entries.delete(oldest.code);
    }
    let code = generateCode();
    while (this.entries.has(code)) code = generateCode();
    const createdAt = this.now();
    const entry: StoredExport = { code, createdAt, expiresAt: createdAt + this.ttlMs, bundle: bundleText, ...validated };
    this.entries.set(code, entry);
    return entry;
  }

  get(code: string): StoredExport | undefined {
    this.evict();
    return this.entries.get(code.toUpperCase());
  }

  remove(code: string): boolean {
    return this.entries.delete(code.toUpperCase());
  }

  private evict(): void {
    const now = this.now();
    for (const [code, entry] of this.entries) if (entry.expiresAt <= now) this.entries.delete(code);
  }
}

function readBody(request: IncomingMessage, limit: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('Request body too large.'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

export function retrievalPage(entry: StoredExport): string {
  const title = escapeHtml(entry.title);
  const files = [
    ['decision.md', 'Markdown decision record'],
    ...Object.keys(entry.diagrams).map((key) => [`${key}.svg`, `${key} diagram (SVG)`]),
    ['bundle.json', 'JSON bundle (restorable backup)'],
  ];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} - decision v${entry.version}</title>
<style>body{font:15px/1.5 system-ui,sans-serif;margin:0;padding:24px;background:#f3f4f6;color:#1f2937}main{max-width:920px;margin:auto}h1{font-size:22px}ul{padding-left:20px}a{color:#1d4ed8}pre{white-space:pre-wrap;background:#fff;border:1px solid #d1d5db;border-radius:8px;padding:16px;overflow:auto}svg{max-width:100%;height:auto;border-radius:8px}section{margin-top:24px}.note{color:#4b5563;font-size:13px}</style></head>
<body><main><h1>${title} - decision v${entry.version}</h1>
<p class="note">Retrieval code ${entry.code}. Expires ${new Date(entry.expiresAt).toISOString()}. Private to whoever holds this code; nothing is published.</p>
<ul>${files.map(([name, label]) => `<li><a href="/api/exports/${entry.code}/${name}" download="${name}">${escapeHtml(label)}</a></li>`).join('')}</ul>
${Object.entries(entry.diagrams).map(([key, svg]) => `<section><h2>${escapeHtml(key)}</h2>${svg}</section>`).join('')}
<section><h2>Decision record</h2><pre>${escapeHtml(entry.markdown)}</pre></section>
</main></body></html>`;
}

export function exportMiddleware(inbox = new ExportInbox(), options: ExportInboxOptions = {}) {
  const maxBodyBytes = options.maxBodyBytes ?? 2_000_000;
  const allowedOrigins =
    options.allowedOrigins ?? (process.env.AI_ALLOWED_ORIGINS || 'https://localhost:8081,https://127.0.0.1:8081').split(',');
  return async (request: IncomingMessage, response: ServerResponse, next: () => void): Promise<void> => {
    const path = request.url?.split('?')[0] ?? '';
    const send = (status: number, body: string, type: string, extra: Record<string, string> = {}) => {
      response.writeHead(status, {
        'Content-Type': type,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; img-src data:; style-src 'unsafe-inline'",
        ...extra,
      });
      response.end(body);
    };
    const json = (status: number, body: unknown) => send(status, JSON.stringify(body), 'application/json');

    if (path === '/api/exports' && request.method === 'POST') {
      const origin = request.headers.origin;
      // Vite's HTTPS server uses HTTP/2 in Chrome/Quest Browser, where the
      // target host is carried in :authority instead of the HTTP/1 Host header.
      const authority = request.headers.host ?? request.headers[':authority'];
      let sameHost = false;
      try {
        sameHost = typeof authority === 'string' && typeof origin === 'string' && new URL(origin).host === authority;
      } catch { /* Opaque or malformed origins are rejected below. */ }
      // Keep configured origins and the existing same-host LAN policy.
      if (origin && !allowedOrigins.includes(origin) && !sameHost) {
        json(403, { error: 'Cross-origin export requests are not accepted.' });
        return;
      }
      try {
        const body = await readBody(request, maxBodyBytes);
        const entry = inbox.store(JSON.parse(body), body);
        json(201, { code: entry.code, path: `/exports/${entry.code}`, expiresAt: new Date(entry.expiresAt).toISOString() });
      } catch (error) {
        json(400, { error: error instanceof Error ? error.message : 'Invalid export.' });
      }
      return;
    }

    const page = /^\/exports\/([A-Za-z0-9-]{9})\/?$/.exec(path);
    if (page && request.method === 'GET') {
      const entry = inbox.get(page[1]);
      if (!entry) {
        send(404, '<!doctype html><meta charset="utf-8"><p>Export not found or expired.</p>', 'text/html; charset=utf-8');
        return;
      }
      send(200, retrievalPage(entry), 'text/html; charset=utf-8');
      return;
    }

    const single = /^\/api\/exports\/([A-Za-z0-9-]{9})\/?$/.exec(path);
    if (single && request.method === 'DELETE') {
      const deleted = inbox.remove(single[1]);
      json(deleted ? 200 : 404, { deleted, code: single[1].toUpperCase() });
      return;
    }

    const file = /^\/api\/exports\/([A-Za-z0-9-]{9})\/([a-z-]+\.(md|svg|json))$/.exec(path);
    if (file && request.method === 'GET') {
      const entry = inbox.get(file[1]);
      if (!entry) {
        json(404, { error: 'Export not found or expired.' });
        return;
      }
      const name = file[2];
      const disposition = { 'Content-Disposition': `attachment; filename="${name}"` };
      if (name === 'decision.md') send(200, entry.markdown, 'text/markdown; charset=utf-8', disposition);
      else if (name === 'bundle.json') send(200, entry.bundle, 'application/json', disposition);
      else {
        const svg = entry.diagrams[name.replace(/\.svg$/, '')];
        if (svg === undefined) json(404, { error: 'Unknown diagram.' });
        else send(200, svg, 'image/svg+xml', disposition);
      }
      return;
    }

    if (path.startsWith('/api/exports') || path.startsWith('/exports/')) {
      json(405, { error: 'Method not allowed.' });
      return;
    }
    next();
  };
}
