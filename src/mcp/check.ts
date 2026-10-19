/** Repeatable, no-inference protocol smoke check against the actual stdio entrypoint. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { baseEnvironment, configArgument } from './config.js';

const args = process.argv.slice(2);
const includeUpstreams = args.includes('--upstreams');
const taskIndex = args.indexOf('--task');
const taskId = taskIndex >= 0 ? args[taskIndex + 1] : undefined;
if (taskIndex >= 0 && (!taskId || taskId.startsWith('--'))) throw new Error('--task requires a configured task ID.');
const configFile = configArgument(args.filter((arg, index) => arg !== '--upstreams' && index !== taskIndex && (taskIndex < 0 || index !== taskIndex + 1)));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const client = new Client({ name: 'app-manager-check', version: '0.1.0' });
const transport = new StdioClientTransport({ command: process.execPath, args: ['--import', 'tsx', path.join(root, 'mcp', 'cli.ts'), '--config', configFile], cwd: root, env: baseEnvironment(), stderr: 'pipe' });
transport.stderr?.on('data', chunk => process.stderr.write(chunk));
try {
  await client.connect(transport, { timeout: 15_000 });
  const tools = await client.listTools();
  const resources = await client.listResources();
  const prompts = await client.listPrompts();
  const listing = await client.callTool({ name: 'app_list', arguments: {} });
  if (listing.isError) throw new Error('app_list failed.');
  const apps = (listing.structuredContent as { data: { appId: string; tasks: { taskId: string; effect: string; timeoutMs: number }[]; upstreams: { upstreamId: string; tools: Record<string, unknown> }[] }[] }).data;
  if (taskId && apps.length !== 1) throw new Error('--task requires a config with exactly one registered app.');
  const upstreamResults = [];
  const taskResults = [];
  for (const { appId, upstreams, tasks } of apps) {
    const inspect = await client.callTool({ name: 'app_inspect', arguments: { appId } });
    const readme = await client.callTool({ name: 'project_read', arguments: { appId, path: 'README.md', lineCount: 10 } });
    if (inspect.isError || readme.isError) throw new Error(`Inspection failed for ${appId}.`);
    if (includeUpstreams) for (const upstream of upstreams) {
      const discovered = await client.callTool({ name: 'upstream_tools', arguments: { appId, upstreamId: upstream.upstreamId } });
      if (discovered.isError) throw new Error(`Upstream discovery failed for ${upstream.upstreamId}.`);
      const discovery = (discovered.structuredContent as { data: { tools: { name: string }[]; missingTools: string[] | null } }).data;
      if (discovery.missingTools?.length) throw new Error(`Configured upstream tools are missing: ${discovery.missingTools.join(', ')}`);
      const names = discovery.tools.map(tool => tool.name);
      let runtimeStatus: string | undefined;
      if (upstream.upstreamId === 'iwsdk' && names.includes('runtime_get_status')) {
        const status = await client.callTool({ name: 'upstream_read', arguments: { appId, upstreamId: 'iwsdk', toolName: 'runtime_get_status', arguments: {} } });
        if (status.isError) throw new Error('IWSDK status call failed.');
        runtimeStatus = 'status call completed; inspect live readiness separately';
      }
      upstreamResults.push({ appId, upstreamId: upstream.upstreamId, tools: names, runtimeStatus });
    }
    if (taskId) {
      const task = tasks.find(task => task.taskId === taskId);
      if (!task || task.effect === 'remote-write') throw new Error('Check task must be a configured read or local-write task.');
      const started = await client.callTool({ name: 'task_start', arguments: { appId, taskId } });
      if (started.isError) throw new Error('Could not start the configured task.');
      const id = (started.structuredContent as { data: { id: string } }).data.id;
      const deadline = Date.now() + task.timeoutMs + 15_000;
      while (true) {
        const result = await client.callTool({ name: 'job_get', arguments: { jobId: id } });
        if (result.isError) throw new Error('Job lookup failed.');
        const job = (result.structuredContent as { data: { state: string; exitCode?: number; output: string } }).data;
        if (job.state !== 'running') {
          if (job.state !== 'succeeded') throw new Error(`Task ${taskId}: ${job.state}\n${job.output.slice(-4_000)}`);
          taskResults.push({ appId, taskId, state: job.state, exitCode: job.exitCode, output: job.output.slice(-2_000) });
          break;
        }
        if (Date.now() >= deadline) throw new Error('Task did not settle before its timeout.');
        await new Promise(resolve => setTimeout(resolve, 250));
      }
    }
  }
  console.log(JSON.stringify({ ok: true, transport: 'stdio', tools: tools.tools.map(tool => tool.name), resources: resources.resources.map(resource => resource.uri), prompts: prompts.prompts.map(prompt => prompt.name), apps: apps.map(app => app.appId), upstreamResults, taskResults, httpOperations: 0, inferenceCalls: 0 }, null, 2));
} finally { await client.close(); }
