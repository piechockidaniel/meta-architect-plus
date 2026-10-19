/**
 * Intake: entry paths, adaptive questions, contradictions and question
 * prioritisation. Questions never infer mandatory facts silently.
 */
import { inputDefinitions, valueLabel } from './decision.js';
import type { ChoiceKey, Classification, Inputs, Snapshot } from './decision.js';

export interface Question {
  key: ChoiceKey;
  title: string;
  reason: string;
  classification: Classification;
  choices: { label: string; value: string }[];
}

interface QuestionText {
  organization: string;
  greenfield: string;
  reason: string;
}

const questionTexts: Record<ChoiceKey, QuestionText> = {
  deployment: {
    organization: 'A1. Is the deployment environment fixed or open for evaluation?',
    greenfield: 'B6. Is any deployment choice already fixed?',
    reason:
      'A mandated environment excludes otherwise attractive alternatives. Open means choosing it is part of this assessment.',
  },
  dataLocation: {
    organization: 'A4. Must the database stay at the organization site?',
    greenfield: 'B4. Do data rules require the database to stay on-site?',
    reason: 'Database residency rules out the cloud sample and introduces connectivity requirements for hybrid.',
  },
  identity: {
    organization: 'A3. Must the application use the organizational identity system?',
    greenfield: 'B4. Where do user identities come from?',
    reason:
      'Mandatory identity integration must be confirmed for every hosting boundary. Authentication and application authorization are separate.',
  },
  capacity: {
    organization: 'A3. Is organizational compute and database capacity available?',
    greenfield: 'B6. Is any organizational infrastructure available to you?',
    reason: 'On-premise and hybrid cannot assume existing capacity is available or free.',
  },
  operator: {
    organization: 'A5. Who will operate the application?',
    greenfield: 'B5. Who can maintain the application after launch?',
    reason: 'Every model needs maintenance, monitoring, incident handling and restore ownership.',
  },
  recovery: {
    organization: 'A6. Does the design require high availability?',
    greenfield: 'B5. Does the first release need high availability?',
    reason: 'These single-site conceptual samples do not validate a redundant high-availability design.',
  },
  usage: {
    organization: 'A6. Which usage scenario should we examine?',
    greenfield: 'B3. What usage do you expect?',
    reason: 'Growth uses an explicit three-times resource quantity assumption. It is not a traffic forecast.',
  },
  connectivity: {
    organization: 'Follow-up: is cross-environment connectivity verified?',
    greenfield: 'Follow-up: is cross-environment connectivity verified?',
    reason: 'Hybrid depends on a suitable private connection. Unknown leaves feasibility conditional.',
  },
  latency: {
    organization: 'Follow-up: can the application tolerate cross-environment latency?',
    greenfield: 'Follow-up: can the application tolerate cross-environment latency?',
    reason: 'The hybrid example has a remote database boundary. A latency-sensitive workload needs a different pattern.',
  },
};

const questionOrder: Record<Inputs['path'], ChoiceKey[]> = {
  organization: ['deployment', 'identity', 'dataLocation', 'capacity', 'operator', 'recovery', 'usage', 'connectivity', 'latency'],
  greenfield: ['usage', 'dataLocation', 'identity', 'operator', 'recovery', 'deployment', 'capacity', 'connectivity', 'latency'],
};

export function questionFor(path: Inputs['path'], key: ChoiceKey): Question {
  const definition = inputDefinitions[key];
  const text = questionTexts[key];
  return {
    key,
    title: text[path],
    reason: text.reason,
    classification: definition.classification,
    choices: definition.values.map((entry) => ({ label: entry.label, value: entry.value })),
  };
}

export function hybridRelevant(inputs: Inputs): boolean {
  if (inputs.deployment === 'hybrid') return true;
  if (inputs.deployment === 'cloud' || inputs.deployment === 'on-premise') return false;
  return inputs.capacity !== 'unavailable';
}

export function applicableQuestions(inputs: Inputs): Question[] {
  const relevant = hybridRelevant(inputs);
  return questionOrder[inputs.path]
    .filter((key) => relevant || (key !== 'connectivity' && key !== 'latency'))
    .map((key) => questionFor(inputs.path, key));
}

export interface InputConflict {
  id: string;
  inputs: ChoiceKey[];
  reason: string;
  prompt: string;
}

/** Contradictions are surfaced before any ranking so the user can correct either input. */
export function conflicts(inputs: Inputs): InputConflict[] {
  const found: InputConflict[] = [];
  if (inputs.deployment === 'cloud' && inputs.dataLocation === 'on-premise') {
    found.push({
      id: 'cloud-vs-residency',
      inputs: ['deployment', 'dataLocation'],
      reason: 'Cloud deployment is mandated but the database must stay at the organization site.',
      prompt: 'Relax the deployment mandate or the database location requirement.',
    });
  }
  if (inputs.deployment === 'on-premise' && inputs.capacity === 'unavailable') {
    found.push({
      id: 'on-premise-vs-capacity',
      inputs: ['deployment', 'capacity'],
      reason: 'On-premise deployment is mandated but no organizational capacity is available.',
      prompt: 'Confirm capacity can be provided or reconsider the deployment mandate.',
    });
  }
  if (inputs.deployment === 'hybrid' && inputs.capacity === 'unavailable') {
    found.push({
      id: 'hybrid-vs-capacity',
      inputs: ['deployment', 'capacity'],
      reason: 'Hybrid deployment keeps the database on-site but no organizational capacity is available.',
      prompt: 'Confirm site capacity for the database or reconsider the deployment mandate.',
    });
  }
  if (inputs.deployment === 'hybrid' && inputs.connectivity === 'unavailable') {
    found.push({
      id: 'hybrid-vs-connectivity',
      inputs: ['deployment', 'connectivity'],
      reason: 'Hybrid deployment is mandated but no cross-environment connection is available.',
      prompt: 'Arrange a private connection or reconsider the deployment mandate.',
    });
  }
  if (inputs.deployment === 'hybrid' && inputs.latency === 'sensitive') {
    found.push({
      id: 'hybrid-vs-latency',
      inputs: ['deployment', 'latency'],
      reason: 'Hybrid deployment is mandated but the workload is latency sensitive across environments.',
      prompt: 'Confirm latency tolerance or reconsider the deployment mandate.',
    });
  }
  return found;
}

export interface QuestionPriority {
  key: ChoiceKey;
  priority: 'contradiction' | 'mandatory unknown' | 'comparison' | 'refinement';
  why: string;
}

/**
 * Question selection rules: contradictions first, mandatory unknowns second,
 * comparison-changing inputs third, the rest as optional refinement.
 */
export function prioritizedQuestions(inputs: Inputs, snapshot: Snapshot): QuestionPriority[] {
  const applicable = applicableQuestions(inputs).map((question) => question.key);
  const result: QuestionPriority[] = [];
  const seen = new Set<ChoiceKey>();
  const push = (key: ChoiceKey, priority: QuestionPriority['priority'], why: string) => {
    if (!applicable.includes(key) || seen.has(key)) return;
    seen.add(key);
    result.push({ key, priority, why });
  };
  for (const conflict of conflicts(inputs)) {
    for (const key of conflict.inputs) push(key, 'contradiction', conflict.reason);
  }
  for (const assessment of snapshot.assessments) {
    for (const finding of assessment.findings) {
      if (finding.result !== 'unknown') continue;
      for (const key of finding.inputs) {
        if (key in inputDefinitions && inputDefinitions[key as ChoiceKey].classification === 'hard constraint') {
          push(key as ChoiceKey, 'mandatory unknown', `${assessment.variant.label} is conditional: ${finding.reason}`);
        }
      }
    }
  }
  for (const key of applicable) {
    if (inputs[key] === 'unknown') push(key, 'comparison', 'Unknown assumption keeps comparison incomplete.');
  }
  for (const key of applicable) push(key, 'refinement', 'Already answered; revisit only if it changed.');
  return result;
}

export interface ProjectContext {
  /** Optional human-authored reason; older backups omit it. */
  rationale?: string;
  title: string;
  specification: string;
  inputOrigin: 'sample' | 'user';
  confirmed: boolean;
}

export function sampleContext(path: Inputs['path']): ProjectContext {
  return path === 'organization'
    ? {
        title: 'Internal business application (sample)',
        specification:
          'Employees manage business records through a browser. The organization already runs an identity system that the application must use, and database records must remain at the organizational site. The application is a conventional HTTP backend with a relational database. Hosting is open for evaluation.',
        inputOrigin: 'sample',
        confirmed: false,
      }
    : {
        title: 'Startup business application (sample)',
        specification:
          'A small team launches a customer-facing business web application: browser frontend, HTTP backend, relational database. No organizational infrastructure exists. Usage is uncertain and maintenance capacity is limited, so operating responsibilities and cost drivers need review before choosing a starting design.',
        inputOrigin: 'sample',
        confirmed: false,
      };
}

export interface FactLine {
  key: ChoiceKey;
  label: string;
  value: string;
  classification: Classification;
}

/** Known facts for the product summary, labelled by classification. */
export function factLines(inputs: Inputs): FactLine[] {
  return applicableQuestions(inputs).map((question) => ({
    key: question.key,
    label: inputDefinitions[question.key].label,
    value: valueLabel(question.key, String(inputs[question.key])),
    classification: question.classification,
  }));
}

export function validateContext(value: unknown): ProjectContext {
  if (!value || typeof value !== 'object') throw new Error('Invalid project context.');
  const p = value as Record<string, unknown>;
  if (p.rationale !== undefined && (typeof p.rationale !== 'string' || p.rationale.length > 4000)) throw new Error('Invalid rationale (maximum 4000 characters).');
  if (
    typeof p.title !== 'string' ||
    p.title.trim().length < 1 ||
    p.title.length > 160 ||
    typeof p.specification !== 'string' ||
    p.specification.length > 16000 ||
    !['sample', 'user'].includes(String(p.inputOrigin)) ||
    typeof p.confirmed !== 'boolean'
  ) {
    throw new Error('Invalid project context.');
  }
  return {
    ...(typeof p.rationale === 'string' ? { rationale: p.rationale } : {}),
    title: p.title.trim(),
    specification: p.specification,
    inputOrigin: p.inputOrigin as ProjectContext['inputOrigin'],
    confirmed: p.confirmed,
  };
}
