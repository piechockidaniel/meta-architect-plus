import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { evaluate, sample } from '../src/decision.ts';
import { affectedComponents, describeChanges } from '../src/changes.ts';

test('changes are traced to causes, state transitions and affected components', () => {
  const before = evaluate(sample('organization'), 1);
  const after = evaluate({ ...sample('organization'), dataLocation: 'open' }, 2);
  const summary = describeChanges(before, after);
  assert.deepEqual(summary.causes, ['Database location: Must stay on-site -> Open (hard constraint)']);
  const cloud = summary.variants.find((entry) => entry.id === 'cloud')!;
  assert.equal(cloud.stateBefore, 'excluded');
  assert.equal(cloud.stateAfter, 'conditional');
  assert.deepEqual(cloud.findings.map((finding) => finding.rule), ['residency']);
  assert.deepEqual(affectedComponents(summary, 'cloud'), ['database', 'backup']);
  assert.match(summary.headline, /Cloud: excluded -> conditional/);
  assert.match(summary.headline, /Recommendation unchanged/);
});

test('a no-op reevaluation says so', () => {
  const before = evaluate(sample('greenfield'), 1);
  const after = evaluate(sample('greenfield'), 2);
  assert.match(describeChanges(before, after).headline, /No input changed/);
});

test('recommendation reversal is named', () => {
  const before = evaluate(sample('greenfield'), 1);
  const after = evaluate({ ...sample('greenfield'), operator: 'unavailable' }, 2);
  assert.match(describeChanges(before, after).headline, /Recommendation: cloud -> none/);
});
