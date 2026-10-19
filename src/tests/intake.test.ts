import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { evaluate, sample } from '../src/decision.ts';
import { applicableQuestions, conflicts, factLines, prioritizedQuestions, questionFor } from '../src/intake.ts';

test('adaptive questions omit irrelevant hybrid details and use path-specific wording', () => {
  assert.ok(!applicableQuestions(sample('greenfield')).some((q) => q.key === 'latency'));
  assert.ok(applicableQuestions(sample('organization')).some((q) => q.key === 'latency'));
  assert.ok(!applicableQuestions({ ...sample('organization'), deployment: 'cloud' }).some((q) => q.key === 'connectivity'));
  assert.match(questionFor('organization', 'deployment').title, /^A1\./);
  assert.match(questionFor('greenfield', 'deployment').title, /^B6\./);
  assert.equal(questionFor('greenfield', 'usage').classification, 'scenario assumption');
});

test('contradictions identify both inputs so the user can correct either', () => {
  const found = conflicts({ ...sample('organization'), deployment: 'cloud' });
  assert.equal(found.length, 1);
  assert.deepEqual(found[0].inputs, ['deployment', 'dataLocation']);
  assert.equal(conflicts(sample('organization')).length, 0);
  assert.equal(conflicts({ ...sample('greenfield'), deployment: 'on-premise' })[0]?.id, 'on-premise-vs-capacity');
  assert.equal(conflicts({ ...sample('organization'), deployment: 'hybrid', latency: 'sensitive' })[0]?.id, 'hybrid-vs-latency');
});

test('question priority: contradictions first, mandatory unknowns second, assumptions third, refinement last', () => {
  const inputs = { ...sample('organization'), deployment: 'cloud' as const, operator: 'unknown' as const, capacity: 'unknown' as const };
  const order = prioritizedQuestions(inputs, evaluate(inputs));
  assert.equal(order[0].priority, 'contradiction');
  assert.deepEqual(order.slice(0, 2).map((entry) => entry.key), ['deployment', 'dataLocation']);
  assert.equal(order.find((entry) => entry.key === 'operator')?.priority, 'mandatory unknown');
  assert.equal(order.find((entry) => entry.key === 'capacity')?.priority, 'comparison');
  assert.equal(order[order.length - 1].priority, 'refinement');
  assert.equal(new Set(order.map((entry) => entry.key)).size, order.length);
});

test('fact lines label constraints and assumptions for the product summary', () => {
  const facts = factLines(sample('organization'));
  assert.equal(facts.find((fact) => fact.key === 'dataLocation')?.value, 'Must stay on-site');
  assert.equal(facts.find((fact) => fact.key === 'capacity')?.classification, 'scenario assumption');
});
