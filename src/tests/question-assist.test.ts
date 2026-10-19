import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { qualifyProposal } from '../src/question-assist.js';

test('qualification requires a current-question value and verbatim captured evidence', () => {
  assert.deepEqual(qualifyProposal('usage', 'expect growth', { suggestions: [{ field: 'usage', value: 'growth', quote: 'growth' }] }), { value: 'growth', quote: 'growth' });
  for (const suggestion of [
    { field: 'identity', value: 'application', quote: 'growth' },
    { field: 'usage', value: 'invented', quote: 'growth' },
    { field: 'usage', value: 'growth', quote: 'not in the answer' },
  ]) assert.throws(() => qualifyProposal('usage', 'expect growth', { suggestions: [suggestion] }));
});
test('ambiguous or unknown input requests clarification instead of guessing', () => {
  assert.equal(qualifyProposal('usage', 'maybe', { suggestions: [], questions: ['Launch or growth?'] }).question, 'Launch or growth?');
  assert.equal(qualifyProposal('identity', 'not sure', { suggestions: [{ field: 'identity', value: 'unknown' }] }).value, undefined);
});
