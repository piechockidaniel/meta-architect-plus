import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { WorkspacePresenter, presenterPanelNames } from '../src/presenter.ts';
import { DecisionSession } from '../src/session.ts';
import { sample } from '../src/decision.ts';
import { decisionBundle } from '../src/exports.ts';
import { applicableQuestions } from '../src/intake.ts';
import type { PanelName, UiElement, UiPanel, WorkspaceHost } from '../src/ui-host.ts';

class FakeElement implements UiElement {
  properties: Record<string, unknown> = {};
  listeners = new Set<() => void>();
  setProperties(properties: Record<string, unknown>): void {
    Object.assign(this.properties, properties);
  }
  addEventListener(_type: 'click', listener: () => void): void {
    this.listeners.add(listener);
  }
  removeEventListener(_type: 'click', listener: () => void): void {
    this.listeners.delete(listener);
  }
  click(): void {
    for (const listener of [...this.listeners]) listener();
  }
}

class FakePanel implements UiPanel {
  elements = new Map<string, FakeElement>();
  visible = true;
  requireElementById(id: string): FakeElement {
    let element = this.elements.get(id);
    if (!element) {
      element = new FakeElement();
      this.elements.set(id, element);
    }
    return element;
  }
  setVisible(visible: boolean): void {
    this.visible = visible;
  }
}

function harness(path: 'organization' | 'greenfield' = 'greenfield', options: { inboxFails?: boolean; saved?: string | null; storageFails?: boolean } = {}) {
  const panels = new Map<PanelName, FakePanel>(presenterPanelNames.map((name) => [name, new FakePanel()]));
  const log: string[] = [];
  let stored: string | null = options.saved ?? null;
  const host: WorkspaceHost = {
    decisionLocked: () => log.push('decision-locked'),
    panel: (name) => panels.get(name)!,
    xr: { available: true, launch: () => log.push('launch'), exit: () => log.push('exit') },
    recenter: () => log.push('recenter'),
    setTextScale: (scale) => log.push(`scale:${scale}`),
    storage: { load: () => stored, save: (value) => { if (options.storageFails) throw new Error('denied'); stored = value; }, remove: () => { if (options.storageFails) throw new Error('denied'); stored = null; } },
    exports: {
      inbox: async (bundle) => {
        log.push(`inbox:${bundle.snapshot.version}`);
        if (options.inboxFails) throw new Error('export inbox unavailable');
        return { code: 'ABCD-EFGH', url: 'https://host/exports/ABCD-EFGH', expiresAt: '2026-10-12T00:00:00.000Z' };
      },
      download: (_content, _type, name) => {
        log.push(`download:${name}`);
        return true;
      },
      remove: async (code) => {
        log.push(`remove:${code}`);
        return true;
      },
    },
  };
  const presenter = new WorkspacePresenter(host, new DecisionSession(sample(path)));
  presenter.bind();
  const click = (name: PanelName, id: string) => panels.get(name)!.requireElementById(id).click();
  const text = (name: PanelName, id: string) => String(panels.get(name)!.requireElementById(id).properties.text ?? '');
  const prop = (name: PanelName, id: string, key: string) => panels.get(name)!.requireElementById(id).properties[key];
  return { presenter, panels, log, click, text, prop, stored: () => stored };
}

test('focused carousel hides competing surfaces and browsing never edits the decision', () => {
  const h = harness();
  h.presenter.focusedMode = true; h.presenter.focusStep = 'browse'; h.presenter.render();
  const before = h.presenter.session.backup();
  for (const name of presenterPanelNames) assert.equal(h.panels.get(name)!.visible, name === 'carousel');
  assert.equal(h.presenter.diagramModel().visible, false);
  h.click('carousel', 'fc-down'); h.click('carousel', 'fc-right');
  assert.equal(h.presenter.carousel.variant, 1); assert.equal(h.presenter.carousel.section, 1);
  assert.deepEqual(h.presenter.session.backup(), before);
  assert.match(h.text('carousel', 'fc-subtitle'), /COST/);
  assert.match(h.text('carousel', 'fc-line-0'), /Unpriced/);
});

test('focused decision rejects conditional selection and allows explicit uncertainty with export', async () => {
  const h = harness('organization'); h.presenter.focusedMode = true;
  h.presenter.focusStep = 'browse'; h.presenter.carousel.variant = 2; h.presenter.render();
  h.click('carousel', 'fc-primary');
  assert.equal(h.presenter.focusStep, 'decide');
  assert.equal(h.prop('carousel', 'fc-primary', 'disabled'), true);
  h.click('carousel', 'fc-secondary');
  assert.equal(h.presenter.focusStep, 'export'); assert.equal(h.presenter.session.snapshot.selection, null);
  h.click('carousel', 'fc-primary'); await Promise.resolve(); await Promise.resolve();
  assert.equal(h.presenter.exportState.status, 'ready');
});

test('focused sample acknowledgement and answer steps preserve explicit unknown choices', () => {
  const h = harness(); h.presenter.focusedMode = true; h.presenter.render();
  h.click('carousel', 'fc-primary');
  for (let i = 0; i < 20 && h.presenter.focusStep === 'summary'; i++) h.click('carousel', 'fc-primary');
  assert.equal(h.presenter.focusStep, 'questions'); assert.equal(h.presenter.session.context.confirmed, true);
  // Unknown remains an explicit choice; cycling alone does not commit.
  const before = h.presenter.session.snapshot.version;
  const questions = applicableQuestions(h.presenter.session.snapshot.inputs);
  h.presenter.questionIndex = questions.findIndex(question => question.key === 'deployment'); h.presenter.render();
  const question = questions[h.presenter.questionIndex];
  for (let index = 0; index < question.choices.length; index++) assert.equal(h.prop('carousel', `fc-answer-${index}`, 'display'), 'flex');
  h.click('carousel', `fc-answer-${question.choices.findIndex(choice => choice.value === 'unknown')}`);
  assert.equal(h.presenter.session.snapshot.version, before);
  h.click('carousel', 'fc-primary');
  assert.equal(h.presenter.session.snapshot.inputs[question.key], 'unknown');
  for (let i = 0; i < 20 && h.presenter.focusStep === 'questions'; i++) h.click('carousel', 'fc-primary');
  assert.equal(h.presenter.focusStep, 'browse');
});

test('captured answer stays a draft; AI qualification requires consent and explicit confirmation', async () => {
  const h = harness(); let calls = 0;
  const host = (h.presenter as any).host as WorkspaceHost;
  host.questionAi = { available: true, qualify: async () => { calls++; return { value: 'growth', quote: 'growth' }; } };
  h.presenter.focusedMode = true; h.presenter.focusStep = 'questions'; h.presenter.render();
  const before = h.presenter.session.snapshot.version;
  h.click('carousel', 'fc-secondary');
  assert.equal(h.presenter.keyboard.entry?.field, 'answer');
  h.presenter.keyboard.entry = { ...h.presenter.keyboard.entry!, value: 'expect growth' };
  h.click('keyboard', 'entry-done');
  assert.equal(calls, 0); assert.equal(h.presenter.focusStep, 'assist');
  h.click('carousel', 'fc-primary'); await Promise.resolve(); await Promise.resolve();
  assert.equal(calls, 1); assert.equal(h.presenter.answerDraft?.state, 'proposal');
  assert.equal(h.presenter.session.snapshot.version, before);
  h.click('carousel', 'fc-primary'); // selects a proposal only
  assert.equal(h.presenter.session.snapshot.version, before);
  h.click('carousel', 'fc-primary'); // records the selected answer
  assert.equal(h.presenter.session.snapshot.inputs.usage, 'growth');
});

test('ambiguous and stale AI answers do not qualify or mutate the session', async () => {
  const h = harness();
  const host = (h.presenter as any).host as WorkspaceHost;
  let resolve: (result: { question: string }) => void = () => undefined;
  host.questionAi = { available: true, qualify: () => new Promise(done => { resolve = done; }) };
  h.presenter.focusedMode = true; h.presenter.focusStep = 'questions'; h.presenter.render();
  h.presenter.captureAnswer(); h.presenter.keyboard.entry = { ...h.presenter.keyboard.entry!, value: 'maybe' }; h.click('keyboard', 'entry-done');
  const before = h.presenter.session.snapshot.version;
  const pending = h.presenter.qualifyAnswer(); resolve({ question: 'Launch or growth?' }); await pending;
  assert.equal(h.presenter.answerDraft?.state, 'clarify'); assert.equal(h.presenter.session.snapshot.version, before);
  const stale = h.presenter.qualifyAnswer(); h.presenter.session.setRationale('changed'); resolve({ question: 'Clarify?' }); await stale;
  assert.equal(h.presenter.session.snapshot.inputs.usage, 'launch');
  h.click('carousel', 'fc-back'); assert.equal(h.presenter.answerDraft, null);
});

test('focused viable selection is acknowledged, explicit, and distinct from browsing', () => {
  const h = harness(); h.presenter.focusedMode = true; h.presenter.confirmContext();
  h.presenter.focusStep = 'browse'; h.presenter.render();
  h.click('carousel', 'fc-primary'); assert.equal(h.presenter.session.snapshot.selection, null);
  assert.equal(h.log.includes('decision-locked'), false);
  h.click('carousel', 'fc-primary');
  assert.equal(h.log.filter(entry => entry === 'decision-locked').length, 1);
  assert.equal(h.presenter.session.snapshot.selection, 'cloud'); assert.equal(h.presenter.focusStep, 'export');
  h.click('carousel', 'fc-secondary'); assert.equal(h.presenter.focusStep, 'browse');
  h.click('carousel', 'fc-back'); assert.equal(h.presenter.focusStep, 'questions');
});

test('focused menu preserves navigation, exposes session/comfort operations, and opens advanced on demand', () => {
  const h = harness(); h.presenter.focusedMode = true; h.presenter.focusStep = 'browse'; h.presenter.render();
  h.click('carousel', 'fc-menu'); h.click('carousel', 'fc-primary');
  assert.ok(h.log.includes('launch'));
  h.click('carousel', 'fc-secondary'); h.click('carousel', 'fc-primary'); assert.ok(h.log.includes('recenter'));
  h.click('carousel', 'fc-secondary'); h.click('carousel', 'fc-primary'); assert.ok(h.log.includes('scale:1.2'));
  h.click('carousel', 'fc-close'); assert.equal(h.presenter.focusStep, 'browse');
  h.click('carousel', 'fc-menu');
  for (let i = 0; i < 3; i++) h.click('carousel', 'fc-secondary');
  h.click('carousel', 'fc-primary'); assert.equal(h.presenter.focusedMode, false);
  assert.equal(h.panels.get('carousel')!.visible, false);
});

test('spatial text renders typographic dashes without changing project data or exports', () => {
  const h = harness();
  const context = {
    title: 'Customer portal \u2013 launch',
    specification: 'Frontend \u2014 API \u2013 database. Keep Za\u017c\u00f3\u0142\u0107 unchanged.',
    inputOrigin: 'user' as const,
    confirmed: true,
  };
  h.presenter.session.setContext(context);
  h.click('decision', 'dp-start');
  assert.equal(h.text('decision', 'dp-product-title'), 'Customer portal - launch');
  assert.equal(h.text('decision', 'dp-product-spec'), 'Frontend - API - database. Keep Za\u017c\u00f3\u0142\u0107 unchanged.');
  assert.deepEqual(h.presenter.session.context, context);
  const bundle = decisionBundle(h.presenter.session);
  assert.deepEqual(bundle.context, context);
  assert.deepEqual(bundle.backup.context, context);
  assert.ok(bundle.markdown.includes(context.title));
  assert.ok(bundle.markdown.includes(context.specification));
  h.presenter.dispose();
});

test('first five minutes: start, confirm, answer, compare, change, inspect, review, export', async () => {
  const h = harness('organization');
  assert.equal(h.presenter.stage, 'start');
  assert.equal(h.panels.get('graph-cloud')!.visible, false);
  h.click('decision', 'dp-start');
  assert.equal(h.presenter.stage, 'product');
  assert.match(h.text('decision', 'dp-fact-line-0'), /constraint|assumption/);
  h.click('decision', 'dp-confirm');
  assert.equal(h.presenter.session.context.confirmed, true);
  assert.equal(h.presenter.stage, 'requirements');
  assert.match(h.text('decision', 'dp-question-title'), /^A1\./);
  h.click('decision', 'dp-answer-4'); // deployment unknown
  assert.equal(h.presenter.session.snapshot.inputs.deployment, 'unknown');
  assert.match(h.text('decision', 'dp-status'), /reevaluated/);
  assert.match(h.text('decision', 'dp-question-suggested-label'), /mandatory unknown/);
  h.click('decision', 'dp-answer-0'); // back to open
  h.click('decision', 'dp-go-compare');
  assert.equal(h.presenter.stage, 'compare');
  assert.equal(h.panels.get('graph-cloud')!.visible, true);
  assert.equal(h.prop('decision', 'dp-state-cloud', 'label'), 'X EXCLUDED');
  assert.equal(h.prop('decision', 'dp-state-on-premise', 'label'), 'OK VIABLE');
  // Scenario change workflow: select input -> propose value -> preview -> apply -> highlighted consequences.
  h.click('decision', 'dp-change-dataLocation');
  assert.equal(h.presenter.changing, 'dataLocation');
  h.click('decision', 'dp-value-0'); // open
  assert.equal(h.presenter.pending?.proposedValue, 'open');
  assert.match(h.text('decision', 'dp-pending-line-0'), /Existing: Must stay on-site -> Proposed: Open \(hard constraint\)/);
  const versionBefore = h.presenter.session.snapshot.version;
  h.click('decision', 'dp-pending-apply');
  assert.equal(h.presenter.session.snapshot.version, versionBefore + 1);
  assert.equal(h.presenter.pending, null);
  assert.equal(h.presenter.highlightChange, true);
  assert.match(h.text('graph-cloud', 'ag-node-database-label'), /^\* /);
  assert.equal(h.prop('graph-cloud', 'ag-node-database', 'borderWidth'), 3);
  assert.match(h.text('decision', 'dp-last-change-line-0'), /Cause: Database location/);
  h.click('decision', 'dp-last-change-keep');
  assert.equal(h.presenter.highlightChange, false);
  assert.doesNotMatch(h.text('graph-cloud', 'ag-node-database-label'), /^\* /);
  // Component inspection opens the detail panel with purpose, owner, dependencies, evidence.
  h.click('graph-hybrid', 'ag-node-connectivity');
  assert.deepEqual(h.presenter.focus, { kind: 'component', variant: 'hybrid', id: 'connectivity' });
  assert.equal(h.panels.get('detail')!.visible, true);
  assert.match(h.text('detail', 'dt-title'), /Connectivity \(Hybrid\)/);
  assert.match(h.text('detail', 'dt-line-2'), /^Owner:/);
  h.click('detail', 'dt-action-0'); // highlight requirement
  assert.equal(h.presenter.focus?.kind, 'requirement');
  assert.match(h.text('graph-hybrid', 'ag-node-connectivity-label'), /> /);
  h.click('detail', 'dt-close');
  assert.equal(h.presenter.focus, null);
  // Failure boundary cycles authored scenarios.
  h.click('graph-on-premise', 'ag-failure');
  assert.deepEqual(h.presenter.focus, { kind: 'failure', variant: 'on-premise', index: 0 });
  assert.match(h.text('detail', 'dt-title'), /Site power or network failure/);
  h.click('graph-on-premise', 'ag-failure');
  assert.equal((h.presenter.focus as { index: number }).index, 1);
  // Review, selection rules and export.
  h.click('decision', 'dp-stage-review');
  h.click('decision', 'dp-select-cloud');
  assert.equal(h.presenter.session.snapshot.selection, null);
  assert.match(h.text('decision', 'dp-status'), /Resolve conditional/);
  h.click('decision', 'dp-select-on-premise');
  assert.equal(h.presenter.session.snapshot.selection, 'on-premise');
  await h.presenter.exportToInbox();
  assert.equal(h.presenter.exportState.status, 'ready');
  assert.match(h.text('decision', 'dp-export-line-0'), /Retrieval code: ABCD-EFGH/);
  assert.ok(h.log.some((entry) => entry.startsWith('inbox:')));
  assert.ok(h.stored()?.includes('architecture-session.v1'));
});

test('selection that does not exist in the catalogue cannot be recorded on hidden graphs', () => {
  const h = harness();
  h.click('graph-cloud', 'ag-node-database'); // graphs hidden at start
  assert.equal(h.presenter.focus, null);
});

test('contradiction banner offers both corrections', () => {
  const h = harness('organization');
  h.click('decision', 'dp-start');
  h.click('decision', 'dp-confirm');
  h.click('decision', 'dp-answer-1'); // deployment cloud vs on-site data
  assert.equal(h.prop('decision', 'dp-conflict', 'display'), 'flex');
  assert.match(h.text('decision', 'dp-conflict-text'), /Cloud deployment is mandated/);
  h.click('decision', 'dp-conflict-fix-1');
  assert.match(h.text('decision', 'dp-question-title'), /A4\./);
  assert.equal(h.presenter.session.snapshot.recommendation, null);
});

test('undo, pause, help, text size and recenter controls', () => {
  const h = harness();
  h.click('decision', 'dp-start');
  h.click('decision', 'dp-confirm');
  h.click('decision', 'dp-answer-1');
  const version = h.presenter.session.snapshot.version;
  h.click('controls', 'cp-undo');
  assert.equal(h.presenter.session.snapshot.version, version + 1);
  assert.equal(h.presenter.session.snapshot.inputs.usage, 'launch');
  h.click('controls', 'cp-pause');
  assert.equal(h.presenter.paused, true);
  assert.equal(h.panels.get('decision')!.visible, false);
  h.click('decision', 'dp-go-compare');
  assert.equal(h.presenter.stage, 'requirements');
  h.click('controls', 'cp-pause');
  assert.equal(h.presenter.paused, false);
  h.click('controls', 'cp-help');
  assert.equal(h.presenter.focus?.kind, 'help');
  assert.match(h.text('detail', 'dt-line-6'), /Lost hand tracking/);
  h.click('controls', 'cp-text');
  assert.deepEqual(h.log.filter((entry) => entry.startsWith('scale')), ['scale:1.2']);
  assert.equal(h.text('controls', 'cp-text-label'), 'Text size 120%');
  h.click('controls', 'cp-recenter');
  assert.ok(h.log.includes('recenter'));
});

test('tracking loss and interrupted sessions are announced without confirming anything', () => {
  const h = harness();
  h.presenter.setImmersive(true);
  assert.equal(h.prop('controls', 'cp-exit', 'display'), 'flex');
  h.presenter.setTrackingLost(true);
  assert.match(h.text('controls', 'cp-alert'), /No hands or controllers tracked/);
  h.presenter.setTrackingLost(false);
  h.presenter.setBlurred(true);
  assert.equal(h.presenter.paused, true);
  h.presenter.setImmersive(false);
  assert.equal(h.presenter.interrupted, true);
  assert.match(h.text('controls', 'cp-alert'), /interrupted/);
  assert.equal(h.presenter.session.snapshot.version, 1);
});

test('export failure keeps the decision and offers the download route', async () => {
  const h = harness('greenfield', { inboxFails: true });
  h.click('decision', 'dp-start');
  h.click('decision', 'dp-stage-review');
  await h.presenter.exportToInbox();
  assert.equal(h.presenter.exportState.status, 'failed');
  assert.match(h.text('decision', 'dp-export-line-1'), /download/i);
  h.click('decision', 'dp-export-download');
  assert.equal(h.log.filter((entry) => entry.startsWith('download:')).length, 5);
});

test('saved project can be resumed from the start screen', () => {
  const first = harness('organization');
  first.click('decision', 'dp-start');
  first.click('decision', 'dp-confirm');
  const saved = first.stored();
  const second = harness('greenfield', { saved });
  assert.equal(second.prop('decision', 'dp-resume', 'display'), 'flex');
  second.click('decision', 'dp-resume');
  assert.equal(second.presenter.session.snapshot.inputs.path, 'organization');
  assert.equal(second.presenter.stage, 'compare');
  const broken = harness('greenfield', { saved: '{"backup":{"schema":"other"}}' });
  broken.click('decision', 'dp-resume');
  assert.match(broken.text('decision', 'dp-status'), /could not be restored/);
  assert.equal(broken.presenter.session.snapshot.inputs.path, 'greenfield');
});

test('switching entry path keeps user answers but reloads sample facts for samples', () => {
  const h = harness('greenfield');
  h.click('decision', 'dp-start');
  h.click('decision', 'dp-path-organization');
  assert.equal(h.presenter.session.snapshot.inputs.dataLocation, 'on-premise');
  h.presenter.session.updateProject({ ...h.presenter.session.snapshot.inputs, dataLocation: 'open' }, { ...h.presenter.session.context, inputOrigin: 'user' });
  h.click('decision', 'dp-path-greenfield');
  assert.equal(h.presenter.session.snapshot.inputs.path, 'greenfield');
  assert.equal(h.presenter.session.snapshot.inputs.identity, 'organizational');
});

test('template library opens a walk-through and keeps undo available', () => {
  const h = harness('greenfield');
  h.click('decision', 'dp-start');
  assert.match(h.text('decision', 'dp-template-title'), /^Template 1 of/);
  h.click('decision', 'dp-template-next');
  h.click('decision', 'dp-template-next');
  h.click('decision', 'dp-template-open');
  assert.equal(h.presenter.session.context.title, 'Hybrid pilot (template)');
  assert.equal(h.presenter.session.snapshot.inputs.connectivity, 'verified');
  assert.equal(h.presenter.focus?.kind, 'walkthrough');
  assert.match(h.text('detail', 'dt-line-2'), /^Step 1:/);
  h.click('detail', 'dt-action-0');
  assert.equal(h.presenter.stage, 'compare');
  h.click('controls', 'cp-undo');
  assert.equal(h.presenter.session.context.title, 'Startup business application (sample)');
});

test('workload buttons add generic blocks that appear in every diagram with examples in the detail panel', () => {
  const h = harness('greenfield');
  h.click('decision', 'dp-start');
  h.click('decision', 'dp-workload-storage');
  assert.deepEqual(h.presenter.session.snapshot.inputs.workload, ['storage']);
  assert.equal(h.text('decision', 'dp-workload-storage-label'), '- File storage');
  assert.match(h.text('detail', 'dt-title'), /File storage \(Cloud\)/);
  assert.match(h.text('detail', 'dt-line-5'), /Examples: Uploaded contracts/);
  h.click('decision', 'dp-go-compare');
  assert.equal(h.prop('graph-hybrid', 'ag-node-storage', 'display'), 'flex');
  assert.equal(h.text('graph-hybrid', 'ag-node-storage-sub'), 'Organization site');
  assert.equal(h.prop('graph-hybrid', 'ag-node-jobs', 'display'), 'none');
  h.click('detail', 'dt-action-1'); // remove from the workflow
  assert.deepEqual(h.presenter.session.snapshot.inputs.workload, []);
  assert.equal(h.prop('graph-hybrid', 'ag-node-storage', 'display'), 'none');
});

test('data controls: delete the server export early and forget the local copy', async () => {
  const h = harness('greenfield');
  h.click('decision', 'dp-start');
  h.click('decision', 'dp-confirm');
  h.click('decision', 'dp-stage-review');
  await h.presenter.exportToInbox();
  assert.equal(h.prop('decision', 'dp-export-delete', 'display'), 'flex');
  await h.presenter.deleteServerExport();
  assert.equal(h.presenter.exportState.status, 'deleted');
  assert.ok(h.log.includes('remove:ABCD-EFGH'));
  assert.equal(h.prop('decision', 'dp-export-delete', 'display'), 'none');
  assert.ok(h.stored() !== null);
  h.click('decision', 'dp-delete-local');
  assert.equal(h.stored(), null);
});

test('storage denial remains visible after an action and deletion never claims success', () => {
  const h = harness('greenfield', { storageFails: true });
  h.click('decision', 'dp-start'); h.click('decision', 'dp-confirm');
  assert.ok(h.text('decision', 'dp-status').includes('storage unavailable'));
  h.presenter.deleteLocalCopy();
  assert.ok(h.presenter.statusText.includes('could not be deleted'));
});

test('keyboard modal hides the decision panel and returns after cancel', () => {
  const h = harness(); h.click('decision', 'dp-start'); h.click('decision', 'dp-edit-title');
  assert.equal(h.panels.get('keyboard')!.visible, true);
  assert.equal(h.panels.get('decision')!.visible, false);
  h.click('keyboard', 'entry-cancel');
  assert.equal(h.panels.get('keyboard')!.visible, false);
  assert.equal(h.panels.get('decision')!.visible, true);
});
