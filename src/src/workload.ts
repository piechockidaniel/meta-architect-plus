/**
 * Workload component library.
 *
 * Generic, provider-neutral building blocks a user can add to the workflow
 * (by button or by dropping a 3D block on a variant island). Each block is a
 * first-class catalogue component: the engine places it in a deployment
 * boundary per variant, attaches rules and responsibilities, and exports it
 * like every base component. Nothing here names a vendor or product.
 */
import type { Boundary, ComponentId, Deployment } from './catalogue.js';

export type WorkloadId = 'storage' | 'jobs' | 'cache' | 'queue' | 'integration';
export const workloadIds: readonly WorkloadId[] = ['storage', 'jobs', 'cache', 'queue', 'integration'];

export interface WorkloadDefinition {
  id: WorkloadId;
  label: string;
  shortLabel: string;
  role: string;
  purpose: string;
  /** Which base component it attaches to in the diagram. */
  dependsOn: ComponentId[];
  /** Boundary per variant; data-bearing blocks follow the database, compute blocks follow the application. */
  boundary: Record<Deployment, Boundary>;
  owner: Record<Deployment, string>;
  responsibility: string;
  /** Generic examples that help users pick the right block; not catalogue facts. */
  examples: string[];
  /** Extra cost categories the supplied rates do not cover. */
  costExclusion: string;
  /** Colour used by the 3D block (neutral palette, no brand colours). */
  tint: string;
}

const APP_TEAM = 'Application team';
const PLATFORM_TEAM = 'Organization platform team (to confirm)';
const PROVIDER = 'External hosting provider (arrangement to confirm)';

export const workloadLibrary: Record<WorkloadId, WorkloadDefinition> = {
  storage: {
    id: 'storage',
    label: 'File storage',
    shortLabel: 'Storage',
    role: 'Object or file store',
    purpose: 'Holds uploaded documents and generated files outside the relational database.',
    dependsOn: ['application'],
    boundary: { cloud: 'External hosting', 'on-premise': 'Organization site', hybrid: 'Organization site' },
    owner: { cloud: `${PROVIDER} with ${APP_TEAM}`, 'on-premise': PLATFORM_TEAM, hybrid: PLATFORM_TEAM },
    responsibility: 'Define retention, access rules and backup coverage for stored files.',
    examples: ['Uploaded contracts', 'Generated reports', 'Product images'],
    costExclusion: 'File storage capacity and transfer charges',
    tint: '#3b82a6',
  },
  jobs: {
    id: 'jobs',
    label: 'Background jobs',
    shortLabel: 'Jobs',
    role: 'Scheduled or queued processing',
    purpose: 'Runs work outside the request cycle: imports, notifications, periodic reports.',
    dependsOn: ['application', 'database', 'queue'],
    boundary: { cloud: 'External hosting', 'on-premise': 'Organization site', hybrid: 'External hosting' },
    owner: { cloud: APP_TEAM, 'on-premise': APP_TEAM, hybrid: APP_TEAM },
    responsibility: 'Own scheduling, retries, failure alerts and idempotent processing.',
    examples: ['Nightly data import', 'E-mail notifications', 'Monthly statements'],
    costExclusion: 'Worker runtime charges',
    tint: '#6b8f3a',
  },
  cache: {
    id: 'cache',
    label: 'Cache',
    shortLabel: 'Cache',
    role: 'Short-lived fast lookup store',
    purpose: 'Speeds up repeated reads; data must be reconstructible from the database.',
    dependsOn: ['application'],
    boundary: { cloud: 'External hosting', 'on-premise': 'Organization site', hybrid: 'External hosting' },
    owner: { cloud: APP_TEAM, 'on-premise': APP_TEAM, hybrid: APP_TEAM },
    responsibility: 'Define expiry rules and confirm the application works when the cache is empty.',
    examples: ['Session data', 'Price lists', 'Rendered page fragments'],
    costExclusion: 'Cache instance charges',
    tint: '#a6763b',
  },
  queue: {
    id: 'queue',
    label: 'Message queue',
    shortLabel: 'Queue',
    role: 'Asynchronous hand-off between components',
    purpose: 'Decouples producers from consumers so spikes and outages do not lose work.',
    dependsOn: ['application'],
    boundary: { cloud: 'External hosting', 'on-premise': 'Organization site', hybrid: 'External hosting' },
    owner: { cloud: APP_TEAM, 'on-premise': `${PLATFORM_TEAM} with ${APP_TEAM}`, hybrid: APP_TEAM },
    responsibility: 'Define message retention, dead-letter handling and ordering expectations.',
    examples: ['Order events', 'Document processing requests', 'Audit events'],
    costExclusion: 'Queue throughput charges',
    tint: '#8a5ea8',
  },
  integration: {
    id: 'integration',
    label: 'External integration',
    shortLabel: 'Integration',
    role: 'Dependency on another system',
    purpose: 'Exchanges data with a system outside this design; its availability is not under your control.',
    dependsOn: ['application'],
    boundary: { cloud: 'External dependency', 'on-premise': 'External dependency', hybrid: 'External dependency' },
    owner: { cloud: 'Integration owner (to confirm)', 'on-premise': 'Integration owner (to confirm)', hybrid: 'Integration owner (to confirm)' },
    responsibility: 'Record rate limits, failure behavior and who is contacted when the other system changes.',
    examples: ['Payment processing', 'Accounting system', 'Partner data feed'],
    costExclusion: 'Integration fees and partner charges',
    tint: '#b5485f',
  },
};

export function workloadDefinition(id: WorkloadId): WorkloadDefinition {
  return workloadLibrary[id];
}

export function isWorkloadId(value: unknown): value is WorkloadId {
  return typeof value === 'string' && (workloadIds as readonly string[]).includes(value);
}

/** Normalises a workload list: known ids only, library order, no duplicates. */
export function normalizeWorkload(value: unknown): WorkloadId[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error('Invalid workload.');
  for (const entry of value) if (!isWorkloadId(entry)) throw new Error(`Invalid workload component ${String(entry)}.`);
  return workloadIds.filter((id) => value.includes(id));
}
