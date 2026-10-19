/**
 * Deterministic decision engine: inputs -> findings -> states -> costs ->
 * recommendation. Runs without XR or AI so it can be tested directly.
 */
import {
  CATALOGUE_VERSION,
  RULES_VERSION,
  catalogue,
  componentOrder,
  evidenceRecord,
} from './catalogue.js';
import type {
  ComponentId,
  Connection,
  Deployment,
  EvidenceRecord,
  ResponsibilityAssignment,
  Variant,
} from './catalogue.js';
import { normalizeWorkload, workloadLibrary } from './workload.js';
import type { WorkloadId } from './workload.js';

export type { Deployment, ComponentId } from './catalogue.js';
export type { WorkloadId } from './workload.js';
export type State = 'viable' | 'conditional' | 'excluded' | 'unsupported';
export type RuleResult = 'pass' | 'fail' | 'unknown' | 'unsupported';
export type Classification = 'hard constraint' | 'scenario assumption';
export type Currency = 'USD' | 'EUR' | 'PLN';

export interface Rates {
  hosting: number;
  site: number;
  connectivity: number;
}

export interface Inputs {
  path: 'organization' | 'greenfield';
  deployment: Deployment | 'open' | 'unknown';
  dataLocation: 'on-premise' | 'open' | 'unknown';
  identity: 'organizational' | 'application' | 'unknown';
  capacity: 'available' | 'unavailable' | 'unknown';
  connectivity: 'verified' | 'unavailable' | 'unknown';
  latency: 'tolerant' | 'sensitive' | 'unknown';
  operator: 'available' | 'unavailable' | 'unknown';
  recovery: 'basic' | 'high-availability';
  usage: 'launch' | 'growth';
  /** Optional generic workload blocks (src/workload.ts) added to every variant. */
  workload: WorkloadId[];
  budget: number | null;
  currency: Currency;
  rates: Rates | null;
}

export type ChoiceKey =
  | 'deployment'
  | 'dataLocation'
  | 'identity'
  | 'capacity'
  | 'connectivity'
  | 'latency'
  | 'operator'
  | 'recovery'
  | 'usage';

export interface InputDefinition {
  key: ChoiceKey;
  label: string;
  classification: Classification;
  values: { value: string; label: string }[];
}

/** Single source of truth for choice inputs, their labels and classification. */
export const inputDefinitions: Record<ChoiceKey, InputDefinition> = {
  deployment: {
    key: 'deployment',
    label: 'Deployment policy',
    classification: 'hard constraint',
    values: [
      { value: 'open', label: 'Open' },
      { value: 'cloud', label: 'Cloud mandated' },
      { value: 'on-premise', label: 'On-premise mandated' },
      { value: 'hybrid', label: 'Hybrid mandated' },
      { value: 'unknown', label: 'Unknown' },
    ],
  },
  dataLocation: {
    key: 'dataLocation',
    label: 'Database location',
    classification: 'hard constraint',
    values: [
      { value: 'open', label: 'Open' },
      { value: 'on-premise', label: 'Must stay on-site' },
      { value: 'unknown', label: 'Unknown' },
    ],
  },
  identity: {
    key: 'identity',
    label: 'Identity source',
    classification: 'hard constraint',
    values: [
      { value: 'application', label: 'Application accounts' },
      { value: 'organizational', label: 'Organizational identity' },
      { value: 'unknown', label: 'Unknown' },
    ],
  },
  capacity: {
    key: 'capacity',
    label: 'Site capacity',
    classification: 'scenario assumption',
    values: [
      { value: 'available', label: 'Available' },
      { value: 'unavailable', label: 'Unavailable' },
      { value: 'unknown', label: 'Unknown' },
    ],
  },
  connectivity: {
    key: 'connectivity',
    label: 'Cross-environment connectivity',
    classification: 'hard constraint',
    values: [
      { value: 'verified', label: 'Verified' },
      { value: 'unavailable', label: 'Unavailable' },
      { value: 'unknown', label: 'Unknown' },
    ],
  },
  latency: {
    key: 'latency',
    label: 'Latency tolerance',
    classification: 'hard constraint',
    values: [
      { value: 'tolerant', label: 'Tolerant' },
      { value: 'sensitive', label: 'Sensitive' },
      { value: 'unknown', label: 'Unknown' },
    ],
  },
  operator: {
    key: 'operator',
    label: 'Operating owner',
    classification: 'hard constraint',
    values: [
      { value: 'available', label: 'Accountable owner' },
      { value: 'unavailable', label: 'No owner' },
      { value: 'unknown', label: 'Unknown' },
    ],
  },
  recovery: {
    key: 'recovery',
    label: 'Recovery expectation',
    classification: 'hard constraint',
    values: [
      { value: 'basic', label: 'Basic restore' },
      { value: 'high-availability', label: 'High availability' },
    ],
  },
  usage: {
    key: 'usage',
    label: 'Usage scenario',
    classification: 'scenario assumption',
    values: [
      { value: 'launch', label: 'Launch' },
      { value: 'growth', label: 'Growth (3x)' },
    ],
  },
};

export const choiceKeys = Object.keys(inputDefinitions) as ChoiceKey[];

export function valueLabel(key: ChoiceKey, value: string): string {
  return inputDefinitions[key].values.find((entry) => entry.value === value)?.label ?? value;
}

export interface Finding {
  rule: string;
  result: RuleResult;
  reason: string;
  components: ComponentId[];
  inputs: (keyof Inputs)[];
}

export interface ComponentView {
  id: ComponentId;
  label: string;
  shortLabel: string;
  kind: 'base' | 'workload';
  present: boolean;
  boundary: string;
  owner: string;
  purpose: string;
  responsibility: string;
  dependsOn: ComponentId[];
  worstResult: RuleResult;
}

export interface CostLine {
  id: keyof Rates;
  label: string;
  category: string;
  quantity: number;
  unit: string;
  rate: number | null;
  amount: number | null;
  formula: string;
}

export interface CostEstimate {
  scenario: Inputs['usage'];
  currency: Currency;
  estimateDate: string;
  lines: CostLine[];
  subtotal: number | null;
  completeness: 'unpriced' | 'partial';
  basis: string;
  exclusions: string[];
}

export interface Assessment {
  variant: Variant;
  state: State;
  findings: Finding[];
  components: ComponentView[];
  /** Base connections plus the links of selected workload blocks. */
  connections: Connection[];
  responsibilities: ResponsibilityAssignment[];
  cost: CostEstimate;
  evidence: EvidenceRecord[];
}

export interface Snapshot {
  schema: 2;
  version: number;
  createdAt: string;
  catalogueVersion: string;
  rulesVersion: string;
  inputs: Inputs;
  assessments: Assessment[];
  recommendation: Deployment | null;
  recommendationReasons: string[];
  reversalConditions: string[];
  openIssues: string[];
  selection: Deployment | null;
}

export function sample(path: Inputs['path']): Inputs {
  const organization = path === 'organization';
  return {
    path,
    deployment: 'open',
    dataLocation: organization ? 'on-premise' : 'open',
    identity: organization ? 'organizational' : 'application',
    capacity: organization ? 'available' : 'unavailable',
    connectivity: 'unknown',
    latency: 'unknown',
    operator: 'available',
    recovery: 'basic',
    usage: 'launch',
    workload: [],
    budget: null,
    currency: 'USD',
    rates: null,
  };
}

const money = (value: number): number => Math.round(value * 100) / 100;

function stateOf(findings: Finding[]): State {
  if (findings.some((finding) => finding.result === 'fail')) return 'excluded';
  if (findings.some((finding) => finding.result === 'unsupported')) return 'unsupported';
  if (findings.some((finding) => finding.result === 'unknown')) return 'conditional';
  return 'viable';
}

function evaluateRules(inputs: Inputs, variant: Variant, cost: CostEstimate): Finding[] {
  const findings: Finding[] = [];
  const add = (
    rule: string,
    result: RuleResult,
    reason: string,
    components: ComponentId[],
    keys: (keyof Inputs)[],
  ) => findings.push({ rule, result, reason, components, inputs: keys });
  const hostsExternally = variant.id !== 'on-premise';
  const usesSite = variant.id !== 'cloud';
  const workload = inputs.workload;
  const siteHosted = workload.filter((id) => workloadLibrary[id].boundary[variant.id] === 'Organization site');
  const dataBearing: ComponentId[] = workload.includes('storage') ? ['storage'] : [];

  add(
    'deployment',
    inputs.deployment === 'unknown'
      ? 'unknown'
      : inputs.deployment === 'open' || inputs.deployment === variant.id
        ? 'pass'
        : 'fail',
    inputs.deployment === 'unknown'
      ? 'Deployment policy is unknown; a mandated environment could exclude this variant.'
      : inputs.deployment === 'open'
        ? 'Deployment environment is open for evaluation.'
        : inputs.deployment === variant.id
          ? `Deployment policy mandates ${variant.label.toLowerCase()}.`
          : `Deployment policy mandates ${valueLabel('deployment', inputs.deployment).toLowerCase()}; this variant does not comply.`,
    ['application', 'database'],
    ['deployment'],
  );

  add(
    'residency',
    inputs.dataLocation === 'unknown'
      ? 'unknown'
      : inputs.dataLocation === 'on-premise' && variant.id === 'cloud'
        ? 'fail'
        : 'pass',
    inputs.dataLocation === 'unknown'
      ? 'Database location requirement is unknown; residency cannot be confirmed.'
      : inputs.dataLocation === 'on-premise' && variant.id === 'cloud'
        ? 'Database must stay at the organization site; this variant hosts it externally.'
        : 'Database location requirement is satisfied. Backup locations still require implementation review.',
    ['database', 'backup', ...dataBearing],
    ['dataLocation'],
  );

  add(
    'identity',
    inputs.identity === 'unknown'
      ? 'unknown'
      : inputs.identity === 'organizational' && hostsExternally
        ? 'unknown'
        : 'pass',
    inputs.identity === 'unknown'
      ? 'Identity source is unknown; mandatory identity integration cannot be assessed.'
      : inputs.identity === 'organizational' && hostsExternally
        ? 'Organizational identity must federate to an externally hosted application; the integration is unconfirmed.'
        : inputs.identity === 'organizational'
          ? 'Organizational identity integrates within the site; protocol and ownership still need confirmation.'
          : 'Application-managed accounts; authorization remains an application responsibility.',
    ['identity', 'application'],
    ['identity'],
  );

  if (usesSite) {
    add(
      'capacity',
      inputs.capacity === 'unknown' ? 'unknown' : inputs.capacity === 'available' ? 'pass' : 'fail',
      inputs.capacity === 'unknown'
        ? 'Spare organizational capacity is unknown; it is not assumed free or available.'
        : inputs.capacity === 'available'
          ? 'Organizational capacity is stated as available (assumption until confirmed).'
          : 'No organizational capacity is available for site-hosted components.',
      variant.id === 'hybrid' ? ['database', 'backup', ...siteHosted] : ['application', 'database', 'backup', ...siteHosted],
      ['capacity'],
    );
  }

  if (variant.id === 'hybrid') {
    add(
      'connectivity',
      inputs.connectivity === 'unknown' ? 'unknown' : inputs.connectivity === 'verified' ? 'pass' : 'fail',
      inputs.connectivity === 'unknown'
        ? 'Cross-environment connectivity is unverified; hybrid feasibility stays conditional.'
        : inputs.connectivity === 'verified'
          ? 'A suitable private connection is reported as verified.'
          : 'No cross-environment connection is available.',
      ['connectivity', 'application', 'database', ...dataBearing],
      ['connectivity'],
    );
    add(
      'latency',
      inputs.latency === 'unknown' ? 'unknown' : inputs.latency === 'tolerant' ? 'pass' : 'fail',
      inputs.latency === 'unknown'
        ? 'Latency tolerance across environments is unknown.'
        : inputs.latency === 'tolerant'
          ? 'The workload tolerates cross-environment latency (user statement).'
          : 'The workload is latency sensitive; a remote database boundary is unsuitable.',
      ['connectivity', 'application', 'database', ...dataBearing],
      ['latency'],
    );
  }

  if (workload.includes('integration')) {
    add(
      'integration',
      'pass',
      'External integration recorded. Its availability, rate limits and failure behavior are open issues, not blockers.',
      ['integration', 'application'],
      ['workload'],
    );
  }

  add(
    'operations',
    inputs.operator === 'unknown' ? 'unknown' : inputs.operator === 'available' ? 'pass' : 'fail',
    inputs.operator === 'unknown'
      ? 'Operating ownership is unknown; every variant needs an accountable owner.'
      : inputs.operator === 'available'
        ? 'An accountable operating owner is stated. Hosting does not remove application responsibilities.'
        : 'No accountable operating owner; monitoring, incidents and restores would have no owner.',
    ['monitoring', 'backup'],
    ['operator'],
  );

  if (inputs.recovery === 'high-availability') {
    add(
      'recovery',
      'unsupported',
      'Redundant high-availability designs are outside this single-site catalogue. No availability guarantee is provided.',
      ['application', 'database', 'backup'],
      ['recovery'],
    );
  }

  if (inputs.budget !== null) {
    add(
      'budget',
      cost.subtotal === null || cost.subtotal <= inputs.budget ? 'unknown' : 'fail',
      cost.subtotal === null
        ? 'A hard budget is set but no scenario rates were supplied; affordability cannot be evaluated.'
        : cost.subtotal > inputs.budget
          ? `Modeled subtotal ${cost.subtotal} ${cost.currency} exceeds the hard monthly budget ${inputs.budget} ${cost.currency}.`
          : `Subtotal ${cost.subtotal} ${cost.currency} is within budget, but excluded cost categories prevent a complete affordability conclusion.`,
      ['application', 'database'],
      ['budget', 'rates', 'usage'],
    );
  }
  return findings;
}

function estimateCost(inputs: Inputs, variant: Variant, estimateDate: string): CostEstimate {
  const quantity = inputs.usage === 'growth' ? 3 : 1;
  const unit = 'x launch baseline quantity';
  const rates = inputs.rates;
  const line = (id: keyof Rates, label: string, category: string): CostLine => {
    const rate = rates ? rates[id] : null;
    return {
      id,
      label,
      category,
      quantity,
      unit,
      rate,
      amount: rate === null ? null : money(rate * quantity),
      formula: `${quantity} x ${rate === null ? 'rate (missing)' : `${rate} ${inputs.currency}`}`,
    };
  };
  const lines =
    variant.id === 'cloud'
      ? [line('hosting', 'External hosting (runtime and database)', 'Recurring infrastructure')]
      : variant.id === 'on-premise'
        ? [line('site', 'Site hosting (hardware amortization, facilities, maintenance)', 'Recurring infrastructure')]
        : [
            line('hosting', 'External hosting (runtime)', 'Recurring infrastructure'),
            line('site', 'Site hosting (database, hardware amortization, facilities)', 'Recurring infrastructure'),
            line('connectivity', 'Private connectivity', 'Recurring infrastructure'),
          ];
  const subtotal = rates ? money(lines.reduce((sum, entry) => sum + (entry.amount ?? 0), 0)) : null;
  return {
    scenario: inputs.usage,
    currency: inputs.currency,
    estimateDate,
    lines,
    subtotal,
    completeness: rates ? 'partial' : 'unpriced',
    basis: rates
      ? `User-entered monthly scenario rates; ${quantity}x launch quantity assumption. Not a market quote.`
      : 'Unpriced: supply monthly scenario rates (browser form) to calculate a subtotal.',
    exclusions: [
      'Operating labor',
      'Taxes and discounts',
      'Support contracts',
      'Traffic and backup charges not included in the supplied rates',
      'One-time setup and migration effort',
      ...inputs.workload.map((id) => workloadLibrary[id].costExclusion),
    ],
  };
}

function worstResultFor(id: ComponentId, findings: Finding[]): RuleResult {
  const severity: Record<RuleResult, number> = { pass: 0, unknown: 1, unsupported: 2, fail: 3 };
  return findings
    .filter((finding) => finding.components.includes(id))
    .reduce<RuleResult>((worst, finding) => (severity[finding.result] > severity[worst] ? finding.result : worst), 'pass');
}

function workloadViews(inputs: Inputs, variant: Variant, findings: Finding[]): ComponentView[] {
  return inputs.workload.map((id) => {
    const definition = workloadLibrary[id];
    return {
      id,
      label: definition.label,
      shortLabel: definition.shortLabel,
      kind: 'workload',
      present: true,
      boundary: definition.boundary[variant.id],
      owner: definition.owner[variant.id],
      purpose: definition.purpose,
      responsibility: definition.responsibility,
      dependsOn: definition.dependsOn.filter((dependency) => dependency === 'application' || dependency === 'database' || inputs.workload.includes(dependency as WorkloadId)),
      worstResult: worstResultFor(id, findings),
    };
  });
}

const shortLabels: Record<string, string> = {
  identity: 'Identity',
  ingress: 'Ingress',
  application: 'App',
  connectivity: 'Link',
  database: 'Database',
  backup: 'Backups',
  monitoring: 'Monitor',
};

function componentViews(inputs: Inputs, variant: Variant, findings: Finding[]): ComponentView[] {
  const base = componentOrder.map((id): ComponentView => {
    const definition = variant.components.find((entry) => entry.id === id);
    if (!definition) {
      return {
        id,
        label: 'Connectivity',
        shortLabel: shortLabels[id],
        kind: 'base',
        present: false,
        boundary: 'Not needed: same environment',
        owner: 'n/a',
        purpose: 'This variant keeps application and database in one environment.',
        responsibility: 'None.',
        dependsOn: [],
        worstResult: 'pass',
      };
    }
    const worstResult = worstResultFor(id, findings);
    const boundary =
      id === 'identity'
        ? inputs.identity === 'organizational'
          ? 'Organizational identity'
          : inputs.identity === 'application'
            ? 'Application accounts'
            : 'Identity unknown'
        : definition.boundary;
    return {
      id,
      label: definition.label,
      shortLabel: shortLabels[id],
      kind: 'base',
      present: true,
      boundary,
      owner: definition.owner,
      purpose: definition.purpose,
      responsibility: definition.responsibility,
      dependsOn: definition.dependsOn,
      worstResult,
    };
  });
  return [...base, ...workloadViews(inputs, variant, findings)];
}

function workloadConnections(inputs: Inputs, variant: Variant): Connection[] {
  const links: Connection[] = [...variant.connections];
  for (const id of inputs.workload) {
    for (const dependency of workloadLibrary[id].dependsOn) {
      if (dependency !== 'application' && dependency !== 'database' && !inputs.workload.includes(dependency as WorkloadId)) continue;
      links.push({ id: `${dependency}-${id}`, from: dependency, to: id, purpose: workloadLibrary[id].role });
    }
  }
  return links;
}

function resolvedResponsibilities(inputs: Inputs, variant: Variant): ResponsibilityAssignment[] {
  if (inputs.operator === 'available') return variant.responsibilities;
  const suffix =
    inputs.operator === 'unknown'
      ? ' Operating owner unknown: this assignment is unconfirmed.'
      : ' No accountable owner is available: this task has no owner.';
  return variant.responsibilities.map((entry) => ({ ...entry, note: entry.note + suffix }));
}

const ruleLabels: Record<string, string> = {
  deployment: 'deployment policy',
  residency: 'database location',
  identity: 'identity integration',
  capacity: 'site capacity',
  connectivity: 'cross-environment connectivity',
  latency: 'latency tolerance',
  operations: 'operating ownership',
  recovery: 'recovery expectation',
  budget: 'budget',
};

function reversalConditions(assessments: Assessment[]): string[] {
  const conditions: string[] = [];
  for (const assessment of assessments) {
    const blockers = assessment.findings.filter((finding) => finding.result !== 'pass');
    if (blockers.length === 0) {
      conditions.push(
        `${assessment.variant.label} stays viable only while its passing inputs hold; changing ${blockersToInputs(assessment.findings)} could change the result.`,
      );
      continue;
    }
    const needs = blockers
      .map((finding) => `${ruleLabels[finding.rule] ?? finding.rule} (${finding.result})`)
      .join(', ');
    conditions.push(`${assessment.variant.label} becomes viable only if resolved: ${needs}.`);
  }
  return conditions;
}

function blockersToInputs(findings: Finding[]): string {
  const keys = [...new Set(findings.flatMap((finding) => finding.inputs))];
  return keys.join(', ');
}

export function evaluate(inputs: Inputs, version = 1, now: Date = new Date()): Snapshot {
  const createdAt = now.toISOString();
  const assessments = catalogue.map((entry): Assessment => {
    const cost = estimateCost(inputs, entry, createdAt);
    const findings = evaluateRules(inputs, entry, cost);
    return {
      variant: entry,
      state: stateOf(findings),
      findings,
      components: componentViews(inputs, entry, findings),
      connections: workloadConnections(inputs, entry),
      responsibilities: resolvedResponsibilities(inputs, entry),
      cost,
      evidence: entry.evidence.map(evidenceRecord),
    };
  });
  const viable = assessments.filter((assessment) => assessment.state === 'viable');
  const recommendation = viable.length === 1 ? viable[0].variant.id : null;
  const recommendationReasons =
    viable.length === 1
      ? [
          `${viable[0].variant.label} is the only variant whose mandatory checks all pass under the confirmed inputs.`,
          ...assessments
            .filter((assessment) => assessment.state !== 'viable')
            .map(
              (assessment) =>
                `${assessment.variant.label} is ${assessment.state}: ${assessment.findings
                  .filter((finding) => finding.result !== 'pass')
                  .map((finding) => ruleLabels[finding.rule] ?? finding.rule)
                  .join(', ')}.`,
            ),
        ]
      : viable.length === 0
        ? ['No variant passes every mandatory check; review the exclusions and unknowns instead of forcing a choice.']
        : [
            `${viable.map((assessment) => assessment.variant.label).join(' and ')} are both viable; the choice is preference-sensitive and no composite score is used.`,
          ];
  const openIssues = [
    ...assessments.flatMap((assessment) =>
      assessment.findings
        .filter((finding) => finding.result === 'unknown' || finding.result === 'unsupported')
        .map((finding) => `${assessment.variant.label}: ${finding.reason}`),
    ),
    ...(inputs.rates === null ? ['Costs are unpriced until monthly scenario rates are supplied.'] : []),
    ...(inputs.workload.includes('integration')
      ? ['External integration: availability, rate limits and failure behavior must be confirmed with its owner.']
      : []),
    ...inputs.workload.filter((id) => id !== 'integration').map((id) => `${workloadLibrary[id].label}: ${workloadLibrary[id].responsibility}`),
    'Backup locations, identity protocol and concrete service compatibility require implementation review.',
  ];
  return {
    schema: 2,
    version,
    createdAt,
    catalogueVersion: CATALOGUE_VERSION,
    rulesVersion: RULES_VERSION,
    inputs: structuredClone(inputs),
    assessments,
    recommendation,
    recommendationReasons,
    reversalConditions: reversalConditions(assessments),
    openIssues: [...new Set(openIssues)],
    selection: null,
  };
}

/** Unknown mandatory inputs that keep any variant conditional, in catalogue order. */
export function nextQuestions(snapshot: Snapshot): string[] {
  return [
    ...new Set(
      snapshot.assessments
        .filter((assessment) => assessment.state === 'conditional')
        .flatMap((assessment) =>
          assessment.findings.filter((finding) => finding.result === 'unknown').map((finding) => finding.rule),
        ),
    ),
  ];
}

export function assessmentFor(snapshot: Snapshot, id: Deployment): Assessment {
  const found = snapshot.assessments.find((assessment) => assessment.variant.id === id);
  if (!found) throw new Error(`Missing assessment ${id}.`);
  return found;
}

export function restoreInputs(value: unknown): Inputs {
  if (!value || typeof value !== 'object') throw new Error('Invalid project.');
  const input = value as Record<string, unknown>;
  const allowed: Record<string, readonly string[]> = {
    path: ['organization', 'greenfield'],
    currency: ['USD', 'EUR', 'PLN'],
    ...Object.fromEntries(choiceKeys.map((key) => [key, inputDefinitions[key].values.map((entry) => entry.value)])),
  };
  for (const [key, values] of Object.entries(allowed)) {
    if (typeof input[key] !== 'string' || !values.includes(input[key] as string)) throw new Error(`Invalid ${key}.`);
  }
  const amount = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1e12;
  if (input.budget !== null && !amount(input.budget)) throw new Error('Invalid budget.');
  if (input.rates !== null) {
    if (!input.rates || typeof input.rates !== 'object') throw new Error('Invalid rates.');
    for (const key of ['hosting', 'site', 'connectivity']) {
      if (!amount((input.rates as Record<string, unknown>)[key])) throw new Error(`Invalid ${key} rate.`);
    }
  }
  const keys = [...Object.keys(allowed), 'budget', 'rates'];
  const restored = Object.fromEntries(keys.map((key) => [key, structuredClone(input[key])]));
  restored.workload = normalizeWorkload(input.workload);
  if (restored.rates !== null) {
    const rates = restored.rates as Record<string, number>;
    restored.rates = { hosting: rates.hosting, site: rates.site, connectivity: rates.connectivity };
  }
  return restored as unknown as Inputs;
}

/** Input sample with an older schema (before `identity`) is upgraded explicitly, never silently guessed. */
export function upgradeInputs(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const input = value as Record<string, unknown>;
  if ('identity' in input) return input;
  return { ...input, identity: 'unknown' };
}
