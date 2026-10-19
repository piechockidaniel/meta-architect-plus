import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { DecisionSession } from '../src/session.ts';
import { sample } from '../src/decision.ts';

test('selection requires acknowledged context and a viable architecture', () => {
  const session = new DecisionSession(sample('greenfield'));
  assert.throws(() => session.select('cloud'), /Confirm the product summary/);
  session.setContext({ ...session.context, confirmed: true });
  session.select('cloud');
  assert.equal(session.snapshot.selection, 'cloud');
  assert.throws(() => session.select('hybrid'), /Resolve conditional/);
  session.clearSelection();
  assert.equal(session.snapshot.selection, null);
});

test('preview evaluates a proposed change without committing it', () => {
  const session = new DecisionSession(sample('organization'));
  const version = session.snapshot.version;
  const preview = session.preview('dataLocation', 'open');
  assert.equal(preview.currentLabel, 'Must stay on-site');
  assert.equal(preview.proposedLabel, 'Open');
  assert.equal(preview.classification, 'hard constraint');
  assert.equal(preview.summary.variants.find((entry) => entry.id === 'cloud')?.stateAfter, 'conditional');
  assert.equal(session.snapshot.version, version);
  assert.equal(session.snapshot.inputs.dataLocation, 'on-premise');
  assert.equal(session.lastChange, null);
  session.apply(preview.inputs);
  assert.equal(session.snapshot.version, version + 1);
  assert.equal(session.lastChange?.toVersion, version + 1);
});

test('undo creates a unique version, restores the previous change summary, and future edits never reuse versions', () => {
  const session = new DecisionSession(sample('greenfield'));
  assert.equal(session.canUndo, false);
  session.apply({ ...session.snapshot.inputs, usage: 'growth' });
  const edited = session.snapshot.version;
  assert.equal(session.canUndo, true);
  session.undo();
  assert.ok(session.snapshot.version > edited);
  assert.equal(session.snapshot.inputs.usage, 'launch');
  assert.equal(session.lastChange, null);
  const undone = session.snapshot.version;
  session.apply({ ...session.snapshot.inputs, operator: 'unknown' });
  assert.ok(session.snapshot.version > undone);
  assert.equal(session.undo(), true);
  assert.equal(session.undo(), false);
});

test('backup restores context and valid selection without trusting stale evaluations', () => {
  const session = new DecisionSession(sample('greenfield'));
  session.setContext({ ...session.context, confirmed: true });
  session.select('cloud');
  const restored = new DecisionSession(sample('organization'));
  restored.restore(session.backup());
  assert.equal(restored.snapshot.selection, 'cloud');
  const backup = session.backup();
  backup.inputs.deployment = 'on-premise';
  restored.restore(backup);
  assert.equal(restored.snapshot.selection, null);
});

test('malformed import leaves current project intact', () => {
  const session = new DecisionSession(sample('organization'));
  const before = structuredClone(session.snapshot);
  assert.throws(() => session.restore({ schema: 'architecture-session.v1', inputs: sample('greenfield'), context: null, selection: null }));
  assert.throws(() => session.restore({ schema: 'other', inputs: sample('greenfield'), context: session.context, selection: null }));
  assert.deepEqual(session.snapshot, before);
});

test('older backups without identity are upgraded to unknown rather than guessed', () => {
  const session = new DecisionSession(sample('greenfield'));
  const backup = session.backup() as unknown as { inputs: Record<string, unknown> };
  delete backup.inputs.identity;
  session.restore(backup);
  assert.equal(session.snapshot.inputs.identity, 'unknown');
  assert.equal(session.snapshot.recommendation, null);
});

test('project details commit atomically and undo restores both inputs and context', () => {
  const session = new DecisionSession(sample('greenfield'));
  const before = session.backup();
  let notifications = 0;
  const off = session.subscribe(() => {
    notifications++;
  });
  session.updateProject(sample('organization'), { ...session.context, title: 'New project', inputOrigin: 'user', confirmed: true });
  assert.equal(notifications, 1);
  assert.equal(session.snapshot.version, 2);
  session.undo();
  assert.deepEqual(session.backup(), before);
  assert.equal(notifications, 2);
  const snapshot = structuredClone(session.snapshot);
  assert.throws(() => session.updateProject(sample('organization'), { ...session.context, title: '' }));
  assert.deepEqual(session.snapshot, snapshot);
  assert.deepEqual(session.backup(), before);
  assert.equal(notifications, 2);
  off();
  session.apply(sample('organization'));
  assert.equal(notifications, 2);
});
