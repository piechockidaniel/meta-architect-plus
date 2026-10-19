import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig, configArgument } from './config.js';
import { createToolset } from './server.js';
import { redact } from './security.js';

try {
  const config = await loadConfig(configArgument(process.argv.slice(2)));
  const manager = createToolset(config);
  let closing = false;
  const shutdown = async () => {
    if (closing) return;
    closing = true;
    await manager.close();
    await manager.server.close();
  };
  manager.server.server.onclose = () => { void shutdown(); };
  process.once('SIGINT', () => { void shutdown(); });
  process.once('SIGTERM', () => { void shutdown(); });
  await manager.server.connect(new StdioServerTransport());
  // stdout is reserved exclusively for MCP JSON-RPC messages.
} catch (error) {
  console.error(redact(error instanceof Error ? error.message : 'MCP startup failed.'));
  process.exitCode = 1;
}
