/**
 * Guided tour: an optional practice session on a sandboxed sample project.
 * Each step names one action, explains why it matters and checks the
 * workspace state to tell when the user has done it. "Do it for me" performs
 * the same action the user would, through the presenter, so the tour never
 * bypasses the normal rules. Nothing auto-advances; the user presses Next.
 */
import type { WorkspacePresenter } from './presenter.js';
import { templateById } from './templates.js';

export const TOUR_TEMPLATE_ID = 'internal-records';

export interface TourStep {
  id: string;
  title: string;
  instruction: string;
  why: string;
  /** True once the workspace state shows the step was done; reachedVersion is the decision version when the step was reached. */
  check(presenter: WorkspacePresenter, reachedVersion: number): boolean;
  /** Performs the step through the same presenter actions the user would trigger. */
  perform(presenter: WorkspacePresenter): void;
}

export const tourSteps: TourStep[] = [
  {
    id: 'confirm',
    title: 'Read and confirm the sample product',
    instruction: 'On 1 Product, read the summary and the supplied facts, then select "Confirm summary and assumptions".',
    why: 'Facts are labelled constraint (mandatory) or assumption (scenario input). Confirming records that you reviewed them; it does not verify them.',
    check: (presenter) => presenter.session.context.confirmed,
    perform: (presenter) => presenter.confirmContext(),
  },
  {
    id: 'unknown',
    title: 'Answer a question with Unknown',
    instruction: 'On 2 Requirements, set "Deployment policy" to Unknown.',
    why: 'Unknown is never treated as permission: every option turns conditional and the suggested next question points at the blocker.',
    check: (presenter) => presenter.session.snapshot.inputs.deployment === 'unknown',
    perform: (presenter) => {
      presenter.goTo('requirements');
      presenter.questionIndex = 0;
      presenter.answer(4);
    },
  },
  {
    id: 'open',
    title: 'Set it back to Open',
    instruction: 'Select "Open" for the same question, then "Compare supported patterns".',
    why: 'Open means the choice is part of the assessment. The recommendation returns once the mandatory unknown is resolved.',
    check: (presenter) => presenter.session.snapshot.inputs.deployment === 'open' && presenter.stage === 'compare',
    perform: (presenter) => {
      presenter.goTo('requirements');
      presenter.questionIndex = 0;
      presenter.answer(0);
      presenter.goTo('compare');
    },
  },
  {
    id: 'inspect',
    title: 'Select the failed Database block',
    instruction: 'In the Cloud island (or the Cloud text panel), select the Database block.',
    why: 'The detail panel shows its purpose, owner, dependencies and the finding that fails: the database must stay on site, so Cloud is excluded.',
    check: (presenter) => presenter.focus?.kind === 'component' && presenter.focus.variant === 'cloud' && presenter.focus.id === 'database',
    perform: (presenter) => presenter.focusComponent('cloud', 'database'),
  },
  {
    id: 'change',
    title: 'Preview and apply a change',
    instruction: 'Select "Data location", choose "Open", read the preview, then "Apply as new version".',
    why: 'Changes are previewed first: existing value, proposed value, classification and what would change. Applying creates a new version; the old one stays for undo.',
    check: (presenter) => presenter.session.snapshot.inputs.dataLocation === 'open',
    perform: (presenter) => {
      presenter.startChange('dataLocation');
      presenter.proposeValue(0);
      presenter.applyChange();
    },
  },
  {
    id: 'undo',
    title: 'Undo the change',
    instruction: 'Select "Undo this change" (or Undo on the controls panel).',
    why: 'Undo restores the previous confirmed inputs as a new version, so exported versions are never reused.',
    check: (presenter, reachedVersion) =>
      presenter.session.snapshot.inputs.dataLocation === 'on-premise' && presenter.session.snapshot.version > reachedVersion,
    perform: (presenter) => presenter.undo(),
  },
  {
    id: 'failure',
    title: 'Inspect a failure boundary',
    instruction: 'Select "Failures" on the Hybrid panel.',
    why: 'Authored failure scenarios show which components stop working and who recovers them. They explain modeled findings; they are not simulations.',
    check: (presenter) => presenter.focus?.kind === 'failure' && presenter.focus.variant === 'hybrid',
    perform: (presenter) => presenter.focusFailure('hybrid'),
  },
  {
    id: 'select',
    title: 'Record a selection',
    instruction: 'Go to 4 Review and select "Select On-premise".',
    why: 'Your selection is recorded separately from the system recommendation. Only viable options can be selected; conditional ones explain what is missing.',
    check: (presenter) => presenter.session.snapshot.selection === 'on-premise',
    perform: (presenter) => {
      presenter.goTo('review');
      presenter.select('on-premise');
    },
  },
  {
    id: 'export',
    title: 'Export the decision record',
    instruction: 'Select "Export decision record" and read the retrieval code, or "Download files" in the browser.',
    why: 'Markdown, three SVG diagrams and a JSON bundle come from the same frozen version, so they always agree.',
    check: (presenter) => presenter.exportState.status !== 'idle' && presenter.exportState.status !== 'working',
    perform: (presenter) => {
      presenter.goTo('review');
      void presenter.exportToInbox();
    },
  },
];

export function tourTemplate() {
  const template = templateById(TOUR_TEMPLATE_ID);
  if (!template) throw new Error('Tour template missing.');
  return template;
}
