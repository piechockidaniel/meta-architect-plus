import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { templates, templateById } from '../src/templates.ts';
import { assessmentFor, evaluate, restoreInputs } from '../src/decision.ts';
import { validateContext } from '../src/intake.ts';

const states = (id: string) => {
  const snapshot = evaluate(templateById(id)!.inputs);
  return { cloud: assessmentFor(snapshot, 'cloud').state, onPremise: assessmentFor(snapshot, 'on-premise').state, hybrid: assessmentFor(snapshot, 'hybrid').state, recommendation: snapshot.recommendation };
};

test('every template is a valid, provider-neutral project', () => {
  const ids = new Set<string>();
  for (const template of templates) {
    assert.ok(!ids.has(template.id));
    ids.add(template.id);
    assert.deepEqual(restoreInputs(template.inputs), template.inputs);
    validateContext(template.context);
    assert.equal(template.context.inputOrigin, 'sample');
    assert.equal(template.context.confirmed, false);
    assert.ok(template.walkthrough.length >= 2);
    const text = `${template.title} ${template.summary} ${template.context.specification} ${template.walkthrough.join(' ')}`;
    assert.doesNotMatch(text, /\b(AWS|Azure|Google Cloud|GCP|Amazon|Microsoft|Oracle|Kubernetes)\b/i);
  }
  assert.ok(templates.length >= 6);
});

test('templates produce the outcomes they claim to teach', () => {
  assert.deepEqual(states('internal-records'), { cloud: 'excluded', onPremise: 'viable', hybrid: 'conditional', recommendation: 'on-premise' });
  assert.deepEqual(states('customer-launch'), { cloud: 'viable', onPremise: 'excluded', hybrid: 'excluded', recommendation: 'cloud' });
  assert.deepEqual(states('hybrid-pilot'), { cloud: 'excluded', onPremise: 'viable', hybrid: 'conditional', recommendation: 'on-premise' });
  assert.deepEqual(states('availability-request'), { cloud: 'excluded', onPremise: 'unsupported', hybrid: 'unsupported', recommendation: null });
  assert.deepEqual(states('budget-bound'), { cloud: 'conditional', onPremise: 'excluded', hybrid: 'excluded', recommendation: null });
  assert.deepEqual(states('discovery'), { cloud: 'conditional', onPremise: 'conditional', hybrid: 'conditional', recommendation: null });
  const growth = evaluate({ ...templateById('budget-bound')!.inputs, usage: 'growth' });
  assert.equal(assessmentFor(growth, 'cloud').state, 'excluded');
});

test('workload blocks join every variant with a boundary, links and responsibilities', () => {
  const snapshot = evaluate(templateById('document-workflow')!.inputs);
  for (const assessment of snapshot.assessments) {
    const ids = assessment.components.filter((c) => c.kind === 'workload').map((c) => c.id);
    assert.deepEqual(ids, ['storage', 'jobs', 'queue']);
    assert.ok(assessment.connections.some((link) => link.from === 'queue' && link.to === 'jobs'));
    assert.ok(assessment.cost.exclusions.some((line) => /File storage/.test(line)));
  }
  assert.equal(assessmentFor(snapshot, 'hybrid').components.find((c) => c.id === 'storage')?.boundary, 'Organization site');
  assert.equal(assessmentFor(snapshot, 'cloud').components.find((c) => c.id === 'storage')?.boundary, 'External hosting');
  assert.equal(snapshot.recommendation, 'cloud');
  // Storage follows the database: an on-site data rule fails it in the cloud variant.
  const onSite = evaluate({ ...templateById('document-workflow')!.inputs, dataLocation: 'on-premise' });
  assert.equal(assessmentFor(onSite, 'cloud').components.find((c) => c.id === 'storage')?.worstResult, 'fail');
  const integration = evaluate({ ...templateById('customer-launch')!.inputs, workload: ['integration'] });
  assert.equal(assessmentFor(integration, 'cloud').state, 'viable');
  assert.ok(integration.openIssues.some((issue) => /External integration/.test(issue)));
  assert.throws(() => restoreInputs({ ...templateById('customer-launch')!.inputs, workload: ['invented'] }));
  assert.deepEqual(restoreInputs({ ...templateById('customer-launch')!.inputs, workload: ['queue', 'storage', 'storage'] }).workload, ['storage', 'queue']);
});
