import { applyKey, beginEntry, parseNumericEntry } from './text-entry.js';
import type { KeyAction, TextEntryState } from './text-entry.js';
import type { DecisionSession } from './session.js';
import type { UiPanel } from './ui-host.js';
import { spatialText } from './spatial-text.js';

export const projectFields = ['title', 'specification', 'rationale', 'budget', 'hosting', 'site', 'connectivity'] as const;
export type ProjectField = typeof projectFields[number];
const labels: Record<ProjectField, string> = { title: 'Product name', specification: 'Specification', rationale: 'Why this decision', budget: 'Hard monthly budget', hosting: 'Hosting rate', site: 'Site rate', connectivity: 'Connectivity rate' };

/** Modal input adapter ported from meta-vr-glasses; the existing engine stays authoritative. */
export class ProjectKeyboard {
  entry: TextEntryState | null = null;
  private version = 0;
  private rateVersion = -1;
  private rates = { hosting: '', site: '', connectivity: '' };
  private draftDone: ((value: string) => void) | null = null;
  constructor(private session: DecisionSession, private status: (text: string) => void) {}
  begin(field: ProjectField): void {
    this.draftDone = null;
    const { inputs, version } = this.session.snapshot;
    if (this.rateVersion !== version) {
      this.rates = { hosting: String(inputs.rates?.hosting ?? ''), site: String(inputs.rates?.site ?? ''), connectivity: String(inputs.rates?.connectivity ?? '') };
      this.rateVersion = version;
    }
    const text = field === 'title' || field === 'specification' || field === 'rationale';
    const value = text ? this.session.context[field] ?? '' : field === 'budget' ? String(inputs.budget ?? '') : this.rates[field];
    this.version = version;
    this.entry = beginEntry(field, labels[field], text ? 'text' : 'numeric', value, { maxLength: field === 'title' ? 160 : field === 'rationale' ? 4000 : text ? 16000 : 18 });
  }
  key(action: KeyAction): void { if (this.entry) this.entry = applyKey(this.entry, action); }
  beginDraft(label: string, value: string, done: (value: string) => void): void {
    this.version = this.session.snapshot.version;
    this.draftDone = done;
    this.entry = beginEntry('answer', label, 'text', value, { maxLength: 2000 });
  }
  cancel(): void { this.entry = null; this.draftDone = null; this.status('Edit cancelled. Confirmed project unchanged.'); }
  done(): void {
    if (!this.entry) return;
    if (this.version !== this.session.snapshot.version) throw new Error('Project changed while editing. Cancel and reopen this field.');
    if (this.entry.field === 'answer') {
      const value = this.entry.value, done = this.draftDone;
      this.entry = null; this.draftDone = null;
      done?.(value);
      return;
    }
    const { value } = this.entry, field = this.entry.field as ProjectField;
    const inputs = this.session.snapshot.inputs;
    if (field === 'rationale') this.session.setRationale(value);
    else if (field === 'title' || field === 'specification') {
      this.session.updateProject(inputs, { ...this.session.context, [field]: value, inputOrigin: 'user', confirmed: false });
    } else {
      const parsed = parseNumericEntry(value);
      if (!parsed.ok) throw new Error(parsed.reason);
      if (field === 'budget') this.session.updateProject({ ...inputs, budget: parsed.value }, { ...this.session.context, confirmed: false });
      else {
        this.rates[field] = value;
        const amounts = Object.values(this.rates).map(value => parseNumericEntry(value));
        if (amounts.some(amount => !amount.ok)) throw new Error('Invalid rate draft.');
        const complete = Object.values(this.rates).every(Boolean), empty = Object.values(this.rates).every(value => !value);
        if (!complete && !empty) {
          this.entry = null;
          this.status(`Rate draft: hosting ${this.rates.hosting || '?'}, site ${this.rates.site || '?'}, link ${this.rates.connectivity || '?'}. Fill all three (zero is allowed) to commit; current prices unchanged.`);
          return;
        }
        this.session.updateProject({ ...inputs, rates: empty ? null : { hosting: Number(this.rates.hosting), site: Number(this.rates.site), connectivity: Number(this.rates.connectivity) } }, { ...this.session.context, confirmed: false });
        this.rateVersion = this.session.snapshot.version;
      }
    }
    this.entry = null;
    this.status(field === 'rationale' ? 'Rationale saved. Selection retained.' : 'Project updated. Review and confirm the changed assumptions.');
  }
  render(panel: UiPanel, error: string): void {
    const text = (id: string, value: string) => panel.requireElementById(id).setProperties({ text: spatialText(value) });
    const entry = this.entry;
    text('entry-label', entry?.label ?? 'Project field');
    text('entry-value', `${entry?.value.slice(-80) ?? ''}|`);
    text('entry-hint', error || (entry?.field === 'answer' ? 'Type or dictate. Done captures only a draft; Cancel discards.' : entry?.mode === 'numeric' ? 'Non-negative amount. Empty clears. Done applies; Cancel discards.' : 'Select keys. Done applies; Cancel discards.'));
    panel.requireElementById('keys-letters').setProperties({ display: entry?.mode === 'numeric' ? 'none' : 'flex' });
    for (const letter of 'abcdefghijklmnopqrstuvwxyz') text(`key-label-${letter}`, entry?.shift ? letter.toUpperCase() : letter);
    for (const [id, visible] of [['key-shift-off', !entry?.shift], ['key-shift-on', !!entry?.shift]] as const) panel.requireElementById(id).setProperties({ display: visible ? 'flex' : 'none' });
  }
}
