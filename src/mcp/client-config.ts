import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
console.log(JSON.stringify({ mcpServers: { 'architecture-manager': {
  command: process.execPath,
  args: ['--import', pathToFileURL(path.join(root, 'node_modules', 'tsx', 'dist', 'loader.mjs')).href, path.join(root, 'mcp', 'cli.ts')],
} } }, null, 2));
