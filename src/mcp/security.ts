import { createHash } from 'node:crypto';
import { appendFile, mkdir, readFile, rename, stat } from 'node:fs/promises';
import path from 'node:path';

export function sha256(value: string | Buffer): string { return createHash('sha256').update(value).digest('hex'); }
const referencedSecrets = new Set<string>();
export function rememberSecret(value: string | undefined): void {
  if (typeof value === 'string' && value.length >= 4) referencedSecrets.add(value);
}
export function redact(value: string): string {
  let result = value;
  for (const secret of referencedSecrets) result = result.split(secret).join('[REDACTED]');
  // Also covers credentials deliberately passed to subprocesses through environment references.
  for (const [name, secret] of Object.entries(process.env)) {
    if (secret && secret.length >= 8 && /key|secret|token|password|credential/i.test(name)) result = result.split(secret).join('[REDACTED]');
  }
  return result
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g, '[REDACTED PRIVATE KEY]')
    .replace(/\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+\/-]+=*/gi, '[REDACTED AUTH]')
    .replace(/\b(?:sk|ghp|github_pat|glpat)[-_][A-Za-z0-9_-]{12,}/g, '[REDACTED TOKEN]')
    .replace(/((?:api[_-]?key|password|access[_-]?token|secret)\s*["']?\s*[:=]\s*["']?)[^\s"',;}]+/gi, '$1[REDACTED]');
}

export class AuditLog {
  private queue: Promise<void> = Promise.resolve();
  constructor(readonly file: string) {}
  async write(event: { action: string; appId?: string; target?: string; outcome: string; jobId?: string }): Promise<void> {
    const write = this.queue.catch(() => undefined).then(async () => {
      await mkdir(path.dirname(this.file), { recursive: true });
      const size = await stat(this.file).then(s => s.size).catch(() => 0);
      if (size >= 5_000_000) await rename(this.file, this.file + '.previous');
      await appendFile(this.file, JSON.stringify({ at: new Date().toISOString(), ...event }) + '\n', { mode: 0o600 });
    });
    this.queue = write;
    await write;
  }
  async tail(limit: number): Promise<unknown[]> {
    await this.queue;
    const body = await readFile(this.file, 'utf8').catch(() => '');
    return body.trim().split('\n').filter(Boolean).slice(-limit).map(line => {
      const row = JSON.parse(line);
      return { at: row.at, action: row.action, appId: row.appId, target: row.target, outcome: row.outcome, jobId: row.jobId };
    });
  }
}

export function within(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep));
}

export function boundedJson(value: unknown, maxBytes = 65_536): void {
  if (Buffer.byteLength(JSON.stringify(value)) > maxBytes) throw new Error(`Payload exceeds ${maxBytes} bytes.`);
}
