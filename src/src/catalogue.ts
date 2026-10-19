/**
 * Conceptual architecture catalogue.
 *
 * Three narrowly authored variants of one business web application
 * (browser frontend, HTTP backend, relational database). Everything here is
 * illustrative catalogue content: no provider, region, price or availability
 * claim is verified. See docs/RELEASE-BASELINE.md for the scope decision.
 */

export const CATALOGUE_VERSION = 'conceptual-2026.10.11';
export const RULES_VERSION = 'rules-2';

export type Deployment = 'cloud' | 'on-premise' | 'hybrid';
export const deployments: readonly Deployment[] = ['cloud', 'on-premise', 'hybrid'];

export type BaseComponentId =
  | 'identity'
  | 'ingress'
  | 'application'
  | 'connectivity'
  | 'database'
  | 'backup'
  | 'monitoring';
/** Workload blocks from src/workload.ts share the component id space. */
export type WorkloadComponentId = 'storage' | 'jobs' | 'cache' | 'queue' | 'integration';
export type ComponentId = BaseComponentId | WorkloadComponentId;

/** Stable, aligned slots shared by every variant so comparisons line up. */
export const componentOrder: readonly BaseComponentId[] = [
  'identity',
  'ingress',
  'application',
  'connectivity',
  'database',
  'backup',
  'monitoring',
];

export type Boundary =
  | 'External hosting'
  | 'Organization site'
  | 'Cross-environment link'
  | 'Identity source'
  | 'External dependency';

export interface ComponentDefinition {
  id: BaseComponentId;
  label: string;
  role: string;
  purpose: string;
  boundary: Boundary;
  owner: string;
  dependsOn: ComponentId[];
  responsibility: string;
}

export interface Connection {
  id: string;
  from: ComponentId;
  to: ComponentId;
  purpose: string;
}

export type OperatingTask =
  | 'deployment'
  | 'patching'
  | 'access control'
  | 'secrets'
  | 'monitoring'
  | 'incidents'
  | 'backups'
  | 'restore verification'
  | 'cost review';

export const operatingTasks: readonly OperatingTask[] = [
  'deployment',
  'patching',
  'access control',
  'secrets',
  'monitoring',
  'incidents',
  'backups',
  'restore verification',
  'cost review',
];

export interface ResponsibilityAssignment {
  task: OperatingTask;
  owner: string;
  note: string;
}

export interface FailureScenario {
  id: string;
  title: string;
  description: string;
  affected: ComponentId[];
  impact: string;
  recoveryOwner: string;
  note: string;
}

export interface GrowthPath {
  changes: string[];
  triggers: string[];
  caution: string;
}

export interface EvidenceRecord {
  id: string;
  claim: string;
  source: string;
  sourceDate: string;
  verifiedDate: string | null;
  status: 'illustrative' | 'verified';
}

export interface Variant {
  id: Deployment;
  label: string;
  summary: string;
  prerequisites: string[];
  limitations: string[];
  components: ComponentDefinition[];
  connections: Connection[];
  responsibilities: ResponsibilityAssignment[];
  failureScenarios: FailureScenario[];
  growth: GrowthPath;
  evidence: string[];
}

export const evidence: EvidenceRecord[] = [
  {
    id: 'ev-catalogue-scope',
    claim: 'The three variants are conceptual patterns for a single-site business web application.',
    source: 'Project release baseline (docs/RELEASE-BASELINE.md), authored catalogue',
    sourceDate: '2026-10-11',
    verifiedDate: null,
    status: 'illustrative',
  },
  {
    id: 'ev-no-provider',
    claim: 'No provider, region, pricing or availability figure has been checked against vendor documentation.',
    source: 'Authored catalogue; provider bindings deferred',
    sourceDate: '2026-10-11',
    verifiedDate: null,
    status: 'illustrative',
  },
  {
    id: 'ev-hybrid-bounded',
    claim: 'Hybrid is supported only as application externally hosted with the database retained at the organization site.',
    source: 'Project release baseline (docs/RELEASE-BASELINE.md)',
    sourceDate: '2026-10-11',
    verifiedDate: null,
    status: 'illustrative',
  },
];

const APP_TEAM = 'Application team';
const PLATFORM_TEAM = 'Organization platform team (to confirm)';
const PROVIDER = 'External hosting provider (arrangement to confirm)';

function component(
  id: BaseComponentId,
  boundary: Boundary,
  owner: string,
  overrides: Partial<ComponentDefinition> = {},
): ComponentDefinition {
  const base: Record<BaseComponentId, Omit<ComponentDefinition, 'id' | 'boundary' | 'owner'>> = {
    identity: {
      label: 'Identity',
      role: 'Authentication source',
      purpose: 'Authenticates users; application authorization stays in the application.',
      dependsOn: [],
      responsibility: 'Confirm the identity integration protocol and who owns account lifecycle.',
    },
    ingress: {
      label: 'Ingress / TLS',
      role: 'Entry point',
      purpose: 'Terminates TLS, routes requests and forms the exposure boundary.',
      dependsOn: [],
      responsibility: 'Maintain certificates, access rules and request routing.',
    },
    application: {
      label: 'Application',
      role: 'HTTP backend',
      purpose: 'Serves the browser frontend and business logic over HTTP.',
      dependsOn: ['identity', 'ingress'],
      responsibility: 'Deploy, patch, monitor and respond to application incidents.',
    },
    connectivity: {
      label: 'Connectivity',
      role: 'Cross-environment link',
      purpose: 'Private connection between externally hosted application and on-site database.',
      dependsOn: ['application'],
      responsibility: 'Provide, monitor and restore the private link; define outage behavior.',
    },
    database: {
      label: 'Database',
      role: 'Relational data store',
      purpose: 'Stores business records; its location drives residency findings.',
      dependsOn: ['application'],
      responsibility: 'Maintain access control, capacity and recovery arrangements.',
    },
    backup: {
      label: 'Backups',
      role: 'Recovery copy',
      purpose: 'Isolated copies of the database for restore after loss.',
      dependsOn: ['database'],
      responsibility: 'Define retention and isolation; verify restores regularly.',
    },
    monitoring: {
      label: 'Monitoring',
      role: 'Observability',
      purpose: 'Collects logs and alerts so an accountable owner can respond.',
      dependsOn: ['application'],
      responsibility: 'Define alerts, retention and the response owner.',
    },
  };
  return { id, boundary, owner, ...base[id], ...overrides };
}

const connections: Connection[] = [
  { id: 'identity-application', from: 'identity', to: 'application', purpose: 'Authentication' },
  { id: 'ingress-application', from: 'ingress', to: 'application', purpose: 'Request routing' },
  { id: 'application-database', from: 'application', to: 'database', purpose: 'Data access' },
  { id: 'database-backup', from: 'database', to: 'backup', purpose: 'Backup copies' },
  { id: 'application-monitoring', from: 'application', to: 'monitoring', purpose: 'Logs and alerts' },
];

const hybridConnections: Connection[] = [
  { id: 'identity-application', from: 'identity', to: 'application', purpose: 'Authentication' },
  { id: 'ingress-application', from: 'ingress', to: 'application', purpose: 'Request routing' },
  { id: 'application-connectivity', from: 'application', to: 'connectivity', purpose: 'Private link' },
  { id: 'connectivity-database', from: 'connectivity', to: 'database', purpose: 'Data access across environments' },
  { id: 'database-backup', from: 'database', to: 'backup', purpose: 'Backup copies' },
  { id: 'application-monitoring', from: 'application', to: 'monitoring', purpose: 'Logs and alerts' },
];

function responsibilities(owners: Record<OperatingTask, [string, string]>): ResponsibilityAssignment[] {
  return operatingTasks.map((task) => ({ task, owner: owners[task][0], note: owners[task][1] }));
}

const sharedFailure: FailureScenario = {
  id: 'database-loss',
  title: 'Database loss requiring restore',
  description: 'Records are corrupted or deleted and must be restored from a backup copy.',
  affected: ['database', 'backup'],
  impact: 'Data written after the last verified backup is lost; the application is unavailable during restore.',
  recoveryOwner: 'Backup owner with application team verification',
  note: 'Recovery time depends on tested restore procedures, not on the deployment label.',
};

export const catalogue: Variant[] = [
  {
    id: 'cloud',
    label: 'Cloud',
    summary: 'Application and database in a generic external hosting environment.',
    prerequisites: [
      'Database records may leave the organization site.',
      'Runtime and database management arrangements are stated separately.',
    ],
    limitations: [
      'Managed services still leave application and account responsibilities with the team.',
      'Provider capabilities, regions and prices are not verified in this catalogue.',
    ],
    components: [
      component('identity', 'Identity source', 'Identity owner (to confirm)'),
      component('ingress', 'External hosting', PROVIDER),
      component('application', 'External hosting', APP_TEAM),
      component('database', 'External hosting', `${PROVIDER} with ${APP_TEAM}`),
      component('backup', 'External hosting', APP_TEAM, {
        responsibility: 'Define retention and isolation; verify restores. Backup location is to be confirmed.',
      }),
      component('monitoring', 'External hosting', APP_TEAM),
    ],
    connections,
    responsibilities: responsibilities({
      deployment: [APP_TEAM, 'Release pipeline into the hosting environment.'],
      patching: [`${PROVIDER} / ${APP_TEAM}`, 'Provider patches managed runtime and database; team patches application dependencies.'],
      'access control': [APP_TEAM, 'Hosting account roles and application authorization.'],
      secrets: [APP_TEAM, 'Hosting secret store usage and rotation policy.'],
      monitoring: [APP_TEAM, 'Alert definitions and retention on hosting tooling.'],
      incidents: [APP_TEAM, 'Provider handles platform incidents; team handles application incidents.'],
      backups: [`${PROVIDER} / ${APP_TEAM}`, 'Managed backups require an explicit retention and isolation arrangement.'],
      'restore verification': [APP_TEAM, 'Managed backups do not prove restores work.'],
      'cost review': [APP_TEAM, 'Usage-based charges need a recurring review.'],
    }),
    failureScenarios: [
      {
        id: 'hosting-outage',
        title: 'External hosting outage',
        description: 'The hosting environment is unavailable; no component at the provider responds.',
        affected: ['ingress', 'application', 'database', 'monitoring'],
        impact: 'Full outage until the provider recovers; the team cannot shorten it.',
        recoveryOwner: `${PROVIDER}; team verifies application health afterwards`,
        note: 'Outage frequency and duration require provider evidence that this catalogue does not hold.',
      },
      sharedFailure,
    ],
    growth: {
      changes: [
        'Move the application runtime to a larger tier or additional instances.',
        'Upgrade the managed database tier; confirm the provider supports it without downtime.',
        'Review usage-based charges at the three-times quantity assumption.',
      ],
      triggers: [
        'Sustained utilization above the agreed threshold.',
        'Response time degradation reported by monitoring.',
        'Backup windows that no longer fit the maintenance period.',
      ],
      caution: 'Growth changes are proposals that need provider capability evidence; no migration is automatic.',
    },
    evidence: ['ev-catalogue-scope', 'ev-no-provider'],
  },
  {
    id: 'on-premise',
    label: 'On-premise',
    summary: 'Application and database at one organizational site.',
    prerequisites: [
      'Compute, networking, facilities and hardware maintenance exist or are planned.',
      'An organizational owner operates the platform layer.',
    ],
    limitations: [
      'Existing capacity is not assumed free or available without confirmation.',
      'Single-site designs do not provide redundancy across sites.',
    ],
    components: [
      component('identity', 'Identity source', 'Identity owner (to confirm)'),
      component('ingress', 'Organization site', PLATFORM_TEAM),
      component('application', 'Organization site', APP_TEAM),
      component('database', 'Organization site', `${PLATFORM_TEAM} with ${APP_TEAM}`),
      component('backup', 'Organization site', PLATFORM_TEAM, {
        responsibility: 'Define retention and off-site isolation; verify restores. Backup location is to be confirmed.',
      }),
      component('monitoring', 'Organization site', `${PLATFORM_TEAM} with ${APP_TEAM}`),
    ],
    connections,
    responsibilities: responsibilities({
      deployment: [APP_TEAM, 'Release into the organizational platform using its delivery tooling.'],
      patching: [`${PLATFORM_TEAM} / ${APP_TEAM}`, 'Platform team patches hosts and database engine; team patches the application.'],
      'access control': [`${PLATFORM_TEAM} / ${APP_TEAM}`, 'Network and host access by platform; application authorization by team.'],
      secrets: [PLATFORM_TEAM, 'Organizational secret store; confirm it exists.'],
      monitoring: [`${PLATFORM_TEAM} / ${APP_TEAM}`, 'Platform alerts for hosts; application alerts by team.'],
      incidents: [`${PLATFORM_TEAM} / ${APP_TEAM}`, 'Facilities, hardware and network incidents belong to the platform owner.'],
      backups: [PLATFORM_TEAM, 'Backup schedule, retention and off-site copies.'],
      'restore verification': [`${PLATFORM_TEAM} / ${APP_TEAM}`, 'Regular restore exercises with application verification.'],
      'cost review': [PLATFORM_TEAM, 'Hardware amortization, facilities and maintenance allocation.'],
    }),
    failureScenarios: [
      {
        id: 'site-outage',
        title: 'Site power or network failure',
        description: 'The organization site loses power or external network connectivity.',
        affected: ['ingress', 'application', 'database', 'backup', 'monitoring'],
        impact: 'Full outage; backups kept at the same site are unavailable for restore elsewhere.',
        recoveryOwner: `${PLATFORM_TEAM} with facilities`,
        note: 'Off-site backup copies must be an explicit arrangement, not an assumption.',
      },
      sharedFailure,
    ],
    growth: {
      changes: [
        'Procure or allocate additional compute and storage; expect hardware lead time.',
        'Plan capacity with the platform team before demand arrives.',
        'Revisit backup windows and restore times at larger data volumes.',
      ],
      triggers: [
        'Sustained utilization above the agreed threshold.',
        'Capacity requests that exceed the platform reserve.',
        'Restore exercises that exceed the agreed recovery time.',
      ],
      caution: 'Hardware lead time makes late growth decisions expensive; review triggers early.',
    },
    evidence: ['ev-catalogue-scope', 'ev-no-provider'],
  },
  {
    id: 'hybrid',
    label: 'Hybrid',
    summary: 'Application in external hosting; database retained at the organization site.',
    prerequisites: [
      'A private connection between the hosting environment and the site.',
      'Explicit latency tolerance, outage behavior and split ownership.',
    ],
    limitations: [
      'Supported only as this bounded example; other hybrid topologies are unsupported.',
      'Never recommended merely as a compromise between the other variants.',
    ],
    components: [
      component('identity', 'Identity source', 'Identity owner (to confirm)'),
      component('ingress', 'External hosting', PROVIDER),
      component('application', 'External hosting', APP_TEAM),
      component('connectivity', 'Cross-environment link', `${PLATFORM_TEAM} with ${PROVIDER}`),
      component('database', 'Organization site', `${PLATFORM_TEAM} with ${APP_TEAM}`),
      component('backup', 'Organization site', PLATFORM_TEAM, {
        responsibility: 'Define retention and off-site isolation; verify restores. Backup location is to be confirmed.',
      }),
      component('monitoring', 'External hosting', `${APP_TEAM} with ${PLATFORM_TEAM}`),
    ],
    connections: hybridConnections,
    responsibilities: responsibilities({
      deployment: [APP_TEAM, 'Release into the hosting environment; database changes coordinated with the site.'],
      patching: [`${PROVIDER} / ${PLATFORM_TEAM} / ${APP_TEAM}`, 'Three parties patch different layers; document the split.'],
      'access control': [`${PLATFORM_TEAM} / ${APP_TEAM}`, 'Link access rules by platform; application authorization by team.'],
      secrets: [APP_TEAM, 'Database credentials cross environments; rotation must be coordinated.'],
      monitoring: [`${APP_TEAM} / ${PLATFORM_TEAM}`, 'Link health needs its own alerts on both sides.'],
      incidents: [`${APP_TEAM} / ${PLATFORM_TEAM}`, 'Agree who leads when the link fails.'],
      backups: [PLATFORM_TEAM, 'Backups stay at the site; confirm off-site copies.'],
      'restore verification': [`${PLATFORM_TEAM} / ${APP_TEAM}`, 'Restore exercises include re-establishing the link.'],
      'cost review': [`${APP_TEAM} / ${PLATFORM_TEAM}`, 'Hosting, site and connectivity charges reviewed together.'],
    }),
    failureScenarios: [
      {
        id: 'link-failure',
        title: 'Cross-environment link failure',
        description: 'The private connection between the hosting environment and the site drops.',
        affected: ['connectivity', 'application', 'database'],
        impact: 'The application stays up but every data request fails; users see errors until the link recovers.',
        recoveryOwner: `${PLATFORM_TEAM} with ${PROVIDER}`,
        note: 'Outage behavior (queueing, read-only mode, failure) must be designed explicitly.',
      },
      sharedFailure,
    ],
    growth: {
      changes: [
        'Scale the hosted application tier.',
        'Confirm link capacity and latency headroom for three-times traffic.',
        'Plan site database capacity with hardware lead time.',
      ],
      triggers: [
        'Sustained link utilization or latency above the agreed threshold.',
        'Response time degradation attributable to cross-environment calls.',
        'Site capacity requests exceeding the platform reserve.',
      ],
      caution: 'Growth stresses the link first; without latency evidence the growth finding stays conditional.',
    },
    evidence: ['ev-catalogue-scope', 'ev-no-provider', 'ev-hybrid-bounded'],
  },
];

export function variant(id: Deployment): Variant {
  const found = catalogue.find((entry) => entry.id === id);
  if (!found) throw new Error(`Unknown variant ${id}.`);
  return found;
}

export function evidenceRecord(id: string): EvidenceRecord {
  const found = evidence.find((entry) => entry.id === id);
  if (!found) throw new Error(`Unknown evidence ${id}.`);
  return found;
}
