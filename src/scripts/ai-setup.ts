/**
 * AI setup wizard — run by the developer/operator in a terminal, never by an
 * end user inside the headset. It writes config/ai.local.json, which:
 *
 *   - is read only by the server (server/ai-config.ts), never sent to the browser;
 *   - is listed in .gitignore, so a key can never be committed by accident;
 *   - is picked up by the dev/preview server immediately, no restart needed.
 *
 * This keeps the existing security contract (docs/DATA-AND-PRIVACY.md,
 * docs/RELEASE-BASELINE.md: "keep keys server-side") while still giving you
 * a guided, no-typing-in-.env-by-hand way to turn AI on.
 *
 * Usage:
 *   node scripts/ai-setup.mjs            interactive wizard
 *   node scripts/ai-setup.mjs --status   show current configuration (masked) and exit
 *   node scripts/ai-setup.mjs --remove   delete config/ai.local.json (disables AI) and exit
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { mkdir, readFile, writeFile, rm, chmod } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { resolveAiConfig } from '../server/ai-config.js';
import { aiAvailability, assist } from '../server/ai-service.js';
import { sample, evaluate } from '../src/decision.js';

const CONFIG_PATH = path.resolve(process.cwd(), 'config', 'ai.local.json');
type Provider = { id: string; label: string; suggestedModel: string; envHint: string };

const PROVIDERS: Record<string, Provider> = {
  1: { id: 'openai', label: 'OpenAI', suggestedModel: 'gpt-4o-mini', envHint: 'OPENAI_API_KEY' },
  2: { id: 'anthropic', label: 'Anthropic', suggestedModel: 'claude-3-5-haiku-latest', envHint: 'ANTHROPIC_API_KEY' },
  3: { id: 'google', label: 'Google Generative AI', suggestedModel: 'gemini-1.5-flash', envHint: 'GOOGLE_GENERATIVE_AI_API_KEY' },
  4: { id: 'compatible', label: 'OpenAI-compatible endpoint (self-hosted / gateway)', suggestedModel: '', envHint: 'AI_API_KEY' },
};

function maskSecret(secret: string | undefined): string {
  if (!secret) return '(not set)';
  if (secret.length <= 6) return '*'.repeat(secret.length);
  return `${secret.slice(0, 3)}${'*'.repeat(Math.max(3, secret.length - 5))}${secret.slice(-2)}`;
}

async function readExisting(): Promise<Record<string, any> | null> {
  if (!existsSync(CONFIG_PATH)) return null;
  try {
    return JSON.parse(await readFile(CONFIG_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function printStatus(config: Record<string, any> | null): void {
  if (!config) {
    console.log('No local AI configuration. AI is disabled unless environment variables set it (see docs/AI-INTEGRATION-DECISION.md).');
    return;
  }
  console.log('Current local AI configuration (config/ai.local.json):');
  console.log(`  enabled:    ${config.enabled === true}`);
  console.log(`  provider:   ${config.provider ?? '(not set)'}`);
  console.log(`  model:      ${config.model ?? '(not set)'}`);
  console.log(`  baseURL:    ${config.baseURL ?? '(not set)'}`);
  console.log(`  apiKey:     ${maskSecret(config.apiKey)}`);
  console.log(`  maxCalls:   ${config.maxCalls ?? '(not set)'}`);
  console.log(`  origins:    ${(config.allowedOrigins ?? []).join(', ') || '(default: https://localhost:8081)'}`);
  console.log(`  configured: ${config.configuredAt ?? '(unknown)'}`);
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const existing = await readExisting();

  if (args.has('--status')) {
    printStatus(existing);
    return;
  }
  if (args.has('--remove')) {
    if (existsSync(CONFIG_PATH)) {
      await rm(CONFIG_PATH);
      console.log('Removed config/ai.local.json. AI is now disabled unless environment variables configure it.');
    } else {
      console.log('Nothing to remove: config/ai.local.json does not exist.');
    }
    return;
  }

  console.log('AI setup wizard — this writes config/ai.local.json on THIS machine only.');
  console.log('The key is read by the local dev/preview server and is never sent to a browser or a headset.');
  console.log('Nothing here makes a network call until you explicitly ask for a test at the end.\n');
  if (existing) {
    console.log('Existing configuration found:');
    printStatus(existing);
    console.log('');
  }

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const enableAnswer = (await rl.question('Enable AI assistance? [y/N]: ')).trim().toLowerCase();
    if (enableAnswer !== 'y' && enableAnswer !== 'yes') {
      if (existing) {
        const clear = (await rl.question('Keep the existing configuration but mark it disabled? [y/N]: ')).trim().toLowerCase();
        if (clear === 'y' || clear === 'yes') {
          await saveConfig({ ...existing, enabled: false });
          console.log('Saved: AI disabled. The curated decision workflow remains fully usable.');
        }
      } else {
        console.log('Nothing written. AI remains disabled.');
      }
      return;
    }

    console.log('\nProviders:');
    for (const [key, value] of Object.entries(PROVIDERS)) console.log(`  ${key}) ${value.label}`);
    let provider: Provider | undefined;
    while (!provider) {
      const choice = (await rl.question(`Choose a provider [1-4]${existing?.provider ? ` (current: ${existing.provider})` : ''}: `)).trim();
      provider = PROVIDERS[choice];
      if (!provider) console.log('Please enter 1, 2, 3 or 4.');
    }

    const modelDefault = existing?.model || provider.suggestedModel;
    const model = (await rl.question(`Model name${modelDefault ? ` [${modelDefault}]` : ' (required)'}: `)).trim() || modelDefault;
    if (!model) {
      console.log('A model name is required. Aborted; nothing was written.');
      return;
    }

    let baseURL: string | undefined;
    if (provider.id === 'compatible') {
      baseURL = (await rl.question(`Endpoint base URL${existing?.baseURL ? ` [${existing.baseURL}]` : ' (required, e.g. https://api.example.com/v1)'}: `)).trim() || existing?.baseURL;
      if (!baseURL) {
        console.log('A base URL is required for an OpenAI-compatible endpoint. Aborted; nothing was written.');
        return;
      }
    }

    console.log(`\nAPI key for ${provider.label} (normally the same value as environment variable ${provider.envHint}).`);
    console.log('It will be echoed back masked only, and stored only in config/ai.local.json (gitignored).');
    const apiKey = (await rl.question('Paste the API key: ')).trim();
    if (!apiKey) {
      console.log('No key entered. Aborted; nothing was written.');
      return;
    }

    const maxCallsAnswer = (await rl.question(`Maximum AI requests allowed per server run [${existing?.maxCalls ?? 20}]: `)).trim();
    const maxCalls = Math.max(0, Math.min(100, Number(maxCallsAnswer || existing?.maxCalls || 20) || 0));

    const originsAnswer = (await rl.question(`Allowed browser origins, comma-separated [${(existing?.allowedOrigins ?? ['https://localhost:8081', 'https://127.0.0.1:8081']).join(',')}]: `)).trim();
    const allowedOrigins = (originsAnswer || (existing?.allowedOrigins ?? ['https://localhost:8081', 'https://127.0.0.1:8081']).join(',')).split(',').map((origin: string) => origin.trim()).filter(Boolean);

    const config = {
      enabled: true,
      provider: provider.id,
      model,
      apiKey,
      baseURL,
      maxCalls,
      allowedOrigins,
      configuredAt: new Date().toISOString(),
    };
    await saveConfig(config);

    console.log('\nSaved config/ai.local.json:');
    printStatus({ ...config, apiKey: maskSecret(config.apiKey) });

    const schemaCheck = (await rl.question('\nRun a schema-only availability check now (no network call)? [Y/n]: ')).trim().toLowerCase();
    if (schemaCheck !== 'n' && schemaCheck !== 'no') {
      const resolved = resolveAiConfig(process.env, CONFIG_PATH);
      const availability = aiAvailability(resolved);
      console.log(`Result: ${availability.available ? 'available' : 'NOT available'} — ${availability.reason}`);
    }

    const liveCheck = (await rl.question('\nSend ONE synthetic test request to the provider now? This leaves your machine and may incur provider cost. [y/N]: ')).trim().toLowerCase();
    if (liveCheck === 'y' || liveCheck === 'yes') {
      await runLiveTest();
    } else {
      console.log('Skipped. You can test later from the app (Review stage -> "Explain current findings") or re-run this wizard with the same question.');
    }
  } finally {
    rl.close();
  }
}

async function saveConfig(config: Record<string, unknown>): Promise<void> {
  await mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf8');
  try {
    await chmod(CONFIG_PATH, 0o600); // best-effort; no-op on platforms that ignore POSIX modes (e.g. default Windows ACLs)
  } catch {
    // Non-fatal: not every filesystem supports chmod.
  }
}

async function runLiveTest(): Promise<void> {
  const config = resolveAiConfig(process.env, CONFIG_PATH);
  const inputs = sample('greenfield');
  const snapshot = evaluate(inputs, 1);
  console.log('Sending a synthetic, non-identifying sample snapshot (the greenfield sample) for a grounded explanation...');
  try {
    const result = await assist(config, { action: 'explain', inputs, specification: '', version: snapshot.version, consent: true });
    const explanation = 'explanation' in result.result ? result.result.explanation : '';
    console.log('Provider responded successfully:');
    console.log(`  explanation: ${explanation.slice(0, 240)}${explanation.length > 240 ? '...' : ''}`);
    console.log(`  usage: ${JSON.stringify(result.usage)}`);
  } catch (error) {
    console.log(`Test request failed: ${error instanceof Error ? error.message : String(error)}`);
    console.log('Configuration was still saved; fix the key/model/endpoint and re-run "node scripts/ai-setup.mjs --status", or just try again later.');
  }
}

main().catch((error) => {
  console.error('AI setup wizard failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
