/**
 * Export pipeline: one frozen snapshot -> SVG diagrams + Markdown record +
 * JSON bundle. Nothing here reads live session state after capture.
 */
import type { BaseComponentId, ComponentId } from './catalogue.js';
import { assessmentFor, choiceKeys, inputDefinitions, valueLabel } from './decision.js';
import { workloadLibrary } from './workload.js';
import type { Assessment, Deployment, RuleResult, Snapshot } from './decision.js';
import { conflicts } from './intake.js';
import type { DecisionSession } from './session.js';

const escapeXml = (text: string): string =>
  text.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);

/** Escape Markdown control characters and raw HTML in user-supplied text so it cannot alter structure. */
const escapeMarkdown = (text: string): string =>
  text.replace(/[&<]/g, (c) => (c === '&' ? '&amp;' : '&lt;')).replace(/[\\`*_{}[\]()#+\-!|>]/g, (c) => `\\${c}`);

export const resultSymbol: Record<RuleResult, string> = { pass: 'OK', unknown: '?', unsupported: '!', fail: 'X' };

/** Shared aligned layout: same slot for the same role in every variant; workload blocks share a bottom row. */
const slots: Record<BaseComponentId, { column: 0 | 1 | 'span'; row: number }> = {
  identity: { column: 0, row: 0 },
  ingress: { column: 1, row: 0 },
  application: { column: 'span', row: 1 },
  connectivity: { column: 'span', row: 2 },
  database: { column: 0, row: 3 },
  backup: { column: 1, row: 3 },
  monitoring: { column: 'span', row: 4 },
};

export function diagram(snapshot: Snapshot, id: Deployment): string {
  const assessment = assessmentFor(snapshot, id);
  const width = 800;
  const margin = 40;
  const columnWidth = 340;
  const gap = 40;
  const boxHeight = 84;
  const rowGap = 46;
  const top = 120;
  const workload = assessment.components.filter((component) => component.kind === 'workload');
  const rows = 5 + (workload.length > 0 ? 1 : 0);
  const box = (component: ComponentId) => {
    if (component in slots) {
      const slot = slots[component as BaseComponentId];
      const x = slot.column === 'span' ? margin : margin + slot.column * (columnWidth + gap);
      const w = slot.column === 'span' ? columnWidth * 2 + gap : columnWidth;
      const y = top + slot.row * (boxHeight + rowGap);
      return { x, y, w, h: boxHeight, cx: x + w / 2, cy: y + boxHeight / 2 };
    }
    const index = Math.max(0, workload.findIndex((entry) => entry.id === component));
    const count = Math.max(1, workload.length);
    const innerGap = 16;
    const w = (columnWidth * 2 + gap - innerGap * (count - 1)) / count;
    const x = margin + index * (w + innerGap);
    const y = top + 5 * (boxHeight + rowGap);
    return { x, y, w, h: boxHeight, cx: x + w / 2, cy: y + boxHeight / 2 };
  };
  const height = top + rows * (boxHeight + rowGap) + 40;
  const fill: Record<RuleResult, string> = { pass: '#1f3d53', unknown: '#5a4a16', unsupported: '#4d3a5e', fail: '#5a1f2c' };
  const lines = assessment.connections
    .map((connection) => {
      const a = box(connection.from);
      const b = box(connection.to);
      return `<line x1="${a.cx}" y1="${a.y + a.h}" x2="${b.cx}" y2="${b.y}" stroke="#7fc4cc" stroke-width="2"/>`;
    })
    .join('');
  const nodes = assessment.components
    .map((view) => {
      const b = box(view.id);
      if (!view.present) {
        return `<g><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="12" fill="none" stroke="#5d7184" stroke-dasharray="8 6"/><text x="${b.x + 16}" y="${b.y + 48}" fill="#9fb3c4" font-family="sans-serif" font-size="15">${escapeXml(view.label)}: ${escapeXml(view.boundary)}</text></g>`;
      }
      const marker = resultSymbol[view.worstResult];
      const compact = b.w < 200;
      return `<g><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="12" fill="${fill[view.worstResult]}" stroke="${view.kind === 'workload' ? '#d9b56a' : '#9ed7de'}" stroke-width="1"/><text x="${b.x + 12}" y="${b.y + 30}" fill="#ffffff" font-family="sans-serif" font-size="${compact ? 15 : 19}" font-weight="700">${escapeXml(compact ? view.shortLabel : view.label)}${marker === 'OK' ? '' : ` [${marker}]`}</text><text x="${b.x + 12}" y="${b.y + 54}" fill="#b9e6ea" font-family="sans-serif" font-size="${compact ? 11 : 14}">${escapeXml(view.boundary)}</text>${compact ? '' : `<text x="${b.x + 12}" y="${b.y + 72}" fill="#9fb3c4" font-family="sans-serif" font-size="12">Owner: ${escapeXml(view.owner)}</text>`}</g>`;
    })
    .join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="${width}" height="${height}" fill="#102132"/>` +
    `<g fill="#e7f3ff" font-family="sans-serif"><text x="${margin}" y="44" font-size="24" font-weight="700">${escapeXml(assessment.variant.label)} - decision v${snapshot.version}</text>` +
    `<text x="${margin}" y="72" font-size="15">State: ${assessment.state.toUpperCase()} | catalogue ${escapeXml(snapshot.catalogueVersion)} | ${escapeXml(snapshot.createdAt)}</text>` +
    `<text x="${margin}" y="94" font-size="13" fill="#b9c9d8">Conceptual pattern. Markers: ? unknown, ! unsupported, X failed mandatory check. Lines are dependencies, not validated configurations. Gold outlines are workload blocks you added.</text></g>` +
    lines +
    nodes +
    `<text x="${margin}" y="${height - 14}" fill="#b9c9d8" font-family="sans-serif" font-size="12">Illustrative catalogue; no provider, region, price or availability claim is verified.</text>` +
    `</svg>`
  );
}

const state = (value: string): string => value.toUpperCase();

function costSection(assessment: Assessment): string[] {
  const cost = assessment.cost;
  return [
    `### Cost estimate (${cost.scenario} scenario, ${cost.currency}, ${cost.completeness}, estimated ${cost.estimateDate})`,
    '| Line item | Category | Quantity | Rate | Amount | Formula |',
    '| --- | --- | --- | --- | --- | --- |',
    ...cost.lines.map(
      (line) =>
        `| ${line.label} | ${line.category} | ${line.quantity} ${line.unit} | ${line.rate === null ? 'missing' : `${line.rate} ${cost.currency}`} | ${line.amount === null ? 'unpriced' : `${line.amount} ${cost.currency}`} | ${line.formula} |`,
    ),
    `Subtotal: ${cost.subtotal === null ? 'unpriced' : `${cost.subtotal} ${cost.currency} per month (incomplete; not a total)`}`,
    cost.basis,
    `Excluded: ${cost.exclusions.join('; ')}.`,
  ];
}

function responsibilitySection(assessment: Assessment): string[] {
  return [
    '### Operating responsibilities',
    '| Task | Owner | Note |',
    '| --- | --- | --- |',
    ...assessment.responsibilities.map((entry) => `| ${entry.task} | ${entry.owner} | ${entry.note} |`),
  ];
}

export function markdown(snapshot: Snapshot): string {
  const inputs = snapshot.inputs;
  const inputConflicts = conflicts(inputs);
  const lines: string[] = [
    `# Architecture decision v${snapshot.version}`,
    `Created: ${snapshot.createdAt}  ` +
      `\nCatalogue: ${snapshot.catalogueVersion} | Rules: ${snapshot.rulesVersion} | Entry path: ${inputs.path}`,
    'Scope: generic conceptual business web application (browser frontend, HTTP backend, relational database). Conceptual patterns only; no provider, region, price or availability claim is verified. This record supports human review; it is not a certification.',
    '## Outcome',
    `System recommendation: ${snapshot.recommendation ? snapshot.recommendation : 'No unique unconditional recommendation'}`,
    ...snapshot.recommendationReasons.map((reason) => `- ${reason}`),
    `User selection (recorded separately): ${snapshot.selection ?? 'Not selected - uncertainty retained'}`,
    '## Inputs and classification',
    '| Input | Value | Classification |',
    '| --- | --- | --- |',
    ...choiceKeys.map(
      (key) => `| ${inputDefinitions[key].label} | ${valueLabel(key, String(inputs[key]))} | ${inputDefinitions[key].classification} |`,
    ),
    `| Workload blocks | ${inputs.workload.length === 0 ? 'none' : inputs.workload.map((id) => workloadLibrary[id].label).join(', ')} | product scope |`,
    `| Hard monthly budget | ${inputs.budget === null ? 'none' : `${inputs.budget} ${inputs.currency}`} | hard constraint |`,
    `| Scenario rates | ${inputs.rates ? `hosting ${inputs.rates.hosting}, site ${inputs.rates.site}, connectivity ${inputs.rates.connectivity} ${inputs.currency}/month` : 'not supplied'} | scenario assumption |`,
    ...(inputConflicts.length > 0
      ? ['### Contradictions', ...inputConflicts.map((conflict) => `- ${conflict.reason} ${conflict.prompt}`)]
      : []),
    '## Open issues',
    ...snapshot.openIssues.map((issue) => `- ${issue}`),
    '## Conditions that would change the decision',
    ...snapshot.reversalConditions.map((condition) => `- ${condition}`),
  ];
  for (const assessment of snapshot.assessments) {
    lines.push(
      `## ${assessment.variant.label}: ${state(assessment.state)}`,
      assessment.variant.summary,
      `Prerequisites: ${assessment.variant.prerequisites.join(' ')}`,
      `Limitations: ${assessment.variant.limitations.join(' ')}`,
      '### Findings',
      ...assessment.findings.map((finding) => `- ${state(finding.result)} [${finding.rule}]: ${finding.reason}`),
      '### Components',
      '| Component | Kind | Boundary | Owner | Depends on | Worst finding |',
      '| --- | --- | --- | --- | --- | --- |',
      ...assessment.components
        .filter((component) => component.present)
        .map(
          (component) =>
            `| ${component.label} | ${component.kind} | ${component.boundary} | ${component.owner} | ${component.dependsOn.join(', ') || '-'} | ${component.worstResult} |`,
        ),
      ...costSection(assessment),
      ...responsibilitySection(assessment),
      '### Failure boundaries (authored scenarios, not simulations)',
      ...assessment.variant.failureScenarios.map(
        (scenario) =>
          `- ${scenario.title}: ${scenario.description} Affected: ${scenario.affected.join(', ')}. Impact: ${scenario.impact} Recovery owner: ${scenario.recoveryOwner}. ${scenario.note}`,
      ),
      '### Launch to growth',
      ...assessment.variant.growth.changes.map((change) => `- Change: ${change}`),
      ...assessment.variant.growth.triggers.map((trigger) => `- Trigger: ${trigger}`),
      assessment.variant.growth.caution,
      '### Evidence',
      ...assessment.evidence.map(
        (record) =>
          `- [${record.status}] ${record.claim} Source: ${record.source} (${record.sourceDate}; verified: ${record.verifiedDate ?? 'not verified'}).`,
      ),
    );
  }
  lines.push(
    '## Review triggers',
    '- Reassess when usage, budget, deployment policy, data location, identity, recovery needs or operating ownership changes.',
    '- Confirm concrete identity, network, backup and service compatibility before deployment.',
  );
  return lines.join('\n\n');
}

/** Capture once so every artifact describes the same project revision. */
export function decisionBundle(session: DecisionSession) {
  const snapshot = structuredClone(session.snapshot);
  const backup = session.backup();
  const context = structuredClone(backup.context);
  const text = `${context.title}\n\n${context.specification}`;
  const longestRun = Math.max(2, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = '`'.repeat(longestRun + 1);
  const rationale = context.rationale?.trim() ?? '';
  const rationaleFence = '`'.repeat(Math.max(3, ...(rationale.match(/`+/g) ?? []).map(run => run.length + 1)));
  const document = [
    markdown(snapshot),
    '## Product context',
    `Title: ${escapeMarkdown(context.title)}`,
    `Input origin: ${context.inputOrigin}. Summary acknowledged: ${context.confirmed ? 'yes' : 'no'}.`,
    `${fence}text`,
    text,
    fence,
    'Acknowledgement records user review; it does not establish that assumptions were independently verified.',
    '## User rationale',
    rationale ? `${rationaleFence}text\n${rationale}\n${rationaleFence}` : 'Not recorded.',
  ].join('\n\n');
  return {
    schema: 'architecture-decision-bundle.v2',
    backup,
    snapshot,
    context,
    markdown: document,
    diagrams: Object.fromEntries(
      snapshot.assessments.map((assessment) => [assessment.variant.id, diagram(snapshot, assessment.variant.id)]),
    ) as Record<Deployment, string>,
  };
}

export type DecisionBundle = ReturnType<typeof decisionBundle>;
