import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({ name: 'fixture-upstream', version: '1' });
server.registerTool('status', { inputSchema: { label: z.string().default('test') } }, ({ label }) => ({ content: [{ type: 'text', text: `status:${label}` }] }));
server.registerTool('restart', { inputSchema: {} }, () => ({ content: [{ type: 'text', text: 'restarted' }] }));
server.registerTool('not_allowed', { inputSchema: {} }, () => ({ content: [{ type: 'text', text: 'must never reach caller' }] }));
server.registerResource('status', 'fixture://status', {}, uri => ({ contents: [{ uri: uri.href, text: 'fixture resource' }] }));
await server.connect(new StdioServerTransport());
