import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { aiAvailability, assist, configFromEnvironment, validateExplanation, validateProposals } from '../server/ai-service.ts';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { sample } from '../src/decision.ts';

test('AI defaults disabled and requires an explicit call allowance', () => {
  assert.equal(aiAvailability(configFromEnvironment({})).available, false);
  assert.equal(aiAvailability(configFromEnvironment({ AI_ENABLED: 'true', AI_MODEL: 'test', OPENAI_API_KEY: 'fixture' })).available, false);
});
test('extraction rejects invented quotes, duplicate fields and invalid values', () => {
  const raw = { summary: 'Application', suggestions: [{ field: 'dataLocation', value: 'on-premise', quote: 'Database stays on-premise.', reason: 'Explicit requirement' }], questions: [] };
  assert.equal(validateProposals(raw, 'Database stays on-premise.', sample('greenfield')).suggestions.length, 1);
  assert.throws(() => validateProposals(raw, 'Something different', sample('greenfield')));
  assert.throws(() => validateProposals({ ...raw, suggestions: [raw.suggestions[0], raw.suggestions[0]] }, 'Database stays on-premise.', sample('greenfield')));
  assert.throws(() => validateProposals({ ...raw, suggestions: [{ ...raw.suggestions[0], value: 'invented' }] }, 'Database stays on-premise.', sample('greenfield')));
});
test('explanations can reference only actual authoritative findings', () => {
  assert.equal(validateExplanation({ explanation: 'Operating ownership is available.', references: [{ variant: 'cloud', rule: 'operations' }] }, sample('greenfield')).references.length, 1);
  assert.throws(() => validateExplanation({ explanation: 'Invented', references: [{ variant: 'cloud', rule: 'certified-security' }] }, sample('greenfield')));
});

test('question qualification sends only the requested category to a local provider fixture', async () => {
  let prompt = '';
  const server = createServer(async (request, response) => {
    let body = ''; for await (const chunk of request) body += chunk;
    prompt = body;
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ id: 'fixture', object: 'chat.completion', created: 1, model: 'fixture',
      choices: [{ index: 0, message: { role: 'assistant', content: JSON.stringify({ summary: 'Growth', suggestions: [{ field: 'usage', value: 'growth', quote: 'growth', reason: 'Captured words' }], questions: [] }) }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 } }));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = (server.address() as { port: number }).port;
  const config = { enabled: true, provider: 'compatible', model: 'fixture', apiKey: 'fixture-only', baseURL: `http://127.0.0.1:${port}/v1`, maxCalls: 2 };
  try {
    const result = await assist(config, { action: 'qualify', key: 'usage', specification: 'expect growth', inputs: sample('greenfield'), version: 3, consent: true });
    assert.equal(result.version, 3); assert.equal((result.result as any).suggestions[0].value, 'growth');
    assert.ok(prompt.includes('capturedAnswer')); assert.ok(prompt.includes('Do not infer missing facts'));
    await assert.rejects(assist(config, { action: 'qualify', specification: 'growth', inputs: sample('greenfield'), version: 3, consent: true }));
  } finally { await new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }); }
});
