/**
 * AI configuration source of truth: a local, gitignored JSON file written by
 * `npm run ai:setup` (see scripts/ai-setup.mjs), falling back to environment
 * variables for hosted deployments where a wizard cannot write to disk.
 *
 * The file never leaves the server process: it is read here, in server code,
 * and only the already-validated `aiAvailability()` reason/boolean is ever
 * sent to the browser (see ai-middleware.ts). The API key itself is never
 * part of any HTTP response.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { configFromEnvironment } from './ai-service.js';
import type { AiConfig } from './ai-service.js';

export const AI_LOCAL_CONFIG_PATH = path.resolve(process.cwd(), 'config', 'ai.local.json');
const DEFAULT_ALLOWED_ORIGINS = 'https://localhost:8081,https://127.0.0.1:8081';

export interface StoredAiConfig {
  enabled?: boolean;
  provider?: string;
  model?: string;
  apiKey?: string;
  baseURL?: string;
  maxCalls?: number;
  allowedOrigins?: string[];
  /** Informational only; not used to authorize anything. */
  configuredAt?: string;
}

/** Returns null for "no file" or "unreadable"; callers fall back to environment variables either way. */
export function readLocalAiConfig(filePath: string = AI_LOCAL_CONFIG_PATH): StoredAiConfig | null {
  if (!existsSync(filePath)) return null;
  try {
    const raw: unknown = JSON.parse(readFileSync(filePath, 'utf8'));
    return raw && typeof raw === 'object' ? (raw as StoredAiConfig) : null;
  } catch {
    return null;
  }
}

/**
 * The local file (wizard output) is authoritative when present; environment
 * variables remain the path for hosted deployments. Re-read on every call
 * (cheap: one small local file) so re-running the wizard takes effect without
 * restarting the dev server.
 */
export function resolveAiConfig(env: NodeJS.ProcessEnv = process.env, filePath: string = AI_LOCAL_CONFIG_PATH): AiConfig {
  const fromEnv = configFromEnvironment(env);
  const file = readLocalAiConfig(filePath);
  if (!file) return fromEnv;
  return {
    enabled: file.enabled ?? fromEnv.enabled,
    provider: file.provider ?? fromEnv.provider,
    model: file.model ?? fromEnv.model,
    apiKey: file.apiKey ?? fromEnv.apiKey,
    baseURL: file.baseURL ?? fromEnv.baseURL,
    maxCalls: typeof file.maxCalls === 'number' ? Math.max(0, Math.min(100, file.maxCalls)) : fromEnv.maxCalls,
  };
}

export function resolveAllowedOrigins(env: NodeJS.ProcessEnv = process.env, filePath: string = AI_LOCAL_CONFIG_PATH): string[] {
  const file = readLocalAiConfig(filePath);
  if (file?.allowedOrigins?.length) return file.allowedOrigins;
  return (env.AI_ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS).split(',');
}

/** Masks a secret for display/logging: first 3 and last 2 characters only. */
export function maskSecret(secret: string | undefined): string {
  if (!secret) return '(not set)';
  if (secret.length <= 6) return '*'.repeat(secret.length);
  return `${secret.slice(0, 3)}${'*'.repeat(Math.max(3, secret.length - 5))}${secret.slice(-2)}`;
}
