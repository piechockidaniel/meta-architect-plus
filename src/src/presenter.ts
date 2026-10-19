/**
 * Workspace presenter: owns UI state (stage, focus, pending change, help,
 * pause, export state) and maps the decision session onto the Horizon-kit
 * panels through the WorkspaceHost contract. No IWSDK imports here so the
 * whole interaction model is testable in Node and in a plain uikit harness.
 */
import { componentOrder, deployments } from './catalogue.js';
import type { ComponentId, Deployment, FailureScenario } from './catalogue.js';
import { assessmentFor, inputDefinitions, sample, valueLabel } from './decision.js';
import type { Assessment, ChoiceKey, ComponentView, RuleResult, State } from './decision.js';
import { affectedComponents } from './changes.js';
import { decisionBundle } from './exports.js';
import { ProjectKeyboard, projectFields } from './project-keyboard.js';
import type { KeyAction } from './text-entry.js';
import { applicableQuestions, conflicts, factLines, prioritizedQuestions, sampleContext } from './intake.js';
import type { DecisionSession, ChangePreview } from './session.js';
import type { PanelName, UiElement, UiPanel, WorkspaceHost } from './ui-host.js';
import { templates } from './templates.js';
import { tourSteps, tourTemplate } from './tour.js';
import type { SessionBackup } from './session.js';
import { workloadIds, workloadLibrary } from './workload.js';
import type { WorkloadId } from './workload.js';
import type { DiagramModel, DiagramVariantModel } from './diagram-model.js';
import { spatialText } from './spatial-text.js';
import { CarouselNavigation, carouselSections } from './carousel.js';

export type Stage = 'start' | 'product' | 'requirements' | 'compare' | 'review';
export type CompareView = 'overview' | 'cost' | 'operations' | 'recovery' | 'growth';
export type Focus =
  | { kind: 'component'; variant: Deployment; id: ComponentId }
  | { kind: 'requirement'; key: ChoiceKey }
  | { kind: 'failure'; variant: Deployment; index: number }
  | { kind: 'walkthrough'; templateId: string }
  | { kind: 'help' }
  | null;

export type ExportState =
  | { status: 'idle' }
  | { status: 'working'; version: number }
  | { status: 'ready'; version: number; code: string; url: string; expiresAt: string }
  | { status: 'downloaded'; version: number; files: number }
  | { status: 'failed'; version: number; reason: string }
  | { status: 'deleted'; version: number; code: string };

const stages: Stage[] = ['start', 'product', 'requirements', 'compare', 'review'];
const views: CompareView[] = ['overview', 'cost', 'operations', 'recovery', 'growth'];
const textScales = [1, 1.2, 1.4];
const stateBadge: Record<State, { label: string; variant: string }> = {
  viable: { label: 'OK VIABLE', variant: 'positive' },
  conditional: { label: '? CONDITIONAL', variant: 'secondary' },
  excluded: { label: 'X EXCLUDED', variant: 'negative' },
  unsupported: { label: '! UNSUPPORTED', variant: 'primary' },
};
const resultMarker: Record<RuleResult, string> = { pass: '', unknown: '? ', unsupported: '! ', fail: 'X ' };
const CHANGE_MARK = '* ';
const LINK_MARK = '> ';

function formatMoney(amount: number | null, currency: string): string {
  return amount === null ? 'unpriced' : `${amount.toFixed(2)} ${currency}`;
}

export class WorkspacePresenter {
  focusedMode = false;
  readonly carousel = new CarouselNavigation();
  focusStep: 'welcome' | 'summary' | 'questions' | 'assist' | 'browse' | 'decide' | 'export' | 'menu' = 'welcome';
  answerDraft: { key: ChoiceKey; text: string; version: number; state: 'consent' | 'working' | 'proposal' | 'clarify'; value?: string; message?: string } | null = null;
  private answerRequest: AbortController | null = null;
  private focusReturn: typeof this.focusStep = 'welcome';
  private focusReturnPage = 0;
  private focusChoice = 0;
  private focusPage = 0;
  private focusPrimary: () => void = () => undefined;
  private focusSecondary: () => void = () => undefined;
  actionSequence = 0;
  lastAction = '';
  readonly keyboard: ProjectKeyboard;
  private keyboardError = '';
  private storageWarning = '';
  stage: Stage = 'start';
  view: CompareView = 'overview';
  inspected: Deployment = 'cloud';
  focus: Focus = null;
  questionIndex = 0;
  changing: ChoiceKey | null = null;
  pending: ChangePreview | null = null;
  highlightChange = false;
  paused = false;
  immersive = false;
  trackingLost = false;
  interrupted = false;
  textScaleIndex = 0;
  templateIndex = 0;
  /** Optional guided practice session on a sandboxed sample; null when not touring. */
  tour: { stepIndex: number; reachedVersion: number; completed: boolean; backup: SessionBackup } | null = null;
  exportState: ExportState = { status: 'idle' };
  statusText = 'Sample assumptions are illustrative. Review before using for a real project.';
  private cleanup: (() => void)[] = [];
  private visiblePanels = new Set<PanelName>(['decision', 'controls']);
  private detailActions: (() => void)[] = [() => undefined, () => undefined];
  private exportRequest = 0;

  constructor(
    private readonly host: WorkspaceHost,
    readonly session: DecisionSession,
  ) { this.keyboard = new ProjectKeyboard(session, text => this.status(text)); }

  // ---------------------------------------------------------------- binding

  bind(): void {
    this.cleanup.push(() => this.answerRequest?.abort());
    for (let index = 0; index < 5; index++) this.on('carousel', `fc-answer-${index}`, () => {
      if (this.focusStep !== 'questions' || !this.currentQuestions()[this.questionIndex]?.choices[index]) return;
      this.focusChoice = index; this.render();
    });
    this.on('carousel', 'fc-primary', () => { this.focusPrimary(); this.render(); });
    this.on('carousel', 'fc-secondary', () => { this.focusSecondary(); this.render(); });
    this.on('carousel', 'fc-menu', () => { this.focusReturn = this.focusStep; this.focusReturnPage = this.focusPage; this.focusStep = 'menu'; this.focusPage = 0; this.render(); });
    this.on('carousel', 'fc-close', () => { this.focusStep = this.focusReturn; this.focusPage = this.focusReturnPage; this.render(); });
    this.on('carousel', 'fc-back', () => {
      if (this.focusStep === 'assist') {
        this.answerRequest?.abort(); this.answerDraft = null; this.focusStep = 'questions';
      } else if (this.focusStep === 'questions') {
        if (this.questionIndex > 0) this.questionIndex--;
        else this.focusStep = 'summary';
        const question = this.currentQuestions()[this.questionIndex];
        this.focusChoice = Math.max(0, question.choices.findIndex(choice => choice.value === this.session.snapshot.inputs[question.key]));
      } else if (this.focusStep === 'summary' && this.focusPage > 0) this.focusPage--;
      else this.focusStep = this.focusStep === 'decide' || this.focusStep === 'export' ? 'browse' : this.focusStep === 'browse' ? 'questions' : 'welcome';
      this.render();
    });
    for (const [id, horizontal, vertical] of [['left', -1, 0], ['right', 1, 0], ['up', 0, -1], ['down', 0, 1]] as const) {
      this.on('carousel', `fc-${id}`, () => {
        this.moveCarousel(horizontal, vertical);
      });
    }
    const edit = (action: () => void) => {
      this.keyboardError = '';
      try { action(); } catch (error) { this.keyboardError = error instanceof Error ? error.message : 'Invalid input.'; }
      this.render();
    };
    for (const field of projectFields) this.on('decision', `dp-edit-${field}`, () => edit(() => this.keyboard.begin(field)));
    const key = (id: string, action: KeyAction) => this.on('keyboard', id, () => edit(() => this.keyboard.key(action)));
    for (const letter of 'abcdefghijklmnopqrstuvwxyz0123456789') key(`key-${letter}`, { type: 'char', value: letter });
    for (const [name, value] of Object.entries({ period: '.', comma: ',', dash: '-', slash: '/', colon: ':', apostrophe: "'", question: '?', paren: '(', close: ')' })) key(`key-${name}`, { type: 'char', value });
    key('key-space', { type: 'space' }); key('key-backspace', { type: 'backspace' }); key('entry-clear', { type: 'clear' });
    key('key-shift-on', { type: 'shift' }); key('key-shift-off', { type: 'shift' });
    this.on('keyboard', 'entry-done', () => edit(() => this.keyboard.done()));
    this.on('keyboard', 'entry-cancel', () => edit(() => this.keyboard.cancel()));
    const decision: PanelName = 'decision';
    const controls: PanelName = 'controls';
    this.on(controls, 'cp-focused', () => { this.focusedMode = true; this.focusStep = 'browse'; this.render(); });
    const detail: PanelName = 'detail';

    this.on(decision, 'dp-start', () => this.goTo('product'));
    this.on(decision, 'dp-resume', () => this.resumeSaved());
    this.on(decision, 'dp-tour-start', () => this.startTour());
    this.on(decision, 'dp-tour-perform', () => this.tourPerform());
    this.on(decision, 'dp-tour-next', () => this.tourNext(false));
    this.on(decision, 'dp-tour-skip', () => this.tourNext(true));
    this.on(decision, 'dp-tour-exit', () => this.exitTour());
    for (const stage of ['product', 'requirements', 'compare', 'review'] as const) {
      this.on(decision, `dp-stage-${stage}`, () => this.goTo(stage));
    }
    this.on(decision, 'dp-path-organization', () => this.choosePath('organization'));
    this.on(decision, 'dp-path-greenfield', () => this.choosePath('greenfield'));
    this.on(decision, 'dp-confirm', () => this.confirmContext());
    this.on(decision, 'dp-template-prev', () => this.browseTemplates(-1));
    this.on(decision, 'dp-template-next', () => this.browseTemplates(1));
    this.on(decision, 'dp-template-open', () => this.openTemplate(this.templateIndex));
    for (const id of workloadIds) this.on(decision, `dp-workload-${id}`, () => this.toggleWorkload(id));
    this.on(decision, 'dp-conflict-fix-0', () => this.fixConflict(0));
    this.on(decision, 'dp-conflict-fix-1', () => this.fixConflict(1));
    for (let index = 0; index < 5; index++) this.on(decision, `dp-answer-${index}`, () => this.answer(index));
    this.on(decision, 'dp-question-back', () => this.moveQuestion(-1));
    this.on(decision, 'dp-question-next', () => this.moveQuestion(1));
    this.on(decision, 'dp-question-suggested', () => this.goToSuggestedQuestion());
    this.on(decision, 'dp-go-compare', () => this.goTo('compare'));
    for (const id of deployments) {
      this.on(decision, `dp-variant-${id}`, () => this.inspect(id));
      this.on(decision, `dp-select-${id}`, () => this.select(id));
    }
    for (const view of views) this.on(decision, `dp-view-${view}`, () => this.setView(view));
    for (const key of Object.keys(inputDefinitions) as ChoiceKey[]) {
      this.on(decision, `dp-change-${key}`, () => this.startChange(key));
    }
    for (let index = 0; index < 5; index++) this.on(decision, `dp-value-${index}`, () => this.proposeValue(index));
    this.on(decision, 'dp-value-cancel', () => this.cancelChange());
    this.on(decision, 'dp-pending-apply', () => this.applyChange());
    this.on(decision, 'dp-pending-cancel', () => this.cancelChange());
    this.on(decision, 'dp-last-change-keep', () => this.keepChange());
    this.on(decision, 'dp-last-change-undo', () => this.undo());
    this.on(decision, 'dp-go-review', () => this.goTo('review'));
    this.on(decision, 'dp-select-none', () => this.retainUncertainty());
    this.on(decision, 'dp-export', () => void this.exportToInbox());
    this.on(decision, 'dp-export-download', () => this.downloadFiles());
    this.on(decision, 'dp-export-delete', () => void this.deleteServerExport());
    this.on(decision, 'dp-delete-local', () => this.deleteLocalCopy());

    for (const id of deployments) {
      const graph: PanelName = `graph-${id}`;
      for (const component of [...componentOrder, ...workloadIds]) {
        this.on(graph, `ag-node-${component}`, () => this.focusComponent(id, component));
      }
      this.on(graph, 'ag-inspect', () => this.inspect(id));
      this.on(graph, 'ag-failure', () => this.focusFailure(id));
    }

    this.on(detail, 'dt-action-0', () => this.detailActions[0]());
    this.on(detail, 'dt-action-1', () => this.detailActions[1]());
    this.on(detail, 'dt-close', () => this.clearFocus());

    this.on(controls, 'cp-home', () => this.resetToOverview());
    this.on(controls, 'cp-undo', () => this.undo());
    this.on(controls, 'cp-recenter', () => this.recenter());
    this.on(controls, 'cp-text', () => this.cycleTextScale());
    this.on(controls, 'cp-help', () => this.toggleHelp());
    this.on(controls, 'cp-tour', () => (this.tour ? this.exitTour() : this.startTour()));
    this.on(controls, 'cp-pause', () => this.togglePause());
    this.on(controls, 'cp-xr', () => this.host.xr.launch());
    this.on(controls, 'cp-exit', () => this.host.xr.exit());

    this.cleanup.push(this.session.subscribe(() => this.persist()));
    this.warnIfRecoveredFromInterruptedTour();
    this.render();
  }

  /** If the last session ended while a guided tour was active, the real project was protected; say so. */
  private warnIfRecoveredFromInterruptedTour(): void {
    const saved = this.host.storage.load();
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { touring?: boolean };
      if (parsed.touring) {
        this.status(
          'The previous session ended during a guided tour. Your project was never overwritten by the tour; select "Resume saved project" to continue it.',
        );
      }
    } catch {
      // Corrupt local data is handled by resumeSaved(); nothing to warn about here.
    }
  }

  dispose(): void {
    for (const fn of this.cleanup.splice(0)) fn();
  }

  private on(name: PanelName, id: string, action: () => void): void {
    const element = this.host.panel(name).requireElementById(id);
    const handler = () => {
      // Hidden panels are not ray targets: ignore stray selections on them.
      if (!this.visiblePanels.has(name)) return;
      this.actionSequence++;
      this.lastAction = id;
      if (this.paused && !['cp-pause', 'cp-recenter', 'cp-text', 'cp-xr', 'cp-exit'].includes(id)) {
        this.status('Paused. Select Resume on the controls panel to continue.');
        this.render();
        return;
      }
      try {
        action();
      } catch (error) {
        this.status(error instanceof Error ? error.message : 'Action failed. Confirmed state was preserved.');
        this.render();
      }
    };
    element.addEventListener('click', handler);
    this.cleanup.push(() => element.removeEventListener('click', handler));
  }

  // ---------------------------------------------------------------- actions

  status(text: string): void {
    this.statusText = text;
  }

  goTo(stage: Stage): void {
    this.stage = stage;
    this.changing = null;
    this.pending = null;
    if (stage === 'compare') this.status('Compare the three patterns. Select a component in a diagram or change one input to see consequences.');
    if (stage === 'requirements') this.status('Answer what you know. Unknown stays unknown; it is never treated as permission.');
    if (stage === 'review') this.status('Review the recommendation, record a selection or retain uncertainty, then export.');
    if (stage === 'product') this.status('Read the summary and the supplied facts, then confirm to continue.');
    this.render();
  }

  choosePath(path: 'organization' | 'greenfield'): void {
    const current = this.session.snapshot.inputs;
    if (current.path === path) {
      this.render();
      return;
    }
    if (this.session.context.inputOrigin === 'sample') {
      this.session.updateProject(sample(path), sampleContext(path));
      this.status(`Loaded the ${path} sample. Its facts are labelled as constraints or assumptions; confirm them before deciding.`);
    } else {
      this.session.updateProject({ ...current, path }, this.session.context);
      this.status(`Entry path changed to ${path}. Your answers were kept; question wording follows the new path.`);
    }
    this.questionIndex = 0;
    this.focus = null;
    this.highlightChange = false;
    this.render();
  }

  // ---------------------------------------------------------------- guided tour

  /**
   * Starts the practice session: the current project is backed up and restored
   * on exit. The backup is set *before* loading the template so that every
   * autosave taken while touring (including one triggered by a crash or a
   * reload, not just a clean exit) keeps writing the pre-tour project to
   * storage instead of the sandboxed tour state. See `persist()`.
   */
  startTour(): void {
    if (this.tour) return;
    const backup = this.session.backup();
    this.tour = { stepIndex: 0, reachedVersion: 0, completed: false, backup };
    const template = tourTemplate();
    this.session.updateProject(template.inputs, template.context);
    this.tour.reachedVersion = this.session.snapshot.version;
    this.stage = 'product';
    this.focus = null;
    this.pending = null;
    this.changing = null;
    this.highlightChange = false;
    this.exportState = { status: 'idle' };
    this.status('Guided tour started on a practice sample. Nothing here touches your own project; Exit tour restores it.');
    this.render();
  }

  tourStepDone(): boolean {
    if (!this.tour || this.tour.completed) return false;
    return tourSteps[this.tour.stepIndex].check(this, this.tour.reachedVersion);
  }

  tourPerform(): void {
    if (!this.tour || this.tour.completed) return;
    tourSteps[this.tour.stepIndex].perform(this);
    this.status(`Step ${this.tour.stepIndex + 1} performed for you; the same buttons do this in a real session.`);
    this.render();
  }

  tourNext(skip: boolean): void {
    if (!this.tour || this.tour.completed) return;
    if (!skip && !this.tourStepDone()) {
      this.status('This step is not done yet. Follow the instruction, use "Do it for me", or skip it.');
      this.render();
      return;
    }
    if (this.tour.stepIndex + 1 >= tourSteps.length) {
      this.tour.completed = true;
      this.status('Tour complete. Exit tour restores your previous project.');
    } else {
      this.tour.stepIndex++;
      this.tour.reachedVersion = this.session.snapshot.version;
      this.status(`Step ${this.tour.stepIndex + 1} of ${tourSteps.length}: ${tourSteps[this.tour.stepIndex].title}.`);
    }
    this.render();
  }

  exitTour(): void {
    if (!this.tour) return;
    const backup = this.tour.backup;
    this.tour = null; // clear first: persist() below must write the restored project, not tour state.
    this.session.restore(backup);
    this.stage = 'start';
    this.focus = null;
    this.pending = null;
    this.changing = null;
    this.highlightChange = false;
    this.exportState = { status: 'idle' };
    this.status('Tour ended and your previous project was restored. Start your real work from a template or the browser form.');
    this.render();
  }

  browseTemplates(delta: number): void {
    this.templateIndex = (this.templateIndex + delta + templates.length) % templates.length;
    this.render();
  }

  /** Opens a template as a fresh sample project; the user's own project can be restored with Undo. */
  openTemplate(index: number): void {
    const template = templates[index];
    if (!template) return;
    this.session.updateProject(template.inputs, template.context);
    this.questionIndex = 0;
    this.highlightChange = false;
    this.pending = null;
    this.changing = null;
    this.focus = { kind: 'walkthrough', templateId: template.id };
    this.status(`Opened template "${template.title}". Facts are illustrative; the walk-through is on the detail panel. Undo restores your previous project.`);
    this.render();
  }

  /** Adds or removes a generic workload block; button and drag-and-drop routes both end here. */
  toggleWorkload(id: WorkloadId, present?: boolean): void {
    const current = this.session.snapshot.inputs.workload;
    const wanted = present ?? !current.includes(id);
    if (wanted === current.includes(id)) {
      this.status(`${workloadLibrary[id].label} is already ${wanted ? 'in' : 'out of'} the workflow.`);
      this.render();
      return;
    }
    const workload = wanted ? [...current, id] : current.filter((entry) => entry !== id);
    this.session.apply({ ...this.session.snapshot.inputs, workload });
    this.highlightChange = true;
    if (wanted) this.focus = { kind: 'component', variant: this.inspected, id };
    else if (this.focus?.kind === 'component' && this.focus.id === id) this.focus = null;
    this.status(
      `${wanted ? 'Added' : 'Removed'} ${workloadLibrary[id].label} (product scope) as v${this.session.snapshot.version}. Every option was reevaluated; the block follows its boundary in each diagram.`,
    );
    this.render();
  }

  confirmContext(): void {
    if (!this.session.context.confirmed) {
      this.session.setContext({ ...this.session.context, confirmed: true });
      this.status('Summary and assumptions acknowledged. This records your review; it does not verify the assumptions.');
    }
    this.goTo('requirements');
  }

  private currentQuestions() {
    return applicableQuestions(this.session.snapshot.inputs);
  }

  answer(index: number): void {
    const questions = this.currentQuestions();
    const question = questions[Math.min(this.questionIndex, questions.length - 1)];
    const choice = question?.choices[index];
    if (!question || !choice) return;
    if (this.session.snapshot.inputs[question.key] === choice.value) {
      this.status('That value is already recorded.');
      this.render();
      return;
    }
    this.session.apply({ ...this.session.snapshot.inputs, [question.key]: choice.value });
    this.highlightChange = true;
    this.status(
      `${inputDefinitions[question.key].label} set to ${choice.label} (${question.classification}). All variants were reevaluated: ${this.session.lastChange?.headline ?? ''}`,
    );
    this.render();
  }

  moveQuestion(delta: number): void {
    const count = this.currentQuestions().length;
    this.questionIndex = Math.max(0, Math.min(count - 1, this.questionIndex + delta));
    this.render();
  }

  goToSuggestedQuestion(): void {
    const suggestion = this.suggestedQuestion();
    if (!suggestion) return;
    this.questionIndex = this.currentQuestions().findIndex((question) => question.key === suggestion.key);
    this.status(`Suggested because: ${suggestion.why}`);
    this.render();
  }

  private suggestedQuestion() {
    const current = this.currentQuestions()[this.questionIndex]?.key;
    return prioritizedQuestions(this.session.snapshot.inputs, this.session.snapshot).find(
      (entry) => entry.priority !== 'refinement' && entry.key !== current,
    );
  }

  fixConflict(which: 0 | 1): void {
    const conflict = conflicts(this.session.snapshot.inputs)[0];
    const key = conflict?.inputs[which];
    if (!key) return;
    this.stage = 'requirements';
    this.questionIndex = Math.max(0, this.currentQuestions().findIndex((question) => question.key === key));
    this.status(`Correct ${inputDefinitions[key].label} to resolve: ${conflict.reason}`);
    this.render();
  }

  inspect(id: Deployment): void {
    this.inspected = id;
    if (this.stage !== 'compare' && this.stage !== 'review') this.stage = 'compare';
    this.render();
  }

  setView(view: CompareView): void {
    this.view = view;
    this.render();
  }

  startChange(key: ChoiceKey): void {
    this.changing = key;
    this.pending = null;
    this.status(`Choose a proposed value for ${inputDefinitions[key].label}. Nothing changes until you apply it.`);
    this.render();
  }

  proposeValue(index: number): void {
    if (!this.changing) return;
    const value = inputDefinitions[this.changing].values[index]?.value;
    if (!value) return;
    if (value === String(this.session.snapshot.inputs[this.changing])) {
      this.status('That is the current value. Choose a different value or cancel.');
      this.render();
      return;
    }
    this.pending = this.session.preview(this.changing, value);
    this.status('Preview computed. Apply to create a new version, or cancel to keep the current one.');
    this.render();
  }

  cancelChange(): void {
    this.changing = null;
    this.pending = null;
    this.status('Change cancelled; the current version is unchanged.');
    this.render();
  }

  applyChange(): void {
    if (!this.pending) return;
    const pending = this.pending;
    this.status(`Reevaluating all three variants for ${pending.label}...`);
    this.session.apply(pending.inputs);
    this.pending = null;
    this.changing = null;
    this.highlightChange = true;
    if (pending.key !== 'usage' && pending.key !== 'capacity') {
      this.focus = { kind: 'requirement', key: pending.key };
    }
    this.status(
      `Applied as v${this.session.snapshot.version}. ${this.session.lastChange?.headline ?? ''} Changed components are marked * in the diagrams.`,
    );
    this.render();
  }

  keepChange(): void {
    this.highlightChange = false;
    this.status('Highlights cleared. The new version is kept; undo remains available.');
    this.render();
  }

  undo(): void {
    if (!this.session.undo()) {
      this.status('Nothing to undo.');
      this.render();
      return;
    }
    this.pending = null;
    this.changing = null;
    this.highlightChange = this.session.lastChange !== null;
    this.status(`Undo restored the previous confirmed inputs as v${this.session.snapshot.version}.`);
    this.render();
  }

  select(id: Deployment): void {
    this.session.select(id);
    this.host.decisionLocked?.();
    this.status(`Recorded your selection: ${assessmentFor(this.session.snapshot, id).variant.label}. The system recommendation is stored separately.`);
    this.render();
  }

  retainUncertainty(): void {
    this.session.clearSelection();
    this.status('No selection recorded. The export will state a provisional outcome with open issues.');
    this.render();
  }

  focusComponent(variant: Deployment, id: ComponentId): void {
    const view = assessmentFor(this.session.snapshot, variant).components.find((entry) => entry.id === id);
    if (!view?.present) {
      this.status('This variant keeps application and database in one environment; no cross-environment link exists.');
      this.render();
      return;
    }
    this.focus = { kind: 'component', variant, id };
    this.inspected = variant;
    this.render();
  }

  focusRequirement(key: ChoiceKey): void {
    this.focus = { kind: 'requirement', key };
    this.render();
  }

  focusFailure(variant: Deployment): void {
    const scenarios = assessmentFor(this.session.snapshot, variant).variant.failureScenarios;
    const index =
      this.focus?.kind === 'failure' && this.focus.variant === variant ? (this.focus.index + 1) % scenarios.length : 0;
    this.focus = { kind: 'failure', variant, index };
    this.inspected = variant;
    this.render();
  }

  clearFocus(): void {
    this.focus = null;
    this.render();
  }

  resetToOverview(): void {
    this.focus = null;
    this.pending = null;
    this.changing = null;
    this.highlightChange = false;
    this.view = 'overview';
    this.status('Overview restored: highlights cleared, all panels visible.');
    this.render();
  }

  recenter(): void {
    this.host.recenter();
    this.status('Panels recentered in front of you.');
    this.render();
  }

  cycleTextScale(): void {
    this.textScaleIndex = (this.textScaleIndex + 1) % textScales.length;
    this.host.setTextScale(textScales[this.textScaleIndex]);
    this.render();
  }

  toggleHelp(): void {
    this.focus = this.focus?.kind === 'help' ? null : { kind: 'help' };
    this.render();
  }

  togglePause(): void {
    this.paused = !this.paused;
    this.status(this.paused ? 'Paused. Confirmed inputs are saved in this browser.' : 'Resumed.');
    this.render();
  }

  /** Called by the host when the immersive session visibility changes. */
  setImmersive(immersive: boolean): void {
    if (this.immersive && !immersive) {
      this.interrupted = true;
      this.status('Immersive session ended. Your latest confirmed state is kept; enter immersive again or continue in the browser.');
    }
    this.immersive = immersive;
    this.render();
  }

  /** Called by the host when the immersive session blurs (system overlay). */
  setBlurred(blurred: boolean): void {
    if (blurred && !this.paused) {
      this.paused = true;
      this.status('Session paused by the system. Select Resume to continue; nothing was confirmed while paused.');
      this.render();
    }
  }

  setTrackingLost(lost: boolean): void {
    if (lost === this.trackingLost) return;
    this.trackingLost = lost;
    this.render();
  }

  resumeSaved(): void {
    const saved = this.host.storage.load();
    if (!saved) {
      this.status('No saved project in this browser.');
      this.render();
      return;
    }
    try {
      const parsed = JSON.parse(saved) as { backup?: unknown };
      this.session.restore(parsed.backup ?? parsed);
      this.stage = 'compare';
      this.status('Restored the saved project and reevaluated it with the current catalogue.');
    } catch (error) {
      this.status(`Saved project could not be restored: ${error instanceof Error ? error.message : 'invalid data'}. Current state kept.`);
    }
    this.render();
  }

  /**
   * Autosaves the *real* project, never the sandboxed guided-tour state.
   * While touring, `this.tour.backup` is what gets written on every change
   * (including a change made by the tour itself), so a crash, a reload, or a
   * browser close in the middle of a tour step can never lose or overwrite
   * the project the user had before starting it. `touring: true` lets the
   * next session explain what happened instead of silently "losing" nothing.
   */
  private persist(): void {
    try {
      const backup = this.tour ? this.tour.backup : this.session.backup();
      this.host.storage.save(JSON.stringify({ savedAt: new Date().toISOString(), backup, touring: this.tour !== null }));
      this.storageWarning = '';
    } catch {
      this.storageWarning = 'Browser storage unavailable. Export a backup before leaving.';
    }
  }

  async exportToInbox(): Promise<void> {
    const bundle = decisionBundle(this.session);
    try { this.host.exports.keep?.(bundle); } catch { this.storageWarning = 'Export kept in memory only; device storage is unavailable. Download before leaving.'; }
    const version = bundle.snapshot.version;
    const request = ++this.exportRequest;
    this.exportState = { status: 'working', version };
    this.status(`Exporting v${version}: Markdown, three SVG diagrams and the JSON bundle.`);
    this.render();
    try {
      const receipt = await this.host.exports.inbox(bundle);
      if (request !== this.exportRequest) return;
      this.exportState = { status: 'ready', version, ...receipt };
      this.status(`Export v${version} ready. Retrieval code ${receipt.code}.`);
    } catch (error) {
      if (request !== this.exportRequest) return;
      const reason = error instanceof Error ? error.message : 'export inbox unavailable';
      this.exportState = { status: 'failed', version, reason };
      this.status(`Export v${version} could not be stored: ${reason}. Use Download files in the browser.`);
    }
    this.render();
  }

  /** Data control: remove the server copy before it expires. */
  async deleteServerExport(): Promise<void> {
    if (this.exportState.status !== 'ready') return;
    const { code, version } = this.exportState;
    try {
      const deleted = await this.host.exports.remove(code);
      this.exportState = { status: 'deleted', version, code };
      this.status(deleted ? `Server copy ${code} deleted.` : `Server copy ${code} had already expired or was deleted.`);
    } catch (error) {
      this.status(`Could not delete ${code}: ${error instanceof Error ? error.message : 'request failed'}. It expires automatically after 24 hours.`);
    }
    this.render();
  }

  /** Data control: forget the locally saved project; the in-memory session continues. */
  deleteLocalCopy(): void {
    let failed = false;
    try { this.host.storage.remove(); } catch { failed = true; }
    try { this.host.exports.clearLocal?.(); } catch { failed = true; }
    if (!failed) {
      this.storageWarning = '';
      this.status('Saved local copy deleted from this browser. The current session stays in memory; the next change saves again. Downloaded files are separate.');
    } else {
      this.status('Saved data could not be deleted. Retry or clear this site data in browser settings. Downloaded files are separate.');
    }
    this.render();
  }

  downloadFiles(): void {
    const bundle = decisionBundle(this.session);
    try { this.host.exports.keep?.(bundle); } catch { this.storageWarning = 'Export kept in memory only; download before leaving.'; }
    const version = bundle.snapshot.version;
    const files: [string, string, string][] = [
      [bundle.markdown, 'text/markdown', `architecture-decision-v${version}.md`],
      ...deployments.map(
        (id): [string, string, string] => [bundle.diagrams[id], 'image/svg+xml', `architecture-${id}-v${version}.svg`],
      ),
      [JSON.stringify(bundle, null, 2), 'application/json', `architecture-decision-v${version}.json`],
    ];
    let count = 0;
    for (const [content, type, name] of files) if (this.host.exports.download(content, type, name)) count++;
    this.exportState =
      count > 0
        ? { status: 'downloaded', version, files: count }
        : { status: 'failed', version, reason: 'downloads are not available in this mode' };
    this.status(
      count > 0
        ? `${count} file(s) requested from the browser download manager for v${version}.`
        : 'Downloads are not available here. Use Export decision record for a retrieval code.',
    );
    this.render();
  }

  // ---------------------------------------------------------------- rendering

  captureAnswer(): void {
    const question = this.currentQuestions()[this.questionIndex];
    const key = question.key, version = this.session.snapshot.version;
    this.answerRequest?.abort();
    this.keyboard.beginDraft(`Your answer: ${inputDefinitions[key].label}`, this.answerDraft?.key === key ? this.answerDraft.text : '', text => {
      this.answerDraft = { key, text, version, state: 'consent' };
      this.focusStep = 'assist';
    });
    this.render();
  }

  async qualifyAnswer(): Promise<void> {
    const draft = this.answerDraft, ai = this.host.questionAi;
    if (!draft?.text.trim() || !ai?.available || draft.state === 'working') return;
    if (draft.version !== this.session.snapshot.version) { draft.state = 'clarify'; draft.message = 'Project changed. Capture a fresh answer.'; this.render(); return; }
    const controller = new AbortController(); this.answerRequest?.abort(); this.answerRequest = controller;
    draft.state = 'working'; this.render();
    try {
      const proposal = await ai.qualify(draft.key, draft.text, this.session.snapshot.inputs, draft.version, controller.signal);
      if (controller.signal.aborted || this.answerDraft !== draft) return;
      if (this.session.snapshot.version !== draft.version || this.currentQuestions()[this.questionIndex].key !== draft.key) {
        draft.state = 'clarify'; draft.message = 'Project changed. Capture a fresh answer.'; this.render(); return;
      }
      if (proposal.value && !inputDefinitions[draft.key].values.some(choice => choice.value === proposal.value)) throw new Error('Invalid proposed answer.');
      draft.value = proposal.value; draft.state = proposal.value ? 'proposal' : 'clarify';
      draft.message = proposal.value ? `Your words: "${proposal.quote}"` : proposal.question || 'Please clarify your answer.';
    } catch (error) {
      if (!controller.signal.aborted && this.answerDraft === draft) { draft.state = 'clarify'; draft.message = error instanceof Error ? error.message : 'Qualification failed. Choose an answer directly.'; }
    }
    if (this.answerDraft === draft && !controller.signal.aborted) this.render();
  }

  moveCarousel(horizontal: number, vertical: number): void {
    this.carousel.move(horizontal, vertical);
    this.focusPage = 0;
    this.inspected = deployments[this.carousel.variant];
    this.render();
  }

  private renderFocused(): void {
    if (this.keyboard.entry) {
      for (const name of presenterPanelNames) this.setPanelVisible(name, name === 'keyboard');
      this.keyboard.render(this.host.panel('keyboard'), this.keyboardError);
      this.host.diagram?.update(this.diagramModel());
      return;
    }
    for (const name of presenterPanelNames) this.setPanelVisible(name, name === 'carousel');
    this.host.diagram?.update(this.diagramModel());
    const panel = this.host.panel('carousel');
    const snapshot = this.session.snapshot;
    const assessment = assessmentFor(snapshot, deployments[this.carousel.variant]);
    let title = '', subtitle = '', body = '', note = '', primary = '', secondary = '';
    let primaryAction = () => undefined as void, secondaryAction = () => undefined as void;
    const next = (step: typeof this.focusStep) => { this.focusStep = step; this.focusPage = 0; };
    const chunks = (text: string): string[] => text.match(/.{1,95}(?:\s|$)|\S{1,95}/g)?.map(part => part.trim()) ?? [''];
    this.show(panel, 'fc-navigation', this.focusStep === 'browse');
    this.show(panel, 'fc-sections', this.focusStep === 'browse');
    this.show(panel, 'fc-close', this.focusStep === 'menu');
    this.show(panel, 'fc-back', !['welcome', 'menu'].includes(this.focusStep));
    this.show(panel, 'fc-menu', this.focusStep !== 'menu');
    this.show(panel, 'fc-answers', this.focusStep === 'questions');
    const category = this.focusStep === 'questions' || this.focusStep === 'assist' ? this.currentQuestions()[this.questionIndex]?.key : null;
    for (const key of Object.keys(inputDefinitions) as ChoiceKey[]) this.show(panel, `fc-icon-${key}`, category === key);
    if (this.focusStep === 'welcome') {
      title = 'One decision at a time'; body = 'Review your project, explore three architectures, then record a decision.';
      note = 'Illustrative assumptions. No vendor recommendation.';
      primary = 'Start'; primaryAction = () => next('summary');
      secondary = 'Resume saved'; secondaryAction = () => { this.resumeSaved(); next('summary'); };
      this.host.panel('carousel').requireElementById('fc-secondary').setProperties({ disabled: !this.host.storage.load() });
    } else if (this.focusStep === 'summary') {
      title = this.session.context.title;
      const pages = chunks(this.session.context.specification);
      this.focusPage = Math.min(this.focusPage, pages.length - 1);
      subtitle = `Project summary ${this.focusPage + 1} / ${pages.length}`; body = pages[this.focusPage];
      note = this.session.context.inputOrigin === 'sample' ? 'Sample assumptions: review before accepting.' : 'Your project: review before accepting.';
      primary = this.focusPage < pages.length - 1 ? 'Continue reading' : 'Acknowledge';
      primaryAction = () => { if (this.focusPage < pages.length - 1) this.focusPage++; else { this.confirmContext(); next('questions'); } };
      secondary = 'Other sample'; secondaryAction = () => { this.choosePath(snapshot.inputs.path === 'greenfield' ? 'organization' : 'greenfield'); this.focusPage = 0; };
      // Never replace a user-authored project with a sample from this short flow.
      if (this.session.context.inputOrigin !== 'sample') secondary = '';
    } else if (this.focusStep === 'questions') {
      const questions = this.currentQuestions();
      this.questionIndex = Math.max(0, Math.min(this.questionIndex, questions.length - 1));
      const question = questions[this.questionIndex];
      this.focusChoice = Math.min(this.focusChoice, question.choices.length - 1);
      const choice = question.choices[this.focusChoice];
      title = inputDefinitions[question.key].label;
      subtitle = `Question ${this.questionIndex + 1} / ${questions.length} | ${question.classification}`;
      body = question.title.replace(/^[AB]\d+\.\s*/, '');
      note = `Selected: ${choice.label}. Confirm to save and continue.`;
      for (let index = 0; index < 5; index++) {
        const option = question.choices[index];
        this.show(panel, `fc-answer-${index}`, !!option);
        this.text(panel, `fc-answer-${index}-label`, option?.label ?? '');
        panel.requireElementById(`fc-answer-${index}`).setProperties({ backgroundColor: index === this.focusChoice ? '#075366' : '#233247', borderColor: index === this.focusChoice ? '#00D2FF' : '#43566F', borderWidth: index === this.focusChoice ? 2 : 1 });
      }
      primary = 'Confirm answer'; primaryAction = () => {
        this.answer(this.focusChoice); this.focusChoice = 0;
        if (this.questionIndex === this.currentQuestions().length - 1) { this.stage = 'compare'; next('browse'); }
        else {
          this.questionIndex++;
          const following = this.currentQuestions()[this.questionIndex];
          this.focusChoice = Math.max(0, following.choices.findIndex(choice => choice.value === this.session.snapshot.inputs[following.key]));
        }
      };
      secondary = 'Type or dictate'; secondaryAction = () => this.captureAnswer();
    } else if (this.focusStep === 'assist') {
      const draft = this.answerDraft;
      title = draft?.state === 'proposal' ? 'Review proposed answer' : draft?.state === 'clarify' ? 'Let us clarify' : 'Qualify your answer';
      subtitle = draft ? inputDefinitions[draft.key].label : '';
      body = draft?.state === 'proposal' && draft.value ? valueLabel(draft.key, draft.value) : (draft?.text || 'No answer captured.').slice(0, 160);
      note = draft?.message || (this.host.questionAi?.available ? 'Send your answer to the configured AI service? Nothing is saved until you confirm.' : 'AI is unavailable. Back returns to all answer choices.');
      primary = draft?.state === 'proposal' ? 'Use proposed answer' : draft?.state === 'working' ? 'Qualifying...' : 'Send to AI';
      primaryAction = () => {
        if (draft?.state === 'proposal' && draft.value) {
          if (draft.version !== this.session.snapshot.version || this.currentQuestions()[this.questionIndex].key !== draft.key) { draft.state = 'clarify'; draft.message = 'Project changed. Capture a fresh answer.'; return; }
          this.focusChoice = this.currentQuestions()[this.questionIndex].choices.findIndex(choice => choice.value === draft.value);
          this.focusStep = 'questions'; this.answerDraft = null;
          this.status('AI proposal selected. Confirm answer to save it.');
        } else void this.qualifyAnswer();
      };
      secondary = draft?.state === 'working' ? 'Cancel request' : 'Edit answer'; secondaryAction = () => {
        this.answerRequest?.abort();
        if (draft?.state === 'working') { draft.state = 'consent'; draft.message = 'Request cancelled. Answers unchanged.'; }
        else this.captureAnswer();
      };
    } else if (this.focusStep === 'browse') {
      title = assessment.variant.label; subtitle = `${carouselSections[this.carousel.section].toUpperCase()} | ${assessment.state.toUpperCase()}`;
      const issues = assessment.findings.filter(finding => finding.result !== 'pass');
      const content = this.carousel.section === 0
        ? `${assessment.variant.summary}`
        : this.carousel.section === 1
          ? `${assessment.cost.subtotal === null ? 'Unpriced: no complete scenario rates.' : `Modeled subtotal: ${formatMoney(assessment.cost.subtotal, snapshot.inputs.currency)}.`} This is a scenario estimate, not a market quote.`
          : issues.length ? issues.map(finding => `${finding.result.toUpperCase()}: ${finding.reason}`).join(' ') : 'No failing or unknown rules in this model. This is not implementation verification.';
      const pages = chunks(content);
      this.focusPage = Math.min(this.focusPage, pages.length - 1); body = pages[this.focusPage];
      note = `Detail ${this.focusPage + 1} / ${pages.length}. Browsing does not select an architecture.`;
      primary = 'Decide'; primaryAction = () => next('decide');
      secondary = pages.length > 1 ? 'Next detail' : ''; secondaryAction = () => { this.focusPage = (this.focusPage + 1) % pages.length; };
    } else if (this.focusStep === 'decide') {
      title = `Choose ${assessment.variant.label}?`; body = `State: ${assessment.state}.`;
      note = this.session.context.confirmed ? 'Selection is separate from the model recommendation.' : 'Acknowledge the project summary before selecting.';
      primary = 'Select this option'; primaryAction = () => { this.select(assessment.variant.id); if (this.session.snapshot.selection === assessment.variant.id) next('export'); };
      secondary = 'Keep uncertainty'; secondaryAction = () => { this.retainUncertainty(); next('export'); };
    } else if (this.focusStep === 'export') {
      title = 'Decision recorded';
      body = snapshot.selection ? `Selected: ${assessmentFor(snapshot, snapshot.selection).variant.label}.` : 'No architecture selected. Uncertainty retained.';
      subtitle = `Project version ${snapshot.version}`;
      const lines = this.exportLines(); note = this.exportState.status === 'idle' ? 'Export includes the full reasoning and all three architectures.' : lines.join(' ');
      primary = 'Export'; primaryAction = () => { void this.exportToInbox(); };
      secondary = 'Browse again'; secondaryAction = () => next('browse');
    } else {
      const options = ['Immersive session', 'Recenter', 'Text size', 'Advanced workspace'] as const;
      title = 'Workspace menu'; subtitle = `${this.focusPage + 1} / ${options.length}`;
      body = options[this.focusPage % options.length];
      note = 'Close returns to the same card. Advanced opens the original workspace.';
      primary = this.focusPage === 0 ? this.immersive ? 'Leave immersive' : 'Enter immersive' : this.focusPage === 3 ? 'Open advanced' : 'Apply';
      primaryAction = () => {
        if (this.focusPage === 0) { if (this.immersive) this.host.xr.exit(); else this.host.xr.launch(); }
        if (this.focusPage === 1) this.host.recenter();
        if (this.focusPage === 2) this.cycleTextScale();
        if (this.focusPage === 3) this.focusedMode = false;
      };
      secondary = 'Next setting'; secondaryAction = () => { this.focusPage = (this.focusPage + 1) % options.length; };
    }
    this.focusPrimary = primaryAction; this.focusSecondary = secondaryAction;
    this.text(panel, 'fc-location', this.focusStep === 'browse' ? `Architecture ${this.carousel.variant + 1} / 3 | Section ${this.carousel.section + 1} / 3` : 'Architecture workspace');
    this.text(panel, 'fc-title', title); this.text(panel, 'fc-subtitle', subtitle);
    panel.requireElementById('fc-subtitle').setProperties({ color: ['browse', 'decide'].includes(this.focusStep) ? ({ viable: '#52D4B2', conditional: '#FFC45B', excluded: '#FF7B86', unsupported: '#C6B5FF' }[assessment.state]) : '#9EACB9' });
    this.text(panel, 'fc-line-0', body); this.text(panel, 'fc-line-1', ''); this.text(panel, 'fc-line-2', note);
    this.show(panel, 'fc-line-1', false);
    this.text(panel, 'fc-position', `${this.carousel.variant + 1} / 3`);
    this.text(panel, 'fc-primary-label', primary); this.text(panel, 'fc-secondary-label', secondary);
    this.show(panel, 'fc-secondary', secondary !== '');
    panel.requireElementById('fc-primary').setProperties({ disabled: this.focusStep === 'decide' && (assessment.state !== 'viable' || !this.session.context.confirmed) || this.exportState.status === 'working' || this.focusStep === 'assist' && (this.answerDraft?.state === 'working' || !this.answerDraft?.text.trim() || !this.host.questionAi?.available) });
    if (this.focusStep !== 'welcome') panel.requireElementById('fc-secondary').setProperties({ disabled: false });
    for (const [id, disabled] of [['left', this.carousel.variant === 0], ['right', this.carousel.variant === 2], ['up', this.carousel.section === 0], ['down', this.carousel.section === 2]] as const) panel.requireElementById(`fc-${id}`).setProperties({ disabled });
    this.text(panel, 'fc-status', this.trackingLost ? 'Tracking lost. Hold hands in view.' : this.interrupted ? 'Session interrupted. Your project is preserved.' : this.storageWarning);
  }

  render(): void {
    if (this.focusedMode) { this.renderFocused(); return; }
    this.setPanelVisible('carousel', false);
    this.renderDecision();
    this.renderGraphs();
    this.renderDetail();
    this.renderControls();
    this.host.diagram?.update(this.diagramModel());
    this.keyboard.render(this.host.panel('keyboard'), this.keyboardError);
    const editing = this.keyboard.entry !== null;
    this.setPanelVisible('keyboard', editing && !this.paused);
    if (editing) {
      for (const name of presenterPanelNames) if (name !== 'keyboard' && name !== 'controls') this.setPanelVisible(name, false);
    }
  }

  /** Shared description of the 3D workflow diagrams; the same markers as the flat panels. */
  diagramModel(): DiagramModel {
    const snapshot = this.session.snapshot;
    // Islands are part of the first impression too: visible from the start screen, hidden only while paused.
    const showGraphs = !this.focusedMode && !this.paused && this.keyboard.entry === null;
    const variants = snapshot.assessments.map((assessment): DiagramVariantModel => {
      const changed = this.highlightChange ? affectedComponents(this.session.lastChange, assessment.variant.id) : [];
      const linked = this.linkedComponents(assessment);
      const boundaryOf = (id: ComponentId) => assessment.components.find((entry) => entry.id === id)?.boundary;
      return {
        id: assessment.variant.id,
        label: assessment.variant.label,
        state: assessment.state,
        inspected: assessment.variant.id === this.inspected,
        nodes: assessment.components.map((view) => ({
          id: view.id,
          label: view.label,
          shortLabel: view.shortLabel,
          kind: view.kind,
          present: view.present,
          boundary: view.boundary,
          result: view.worstResult,
          focused: this.focus?.kind === 'component' && this.focus.variant === assessment.variant.id && this.focus.id === view.id,
          changed: changed.includes(view.id),
          linked: linked.includes(view.id),
        })),
        links: assessment.connections.map((link) => ({
          from: link.from,
          to: link.to,
          crossesBoundary: boundaryOf(link.from) !== boundaryOf(link.to) && link.from !== 'identity' && link.to !== 'integration',
        })),
      };
    });
    return {
      visible: showGraphs,
      variants,
      workload: snapshot.inputs.workload,
      available: workloadIds.filter((id) => !snapshot.inputs.workload.includes(id)),
    };
  }

  private setPanelVisible(name: PanelName, visible: boolean): void {
    this.host.panel(name).setVisible(visible);
    if (visible) this.visiblePanels.add(name);
    else this.visiblePanels.delete(name);
  }

  private text(panel: UiPanel, id: string, text: string): void {
    panel.requireElementById(id).setProperties({ text: spatialText(text) });
  }

  private show(panel: UiPanel, id: string, visible: boolean): void {
    panel.requireElementById(id).setProperties({ display: visible ? 'flex' : 'none' });
  }

  private lines(panel: UiPanel, prefix: string, count: number, values: string[]): void {
    for (let index = 0; index < count; index++) {
      const element = panel.requireElementById(`${prefix}-${index}`);
      const value = values[index];
      element.setProperties({ text: value ?? '', display: value === undefined ? 'none' : 'flex' });
    }
  }

  private choiceButton(element: UiElement, selected: boolean, label?: string): void {
    element.setProperties({ variant: selected ? 'primary' : 'secondary', display: label === undefined ? 'none' : 'flex' });
  }

  private renderDecision(): void {
    const panel = this.host.panel('decision');
    const snapshot = this.session.snapshot;
    const context = this.session.context;
    const inputs = snapshot.inputs;
    this.setPanelVisible('decision', !this.paused);
    this.text(
      panel,
      'dp-subtitle',
      `${context.title} | v${snapshot.version} | ${inputs.path} path | ${context.inputOrigin} inputs | catalogue ${snapshot.catalogueVersion}`,
    );
    const stageIndex = stages.indexOf(this.stage);
    for (let index = 0; index < stages.length; index++) {
      panel.requireElementById(`dp-step-${index}`).setProperties({ value: index <= stageIndex });
    }
    for (const stage of stages) {
      if (stage === 'start') continue;
      panel.requireElementById(`dp-stage-${stage}`).setProperties({ variant: stage === this.stage ? 'primary' : 'secondary' });
      this.show(panel, `dp-section-${stage}`, this.stage === stage);
    }
    this.show(panel, 'dp-section-start', this.stage === 'start');
    this.show(panel, 'dp-resume', this.stage === 'start' && this.host.storage.load() !== null);
    this.renderTour(panel);

    // Product
    panel.requireElementById('dp-path-organization').setProperties({ variant: inputs.path === 'organization' ? 'primary' : 'secondary' });
    panel.requireElementById('dp-path-greenfield').setProperties({ variant: inputs.path === 'greenfield' ? 'primary' : 'secondary' });
    this.text(panel, 'dp-product-title', context.title);
    this.text(panel, 'dp-product-spec', context.specification);
    this.lines(
      panel,
      'dp-fact-line',
      9,
      factLines(inputs).map((fact) => `${fact.label}: ${fact.value} (${fact.classification === 'hard constraint' ? 'constraint' : 'assumption'})`),
    );
    this.text(
      panel,
      'dp-confirm-label',
      context.confirmed ? 'Summary confirmed - continue to requirements' : 'Confirm summary and assumptions',
    );
    const template = templates[this.templateIndex];
    this.text(panel, 'dp-template-title', `Template ${this.templateIndex + 1} of ${templates.length}: ${template.title}`);
    this.text(panel, 'dp-template-summary', template.summary);
    this.text(panel, 'dp-template-teaches', `Shows: ${template.teaches}`);
    for (const id of workloadIds) {
      const present = inputs.workload.includes(id);
      panel.requireElementById(`dp-workload-${id}`).setProperties({ variant: present ? 'primary' : 'secondary' });
      this.text(panel, `dp-workload-${id}-label`, `${present ? '- ' : '+ '}${workloadLibrary[id].label}`);
    }
    this.text(
      panel,
      'dp-workload-info',
      inputs.workload.length === 0
        ? 'No workload blocks added. Blocks are generic (e.g. file storage for uploaded documents); they join every option by boundary.'
        : `In the workflow: ${inputs.workload.map((id) => workloadLibrary[id].label).join(', ')}. Select a block in a diagram for its examples, owner and responsibilities.`,
    );
    this.text(
      panel,
      'dp-product-note',
      context.inputOrigin === 'sample'
        ? 'Sample facts are illustrative. Prepare your own project from the browser form; the spatial controls then work the same way.'
        : 'Your project inputs. Rates and budget come from the browser form; everything else can be changed here.',
    );

    // Requirements
    const questions = this.currentQuestions();
    this.questionIndex = Math.max(0, Math.min(this.questionIndex, questions.length - 1));
    const question = questions[this.questionIndex];
    const inputConflicts = conflicts(inputs);
    this.show(panel, 'dp-conflict', inputConflicts.length > 0);
    if (inputConflicts.length > 0) {
      const conflict = inputConflicts[0];
      this.text(panel, 'dp-conflict-text', `Contradiction: ${conflict.reason} ${conflict.prompt}`);
      this.text(panel, 'dp-conflict-fix-0-label', `Revisit ${inputDefinitions[conflict.inputs[0]].label}`);
      this.text(panel, 'dp-conflict-fix-1-label', `Revisit ${inputDefinitions[conflict.inputs[1]].label}`);
    }
    panel.requireElementById('dp-question-class').setProperties({
      label: question.classification,
      variant: question.classification === 'hard constraint' ? 'primary' : 'secondary',
    });
    this.text(
      panel,
      'dp-question-meta',
      `Question ${this.questionIndex + 1} of ${questions.length} | current: ${valueLabel(question.key, String(inputs[question.key]))}`,
    );
    this.text(panel, 'dp-question-title', question.title);
    this.text(panel, 'dp-question-reason', question.reason);
    for (let index = 0; index < 5; index++) {
      const choice = question.choices[index];
      this.choiceButton(panel.requireElementById(`dp-answer-${index}`), choice?.value === inputs[question.key], choice?.label);
      this.text(panel, `dp-answer-${index}-label`, choice?.label ?? '');
    }
    const suggestion = this.suggestedQuestion();
    this.show(panel, 'dp-question-suggested', suggestion !== undefined);
    if (suggestion) {
      this.text(panel, 'dp-question-suggested-label', `Suggested: ${inputDefinitions[suggestion.key].label} (${suggestion.priority})`);
    }
    const unknowns = questions.filter((entry) => inputs[entry.key] === 'unknown').length;
    const hard = questions.filter((entry) => entry.classification === 'hard constraint').length;
    this.text(
      panel,
      'dp-intake-summary',
      `${hard} hard constraints, ${questions.length - hard} scenario assumptions, ${unknowns} unknown, ${inputConflicts.length} contradiction(s). Recommendation: ${snapshot.recommendation ?? 'none yet (conditional or excluded findings)'}.`,
    );

    // Compare
    for (const id of deployments) {
      const assessment = assessmentFor(snapshot, id);
      panel.requireElementById(`dp-variant-${id}`).setProperties({ variant: id === this.inspected ? 'primary' : 'secondary' });
      panel.requireElementById(`dp-state-${id}`).setProperties(stateBadge[assessment.state]);
    }
    for (const view of views) {
      panel.requireElementById(`dp-view-${view}`).setProperties({ variant: view === this.view ? 'primary' : 'secondary' });
    }
    const inspected = assessmentFor(snapshot, this.inspected);
    this.text(panel, 'dp-compare-title', `${inspected.variant.label}: ${inspected.state.toUpperCase()} - ${this.viewTitle()}`);
    this.lines(panel, 'dp-compare-line', 10, this.compareLines(inspected));
    const change = this.session.lastChange;
    const applicableKeys = new Set(questions.map((entry) => entry.key));
    for (const key of Object.keys(inputDefinitions) as ChoiceKey[]) {
      const element = panel.requireElementById(`dp-change-${key}`);
      element.setProperties({
        display: applicableKeys.has(key) ? 'flex' : 'none',
        variant: this.changing === key || this.pending?.key === key ? 'primary' : 'secondary',
      });
    }
    // While a change is pending or highlighted the user inspects, keeps or undoes it before starting another.
    this.show(panel, 'dp-change-block', this.pending === null && !(this.highlightChange && change !== null));
    this.show(panel, 'dp-value-block', this.changing !== null && this.pending === null);
    if (this.changing) {
      const definition = inputDefinitions[this.changing];
      this.text(
        panel,
        'dp-value-prompt',
        `${definition.label} (${definition.classification}) is currently ${valueLabel(this.changing, String(inputs[this.changing]))}. Choose the proposed value:`,
      );
      for (let index = 0; index < 5; index++) {
        const value = definition.values[index];
        const current = value?.value === String(inputs[this.changing]);
        panel.requireElementById(`dp-value-${index}`).setProperties({
          display: value ? 'flex' : 'none',
          variant: current ? 'tertiary' : 'secondary',
          disabled: current,
        });
        this.text(panel, `dp-value-${index}-label`, value ? `${value.label}${current ? ' (current)' : ''}` : '');
      }
    }
    this.show(panel, 'dp-pending-block', this.pending !== null);
    if (this.pending) {
      const pending = this.pending;
      this.text(panel, 'dp-pending-title', `Proposed change: ${pending.label}`);
      this.lines(panel, 'dp-pending-line', 4, [
        `Existing: ${pending.currentLabel} -> Proposed: ${pending.proposedLabel} (${pending.classification}).`,
        `Preview: ${pending.summary.headline}`,
        pending.summary.variants
          .map((entry) => `${entry.label}: ${entry.affectedComponents.length > 0 ? entry.affectedComponents.join(', ') : 'no component changes'}`)
          .join(' | '),
        `Applying creates v${pending.preview.version}; v${snapshot.version} stays in history for undo.`,
      ]);
    }
    this.show(panel, 'dp-last-change-block', this.highlightChange && change !== null);
    if (change) {
      this.text(panel, 'dp-last-change-title', `What changed in v${change.fromVersion} -> v${change.toVersion}`);
      this.lines(panel, 'dp-last-change-line', 3, [
        `Cause: ${change.causes.join('; ') || 'none'}`,
        change.headline,
        change.variants
          .map((entry) => ({ ...entry, findings: entry.findings.filter((finding) => finding.before !== finding.after) }))
          .filter((entry) => entry.findings.length > 0)
          .map((entry) => `${entry.label}: ${entry.findings.map((finding) => `${finding.rule} ${finding.before} -> ${finding.after}`).join(', ')}`)
          .join(' | ') || 'No rule result changed; only explanations were updated.',
      ]);
    }

    // Review
    this.text(panel, 'dp-review-title', snapshot.recommendation ? `Recommendation: ${assessmentFor(snapshot, snapshot.recommendation).variant.label}` : 'No unconditional recommendation');
    this.lines(panel, 'dp-review-line', 10, this.reviewLines());
    for (const id of deployments) {
      const assessment = assessmentFor(snapshot, id);
      panel.requireElementById(`dp-select-${id}`).setProperties({
        variant: snapshot.selection === id ? 'primary' : assessment.state === 'viable' ? 'secondary' : 'tertiary',
        disabled: assessment.state !== 'viable',
      });
    }
    panel.requireElementById('dp-select-none').setProperties({ variant: snapshot.selection === null ? 'primary' : 'tertiary' });
    this.show(panel, 'dp-export-download', !this.immersive);
    this.show(panel, 'dp-export-delete', this.exportState.status === 'ready');
    const [exportLine0, exportLine1] = this.exportLines();
    this.text(panel, 'dp-export-line-0', exportLine0);
    this.text(panel, 'dp-export-line-1', exportLine1);

    this.text(panel, 'dp-status', [this.statusText, this.storageWarning].filter(Boolean).join(' '));
  }

  private renderTour(panel: UiPanel): void {
    const tour = this.tour;
    this.show(panel, 'dp-tour-block', tour !== null);
    if (!tour) return;
    if (tour.completed) {
      this.text(panel, 'dp-tour-title', 'Guided tour complete');
      this.lines(panel, 'dp-tour-line', 3, [
        'You confirmed a product, answered with Unknown and Open, inspected a failed block, previewed and applied a change, undid it, read a failure boundary, recorded a selection and exported.',
        'Real sessions work exactly the same way; only the facts are yours.',
        'Exit tour restores your previous project.',
      ]);
      this.show(panel, 'dp-tour-perform', false);
      this.show(panel, 'dp-tour-next', false);
      this.show(panel, 'dp-tour-skip', false);
      return;
    }
    const step = tourSteps[tour.stepIndex];
    const done = this.tourStepDone();
    this.text(panel, 'dp-tour-title', `Guided tour, step ${tour.stepIndex + 1} of ${tourSteps.length}: ${step.title}`);
    this.lines(panel, 'dp-tour-line', 3, [
      step.instruction,
      `Why: ${step.why}`,
      done ? 'Done. Select "Next step" to continue.' : 'Not done yet.',
    ]);
    this.show(panel, 'dp-tour-perform', !done);
    this.show(panel, 'dp-tour-next', true);
    this.show(panel, 'dp-tour-skip', !done);
    panel.requireElementById('dp-tour-next').setProperties({ variant: done ? 'primary' : 'secondary' });
  }

  private viewTitle(): string {
    return { overview: 'overview', cost: 'cost estimate', operations: 'operating responsibilities', recovery: 'failure boundaries', growth: 'launch to growth' }[this.view];
  }

  private compareLines(assessment: Assessment): string[] {
    const snapshot = this.session.snapshot;
    switch (this.view) {
      case 'overview': {
        const issues = assessment.findings.filter((finding) => finding.result !== 'pass');
        return [
          assessment.variant.summary,
          issues.length === 0
            ? 'All modeled mandatory checks pass under the confirmed inputs.'
            : `${issues.length} open finding(s):`,
          ...issues.slice(0, 4).map((finding) => `${resultMarker[finding.result]}${finding.rule}: ${finding.reason}`),
          `Prerequisites: ${assessment.variant.prerequisites.join(' ')}`,
          `Limitations: ${assessment.variant.limitations[0]}`,
          `Others: ${snapshot.assessments
            .filter((entry) => entry.variant.id !== assessment.variant.id)
            .map((entry) => `${entry.variant.label} ${entry.state}`)
            .join(', ')}. Recommendation: ${snapshot.recommendation ?? 'none (not unique or not unconditional)'}.`,
        ];
      }
      case 'cost': {
        const cost = assessment.cost;
        const budget = assessment.findings.find((finding) => finding.rule === 'budget');
        return [
          `${cost.scenario} scenario | ${cost.currency} | ${cost.completeness} | estimated ${cost.estimateDate.slice(0, 10)}`,
          ...cost.lines.map((line) => `${line.label}: ${line.formula} = ${formatMoney(line.amount, cost.currency)}`),
          `Subtotal: ${formatMoney(cost.subtotal, cost.currency)} per month${cost.subtotal === null ? '' : ' (incomplete; not a total)'}`,
          cost.basis,
          `Excluded: ${cost.exclusions.join('; ')}.`,
          budget ? `${resultMarker[budget.result]}budget: ${budget.reason}` : 'No hard budget recorded; set one in the browser form.',
          `Other options: ${snapshot.assessments
            .filter((entry) => entry.variant.id !== assessment.variant.id)
            .map((entry) => `${entry.variant.label} ${formatMoney(entry.cost.subtotal, entry.cost.currency)}`)
            .join(', ')}. Labels, not quotes.`,
        ];
      }
      case 'operations':
        return [
          ...assessment.responsibilities.map((entry) => `${entry.task}: ${entry.owner}`),
          `Operating owner input: ${valueLabel('operator', snapshot.inputs.operator)}. Managed services still leave application and account responsibilities.`,
        ];
      case 'recovery':
        return [
          ...assessment.variant.failureScenarios.flatMap((scenario) => [
            `${scenario.title}: ${scenario.description}`,
            `Affected: ${scenario.affected.join(', ')}. Impact: ${scenario.impact}`,
            `Recovery owner: ${scenario.recoveryOwner}. ${scenario.note}`,
          ]),
          `Recovery expectation: ${valueLabel('recovery', snapshot.inputs.recovery)}. ${
            snapshot.inputs.recovery === 'high-availability'
              ? '! Redundant designs are unsupported by this catalogue.'
              : 'Basic restore is modeled; no availability figure is claimed.'
          }`,
          'Authored scenarios explain modeled findings; they are not reliability simulations.',
        ];
      case 'growth':
        return [
          `Usage scenario: ${valueLabel('usage', snapshot.inputs.usage)}. Growth means a three-times quantity assumption, not a forecast.`,
          ...assessment.variant.growth.changes.map((change) => `Change: ${change}`),
          ...assessment.variant.growth.triggers.map((trigger) => `Trigger: ${trigger}`),
          assessment.variant.growth.caution,
          `Growth subtotal here: ${formatMoney(assessment.cost.subtotal, assessment.cost.currency)} (${assessment.cost.scenario} scenario shown).`,
        ];
    }
  }

  private reviewLines(): string[] {
    const snapshot = this.session.snapshot;
    const assumptions = factLines(snapshot.inputs).filter((fact) => fact.classification === 'scenario assumption');
    return [
      ...snapshot.recommendationReasons.slice(0, 3),
      `User selection: ${snapshot.selection ? assessmentFor(snapshot, snapshot.selection).variant.label : 'none (uncertainty retained)'}.`,
      `Accepted assumptions (${this.session.context.confirmed ? 'acknowledged' : 'NOT yet acknowledged'}): ${assumptions
        .map((fact) => `${fact.label} = ${fact.value}`)
        .join('; ')}${snapshot.inputs.rates ? '; user-supplied scenario rates' : '; no rates supplied'}.`,
      `Open issues (${snapshot.openIssues.length}): ${snapshot.openIssues.slice(0, 2).join(' | ')}`,
      `Reversal: ${snapshot.reversalConditions[0] ?? ''}`,
      `Versions: decision v${snapshot.version}, catalogue ${snapshot.catalogueVersion}, rules ${snapshot.rulesVersion}, created ${snapshot.createdAt.slice(0, 16).replace('T', ' ')} UTC.`,
      'Costs are unpriced unless you supplied rates; compatibility, identity and backup details need implementation review.',
    ];
  }

  private exportLines(): [string, string] {
    const state = this.exportState;
    switch (state.status) {
      case 'idle':
        return [
          'Export creates Markdown plus one SVG diagram per pattern from this exact version.',
          'In the headset, the export inbox gives you a retrieval code and URL to open on any device; in the browser you can also download the files.',
        ];
      case 'working':
        return [`Exporting v${state.version}...`, 'Storing the bundle in the export inbox. This does not publish anything.'];
      case 'ready':
        return [
          `Export v${state.version} ready. Retrieval code: ${state.code}`,
          `Open ${state.url} on any device (expires ${state.expiresAt.slice(0, 16).replace('T', ' ')} UTC). Private to whoever has the code.`,
        ];
      case 'downloaded':
        return [`Download requested for v${state.version}: ${state.files} file(s).`, 'Check the browser download manager.'];
      case 'failed':
        return [`Export v${state.version} failed: ${state.reason}.`, 'Your decision is unchanged. Retry, or download the files in browser mode.'];
      case 'deleted':
        return [`Server copy ${state.code} (v${state.version}) deleted.`, 'Export again whenever you need a new retrieval code.'];
    }
  }

  private renderGraphs(): void {
    const snapshot = this.session.snapshot;
    const inspected = assessmentFor(snapshot, this.inspected);
    const showGraphs = !this.paused && this.stage !== 'start' && this.stage !== 'product';
    for (const id of deployments) {
      const panel = this.host.panel(`graph-${id}`);
      this.setPanelVisible(`graph-${id}`, showGraphs);
      const assessment = assessmentFor(snapshot, id);
      this.text(panel, 'ag-title', assessment.variant.label);
      panel.requireElementById('ag-state').setProperties(stateBadge[assessment.state]);
      this.text(panel, 'ag-summary', assessment.variant.summary);
      const changed = this.highlightChange ? affectedComponents(this.session.lastChange, id) : [];
      const linked = this.linkedComponents(assessment);
      for (const workloadId of workloadIds) {
        if (!snapshot.inputs.workload.includes(workloadId)) panel.requireElementById(`ag-node-${workloadId}`).setProperties({ display: 'none' });
      }
      this.show(panel, 'ag-workload-row', snapshot.inputs.workload.length > 0);
      for (const component of assessment.components) this.renderNode(panel, id, component, changed, linked);
      this.text(panel, 'ag-focus', this.graphFocusLine(assessment, changed, linked));
      this.text(panel, 'ag-diff', this.differenceLine(assessment, inspected));
      panel.requireElementById('ag-inspect').setProperties({ variant: id === this.inspected ? 'primary' : 'secondary' });
      this.text(panel, 'ag-inspect-label', id === this.inspected ? 'Inspected' : 'Inspect');
      panel.requireElementById('ag-failure').setProperties({
        variant: this.focus?.kind === 'failure' && this.focus.variant === id ? 'primary' : 'secondary',
      });
    }
  }

  private linkedComponents(assessment: Assessment): ComponentId[] {
    const focus = this.focus;
    if (!focus) return [];
    if (focus.kind === 'requirement') {
      return [
        ...new Set(
          assessment.findings.filter((finding) => finding.inputs.includes(focus.key)).flatMap((finding) => finding.components),
        ),
      ];
    }
    if (focus.kind === 'failure' && focus.variant === assessment.variant.id) {
      return assessment.variant.failureScenarios[focus.index]?.affected ?? [];
    }
    if (focus.kind === 'component' && focus.variant === assessment.variant.id) {
      const view = assessment.components.find((entry) => entry.id === focus.id);
      return view ? [...view.dependsOn] : [];
    }
    return [];
  }

  private renderNode(panel: UiPanel, variant: Deployment, view: ComponentView, changed: ComponentId[], linked: ComponentId[]): void {
    const element = panel.requireElementById(`ag-node-${view.id}`);
    if (view.kind === 'workload') element.setProperties({ display: 'flex' });
    if (!view.present) {
      element.setProperties({ variant: 'tertiary', disabled: true, backgroundColor: undefined, color: undefined, borderWidth: 0, borderColor: undefined });
      this.text(panel, `ag-node-${view.id}-label`, view.label);
      this.text(panel, `ag-node-${view.id}-sub`, view.boundary);
      return;
    }
    const focused = this.focus?.kind === 'component' && this.focus.variant === variant && this.focus.id === view.id;
    const isChanged = changed.includes(view.id);
    const isLinked = linked.includes(view.id);
    const marker = `${isChanged ? CHANGE_MARK : ''}${isLinked ? LINK_MARK : ''}${resultMarker[view.worstResult]}`;
    // Colour is never the only signal: the marker prefix and the detail text carry the same state.
    const tinted = view.worstResult === 'unknown' || view.worstResult === 'unsupported';
    const properties: Record<string, unknown> = {
      disabled: false,
      variant: focused || tinted ? 'primary' : view.worstResult === 'fail' ? 'negative' : 'secondary',
      backgroundColor: focused ? undefined : view.worstResult === 'unknown' ? '#b36b00' : view.worstResult === 'unsupported' ? '#6b4fa0' : undefined,
      borderWidth: focused || isChanged || isLinked ? 3 : 0,
      borderColor: focused ? '#1877f2' : isChanged ? '#e0a100' : isLinked ? '#1877f2' : undefined,
    };
    element.setProperties(properties);
    this.text(panel, `ag-node-${view.id}-label`, `${marker}${view.label}`);
    this.text(panel, `ag-node-${view.id}-sub`, view.boundary);
  }

  private graphFocusLine(assessment: Assessment, changed: ComponentId[], linked: ComponentId[]): string {
    const focus = this.focus;
    if (focus?.kind === 'requirement') {
      const findings = assessment.findings.filter((finding) => finding.inputs.includes(focus.key));
      return findings.length === 0
        ? `${inputDefinitions[focus.key].label}: no rule applies to this variant.`
        : findings.map((finding) => `${inputDefinitions[focus.key].label}: ${finding.result.toUpperCase()} here (${finding.rule}).`).join(' ');
    }
    if (focus?.kind === 'failure' && focus.variant === assessment.variant.id) {
      const scenario = assessment.variant.failureScenarios[focus.index];
      return `Failure boundary: ${scenario.title}. Affected: ${scenario.affected.join(', ')}.`;
    }
    if (focus?.kind === 'component' && focus.variant === assessment.variant.id) {
      return `Selected: ${focus.id}. Depends on: ${linked.join(', ') || 'nothing'}.`;
    }
    if (changed.length > 0) {
      return `Changed in v${this.session.lastChange?.toVersion}: ${changed.join(', ')}.`;
    }
    return 'Select a component to inspect it.';
  }

  private differenceLine(assessment: Assessment, inspected: Assessment): string {
    if (assessment.variant.id === inspected.variant.id) return 'Inspected option. The other panels list their differences from it.';
    const substitutions: string[] = [];
    const additions: string[] = [];
    const removals: string[] = [];
    for (const component of assessment.components) {
      const other = inspected.components.find((entry) => entry.id === component.id)!;
      if (component.present && !other.present) additions.push(component.label);
      else if (!component.present && other.present) removals.push(component.label);
      else if (component.present && component.boundary !== other.boundary) substitutions.push(`${component.label} (${component.boundary})`);
    }
    const parts = [
      substitutions.length > 0 ? `substitutes ${substitutions.join(', ')}` : '',
      additions.length > 0 ? `adds ${additions.join(', ')}` : '',
      removals.length > 0 ? `removes ${removals.join(', ')}` : '',
    ].filter(Boolean);
    return parts.length === 0 ? `Same components and boundaries as ${inspected.variant.label}.` : `Vs. ${inspected.variant.label}: ${parts.join('; ')}.`;
  }

  private renderDetail(): void {
    const panel = this.host.panel('detail');
    const focus = this.focus;
    this.setPanelVisible('detail', !this.paused && focus !== null);
    const actions: { label: string; run: () => void }[] = [];
    let kicker = 'DETAIL';
    let title = 'Nothing selected';
    let lines: string[] = [];
    let note = 'Evidence is illustrative catalogue content unless marked verified.';
    const snapshot = this.session.snapshot;
    if (focus?.kind === 'component') {
      const assessment = assessmentFor(snapshot, focus.variant);
      const view = assessment.components.find((entry) => entry.id === focus.id)!;
      const findings = assessment.findings.filter((finding) => finding.components.includes(focus.id));
      kicker = 'COMPONENT';
      title = `${view.label} (${assessment.variant.label})`;
      lines = [
        `Purpose: ${view.purpose}`,
        `Boundary: ${view.boundary}`,
        `Owner: ${view.owner}`,
        `Depends on: ${view.dependsOn.join(', ') || 'nothing'}`,
        `Responsibility: ${view.responsibility}`,
        ...(view.kind === 'workload'
          ? [`Generic block. Examples: ${workloadLibrary[view.id as WorkloadId].examples.join('; ')}. Not included in the supplied rates.`]
          : []),
        findings.length === 0 ? 'No rule references this component.' : `Findings (${findings.length}):`,
        ...findings.slice(0, 4).map((finding) => `${resultMarker[finding.result] || 'OK '}${finding.rule}: ${finding.reason}`),
        `Evidence: ${assessment.evidence.map((record) => `${record.claim} [${record.status}]`).join(' ')}`,
      ];
      const firstIssue = findings.find((finding) => finding.result !== 'pass') ?? findings[0];
      const key = firstIssue?.inputs.find((input): input is ChoiceKey => input in inputDefinitions);
      if (key) actions.push({ label: `Highlight requirement: ${inputDefinitions[key].label}`, run: () => this.focusRequirement(key) });
      const present = assessment.components.filter((entry) => entry.present);
      const next = present[(present.findIndex((entry) => entry.id === focus.id) + 1) % present.length];
      if (view.kind === 'workload') {
        actions.push({ label: `Remove ${view.label} from the workflow`, run: () => this.toggleWorkload(view.id as WorkloadId, false) });
      } else {
        actions.push({ label: `Next component: ${next.label}`, run: () => this.focusComponent(focus.variant, next.id) });
      }
    } else if (focus?.kind === 'requirement') {
      const definition = inputDefinitions[focus.key];
      kicker = 'REQUIREMENT';
      title = definition.label;
      lines = [
        `Classification: ${definition.classification}. Current value: ${valueLabel(focus.key, String(snapshot.inputs[focus.key]))}.`,
        `Why it matters: ${applicableQuestions({ ...snapshot.inputs, deployment: 'open' }).find((question) => question.key === focus.key)?.reason ?? ''}`,
        ...snapshot.assessments.map((assessment) => {
          const related = assessment.findings.filter((finding) => finding.inputs.includes(focus.key));
          return related.length === 0
            ? `${assessment.variant.label}: no rule applies.`
            : `${assessment.variant.label}: ${related.map((finding) => `${finding.result.toUpperCase()} - ${finding.reason}`).join(' ')}`;
        }),
        'Components linked to this requirement are marked > in every diagram.',
      ];
      actions.push({ label: 'Change this input', run: () => { this.stage = 'compare'; this.startChange(focus.key); } });
      const keys = applicableQuestions(snapshot.inputs).map((question) => question.key);
      const next = keys[(keys.indexOf(focus.key) + 1) % keys.length];
      actions.push({ label: `Next requirement: ${inputDefinitions[next].label}`, run: () => this.focusRequirement(next) });
    } else if (focus?.kind === 'failure') {
      const assessment = assessmentFor(snapshot, focus.variant);
      const scenario: FailureScenario = assessment.variant.failureScenarios[focus.index];
      kicker = 'FAILURE BOUNDARY';
      title = `${scenario.title} (${assessment.variant.label})`;
      lines = [
        scenario.description,
        `Affected components: ${scenario.affected.join(', ')} (marked > in the ${assessment.variant.label} diagram).`,
        `Impact: ${scenario.impact}`,
        `Recovery owner: ${scenario.recoveryOwner}`,
        scenario.note,
        `Backups owner here: ${assessment.responsibilities.find((entry) => entry.task === 'backups')?.owner}; restore verification: ${assessment.responsibilities.find((entry) => entry.task === 'restore verification')?.owner}.`,
      ];
      note = 'Authored scenario explaining modeled findings. It is not a reliability simulation and claims no availability figure.';
      actions.push({ label: 'Next scenario', run: () => this.focusFailure(focus.variant) });
      const other = deployments[(deployments.indexOf(focus.variant) + 1) % deployments.length];
      actions.push({ label: `Same check for ${assessmentFor(snapshot, other).variant.label}`, run: () => { this.focus = { kind: 'failure', variant: other, index: 0 }; this.inspected = other; this.render(); } });
    } else if (focus?.kind === 'walkthrough') {
      const template = templates.find((entry) => entry.id === focus.templateId) ?? templates[0];
      kicker = 'WALK-THROUGH';
      title = template.title;
      lines = [
        template.summary,
        `Shows: ${template.teaches}`,
        ...template.walkthrough.map((step, index) => `Step ${index + 1}: ${step}`),
        `Expected outcome: ${template.expectedOutcome}`,
        'Template facts are illustrative. Fork it by changing any input; your own project details come from the browser form.',
      ];
      note = 'Templates are provider-neutral samples, not verified designs.';
      actions.push({ label: 'Go to Compare', run: () => this.goTo('compare') });
      actions.push({ label: 'Next template', run: () => { this.browseTemplates(1); this.openTemplate(this.templateIndex); } });
    } else if (focus?.kind === 'help') {
      kicker = 'HELP';
      title = 'How to use this workspace';
      lines = [
        'Select: point at a button and pinch (hands), pull the trigger (controller) or click (browser). Nothing confirms on hover.',
        'Journey: 1 Product -> 2 Requirements -> 3 Compare -> 4 Review. Use the stage buttons to move back at any time.',
        'Diagrams: the three panels above align the same component roles. Select a component for its purpose, owner, dependencies and findings.',
        'Markers: ? unknown, ! unsupported by this catalogue, X failed mandatory check, * affected by your last change, > linked to the selected requirement or scenario.',
        'Change: in Compare, choose an input, pick a value, read the preview, then apply. Undo restores the previous version; nothing is lost.',
        'Controls panel: Reset to overview clears highlights; Recenter moves panels in front of you; Text size cycles 100/120/140%.',
        'Lost hand tracking: hold your hands in view. A pending selection is not confirmed while tracking is lost.',
        'Interrupted session: your latest confirmed state is saved in this browser. Use Resume on the start screen after a reload.',
        'Export: Review -> Export decision record stores Markdown, SVG diagrams and JSON in the export inbox and shows a retrieval code.',
        'Guided tour: a practice session on a sample project with one instruction per step and "Do it for me"; your own project is restored when you exit.',
        'Templates: in Product, browse the library and open one; the walk-through appears here. Workload blocks (storage, jobs, cache, queue, integration) are added with their buttons or by dropping a block from the library shelf onto an option.',
        'Your data: inputs and product text stay in this browser (local storage) until you delete them; exports live on the server for 24 hours under a private code; nothing is sent to AI without your consent. AI, when available, was configured by the operator outside the headset; no API key is ever entered here.',
      ];
      note = 'Conceptual patterns only: no provider, price or availability claim is verified. Costs need your rates (browser form).';
    }
    panel.requireElementById('dt-kicker').setProperties({ label: kicker, variant: kicker === 'FAILURE BOUNDARY' ? 'negative' : kicker === 'HELP' || kicker === 'WALK-THROUGH' ? 'primary' : 'secondary' });
    this.text(panel, 'dt-title', title);
    this.lines(panel, 'dt-line', 12, lines.length > 0 ? lines : ['Select a component in a diagram, a requirement in the compare view, or Help on the controls panel.']);
    this.text(panel, 'dt-note', note);
    for (let index = 0; index < 2; index++) {
      const action = actions[index];
      this.detailActions[index] = action?.run ?? (() => undefined);
      this.show(panel, `dt-action-${index}`, action !== undefined);
      this.text(panel, `dt-action-${index}-label`, action?.label ?? '');
    }
  }

  private renderControls(): void {
    const panel = this.host.panel('controls');
    this.text(panel, 'cp-undo-label', this.session.canUndo ? `Undo (to v${this.session.snapshot.version - 1}'s inputs)` : 'Undo (nothing yet)');
    this.text(panel, 'cp-text-label', `Text size ${Math.round(textScales[this.textScaleIndex] * 100)}%`);
    this.text(panel, 'cp-pause-label', this.paused ? 'Resume' : 'Pause');
    panel.requireElementById('cp-pause').setProperties({ variant: this.paused ? 'primary' : 'secondary' });
    panel.requireElementById('cp-help').setProperties({ variant: this.focus?.kind === 'help' ? 'primary' : 'secondary' });
    this.text(panel, 'cp-tour-label', this.tour ? 'Exit guided tour' : 'Guided tour');
    panel.requireElementById('cp-tour').setProperties({ variant: this.tour ? 'primary' : 'secondary' });
    this.show(panel, 'cp-xr', this.host.xr.available && !this.immersive);
    this.show(panel, 'cp-exit', this.immersive);
    const mode = this.immersive ? 'Immersive mode: point and pinch or use the trigger.' : 'Browser mode: click to select. Enter immersive on a headset.';
    this.text(panel, 'cp-status', this.paused ? 'Paused. Panels are hidden until you resume; confirmed inputs are saved.' : mode);
    const alert = this.trackingLost
      ? 'No hands or controllers tracked. Hold your hands in view; nothing is confirmed until you select again.'
      : this.interrupted
        ? 'Immersive session was interrupted. Your latest confirmed state is intact.'
        : '';
    this.show(panel, 'cp-alert', alert !== '');
    this.text(panel, 'cp-alert', alert);
  }
}

export const presenterPanelNames: PanelName[] = ['decision', 'detail', 'controls', 'graph-cloud', 'graph-on-premise', 'graph-hybrid', 'keyboard', 'carousel'];
