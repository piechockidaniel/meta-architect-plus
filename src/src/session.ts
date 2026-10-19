/**
 * Versioned decision session: confirmed snapshots, previews, undo history,
 * selection and validated backup/restore. Presentation code never mutates a
 * snapshot directly.
 */
import { evaluate, restoreInputs, upgradeInputs, valueLabel, inputDefinitions } from './decision.js';
import type { ChoiceKey, Deployment, Inputs, Snapshot } from './decision.js';
import { describeChanges } from './changes.js';
import type { ChangeSummary } from './changes.js';
import { sampleContext, validateContext } from './intake.js';
import type { ProjectContext } from './intake.js';

export interface SessionBackup {
  schema: 'architecture-session.v1';
  inputs: Inputs;
  context: ProjectContext;
  selection: Deployment | null;
}

export interface ChangePreview {
  key: ChoiceKey;
  label: string;
  classification: string;
  currentValue: string;
  currentLabel: string;
  proposedValue: string;
  proposedLabel: string;
  inputs: Inputs;
  preview: Snapshot;
  summary: ChangeSummary;
}

export class DecisionSession {
  snapshot: Snapshot;
  context: ProjectContext;
  /** Summary of the most recent committed change, used for consequence highlighting. */
  lastChange: ChangeSummary | null = null;
  private sequence = 1;
  private history: { snapshot: Snapshot; context: ProjectContext; lastChange: ChangeSummary | null }[] = [];
  private listeners = new Set<() => void>();

  constructor(inputs: Inputs) {
    this.snapshot = evaluate(restoreInputs(inputs), this.sequence);
    this.context = sampleContext(inputs.path);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  private remember(): void {
    this.history.push(structuredClone({ snapshot: this.snapshot, context: this.context, lastChange: this.lastChange }));
    if (this.history.length > 50) this.history.shift();
  }

  get canUndo(): boolean {
    return this.history.length > 0;
  }

  /** Evaluate a proposed single-input change without committing it. */
  preview(key: ChoiceKey, value: string): ChangePreview {
    const inputs = restoreInputs({ ...this.snapshot.inputs, [key]: value });
    const preview = evaluate(inputs, this.sequence + 1);
    return {
      key,
      label: inputDefinitions[key].label,
      classification: inputDefinitions[key].classification,
      currentValue: String(this.snapshot.inputs[key]),
      currentLabel: valueLabel(key, String(this.snapshot.inputs[key])),
      proposedValue: value,
      proposedLabel: valueLabel(key, value),
      inputs,
      preview,
      summary: describeChanges(this.snapshot, preview),
    };
  }

  apply(inputs: Inputs): void {
    const next = evaluate(restoreInputs(inputs), this.sequence + 1);
    const summary = describeChanges(this.snapshot, next);
    this.remember();
    this.snapshot = next;
    this.lastChange = summary;
    this.sequence++;
    this.notify();
  }

  updateProject(inputs: Inputs, context: ProjectContext): void {
    const next = evaluate(restoreInputs(inputs), this.sequence + 1);
    const validated = validateContext(context);
    const summary = describeChanges(this.snapshot, next);
    this.remember();
    this.snapshot = next;
    this.context = validated;
    this.lastChange = summary.causes.length > 0 ? summary : null;
    this.sequence++;
    this.notify();
  }

  setContext(context: ProjectContext): void {
    this.updateProject(this.snapshot.inputs, context);
  }

  setRationale(rationale: string): void {
    const context = validateContext({ ...this.context, rationale });
    this.remember();
    this.context = context;
    this.snapshot = { ...this.snapshot, version: ++this.sequence, createdAt: new Date().toISOString() };
    this.notify();
  }

  select(id: Deployment): void {
    if (!this.context.confirmed) {
      throw new Error('Confirm the product summary and sample assumptions before recording a decision.');
    }
    if (this.snapshot.assessments.find((assessment) => assessment.variant.id === id)?.state !== 'viable') {
      throw new Error('Resolve conditional, excluded or unsupported findings before selecting this option.');
    }
    this.remember();
    this.snapshot = { ...this.snapshot, version: ++this.sequence, createdAt: new Date().toISOString(), selection: id };
    this.notify();
  }

  /** Retain uncertainty explicitly: a provisional outcome with no selection. */
  clearSelection(): void {
    if (this.snapshot.selection === null) return;
    this.remember();
    this.snapshot = { ...this.snapshot, version: ++this.sequence, createdAt: new Date().toISOString(), selection: null };
    this.notify();
  }

  undo(): boolean {
    const previous = this.history.pop();
    if (!previous) return false;
    this.context = previous.context;
    this.snapshot = { ...previous.snapshot, version: ++this.sequence, createdAt: new Date().toISOString() };
    this.lastChange = previous.lastChange;
    this.notify();
    return true;
  }

  backup(): SessionBackup {
    return structuredClone({
      schema: 'architecture-session.v1',
      inputs: this.snapshot.inputs,
      context: this.context,
      selection: this.snapshot.selection,
    });
  }

  restore(raw: unknown): void {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid backup.');
    const data = raw as Record<string, unknown>;
    if (data.schema !== 'architecture-session.v1') throw new Error('Unsupported backup version.');
    const inputs = restoreInputs(upgradeInputs(data.inputs));
    const context = validateContext(data.context);
    if (data.selection !== null && !['cloud', 'on-premise', 'hybrid'].includes(String(data.selection))) {
      throw new Error('Invalid selection.');
    }
    const next = evaluate(inputs, this.sequence + 1);
    // Reevaluate first: stale selections cannot survive changed rules or unconfirmed context.
    if (
      context.confirmed &&
      next.assessments.some((assessment) => assessment.variant.id === data.selection && assessment.state === 'viable')
    ) {
      next.selection = data.selection as Deployment;
    }
    this.remember();
    this.context = context;
    this.snapshot = next;
    this.lastChange = null;
    this.sequence++;
    this.notify();
  }
}
