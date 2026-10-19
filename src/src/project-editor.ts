/**
 * Browser-only preparation surface: describe your own project, supply
 * currency/budget/rates, import or delete local backups and use optional AI
 * assistance. The sample journeys never depend on it; every spatial control
 * keeps working without this form.
 */
import { restoreInputs } from './decision.js';
import type { DecisionSession } from './session.js';

interface AiStatus {
  available?: boolean;
  reason?: string;
}

interface AiSuggestion {
  field: string;
  value: string;
  quote: string;
  reason: string;
}

interface AiResponse {
  version: number;
  result: { summary?: string; suggestions?: AiSuggestion[]; questions?: string[]; explanation?: string };
}

const template = `<summary>Your project and AI (browser only)</summary>
  <p id="editor-status" role="status" aria-live="polite" class="status" hidden></p>
  <form id="project-form" novalidate>
    <p class="intro">Describe your own project here; the spatial controls then work on it exactly as on the samples. Fields marked optional can stay empty.</p>

    <label>Product name <span class="req">required</span>
      <input name="title" maxlength="160" required placeholder="e.g. Field service scheduling">
      <small class="hint">A short working title. It appears on every panel, in the saved project and in the exported decision record (up to 160 characters).</small>
    </label>

    <label>Specification <span class="opt">optional</span>
      <textarea name="specification" maxlength="16000" rows="5" placeholder="Who uses it, what they do, which data it keeps, which systems it talks to, known policies (hosting, identity, data location), budget and who will operate it."></textarea>
      <small class="hint">Plain language; 2-10 sentences is plenty. Used for your own review, and only if you tick the AI consent below, for AI to propose requirement values with quotes. Avoid personal data about third parties.</small>
    </label>

    <label>Your decision rationale (optional)
      <textarea name="rationale" maxlength="4000" rows="3" placeholder="Why you chose this option, and what remains to verify"></textarea>
    </label>
    <fieldset>
      <legend>Costs <span class="opt">optional</span></legend>
      <small class="hint">Rates are your monthly <em>assumptions</em> for the launch scenario, never provider quotes. Leave all three blank for an unpriced comparison; if you fill one, fill all three (use 0 where a rate does not apply).</small>

      <label>Currency
        <select name="currency"><option>USD</option><option>EUR</option><option>PLN</option></select>
        <small class="hint">Applies to the budget and all rates. Amounts are never converted between currencies.</small>
      </label>

      <label>Hard monthly budget
        <input name="budget" type="number" min="0" step="0.01" placeholder="e.g. 120">
        <small class="hint">Leave empty if there is no hard limit. A value here is a <strong>mandatory constraint</strong>: any option whose modeled subtotal exceeds it is excluded; within-budget subtotals stay conditional because categories such as labor and traffic are not modeled.</small>
      </label>

      <label>External hosting rate (per month)
        <input name="hosting" type="number" min="0" step="0.01" placeholder="e.g. 50">
        <small class="hint">What you expect to pay an external host for running the application and its database at launch volume. Sources: your provider's price calculator, a recent invoice, or a finance estimate. Used by the Cloud and Hybrid options.</small>
      </label>

      <label>Site rate (per month)
        <input name="site" type="number" min="0" step="0.01" placeholder="e.g. 40">
        <small class="hint">Your organization's monthly cost for hosting on site: hardware amortization, facilities, maintenance, as your platform or finance team allocates them. Used by the On-premise and Hybrid options.</small>
      </label>

      <label>Connectivity rate (per month)
        <input name="connectivity" type="number" min="0" step="0.01" placeholder="e.g. 20">
        <small class="hint">Monthly cost of the private link between an external host and your site. Only the Hybrid option uses it; enter 0 if not applicable.</small>
      </label>
    </fieldset>

    <label class="check"><input name="confirm" type="checkbox"> I reviewed this summary and the scenario assumptions.
      <small class="hint">Required before an option can be recorded as your selection. It records that you reviewed the inputs; it does not verify them.</small>
    </label>

    <div class="actions">
      <button type="submit">Apply project details</button>
      <button id="reload-project" type="button" class="secondary">Reload current project into form</button>
    </div>
  </form>

  <hr>
  <label>Restore a backup or an export bundle
    <input id="backup-file" type="file" accept=".json,application/json">
    <small class="hint">A JSON file this app produced earlier: <code>bundle.json</code> from an export, or a saved-project backup. It is validated and reevaluated with the current catalogue before replacing the session; a bad file changes nothing.</small>
  </label>
  <button id="delete-local" type="button" class="secondary">Delete local saved project</button>
  <small class="hint">Removes the autosaved copy from this browser's local storage. The project you are working on stays open until you leave the page.</small>

  <hr>
  <p id="ai-availability">Checking AI availability...</p>
  <p class="ai-setup-hint">To enable or change AI, run <code>npm run ai:setup</code> in a terminal on the machine running this server (never in the browser). It never asks for a key here.</p>
  <label class="check"><input id="ai-consent" type="checkbox"> Send this specification or current findings to the configured external AI service.
    <small class="hint">Nothing is sent until you tick this and press a button below. Proposals come back as suggestions with quotes for you to accept or ignore; explanations can only cite existing findings.</small>
  </label>
  <div class="actions">
    <button id="ai-extract" type="button">Propose requirements from specification</button>
    <button id="ai-explain" type="button">Explain current findings</button>
    <button id="ai-cancel" type="button" class="secondary">Cancel request</button>
  </div>
  <div id="ai-results"></div>`;

const styles =
  '#project-editor{position:fixed;left:12px;top:12px;z-index:20;color:#e9f3ff;background:#102132ef;border:1px solid #48667d;border-radius:12px;padding:0 12px 12px;font:14px system-ui;max-width:380px;max-height:88vh;overflow:auto}' +
  '#project-editor summary{cursor:pointer;position:sticky;top:0;background:#102132;padding:12px 0 8px;z-index:2;font-weight:600}' +
  '#project-editor .status{position:sticky;top:44px;z-index:2;margin:0 0 10px;padding:10px 12px;border-radius:8px;background:#1f4d47;border:1px solid #2c8c7d;color:#eafff8;font-weight:600}' +
  '#project-editor .status[data-kind=error]{background:#5a1f2c;border-color:#d4384e;color:#ffe3e8}' +
  '#project-editor .status[hidden]{display:none}' +
  '#project-editor .intro{color:#c7dbe6;font-size:13px;margin:8px 0}' +
  '#project-editor label{display:block;margin:12px 0;font-weight:600}' +
  '#project-editor label.check{font-weight:500}' +
  '#project-editor .hint{display:block;font-weight:400;font-size:12px;line-height:1.45;color:#9fb6c4;margin-top:4px}' +
  '#project-editor .hint code{background:#203e56;padding:1px 5px;border-radius:4px}' +
  '#project-editor .req{font-size:11px;font-weight:700;color:#ffd27a;margin-left:6px;text-transform:uppercase;letter-spacing:.5px}' +
  '#project-editor .opt{font-size:11px;font-weight:600;color:#7fc4cc;margin-left:6px;text-transform:uppercase;letter-spacing:.5px}' +
  '#project-editor fieldset{border:1px solid #35526a;border-radius:8px;padding:4px 10px 8px;margin:12px 0}' +
  '#project-editor legend{padding:0 6px;font-weight:600}' +
  '#project-editor input:not([type=checkbox]),#project-editor textarea,#project-editor select{box-sizing:border-box;width:100%;padding:8px;margin-top:4px;background:#203e56;color:white;border:1px solid #678393;border-radius:4px;font-weight:400}' +
  '#project-editor input[type=checkbox]{margin-right:6px}' +
  '#project-editor .actions{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}' +
  '#project-editor button{padding:9px 12px;border:0;border-radius:4px;background:#26756c;color:white;cursor:pointer}#project-editor button.secondary{background:#35526a}#project-editor button:disabled{opacity:.5}' +
  '#project-editor :focus-visible{outline:3px solid #e8ca5c;outline-offset:2px}' +
  '#project-editor .ai-setup-hint{font-size:12px;color:#9fb6c4;margin:4px 0 10px}' +
  '#project-editor .ai-setup-hint code{background:#203e56;padding:1px 5px;border-radius:4px}';

export function attachProjectEditor(session: DecisionSession, changed: () => void, storageKey: string, deleteLocal?: () => void): () => void {
  if (typeof document === 'undefined') return () => undefined;
  const root = document.createElement('details');
  root.id = 'project-editor';
  root.innerHTML = template;
  const style = document.createElement('style');
  style.textContent = styles;
  document.head.append(style);
  document.body.append(root);

  const element = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const form = element<HTMLFormElement>('project-form');
  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement;
  // Status sits under the summary and is sticky, so errors are seen even when the
  // form is scrolled; errors are styled distinctly and brought into view.
  const status = (text: string, kind: 'info' | 'error' = 'info') => {
    const line = element<HTMLParagraphElement>('editor-status');
    line.textContent = text;
    line.dataset.kind = kind;
    line.hidden = text.length === 0;
    if (kind === 'error') {
      line.scrollIntoView({ block: 'nearest' });
    }
  };
  let dirty = false;
  let formVersion = session.snapshot.version;

  const sync = () => {
    const { inputs } = session.snapshot;
    field('title').value = session.context.title;
    field('specification').value = session.context.specification;
    field('rationale').value = session.context.rationale ?? '';
    field('currency').value = inputs.currency;
    field('budget').value = inputs.budget === null ? '' : String(inputs.budget);
    for (const name of ['hosting', 'site', 'connectivity'] as const) {
      field(name).value = inputs.rates === null ? '' : String(inputs.rates[name]);
    }
    field('confirm').checked = session.context.confirmed;
    dirty = false;
    formVersion = session.snapshot.version;
  };
  sync();
  form.addEventListener('input', () => {
    dirty = true;
  });
  element('reload-project').addEventListener('click', () => {
    sync();
    status('Form reloaded from the current project.');
  });
  const unsubscribe = session.subscribe(() => {
    if (!dirty) sync();
    else status('The project changed while this form had edits. Reload the current project before applying details. Your draft is still visible.', 'error');
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      if (formVersion !== session.snapshot.version) throw new Error('The project changed. Reload the current project before applying this form.');
      const rawRates = ['hosting', 'site', 'connectivity'].map((name) => field(name).value);
      if (rawRates.some(Boolean) && !rawRates.every(Boolean)) {
        throw new Error('Supply all three rates, including zero where appropriate, or leave all blank.');
      }
      const inputs = restoreInputs({
        ...session.snapshot.inputs,
        currency: field('currency').value,
        budget: field('budget').value === '' ? null : Number(field('budget').value),
        rates: rawRates.every(Boolean)
          ? { hosting: Number(rawRates[0]), site: Number(rawRates[1]), connectivity: Number(rawRates[2]) }
          : null,
      });
      const context = {
        ...session.context,
        title: field('title').value,
        specification: field('specification').value,
        rationale: field('rationale').value,
        inputOrigin: 'user' as const,
        confirmed: field('confirm').checked,
      };
      if (!context.title.trim()) throw new Error('Supply a product name.');
      session.updateProject(inputs, context);
      sync();
      changed();
      status('Project details applied. Review the guided requirements before selecting an architecture.');
    } catch (error) {
      status(error instanceof Error ? error.message : 'Invalid project details.', 'error');
    }
  });

  element<HTMLInputElement>('backup-file').addEventListener('change', async (event) => {
    try {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (file.size > 2_000_000) throw new Error('Backup is too large.');
      const data = JSON.parse(await file.text()) as { backup?: unknown };
      session.restore(data.backup ?? data);
      changed();
      sync();
      status('Backup restored and reevaluated.');
    } catch (error) {
      status(error instanceof Error ? error.message : 'Import failed; current project retained.', 'error');
    }
  });
  element('delete-local').addEventListener('click', () => {
    try {
      if (deleteLocal) deleteLocal(); else localStorage.removeItem(storageKey);
      status('Deletion processed; read the workspace status for the result. Open project and downloaded files remain.');
    } catch { status('Saved data could not be deleted. Retry or clear this site data in browser settings.', 'error'); }
  });

  // Optional AI assistance. Everything below degrades to "unavailable" without changing the core workflow.
  const aiButtons = ['ai-extract', 'ai-explain'].map((id) => element<HTMLButtonElement>(id));
  let controller: AbortController | undefined;
  void fetch('/api/ai/status')
    .then((response) => response.json() as Promise<AiStatus>)
    .then((data) => {
      element('ai-availability').textContent = String(data.reason ?? 'AI unavailable.');
      aiButtons.forEach((button) => {
        button.disabled = !data.available;
      });
    })
    .catch(() => {
      element('ai-availability').textContent = 'AI endpoint unavailable; the core workspace remains usable.';
      aiButtons.forEach((button) => {
        button.disabled = true;
      });
    });

  async function request(action: 'extract' | 'explain'): Promise<void> {
    if (!element<HTMLInputElement>('ai-consent').checked) {
      status('Tick the consent box above before sending anything to AI.', 'error');
      return;
    }
    controller?.abort();
    controller = new AbortController();
    const activeController = controller;
    const version = session.snapshot.version;
    const inputs = structuredClone(session.snapshot.inputs);
    const specification = field('specification').value;
    aiButtons.forEach((button) => {
      button.disabled = true;
    });
    status('Preparing AI response... Confirmed inputs remain unchanged.');
    try {
      const response = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ action, inputs, specification, version, consent: true }),
      });
      const data = (await response.json()) as AiResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || 'AI request failed.');
      if (session.snapshot.version !== version || data.version !== version || field('specification').value !== specification) {
        status('Discarded AI response because the project or specification changed.');
        return;
      }
      renderAiResult(action, data, version, inputs, specification);
      status('AI response ready. Nothing was applied automatically.');
    } catch (error) {
      status(
        activeController.signal.aborted ? 'Request cancelled. Project preserved.' : error instanceof Error ? error.message : 'AI request failed.',
        activeController.signal.aborted ? 'info' : 'error',
      );
    } finally {
      if (controller === activeController) {
        aiButtons.forEach((button) => {
          button.disabled = false;
        });
      }
    }
  }

  function renderAiResult(action: 'extract' | 'explain', data: AiResponse, version: number, inputs: unknown, specification: string): void {
    const results = element('ai-results');
    results.replaceChildren();
    const explanation = document.createElement('p');
    explanation.textContent =
      action === 'extract' ? (data.result.summary ?? '') : `AI explanation (verify against source findings): ${data.result.explanation ?? ''}`;
    results.append(explanation);
    if (action !== 'extract') return;
    const proposals: { field: string; value: string; checked: HTMLInputElement }[] = [];
    for (const suggestion of data.result.suggestions ?? []) {
      const label = document.createElement('label');
      const check = document.createElement('input');
      check.type = 'checkbox';
      label.append(check, document.createTextNode(`${suggestion.field}: ${suggestion.value}. Source: "${suggestion.quote}". ${suggestion.reason}`));
      results.append(label);
      proposals.push({ field: suggestion.field, value: suggestion.value, checked: check });
    }
    for (const question of data.result.questions ?? []) {
      const paragraph = document.createElement('p');
      paragraph.textContent = `Open question: ${question}`;
      results.append(paragraph);
    }
    const apply = document.createElement('button');
    apply.textContent = 'Accept checked proposals';
    apply.addEventListener('click', () => {
      try {
        if (session.snapshot.version !== version || field('specification').value !== specification) {
          throw new Error('Project or specification changed; request a fresh proposal.');
        }
        const next = { ...(inputs as Record<string, unknown>) };
        for (const proposal of proposals.filter((entry) => entry.checked.checked)) next[proposal.field] = proposal.value;
        session.apply(restoreInputs(next));
        changed();
        results.replaceChildren();
        status('Accepted checked proposals. Review the resulting constraints and assumptions.');
      } catch (error) {
        status(error instanceof Error ? error.message : 'Could not apply proposals.', 'error');
      }
    });
    results.append(apply);
  }

  aiButtons[0].addEventListener('click', () => {
    void request('extract');
  });
  aiButtons[1].addEventListener('click', () => {
    void request('explain');
  });
  element('ai-cancel').addEventListener('click', () => controller?.abort());

  return () => {
    unsubscribe();
    controller?.abort();
    root.remove();
    style.remove();
  };
}
