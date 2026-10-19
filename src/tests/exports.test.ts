import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { DecisionSession } from '../src/session.ts';
import { sample } from '../src/decision.ts';
import { decisionBundle } from '../src/exports.ts';

test('export captures context, selection and all diagrams at a single isolated revision', () => {
  const session = new DecisionSession(sample('greenfield'));
  session.setContext({ title: 'Customer project', specification: 'Contains ``` fenced text.', inputOrigin: 'user', confirmed: true });
  session.select('cloud');
  const bundle = decisionBundle(session);
  const version = session.snapshot.version;
  assert.equal(bundle.schema, 'architecture-decision-bundle.v2');
  assert.equal(bundle.snapshot.selection, 'cloud');
  assert.deepEqual(bundle.context, bundle.backup.context);
  assert.ok(bundle.markdown.includes('Customer project'));
  assert.ok(bundle.markdown.includes('````text'));
  assert.ok(bundle.markdown.includes(`decision v${version}`));
  assert.ok(bundle.markdown.includes('User selection (recorded separately): cloud'));
  for (const svg of Object.values(bundle.diagrams)) assert.ok(svg.includes(`decision v${version}`));
  assert.deepEqual(Object.keys(bundle.diagrams).sort(), ['cloud', 'hybrid', 'on-premise']);
  session.setContext({ ...session.context, title: 'Later revision' });
  assert.equal(bundle.context.title, 'Customer project');
  assert.equal(bundle.snapshot.version, version);
  const restored = new DecisionSession(sample('organization'));
  restored.restore(bundle.backup);
  assert.equal(restored.context.title, 'Customer project');
  assert.equal(restored.snapshot.selection, 'cloud');
});

test('diagram and markdown agree on component boundaries, states and versions', () => {
  const session = new DecisionSession(sample('organization'));
  const bundle = decisionBundle(session);
  for (const assessment of bundle.snapshot.assessments) {
    const svg = bundle.diagrams[assessment.variant.id];
    assert.ok(svg.includes(`State: ${assessment.state.toUpperCase()}`));
    for (const component of assessment.components.filter((entry) => entry.present)) {
      assert.ok(svg.includes(component.boundary), `${assessment.variant.id} diagram lists ${component.boundary}`);
      assert.ok(bundle.markdown.includes(`| ${component.label} | ${component.kind} | ${component.boundary} |`));
    }
    assert.ok(bundle.markdown.includes(`## ${assessment.variant.label}: ${assessment.state.toUpperCase()}`));
  }
  assert.ok(bundle.markdown.includes(`Catalogue: ${bundle.snapshot.catalogueVersion}`));
});

test('user text cannot inject markdown structure or markup into the record', () => {
  const session = new DecisionSession(sample('greenfield'));
  session.setContext({ title: '# Injected <script>', specification: '<img src=x onerror=alert(1)>', inputOrigin: 'user', confirmed: false });
  const bundle = decisionBundle(session);
  assert.ok(bundle.markdown.includes('Title: \\# Injected &lt;script\\>'));
  const fenceStart = bundle.markdown.indexOf('```text');
  const fenceEnd = bundle.markdown.lastIndexOf('```');
  const raw = bundle.markdown.indexOf('\n# Injected');
  assert.ok(fenceStart > 0 && raw > fenceStart && raw < fenceEnd, 'raw user text only appears inside the code fence');
  for (const svg of Object.values(bundle.diagrams)) assert.ok(!svg.includes('<script'));
});
