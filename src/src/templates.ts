/**
 * Template library: authored, provider-neutral starting points.
 *
 * Each template is a complete project (context + inputs) the user can open,
 * explore and fork. Templates exist to show what the workspace can express, to
 * give variations a starting point, and to anchor walk-throughs. Their facts
 * are illustrative and labelled as such; rates, when present, are sample
 * assumptions and never quotes.
 */
import { sample } from './decision.js';
import type { Inputs } from './decision.js';
import { sampleContext } from './intake.js';
import type { ProjectContext } from './intake.js';

export interface Template {
  id: string;
  title: string;
  path: Inputs['path'];
  summary: string;
  teaches: string;
  /** Short walk-through: what to do and what to watch for. */
  walkthrough: string[];
  expectedOutcome: string;
  inputs: Inputs;
  context: ProjectContext;
}

function project(path: Inputs['path'], title: string, specification: string, overrides: Partial<Inputs> = {}): Pick<Template, 'inputs' | 'context'> {
  return {
    inputs: { ...sample(path), ...overrides },
    context: { ...sampleContext(path), title, specification },
  };
}

export const templates: Template[] = [
  {
    id: 'internal-records',
    title: 'Internal records application',
    path: 'organization',
    summary: 'Employees manage business records; organizational identity is mandatory and data must stay on site.',
    teaches: 'How a hard data-location constraint excludes an otherwise attractive option.',
    walkthrough: [
      'Open Compare: Cloud is excluded by the database location rule.',
      'Change Data location to Open and apply: Cloud becomes conditional, not viable, because identity federation is unconfirmed.',
      'Undo, then export the record and compare the Markdown with the diagrams.',
    ],
    expectedOutcome: 'On-premise is the only viable option; Hybrid stays conditional until connectivity and latency are confirmed.',
    ...project(
      'organization',
      'Internal records application (template)',
      'Employees manage business records through a browser. The organization already runs an identity system that the application must use, and database records must remain at the organizational site. The application is a conventional HTTP backend with a relational database. Hosting is open for evaluation.',
    ),
  },
  {
    id: 'customer-launch',
    title: 'Customer-facing launch',
    path: 'greenfield',
    summary: 'A small team launches a customer-facing web application with no existing infrastructure.',
    teaches: 'Why the operating owner and usage scenario matter more than the hosting label.',
    walkthrough: [
      'Open Compare: Cloud is the only viable option because no site capacity exists.',
      'Change Usage to Growth and apply: states do not change, but the growth view lists triggers to watch.',
      'Change Operating owner to No owner and apply: every option is excluded; no hosting label removes application responsibilities.',
    ],
    expectedOutcome: 'Cloud viable; On-premise and Hybrid excluded by missing site capacity.',
    ...project(
      'greenfield',
      'Customer-facing launch (template)',
      'A small team launches a customer-facing business web application: browser frontend, HTTP backend, relational database. No organizational infrastructure exists. Usage is uncertain and maintenance capacity is limited.',
    ),
  },
  {
    id: 'hybrid-pilot',
    title: 'Hybrid pilot with verified link',
    path: 'organization',
    summary: 'Application hosted externally, database retained on site, with a verified private connection and a latency-tolerant workload.',
    teaches: 'The exact conditions under which the bounded hybrid pattern becomes viable.',
    walkthrough: [
      'Open Compare: Hybrid is conditional only because organizational identity federation is unconfirmed.',
      'Select the Connectivity block in the Hybrid diagram to read its owner and failure behavior.',
      'Use Failures on the Hybrid diagram: the link failure scenario shows which components stop working.',
    ],
    expectedOutcome: 'On-premise viable; Hybrid conditional on identity; Cloud excluded by data location.',
    ...project(
      'organization',
      'Hybrid pilot (template)',
      'An internal application will be hosted externally for elasticity while its database stays at the organization site for policy reasons. A private connection has been tested and the workload tolerates cross-site latency. Organizational identity is mandatory.',
      { connectivity: 'verified', latency: 'tolerant' },
    ),
  },
  {
    id: 'availability-request',
    title: 'High-availability request',
    path: 'organization',
    summary: 'Stakeholders ask for a redundant design that this single-site catalogue does not validate.',
    teaches: 'Abstention: unsupported is a coverage limit, not a verdict that the requirement is infeasible.',
    walkthrough: [
      'Open Compare: On-premise and Hybrid are unsupported (recovery rule); Cloud is excluded by the data location rule.',
      'Change Recovery expectation to Basic restore and apply to see the supported comparison.',
      'Read the open issues in Review: the availability requirement stays recorded for a specialist review.',
    ],
    expectedOutcome: 'No recommendation; nothing is viable until the recovery expectation is revisited or a validated redundant variant exists.',
    ...project(
      'organization',
      'High-availability request (template)',
      'An internal application is expected to survive a full site outage without interruption. Organizational identity is mandatory and the database must stay at the organization site. The catalogue covers single-site designs only.',
      { recovery: 'high-availability' },
    ),
  },
  {
    id: 'budget-bound',
    title: 'Budget-bound launch with sample rates',
    path: 'greenfield',
    summary: 'A launch with a hard monthly budget and illustrative scenario rates, so affordability can be evaluated.',
    teaches: 'Cost completeness: a subtotal within budget is still conditional; growth can cross the budget and exclude an option.',
    walkthrough: [
      'Open Compare and the Cost view: line items show the formula quantity x rate and the excluded categories.',
      'Change Usage to Growth and apply: the cloud subtotal exceeds the budget and the option is excluded.',
      'Undo, then open Review: the recommendation is conditional because excluded cost categories remain.',
    ],
    expectedOutcome: 'Cloud conditional on cost completeness at launch; excluded under the growth scenario.',
    ...project(
      'greenfield',
      'Budget-bound launch (template)',
      'A startup launches a customer-facing web application with a hard monthly hosting budget of 120 USD. The founders supplied illustrative monthly scenario rates: external hosting 50, site 40, connectivity 20. These are assumptions, not quotes.',
      { budget: 120, rates: { hosting: 50, site: 40, connectivity: 20 } },
    ),
  },
  {
    id: 'document-workflow',
    title: 'Document workflow with storage and jobs',
    path: 'greenfield',
    summary: 'Users upload documents that are processed in the background; the design adds file storage, a queue and background jobs.',
    teaches: 'Workload blocks: generic building blocks join the diagram, follow a boundary per option and add their own responsibilities.',
    walkthrough: [
      'Open Compare: the Storage, Queue and Jobs blocks appear in every diagram, placed by boundary.',
      'Select the Storage block in the Hybrid diagram: it stays on site with the database, so the link carries file traffic too.',
      'In Product, remove the Queue block with its button (or drag a block from the library to add another) and watch the diagrams update.',
    ],
    expectedOutcome: 'Cloud viable; the added blocks extend responsibilities and cost exclusions without changing the mandatory findings.',
    ...project(
      'greenfield',
      'Document workflow (template)',
      'Customers upload contracts that are converted and indexed in the background before they appear in the application. Files are kept outside the relational database. Processing must not block the request cycle.',
      { workload: ['storage', 'jobs', 'queue'] },
    ),
  },
  {
    id: 'discovery',
    title: 'Discovery: everything unknown',
    path: 'organization',
    summary: 'A first conversation with a stakeholder: nothing is confirmed yet.',
    teaches: 'Unknown is never treated as permission; the question order follows what blocks the decision.',
    walkthrough: [
      'Open Requirements: the suggested question is a mandatory unknown; answer it and watch the priority move.',
      'Open Compare: every option is conditional with the unknown rules listed.',
      'Answer Deployment policy as Cloud mandated while Database location is unknown: no contradiction yet; set data location to on-site to see one.',
    ],
    expectedOutcome: 'No recommendation until the mandatory unknowns are answered.',
    ...project(
      'organization',
      'Discovery session (template)',
      'A department wants a new internal web application. Policies on hosting, identity, data location and operations have not been confirmed yet. The purpose of the session is to find out which answers would change the design.',
      { deployment: 'unknown', dataLocation: 'unknown', identity: 'unknown', capacity: 'unknown', operator: 'unknown' },
    ),
  },
];

export function templateById(id: string): Template | undefined {
  return templates.find((template) => template.id === id);
}
