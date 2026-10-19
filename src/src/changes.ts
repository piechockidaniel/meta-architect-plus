/**
 * Describes what changed between two decision snapshots so the workspace can
 * highlight affected components and explain causes without re-deriving them.
 */
import { choiceKeys, inputDefinitions, valueLabel } from './decision.js';
import type { ComponentId, Deployment, Inputs, RuleResult, Snapshot, State } from './decision.js';

export interface FindingChange {
  rule: string;
  before: RuleResult | 'absent';
  after: RuleResult | 'absent';
  reason: string;
}

export interface VariantChange {
  id: Deployment;
  label: string;
  stateBefore: State;
  stateAfter: State;
  findings: FindingChange[];
  subtotalBefore: number | null;
  subtotalAfter: number | null;
  affectedComponents: ComponentId[];
}

export interface ChangeSummary {
  fromVersion: number;
  toVersion: number;
  causes: string[];
  variants: VariantChange[];
  recommendationBefore: Deployment | null;
  recommendationAfter: Deployment | null;
  headline: string;
}

function inputCauses(before: Inputs, after: Inputs): string[] {
  const causes: string[] = [];
  for (const key of choiceKeys) {
    if (before[key] !== after[key]) {
      causes.push(
        `${inputDefinitions[key].label}: ${valueLabel(key, String(before[key]))} -> ${valueLabel(key, String(after[key]))} (${inputDefinitions[key].classification})`,
      );
    }
  }
  if (before.path !== after.path) causes.push(`Entry path: ${before.path} -> ${after.path}`);
  if (before.workload.join() !== after.workload.join()) {
    causes.push(`Workload blocks: ${before.workload.join(', ') || 'none'} -> ${after.workload.join(', ') || 'none'} (product scope)`);
  }
  if (before.budget !== after.budget) causes.push(`Hard budget: ${before.budget ?? 'none'} -> ${after.budget ?? 'none'}`);
  if (before.currency !== after.currency) causes.push(`Currency: ${before.currency} -> ${after.currency}`);
  if (JSON.stringify(before.rates) !== JSON.stringify(after.rates)) {
    causes.push(`Scenario rates: ${before.rates ? 'supplied' : 'none'} -> ${after.rates ? 'supplied' : 'none'}`);
  }
  return causes;
}

export function describeChanges(previous: Snapshot, next: Snapshot): ChangeSummary {
  const variants = next.assessments.map((after): VariantChange => {
    const before = previous.assessments.find((entry) => entry.variant.id === after.variant.id);
    const rules = new Set([
      ...(before?.findings.map((finding) => finding.rule) ?? []),
      ...after.findings.map((finding) => finding.rule),
    ]);
    const findings: FindingChange[] = [];
    const affected = new Set<ComponentId>();
    for (const rule of rules) {
      const earlier = before?.findings.find((finding) => finding.rule === rule);
      const later = after.findings.find((finding) => finding.rule === rule);
      const resultBefore = earlier?.result ?? 'absent';
      const resultAfter = later?.result ?? 'absent';
      if (resultBefore === resultAfter && earlier?.reason === later?.reason) continue;
      findings.push({ rule, before: resultBefore, after: resultAfter, reason: later?.reason ?? earlier?.reason ?? '' });
      for (const component of later?.components ?? earlier?.components ?? []) affected.add(component);
    }
    return {
      id: after.variant.id,
      label: after.variant.label,
      stateBefore: before?.state ?? after.state,
      stateAfter: after.state,
      findings,
      subtotalBefore: before?.cost.subtotal ?? null,
      subtotalAfter: after.cost.subtotal,
      affectedComponents: [...affected],
    };
  });
  const causes = inputCauses(previous.inputs, next.inputs);
  const stateChanges = variants.filter((entry) => entry.stateBefore !== entry.stateAfter);
  const recommendationChanged = previous.recommendation !== next.recommendation;
  const headline =
    causes.length === 0
      ? 'No input changed; findings were reevaluated with the same result.'
      : stateChanges.length === 0 && !recommendationChanged
        ? 'Inputs changed but no variant changed state; the recommendation is stable.'
        : `${stateChanges.map((entry) => `${entry.label}: ${entry.stateBefore} -> ${entry.stateAfter}`).join('; ')}${
            recommendationChanged
              ? `. Recommendation: ${previous.recommendation ?? 'none'} -> ${next.recommendation ?? 'none'}`
              : '. Recommendation unchanged'
          }.`;
  return {
    fromVersion: previous.version,
    toVersion: next.version,
    causes,
    variants,
    recommendationBefore: previous.recommendation,
    recommendationAfter: next.recommendation,
    headline,
  };
}

export function affectedComponents(summary: ChangeSummary | null, id: Deployment): ComponentId[] {
  return summary?.variants.find((entry) => entry.id === id)?.affectedComponents ?? [];
}
