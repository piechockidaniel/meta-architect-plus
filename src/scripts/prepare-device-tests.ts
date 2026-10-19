/** Prepare repeatable physical-test inputs and a blank evidence ledger.
 * Reads runtime status; never starts a server, controls a device or invokes AI.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DecisionSession } from '../src/session.js';
import { templateById } from '../src/templates.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const localDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw' }).format(new Date());
const parent = path.join(root, '.local', 'device-tests');
await mkdir(parent, { recursive: true });
const directory = await mkdtemp(path.join(parent, `${localDate}-`));
await mkdir(path.join(directory, 'fixtures'));

let runtime: { running: boolean; localUrl: string | null; networkUrls: string[]; browserReady: boolean;
  productionLocalUrl?: string; productionNetworkUrls?: string[]; error?: string };
try {
  const response = JSON.parse(execFileSync(process.execPath, [path.join(root, 'node_modules/@iwsdk/cli/bin/iwsdk.js'), 'dev', 'status'], {
    cwd: root, timeout: 20_000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }));
  runtime = {
    running: response.data?.state?.running === true,
    localUrl: response.data?.runtimeUrls?.local ?? null,
    networkUrls: response.data?.runtimeUrls?.network ?? [],
    browserReady: response.data?.state?.browserCommandReady === true,
  };
  if (runtime.localUrl) runtime.productionLocalUrl = new URL('dist/index.html', runtime.localUrl).href;
  runtime.productionNetworkUrls = runtime.networkUrls.map(url => new URL('dist/index.html', url).href);
} catch {
  runtime = { running: false, localUrl: null, networkUrls: [], browserReady: false, error: 'IWSDK runtime status unavailable; start the managed server and prepare a new run.' };
}

async function sourceFiles(directory: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
    const relative = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) files.push(...await sourceFiles(relative));
    else if (directory === 'dist' || directory.startsWith(`dist${path.sep}`) ||
      directory === 'public' || directory.startsWith(`public${path.sep}`) ||
      /\.(ts|mjs|json|uikitml|webmanifest|html|svg|css)$/.test(entry.name)) files.push(relative);
  }
  return files;
}
const names = ['package.json', 'package-lock.json', 'iwsdk.config.json', 'vite.config.ts', 'index.html',
  'tsconfig.json', 'tsconfig.tools.json', ...await sourceFiles('scripts'),
  ...await sourceFiles('src'), ...await sourceFiles('server'), ...await sourceFiles('public'),
  ...await sourceFiles('assets'), ...await sourceFiles('styles')].sort();
const hashes: Record<string, string> = {};
for (const name of names) hashes[name.replaceAll('\\', '/')] = createHash('sha256').update(await readFile(path.join(root, name))).digest('hex');
const sourceFingerprint = createHash('sha256').update(JSON.stringify(hashes)).digest('hex');
let productionBuild: { sha256: string; modifiedAt: string; fingerprint: string; files: Record<string, string> } | null = null;
try {
  const file = path.join(root, 'dist/index.html');
  const files: Record<string, string> = {};
  for (const name of (await sourceFiles('dist')).sort()) {
    files[name.replaceAll('\\', '/')] = createHash('sha256').update(await readFile(path.join(root, name))).digest('hex');
  }
  productionBuild = {
    sha256: createHash('sha256').update(await readFile(file)).digest('hex'),
    modifiedAt: (await stat(file)).mtime.toISOString(), files,
    fingerprint: createHash('sha256').update(JSON.stringify(files)).digest('hex'),
  };
} catch { /* A missing build is recorded, not treated as a device pass. */ }

const fixtures: Record<string, unknown> = {};
for (const id of ['customer-launch', 'internal-records', 'budget-bound', 'availability-request', 'document-workflow', 'discovery']) {
  const template = templateById(id);
  if (!template) throw new Error(`Missing test template ${id}`);
  const session = new DecisionSession(template.inputs);
  session.setContext({ ...template.context, confirmed: false });
  await writeFile(path.join(directory, 'fixtures', `${id}.json`), JSON.stringify(session.backup(), null, 2) + '\n');
  fixtures[id] = {
    file: `fixtures/${id}.json`, builtinTemplate: template.title, acknowledgementRequired: true,
    expected: {
      catalogue: session.snapshot.catalogueVersion, rules: session.snapshot.rulesVersion,
      states: Object.fromEntries(session.snapshot.assessments.map(a => [a.variant.id, a.state])),
      recommendation: session.snapshot.recommendation,
    },
  };
}

const cases = [
  ['Q01', 'Launch and native immersive session'], ['Q02', 'Readability, text size and seated comfort'],
  ['Q03', 'Hands-only greenfield journey'], ['Q04', 'Hands-only organization journey'],
  ['Q05', 'Preview, cancel, apply and undo'], ['Q06', 'Unknowns, contradictions and unsupported recovery'],
  ['Q07', 'Workload button and grab/drop parity'], ['Q08', 'Manual tour and original-project restoration'],
  ['Q09', 'Headset export and actual artifact retrieval'], ['Q10', 'Pause and system interruption'],
  ['Q11', 'Tracking loss and recovery'], ['Q12', 'Reload and resume confirmed state'],
  ['Q13', 'Project form, punctuation and backup recovery'], ['Q14', 'Export failure and retry'],
  ['Q15', 'Sustained performance'], ['Q16', 'Comprehension and usability'],
  ['Q17', 'Installed immersive app launch (conditional on packaging)'],
  ['Q18', 'Focused carousel readability, two-axis navigation and explicit decision'],
];
const csv = (value: string) => `"${value.replaceAll('"', '""')}"`;
await writeFile(path.join(directory, 'results.csv'), [
  ['case_id', 'scenario', 'status', 'device_model', 'os_version', 'browser_version', 'input_mode', 'observed', 'evidence', 'issue', 'tester', 'started_at', 'ended_at'].map(csv).join(','),
  ...cases.map(([id, title]) => [id, title, 'NOT_RUN', '', '', '', '', '', '', '', '', '', ''].map(csv).join(',')),
].join('\n') + '\n');
await writeFile(path.join(directory, 'run.json'), JSON.stringify({
  createdAt: new Date().toISOString(), timezone: 'Europe/Warsaw', workspace: root,
  sourceFingerprint, sourceHashes: hashes, productionBuild, runtime,
  device: { model: 'Meta Quest 3', serial: null, osVersion: null, browserVersion: null },
  evidenceLayer: 'physical-device', status: 'NOT_RUN', fixtures,
  note: 'Prepared inputs and expected engine states are not evidence of device operation. Use the same source fingerprint and URL throughout a run. Private local AI/MCP configuration is not read or copied.',
}, null, 2) + '\n');
const scenarioPath = path.relative(directory, path.resolve(root, '../docs/PHYSICAL-DEVICE-TESTS.md')).replaceAll('\\', '/');
await writeFile(path.join(directory, 'README.md'), `# Quest 3 test run\n\nStatus: **NOT_RUN**. Prepared ${localDate} (Europe/Warsaw).\n\nFollow [physical-device scenarios](<${scenarioPath}>). Fill results.csv as you work; put screenshots, recordings and retrieved artifacts here.\n\nSource fingerprint: ${sourceFingerprint}\n\nRuntime running: ${runtime.running}. Local URL: ${runtime.localUrl ?? 'unavailable'}.\n\nNetwork URLs (choose the adapter reachable from your headset):\n${runtime.networkUrls.map(url => '- ' + url).join('\n') || '- unavailable; start the managed server and prepare a new run'}\n\nUse built-in templates for hands-only cases. The fixture JSON files are optional reset inputs; importing one in a desktop browser does not seed headset storage. No device or AI action was performed.\n`);
console.log(JSON.stringify({ directory, status: 'NOT_RUN', sourceFingerprint, runtime, fixtureCount: Object.keys(fixtures).length, scenarioCount: cases.length }, null, 2));
