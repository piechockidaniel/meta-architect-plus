import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { evaluate, sample, restoreInputs, nextQuestions, upgradeInputs, assessmentFor } from '../src/decision.ts';
import { diagram, markdown } from '../src/exports.ts';
import { CATALOGUE_VERSION } from '../src/catalogue.ts';

test('organizational residency excludes cloud, hybrid remains conditional', () => {
  const result = evaluate(sample('organization'));
  assert.equal(assessmentFor(result, 'cloud').state, 'excluded');
  assert.equal(assessmentFor(result, 'hybrid').state, 'conditional');
  assert.equal(assessmentFor(result, 'on-premise').state, 'viable');
  assert.equal(result.recommendation, 'on-premise');
  assert.ok(nextQuestions(result).includes('connectivity'));
  assert.ok(result.reversalConditions.some((line) => line.startsWith('Cloud becomes viable only if resolved')));
});

test('greenfield sample has one viable conceptual option with reasons', () => {
  const result = evaluate(sample('greenfield'));
  assert.equal(result.recommendation, 'cloud');
  assert.match(result.recommendationReasons[0], /only variant/);
  assert.equal(result.catalogueVersion, CATALOGUE_VERSION);
});

test('unknown mandatory inputs keep variants conditional and block an unconditional recommendation', () => {
  assert.equal(evaluate({ ...sample('greenfield'), deployment: 'unknown' }).recommendation, null);
  const identity = evaluate({ ...sample('greenfield'), identity: 'unknown' });
  assert.equal(assessmentFor(identity, 'cloud').state, 'conditional');
  assert.equal(identity.recommendation, null);
});

test('organizational identity on an externally hosted application is an evidence gap, not a pass', () => {
  const result = evaluate({ ...sample('greenfield'), identity: 'organizational' });
  assert.equal(assessmentFor(result, 'cloud').findings.find((f) => f.rule === 'identity')?.result, 'unknown');
});

test('preference cannot override a hard constraint: mandated on-premise excludes cloud even when cloud is otherwise viable', () => {
  const result = evaluate({ ...sample('greenfield'), deployment: 'on-premise' });
  assert.equal(assessmentFor(result, 'cloud').state, 'excluded');
  assert.equal(assessmentFor(result, 'on-premise').state, 'excluded'); // capacity unavailable in greenfield
  assert.equal(result.recommendation, null);
  assert.match(result.recommendationReasons[0], /No variant passes/);
});

test('unsupported recovery is reported as a coverage limitation and never silently relaxed', () => {
  const result = evaluate({ ...sample('greenfield'), recovery: 'high-availability' });
  assert.equal(assessmentFor(result, 'cloud').state, 'unsupported');
  assert.equal(result.recommendation, null);
  assert.ok(result.openIssues.some((issue) => /outside this single-site catalogue/.test(issue)));
});

test('costs: line items carry formulas; incomplete costs cannot prove affordability; exceeded budget excludes', () => {
  const inputs = { ...sample('greenfield'), budget: 100, rates: { hosting: 50, site: 40, connectivity: 20 } };
  const launch = evaluate(inputs);
  const cloud = assessmentFor(launch, 'cloud');
  assert.equal(cloud.cost.subtotal, 50);
  assert.equal(cloud.cost.completeness, 'partial');
  assert.equal(cloud.cost.lines[0].formula, '1 x 50 USD');
  assert.equal(cloud.state, 'conditional');
  const hybrid = assessmentFor(launch, 'hybrid');
  assert.equal(hybrid.cost.subtotal, 110);
  assert.equal(hybrid.cost.lines.length, 3);
  assert.equal(assessmentFor(evaluate({ ...inputs, usage: 'growth' }), 'cloud').state, 'excluded');
  assert.equal(assessmentFor(evaluate({ ...inputs, usage: 'growth' }), 'cloud').cost.subtotal, 150);
});

test('unpriced estimates stay unpriced and say so', () => {
  const result = evaluate(sample('greenfield'));
  const cost = assessmentFor(result, 'on-premise').cost;
  assert.equal(cost.subtotal, null);
  assert.equal(cost.completeness, 'unpriced');
  assert.equal(cost.lines[0].amount, null);
  assert.ok(result.openIssues.some((issue) => /unpriced/.test(issue)));
});

test('responsibilities lose their owner when no operator exists', () => {
  const result = evaluate({ ...sample('greenfield'), operator: 'unavailable' });
  assert.ok(assessmentFor(result, 'cloud').responsibilities.every((entry) => /no owner/.test(entry.note)));
  assert.equal(assessmentFor(result, 'cloud').state, 'excluded');
});

test('component views align the same slots in every variant and mark the hybrid addition', () => {
  const result = evaluate(sample('organization'));
  for (const assessment of result.assessments) assert.equal(assessment.components.length, 7);
  assert.equal(assessmentFor(result, 'cloud').components.find((c) => c.id === 'connectivity')?.present, false);
  assert.equal(assessmentFor(result, 'hybrid').components.find((c) => c.id === 'connectivity')?.present, true);
  assert.equal(assessmentFor(result, 'cloud').components.find((c) => c.id === 'database')?.worstResult, 'fail');
  assert.equal(assessmentFor(result, 'on-premise').components.find((c) => c.id === 'identity')?.boundary, 'Organizational identity');
});

test('snapshots isolate input mutation and exports use matching versions', () => {
  const inputs = sample('greenfield');
  const result = evaluate(inputs, 7);
  inputs.deployment = 'hybrid';
  assert.equal(result.inputs.deployment, 'open');
  assert.match(diagram(result, 'cloud'), /decision v7/);
  assert.match(diagram(result, 'hybrid'), /Connectivity/);
  const document = markdown(result);
  assert.match(document, /# Architecture decision v7/);
  assert.match(document, /Catalogue: conceptual-2026.10.11/);
  assert.match(document, /\| Line item \| Category/);
  assert.match(document, /Operating responsibilities/);
  assert.match(document, /Failure boundaries/);
  assert.match(document, /illustrative/);
});

test('restored input validates numbers and enums and upgrades older samples explicitly', () => {
  assert.deepEqual(restoreInputs(sample('organization')), sample('organization'));
  assert.throws(() => restoreInputs({ ...sample('greenfield'), budget: -1 }));
  assert.throws(() => restoreInputs({ ...sample('greenfield'), deployment: 'invented' }));
  assert.throws(() => restoreInputs({ ...sample('greenfield'), rates: { hosting: Infinity, site: 0, connectivity: 0 } }));
  assert.throws(() => restoreInputs({ ...sample('greenfield'), rates: { hosting: 1, site: 1, connectivity: 1, extra: 'x' }, identity: 'nope' }));
  const legacy = { ...sample('greenfield') } as Record<string, unknown>;
  delete legacy.identity;
  assert.throws(() => restoreInputs(legacy));
  assert.equal(restoreInputs(upgradeInputs(legacy)).identity, 'unknown');
  const withExtra = restoreInputs({ ...sample('greenfield'), rates: { hosting: 1, site: 1, connectivity: 1, extra: 'x' } });
  assert.deepEqual(withExtra.rates, { hosting: 1, site: 1, connectivity: 1 });
});

test('exports escape user-controlled markup', () => {
  const result = evaluate(sample('greenfield'));
  const svg = diagram(result, 'cloud');
  assert.ok(!svg.includes('<script'));
  assert.match(svg, /^<svg /);
});
