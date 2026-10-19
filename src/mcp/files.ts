import { readdir, readFile, realpath, lstat, open, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { rename, unlink, link } from 'node:fs/promises';
import { redact, sha256, within } from './security.js';

const blockedDirectories = new Set(['.git', 'node_modules', '.local', '.iwsdk', '.codex', '.cursor', '.vscode', '.agents', 'coverage', '.tmp', '.temp', 'dist']);
const textExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.md', '.txt', '.html', '.css', '.uikitml', '.yaml', '.yml', '.toml', '.svg', '.webmanifest']);
export function readableName(relative: string): boolean {
  const parts = relative.replaceAll('\\', '/').toLowerCase().split('/');
  return !parts.some(part => blockedDirectories.has(part) || part.startsWith('.env') || part === '.mcp.json' ||
    /(?:^|[._-])(?:secret|credential|token|password)s?(?:[._-]|$)/i.test(part) || /\.local\./i.test(part) ||
    /\.(?:pem|key|pfx|p12|keystore|log|jsonl|db|sqlite|bak)$/i.test(part));
}

export class ProjectFiles {
  private locks = new Set<string>();
  constructor(readonly root: string, private readonly deniedPaths: string[] = []) {}
  private assertAllowed(relative: string): void {
    if (path.isAbsolute(relative) || /[:\0]/.test(relative) || !readableName(relative)) throw new Error('Path is not available through project tools.');
  }
  async resolve(relative: string, create = false): Promise<string> {
    this.assertAllowed(relative);
    const target = path.resolve(this.root, relative);
    if (!within(this.root, target) || this.deniedPaths.some(p => path.resolve(p).toLowerCase() === target.toLowerCase())) throw new Error('Path is outside the available project files.');
    // Do not follow symlinks, including internal ones: stable confinement across platforms.
    let cursor = this.root;
    const segments = path.relative(this.root, target).split(path.sep).filter(Boolean);
    for (let i = 0; i < segments.length; i++) {
      cursor = path.join(cursor, segments[i]);
      const info = await lstat(cursor).catch(error => {
        if (create && i === segments.length - 1 && error.code === 'ENOENT') return null;
        throw error;
      });
      if (info?.isSymbolicLink()) throw new Error('Symbolic links are not available through project tools.');
    }
    const existing = create ? path.dirname(target) : target;
    if (!within(this.root, await realpath(existing))) throw new Error('Resolved path escapes the project.');
    return target;
  }
  async read(relative: string, startLine = 1, lineCount = 200) {
    const target = await this.resolve(relative);
    if (!textExtensions.has(path.extname(target).toLowerCase())) throw new Error('Only text source and documentation files are available.');
    const handle = await open(target, 'r');
    let buffer: Buffer;
    try {
      if ((await handle.stat()).size > 1_000_000) throw new Error('File exceeds the 1 MB read limit.');
      buffer = await handle.readFile();
    } finally { await handle.close(); }
    if (buffer.includes(0)) throw new Error('Binary files are unavailable.');
    const original = buffer.toString('utf8');
    const content = redact(original);
    const lines = content.split(/\r?\n/);
    const selected = lines.slice(startLine - 1, startLine - 1 + lineCount).join('\n');
    return { path: relative, sha256: sha256(buffer), totalLines: lines.length, startLine, content: selected.slice(0, 65_536), truncated: selected.length > 65_536, redacted: content !== original };
  }
  async list(relative = '.', limit = 300) {
    const directory = await this.resolve(relative);
    const files: string[] = [];
    let visited = 0;
    let truncated = false;
    const walk = async (dir: string): Promise<void> => {
      const entries = await readdir(dir, { withFileTypes: true });
      entries.sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        if (++visited > 10_000 || files.length >= limit) { truncated = true; return; }
        const full = path.join(dir, entry.name);
        const rel = path.relative(this.root, full).replaceAll('\\', '/');
        if (!readableName(rel) || entry.isSymbolicLink() || this.deniedPaths.some(p => path.resolve(p).toLowerCase() === full.toLowerCase())) continue;
        if (entry.isDirectory()) await walk(full);
        else if (entry.isFile() && textExtensions.has(path.extname(full).toLowerCase())) files.push(rel);
        if (truncated) return;
      }
    };
    await walk(directory);
    return { files, truncated };
  }
  async search(query: string, relative = '.', limit = 50) {
    const listing = await this.list(relative, 2_000);
    const matches: { path: string; line: number; text: string }[] = [];
    for (const file of listing.files) {
      let item;
      try { item = await this.read(file, 1, 100_000); } catch { continue; }
      for (const [index, line] of item.content.split('\n').entries()) {
        if (line.toLowerCase().includes(query.toLowerCase())) matches.push({ path: file, line: index + 1, text: line.slice(0, 500) });
        if (matches.length >= limit) return { matches, truncated: true };
      }
    }
    return { matches, truncated: listing.truncated };
  }
  async write(relative: string, expectedSha256: string | null, content: string) {
    if (!textExtensions.has(path.extname(relative).toLowerCase()) || Buffer.byteLength(content) > 200_000 || content.includes('\0')) throw new Error('Write requires a text source file at most 200 KB.');
    const target = await this.resolve(relative, true);
    if (this.locks.has(target)) throw new Error('Another write is in progress for this file.');
    this.locks.add(target);
    const temp = path.join(path.dirname(target), `.${path.basename(target)}.${randomUUID()}.tmp`);
    try {
      const current = await readFile(target).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      if ((current ? sha256(current) : null) !== expectedSha256) throw new Error('File changed or already exists. Read it again and supply its current SHA-256.');
      if (current && redact(current.toString('utf8')) !== current.toString('utf8')) throw new Error('A redacted file cannot be edited through MCP.');
      await mkdir(path.dirname(temp), { recursive: true });
      const handle = await open(temp, 'wx', 0o600);
      try { await handle.writeFile(content); } finally { await handle.close(); }
      // Recheck after preparing the replacement; never knowingly overwrite concurrent edits.
      const latest = await readFile(target).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      if ((latest ? sha256(latest) : null) !== expectedSha256) throw new Error('File changed while preparing the replacement.');
      await this.resolve(relative, true);
      if (current === null) await link(temp, target); // Atomic no-clobber create.
      else await rename(temp, target);
      return { path: relative, sha256: sha256(content), bytes: Buffer.byteLength(content), created: current === null };
    } finally {
      this.locks.delete(target);
      await unlink(temp).catch(() => undefined);
    }
  }
}
