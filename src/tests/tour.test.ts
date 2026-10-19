import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { WorkspacePresenter, presenterPanelNames } from '../src/presenter.ts';
import { DecisionSession } from '../src/session.ts';
import { sample } from '../src/decision.ts';
import { tourSteps } from '../src/tour.ts';
import type { PanelName, UiElement, UiPanel, WorkspaceHost } from '../src/ui-host.ts';

class FakeElement implements UiElement {
  properties: Record<string, unknown> = {};
  listeners = new Set<() => void>();
  setProperties(properties: Record<string, unknown>): void { Object.assign(this.properties, properties); }
  addEventListener(_type: 'click', listener: () => void): void { this.listeners.add(listener); }
  removeEventListener(_type: 'click', listener: () => void): void { this.listeners.delete(listener); }
  click(): void { for (const listener of [...this.listeners]) listener(); }
}
class FakePanel implements UiPanel {
  elements = new Map<string, FakeElement>();
  requireElementById(id: string): FakeElement {
    let element = this.elements.get(id);
    if (!element) { element = new FakeElement(); this.elements.set(id, element); }
    return element;
  }
  setVisible(): void {}
}

function harness() {
  const panels = new Map<PanelName, FakePanel>(presenterPanelNames.map((name) => [name, new FakePanel()]));
  const host: WorkspaceHost = {
    panel: (name) => panels.get(name)!,
    xr: { available: true, launch: () => undefined, exit: () => undefined },
    recenter: () => undefined,
    setTextScale: () => undefined,
    storage: { load: () => null, save: () => undefined, remove: () => undefined },
    exports: {
      inbox: async () => ({ code: 'ABCD-EFGH', url: 'https://host/exports/ABCD-EFGH', expiresAt: '2026-10-12T00:00:00.000Z' }),
      download: () => true,
      remove: async () => true,
    },
  };
  const presenter = new WorkspacePresenter(host, new DecisionSession(sample('greenfield')));
  presenter.bind();
  const click = (name: PanelName, id: string) => panels.get(name)!.requireElementById(id).click();
  const text = (name: PanelName, id: string) => String(panels.get(name)!.requireElementById(id).properties.text ?? '');
  const prop = (name: PanelName, id: string, key: string) => panels.get(name)!.requireElementById(id).properties[key];
  return { presenter, click, text, prop };
}

test('the tour runs on a sandboxed sample and restores the previous project on exit', async () => {
  const h = harness();
  h.presenter.session.setContext({ ...h.presenter.session.context, title: 'My real project', inputOrigin: 'user', confirmed: true });
  h.click('decision', 'dp-tour-start');
  assert.ok(h.presenter.tour);
  assert.equal(h.presenter.session.context.title, 'Internal records application (template)');
  assert.equal(h.presenter.stage, 'product');
  assert.equal(h.prop('decision', 'dp-tour-block', 'display'), 'flex');
  assert.match(h.text('decision', 'dp-tour-title'), /step 1 of 9/);
  // Next without doing the step is refused; "Do it for me" performs it through normal actions.
  h.click('decision', 'dp-tour-next');
  assert.equal(h.presenter.tour?.stepIndex, 0);
  assert.match(h.text('decision', 'dp-status'), /not done yet/);
  h.click('decision', 'dp-tour-perform');
  assert.equal(h.presenter.session.context.confirmed, true);
  assert.match(h.text('decision', 'dp-tour-line-2'), /^Done/);
  h.click('decision', 'dp-tour-next');
  assert.equal(h.presenter.tour?.stepIndex, 1);
  // Every remaining step can be completed through its own perform().
  for (let index = 1; index < tourSteps.length; index++) {
    assert.equal(h.presenter.tourStepDone(), false, `${tourSteps[index].id} starts undone`);
    h.click('decision', 'dp-tour-perform');
    if (tourSteps[index].id === 'export') await new Promise((resolve) => setTimeout(resolve, 0));
    h.presenter.render();
    assert.equal(h.presenter.tourStepDone(), true, `${tourSteps[index].id} done after perform`);
    h.click('decision', 'dp-tour-next');
  }
  assert.equal(h.presenter.tour?.completed, true);
  assert.match(h.text('decision', 'dp-tour-title'), /complete/);
  h.click('controls', 'cp-tour');
  assert.equal(h.presenter.tour, null);
  assert.equal(h.presenter.session.context.title, 'My real project');
  assert.equal(h.presenter.session.context.confirmed, true);
  assert.equal(h.presenter.stage, 'start');
});

test('the tour never overwrites the saved real project, even if it is interrupted without exiting', () => {
  let stored: string | null = null;
  const host: WorkspaceHost = {
    panel: () => new FakePanel(),
    xr: { available: true, launch: () => undefined, exit: () => undefined },
    recenter: () => undefined,
    setTextScale: () => undefined,
    storage: { load: () => stored, save: (value) => { stored = value; }, remove: () => { stored = null; } },
    exports: { inbox: async () => { throw new Error('n/a'); }, download: () => false, remove: async () => false },
  };
  const first = new WorkspacePresenter(host, new DecisionSession(sample('greenfield')));
  first.bind();
  first.session.setContext({ ...first.session.context, title: 'My real project', inputOrigin: 'user', confirmed: true });
  const realProjectSnapshot = JSON.parse(stored!);
  assert.equal(realProjectSnapshot.touring, false);
  assert.equal(realProjectSnapshot.backup.context.title, 'My real project');

  // Start the tour and perform a step: storage must keep the real project, not the tour sample.
  first.startTour();
  assert.ok(first.tour);
  const whileTouring = JSON.parse(stored!);
  assert.equal(whileTouring.touring, true);
  assert.equal(whileTouring.backup.context.title, 'My real project', 'storage is not overwritten by the tour template');
  tourSteps[0].perform(first);
  const afterStep = JSON.parse(stored!);
  assert.equal(afterStep.backup.context.title, 'My real project', 'storage stays untouched after a tour action changes the session');

  // Simulate a crash: no exitTour(), a fresh presenter loads whatever is in storage.
  const second = new WorkspacePresenter(host, new DecisionSession(sample('organization')));
  second.bind();
  assert.match(second.statusText, /ended during a guided tour/);
  second.resumeSaved();
  assert.equal(second.session.context.title, 'My real project');
  assert.equal(second.session.context.inputOrigin, 'user');
  assert.equal(second.tour, null);
});

test('a skipped step moves on and the user can do steps by hand', () => {
  const h = harness();
  h.click('decision', 'dp-tour-start');
  h.click('decision', 'dp-tour-skip');
  assert.equal(h.presenter.tour?.stepIndex, 1);
  h.click('decision', 'dp-stage-requirements');
  h.click('decision', 'dp-answer-4');
  assert.equal(h.presenter.tourStepDone(), true);
  assert.equal(h.prop('decision', 'dp-tour-perform', 'display'), 'none');
});
