import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { ProjectKeyboard } from '../src/project-keyboard.ts';
import { DecisionSession } from '../src/session.ts';
import { sample } from '../src/decision.ts';
import { decisionBundle } from '../src/exports.ts';

function setup() {
  const session = new DecisionSession({ ...sample('organization'), workload: ['storage', 'jobs'] });
  const messages: string[] = [];
  return { session, messages, keyboard: new ProjectKeyboard(session, value => messages.push(value)) };
}
test('keyboard edits preserve identity/workload, require acknowledgement and cancel without committing', () => {
  const { session, keyboard } = setup();
  const before = session.backup();
  keyboard.begin('title'); keyboard.key({ type: 'clear' }); keyboard.key({ type: 'char', value: 'X' }); keyboard.cancel();
  assert.deepEqual(session.backup(), before);
  keyboard.begin('title'); keyboard.key({ type: 'clear' }); assert.throws(() => keyboard.done(), /context/);
  keyboard.key({ type: 'char', value: 'Y' }); keyboard.done();
  assert.equal(session.context.title, 'Y'); assert.equal(session.context.confirmed, false);
  assert.equal(session.snapshot.inputs.identity, before.inputs.identity);
  assert.deepEqual(session.snapshot.inputs.workload, ['storage', 'jobs']);
});
test('three rate fields commit atomically, zero remains a supplied rate, invalid drafts cannot commit', () => {
  const { session, keyboard } = setup();
  for (const [field, value] of [['hosting', '1'], ['site', '0'], ['connectivity', '2']] as const) {
    keyboard.begin(field); keyboard.key({ type: 'char', value }); keyboard.done();
    if (field !== 'connectivity') assert.equal(session.snapshot.inputs.rates, null);
  }
  assert.deepEqual(session.snapshot.inputs.rates, { hosting: 1, site: 0, connectivity: 2 });
  keyboard.begin('budget'); keyboard.key({ type: 'char', value: '.' }); assert.throws(() => keyboard.done(), /number/);
  keyboard.cancel(); assert.equal(session.snapshot.inputs.budget, null);
});
test('stale keyboard draft cannot overwrite a changed project', () => {
  const { session, keyboard } = setup(); keyboard.begin('title');
  session.apply({ ...session.snapshot.inputs, usage: 'growth' });
  assert.throws(() => keyboard.done(), /Project changed/); assert.equal(session.snapshot.inputs.usage, 'growth');
});
test('rationale retains selection, round-trips with rich fields and fences user Markdown safely', () => {
  const { session } = setup(); session.setContext({ ...session.context, confirmed: true }); session.select('on-premise');
  session.setRationale('Because – ownership.\n```\n# user heading\n```');
  assert.equal(session.snapshot.selection, 'on-premise');
  const bundle = decisionBundle(session); assert.ok(bundle.markdown.includes('````text'));
  const restored = new DecisionSession(sample('greenfield')); restored.restore(bundle.backup);
  assert.equal(restored.context.rationale, session.context.rationale);
  assert.equal(restored.snapshot.inputs.identity, session.snapshot.inputs.identity);
  assert.deepEqual(restored.snapshot.inputs.workload, ['storage', 'jobs']);
  session.undo(); assert.equal(session.context.rationale, undefined);
  assert.throws(() => session.setRationale('x'.repeat(4001)), /rationale/);
});
test('legacy donor backup imports rationale with unknown identity rather than inventing evidence', () => {
  const { session } = setup(); const old = session.backup() as any;
  delete old.inputs.identity; delete old.inputs.workload; old.context.rationale = 'Legacy reason';
  session.restore(old); assert.equal(session.snapshot.inputs.identity, 'unknown');
  assert.deepEqual(session.snapshot.inputs.workload, []); assert.equal(session.context.rationale, 'Legacy reason');
});
