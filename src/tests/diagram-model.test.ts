import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { ISLAND, islandOffset, layoutVariant } from '../src/diagram-model.ts';
import { WorkspacePresenter } from '../src/presenter.ts';
import { DecisionSession } from '../src/session.ts';
import { sample } from '../src/decision.ts';
import { templateById } from '../src/templates.ts';
import type { DiagramModel, DiagramVariantModel } from '../src/diagram-model.ts';
import type { PanelName, UiElement, UiPanel, WorkspaceHost } from '../src/ui-host.ts';

class NullElement implements UiElement {
  setProperties(): void {}
  addEventListener(): void {}
  removeEventListener(): void {}
}
class NullPanel implements UiPanel {
  requireElementById(): UiElement { return new NullElement(); }
  setVisible(): void {}
}

function presenterWithDiagram(inputs = sample('organization')) {
  const models: DiagramModel[] = [];
  const host: WorkspaceHost = {
    panel: (_name: PanelName) => new NullPanel(),
    diagram: { update: (model) => { models.push(model); } },
    xr: { available: false, launch: () => undefined, exit: () => undefined },
    recenter: () => undefined,
    setTextScale: () => undefined,
    storage: { load: () => null, save: () => undefined, remove: () => undefined },
    exports: { inbox: async () => { throw new Error('n/a'); }, download: () => false, remove: async () => false },
  };
  const presenter = new WorkspacePresenter(host, new DecisionSession(inputs));
  presenter.bind();
  return { presenter, models, latest: () => models[models.length - 1] };
}

test('diagram model mirrors panel markers, is visible from the start screen and hidden only while paused', () => {
  const h = presenterWithDiagram();
  assert.equal(h.latest().visible, true, 'islands are part of the first impression');
  h.presenter.togglePause();
  assert.equal(h.latest().visible, false);
  h.presenter.togglePause();
  h.presenter.goTo('compare');
  const model = h.latest();
  assert.equal(model.visible, true);
  assert.equal(model.variants.length, 3);
  const cloud = model.variants.find((variant) => variant.id === 'cloud')!;
  assert.equal(cloud.nodes.find((node) => node.id === 'database')?.result, 'fail');
  assert.equal(cloud.nodes.find((node) => node.id === 'connectivity')?.present, false);
  const hybrid = model.variants.find((variant) => variant.id === 'hybrid')!;
  assert.ok(hybrid.links.some((link) => link.from === 'application' && link.to === 'connectivity' && link.crossesBoundary));
  h.presenter.focusComponent('hybrid', 'database');
  assert.equal(h.latest().variants.find((variant) => variant.id === 'hybrid')!.nodes.find((node) => node.id === 'database')?.focused, true);
  assert.deepEqual(h.latest().available, ['storage', 'jobs', 'cache', 'queue', 'integration']);
});

test('layout keeps the same role in the same slot across variants and places workload blocks in a row', () => {
  const h = presenterWithDiagram(templateById('document-workflow')!.inputs);
  h.presenter.goTo('compare');
  const layouts = h.latest().variants.map((variant: DiagramVariantModel) => layoutVariant(variant));
  const position = (index: number, id: string) => layouts[index].blocks.find((block) => block.id === id)!.position;
  for (const id of ['identity', 'application', 'database', 'monitoring']) {
    assert.deepEqual(position(0, id), position(1, id));
    assert.deepEqual(position(1, id), position(2, id));
  }
  const workload = layouts[0].blocks.filter((block) => ['storage', 'jobs', 'queue'].includes(block.id));
  assert.equal(workload.length, 3);
  assert.ok(new Set(workload.map((block) => block.position[2])).size === 1, 'same row');
  assert.ok(new Set(workload.map((block) => block.position[0])).size === 3, 'distinct columns');
  for (const block of layouts[0].blocks) {
    assert.ok(Math.abs(block.position[0]) <= ISLAND.width / 2 && Math.abs(block.position[2]) <= ISLAND.depth / 2, `${block.id} inside the island`);
  }
  assert.ok(layouts[2].links.some((link) => link.from === 'queue' && link.to === 'jobs'));
  assert.equal(layouts[0].blocks.find((block) => block.id === 'connectivity')?.present, false);
  assert.equal(islandOffset(0), -ISLAND.spacing);
  assert.equal(islandOffset(2), ISLAND.spacing);
});

test('dropping a block on an island is the same operation as its button', () => {
  const h = presenterWithDiagram(sample('greenfield'));
  h.presenter.goTo('compare');
  const version = h.presenter.session.snapshot.version;
  h.presenter.toggleWorkload('cache', true);
  assert.deepEqual(h.presenter.session.snapshot.inputs.workload, ['cache']);
  assert.equal(h.presenter.session.snapshot.version, version + 1);
  assert.deepEqual(h.presenter.focus, { kind: 'component', variant: 'cloud', id: 'cache' });
  h.presenter.toggleWorkload('cache', true); // dropping it again is a no-op, not a duplicate
  assert.equal(h.presenter.session.snapshot.version, version + 1);
  h.presenter.toggleWorkload('cache');
  assert.deepEqual(h.presenter.session.snapshot.inputs.workload, []);
  assert.equal(h.presenter.focus, null);
  assert.equal(h.latest().variants[0].nodes.some((node) => node.id === 'cache'), false);
});
