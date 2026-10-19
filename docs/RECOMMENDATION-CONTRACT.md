# Recommendation contract

> Scope revision: [Release baseline](RELEASE-BASELINE.md) supersedes earlier provider-selection, hybrid-coverage, hardware and capacity proposals in this document.

Status: proposed design for review; not an implementation or a claim of verified provider support.
Updated: 2026-10-11

## Purpose

Define the conditions under which the workspace may compare architectures, recommend an option, or report that a justified recommendation is unavailable. Apply the same contract to organizational and greenfield entry paths.

The output is decision support for user review. It is not a certification of security, compliance, availability, or production readiness.

## Proposed first-release workload boundary

Support a business web application comprising a browser frontend, HTTP application backend, relational database, and optional file storage and background jobs. Model identity, ingress and TLS, secrets, logs and monitoring, deployment, backups, and recovery responsibilities explicitly.

Initial supported assumptions:

- A single primary deployment region or site.
- Workload ranges supplied by the user or explicitly acknowledged as assumptions.
- A conventional application structure; no requirement for a microservice platform.
- Defined external integrations whose unsupported details are recorded as open issues.

Outside the initial validated scope: active-active multi-region systems, hard real-time systems, specialist GPU workloads, bespoke hardware topology, and certification of regulated deployments. Such requirements trigger an out-of-scope result or an explicitly partial assessment, not a claim that the requirement is infeasible in general.

## Proposed architecture patterns

| Pattern | Starting structure | Main comparison question |
| --- | --- | --- |
| P1: VPS | Application on a virtual server with an explicit database placement and backup arrangement | Is the operating effort acceptable for the expected budget and workload? |
| P2: managed cloud | Managed application runtime and managed relational database, with supported ancillary services | Does reduced infrastructure maintenance justify the cost and platform constraints? |
| P3: organizational infrastructure | Application and database on an existing supported organizational platform | Can existing capacity, integration, recovery, and ownership satisfy the requirements? |

Each pattern is a family, not a deployable design. Comparison requires a complete supported variant with database placement, dependency boundaries, ownership, and cost inputs specified. Never compare an incomplete low-cost pattern against a fully specified alternative.

Hybrid is captured in intake but is not a validated first-release pattern unless a specific hybrid variant and its connectivity, identity, failure, cost, and ownership rules are added. Both entry paths may consider any supported pattern; organizational context does not automatically mean on-premise.

Provider bindings remain open. A catalogue entry becomes selectable only after its service combination has been checked against dated primary documentation. Provider-neutral patterns can support early interaction design, but cannot establish vendor-specific pricing or compatibility.

## Required input sufficiency

Before an unconditional recommendation, establish:

- Supported workload and essential launch capabilities.
- Mandatory deployment, vendor, data location, identity, and integration constraints, or explicit confirmation that none apply in those areas.
- Budget range and currency, or explicit agreement to a comparison without an affordability conclusion.
- Workload scenario ranges sufficient for the cost and capacity statements being made.
- Availability and recovery expectations sufficient to assess the proposed design.
- Operating owner, maintenance capacity, and relevant skill assumptions.
- User priorities for comparing feasible alternatives.

Sufficiency is claim-specific. Missing storage volume may prevent a complete cost estimate without preventing a compatibility finding. An unknown mandatory deployment policy prevents an unconditional deployment recommendation.

## Catalogue and evidence contract

Every supported variant records:

- Stable identifier, version, components, connections, and deployment boundaries.
- Supported capabilities, limitations, prerequisites, and compatibility rules.
- Responsibility split between provider, organization, and application team.
- Known failure boundaries and required recovery arrangements.
- Primary evidence links, supported claims, source dates, and verification dates.
- Pricing inputs, billing units, region, currency, and exclusions where costs are available.
- Validation status and any remaining evidence gaps.

Use official provider documentation and pricing sources for provider-specific facts. Distinguish sourced capabilities, calculated estimates, user statements, and design judgments. Marketing descriptions alone do not prove end-to-end availability or compliance.

Before provider integration, define freshness limits for pricing and capabilities. Evidence that exceeds its limit or is unavailable must be flagged; it cannot silently support a current factual claim. Preserve the evidence snapshot for exported decisions.

## Decision pipeline

1. Normalize inputs without promoting inferred assumptions to confirmed facts.
2. Detect contradictory requirements and ask targeted clarification.
3. Check whether the requested capabilities are within the validated catalogue.
4. Evaluate mandatory constraints for each complete variant.
5. Identify unresolved feasibility conditions and evidence gaps.
6. Calculate supported cost scenarios and describe operational work.
7. Compare feasible options under visible user priorities.
8. Explain the preferred option, alternatives, limitations, and reversal conditions.
9. Obtain user selection or retain a provisional outcome.
10. Generate diagrams and documentation from the same versioned decision model.

## Constraint results

Each rule returns pass, fail, or unknown, with a reason and supporting evidence or input reference.

- Viable: all applicable mandatory constraints pass within the declared scope.
- Conditional: no confirmed failure, but one or more mandatory checks are unknown.
- Excluded: at least one mandatory constraint fails.
- Unsupported: the catalogue cannot evaluate a requested capability or required combination.

Unsupported is a coverage limitation, not proof of infeasibility. Missing evidence is unknown, not pass. A preference score cannot override a failed mandatory constraint.

Viability does not imply an option is recommended, affordable, or production-ready. Those conclusions need their own supporting evaluation.

## Comparison and ranking

Present the raw findings before any summary score:

- Infrastructure spending and cost completeness.
- Setup effort and launch complexity.
- Recurring operating responsibilities and required coverage.
- Reliability and recovery fit.
- Portability and migration implications.
- Growth path and likely changes.

Proposed default: compare visibly and identify trade-offs without a composite score. Offer a weighted ranking only after criteria, scoring anchors, and weights are defined and visible. Record weights in the decision model. Do not invent quantitative precision from subjective judgments.

Keep conditional alternatives separate from unconditional recommendations. If alternatives are tied or preference-sensitive, present that result. If only one variant is viable, explain the exclusions rather than claiming it is universally best.

Run sensitivity checks over the user's stated workload scenarios and selected priorities. Explain when the preferred option changes; do not fabricate probabilities for uncertain futures.

## Cost contract

For each cost estimate, record scenario, region, currency, pricing date, resource quantities, billing units, formula, and included/excluded items.

Consider compute, database, storage, backups, traffic, load balancing, monitoring, support, and other applicable services. Flag missing material inputs. State tax, discounts, free-tier assumptions, and commitment terms explicitly. Keep different currencies separate unless a dated exchange rate is supplied.

Show a subtotal when coverage is incomplete and avoid ranking it as though it were a complete total. Separate recurring infrastructure charges, one-time setup, and operating labor. Do not invent labor rates or precise staffing requirements.

For existing organizational infrastructure, distinguish incremental spending from allocated or existing costs. Existing capacity is not automatically free or available.

Budgets may be hard constraints or preferences according to the user's classification. If an estimated range crosses a hard budget limit, report affordability as unresolved under the stated scenarios.

## Operating model contract

List who handles deployment, patching, access control, secrets, monitoring, incidents, backups, restore verification, and cost review. Identify coverage gaps and relevant skills.

Managed services still leave application and account responsibilities. Recommend staffing arrangements qualitatively unless evidence supports an effort estimate. Headcount cannot be derived from infrastructure size alone; incident coverage and business obligations matter.

## Recommendation output

Each assessment contains:

- Scope and model/catalogue versions.
- Confirmed requirements and their classifications.
- Accepted assumptions and unresolved questions.
- Evaluated alternatives and rule outcomes.
- Preferred option, if justified, with reasons linked to findings.
- Costs and operational responsibilities with completeness indicators.
- Risks, growth triggers, and conditions that would change the decision.
- Evidence references and export timestamp.
- User selection, recorded separately from the system recommendation.

Use explicit evidence and completeness labels rather than an unsupported numerical confidence score.

## Abstention and partial results

Withhold an unconditional recommendation when requirements conflict, feasibility depends on unknown mandatory facts, required capabilities are unsupported, critical compatibility evidence is missing, or no option satisfies the hard constraints.

Show the work that remains useful: known requirements, evaluated alternatives, reasons, and the smallest information request or scope change that could unblock the decision. Never silently relax a hard requirement. User-approved changes create a new decision version.

## AI boundary

AI may propose extracted requirements, follow-up questions, and explanations grounded in the decision model and evidence. Validate structured output before accepting it.

AI cannot override mandatory rules, create unverified catalogue facts, invent prices, hide missing inputs, or claim that generated diagrams prove technical correctness. Generated explanation must not contradict rule results or calculated costs.

If AI fails or is unavailable, preserve input and keep curated sample assessment, comparison, spatial exploration, and supported export usable. A live free-text interpretation may be unavailable and should say so.

## Diagram and document consistency

Generate all representations from one versioned architecture and decision model. Components and connections need stable identifiers. Scenario changes invalidate affected findings and produce an updated version; exports must not mix old estimates with a new diagram.

A diagram must make identity, ingress, data stores, external dependencies, and deployment boundaries inspectable where applicable. Explain omitted detail and distinguish conceptual drawings from deployable configurations.

## Validation scenarios required before release

| Scenario | Expected behavior |
| --- | --- |
| Fixed region conflicts with a service variant | Exclude variant and show the region rule |
| Mandatory identity integration is unknown | Keep affected variant conditional |
| Preferred provider violates a hard constraint | Exclude despite preference |
| Workload exceeds validated catalogue coverage | Report unsupported scope |
| All variants fail | Explain failures; request user review of constraints |
| Price input is missing or stale | Flag incomplete/stale estimate; avoid unsupported cost conclusion |
| Usage range crosses hard budget | Report unresolved affordability |
| Recovery expectations exceed a variant's validated capability | Exclude or mark unknown according to evidence |
| Existing platform has unknown spare capacity | Keep capacity-dependent claim conditional |
| User revises an accepted assumption | Reevaluate dependencies and version the output |
| AI explanation conflicts with rules | Reject or regenerate explanation; preserve authoritative results |
| AI is unavailable | Supported sample and core workspace remain usable |
| Diagram and Markdown export | Components, assumptions, costs, and versions agree |

These are planned acceptance scenarios, not completed checks.

## Decisions to resolve next

1. Confirm first-release pattern coverage, including whether hybrid remains assessment-only.
2. Select provider bindings and catalogue evidence freshness policies.
3. Define component schemas, validation rules, and cost input units.
4. Specify spatial interaction and first-five-minutes behavior around the comparison findings.
5. Translate this contract into a technical architecture and staged delivery plan.
