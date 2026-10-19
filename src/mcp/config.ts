import { readFile, realpath } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { rememberSecret } from './security.js';

const id = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/);
export const effectSchema = z.enum(['read', 'local-write', 'remote-write']);
export type Effect = z.infer<typeof effectSchema>;
const envRefs = z.record(z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/), z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/)).default({});
const timeout = z.number().int().min(100).max(300_000).default(30_000);
const httpUrl = z.string().url().refine(value => {
  const url = new URL(value);
  return !url.username && !url.password && !url.search && !url.hash &&
    (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)));
}, 'Use HTTPS, or loopback HTTP, without embedded credentials, query or fragment.');
const taskSchema = z.object({
  description: z.string().min(1), command: z.string().min(1), args: z.array(z.string()).default([]),
  effect: effectSchema, timeoutMs: timeout, env: envRefs,
  exclusiveGroup: id.default('workspace'),
}).strict();
const operationSchema = z.object({
  description: z.string().min(1), method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  path: z.string().startsWith('/').refine(value => !value.startsWith('//') && !value.includes('\\'), 'Use a path within the configured origin.').default('/'), effect: effectSchema,
}).strict().refine(op => (op.method === 'GET') === (op.effect === 'read'), 'GET must be read; other methods must declare a write effect.');
const upstreamBase = {
  description: z.string().min(1), timeoutMs: timeout,
  tools: z.record(id, z.object({ effect: effectSchema }).strict()).default({}),
  resources: z.array(z.string().min(1)).default([]),
};
const upstreamSchema = z.discriminatedUnion('transport', [
  z.object({ ...upstreamBase, transport: z.literal('stdio'), command: z.string().min(1), args: z.array(z.string()).default([]), cwd: z.string().optional(), env: envRefs }).strict(),
  z.object({ ...upstreamBase, transport: z.literal('http'), url: httpUrl, headersEnv: z.record(z.string(), z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/)).default({}) }).strict(),
]);
export const configSchema = z.object({
  version: z.literal(1), auditFile: z.string().default('../.local/mcp/audit.jsonl'),
  apps: z.record(id, z.object({
    label: z.string().min(1), root: z.string().min(1), allowFileWrites: z.boolean().default(false),
    tasks: z.record(id, taskSchema).default({}),
    endpoints: z.record(id, z.object({
      description: z.string().min(1), url: httpUrl, timeoutMs: timeout,
      headersEnv: z.record(z.string(), z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/)).default({}),
      operations: z.record(id, operationSchema),
    }).strict()).default({}),
    upstreams: z.record(id, upstreamSchema).default({}),
  }).strict()).refine(apps => Object.keys(apps).length > 0, 'Register at least one app.'),
}).strict();

export type AppConfig = z.infer<typeof configSchema>['apps'][string];
export type TaskConfig = AppConfig['tasks'][string];
export type UpstreamConfig = AppConfig['upstreams'][string];
export type ToolsetConfig = z.infer<typeof configSchema> & { configFile: string };

export function configArgument(args: string[]): string {
  if (args.length === 0) {
    const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../config');
    const local = path.join(directory, 'mcp.local.json');
    return existsSync(local) ? local : path.join(directory, 'mcp.example.json');
  }
  if (args.length === 2 && args[0] === '--config') return path.resolve(args[1]);
  throw new Error('Usage: node --import tsx mcp/cli.ts [--config <file>]');
}

export async function loadConfig(file: string): Promise<ToolsetConfig> {
  const configFile = await realpath(file);
  const config = configSchema.parse(JSON.parse(await readFile(configFile, 'utf8')));
  for (const app of Object.values(config.apps)) {
    app.root = await realpath(path.resolve(path.dirname(configFile), app.root));
    for (const upstream of Object.values(app.upstreams)) {
      if (upstream.transport === 'stdio') upstream.cwd = path.resolve(app.root, upstream.cwd ?? '.');
    }
  }
  return { ...config, configFile, auditFile: path.resolve(path.dirname(configFile), config.auditFile) };
}

/** Values are supplied by the host, never by tool arguments or committed config. */
export function resolveEnv(refs: Record<string, string>, env: NodeJS.ProcessEnv = process.env): Record<string, string> {
  return Object.fromEntries(Object.entries(refs).map(([name, ref]) => {
    const value = env[ref];
    if (!value) throw new Error(`Missing environment variable: ${ref}`);
    rememberSecret(value);
    return [name, value];
  }));
}

export function baseEnvironment(): Record<string, string> {
  const names = ['PATH', 'Path', 'PATHEXT', 'SystemRoot', 'SYSTEMROOT', 'COMSPEC', 'TEMP', 'TMP', 'HOME', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA'];
  return Object.fromEntries(names.flatMap(name => process.env[name] ? [[name, process.env[name]!]] : []));
}
