# User journeys and adaptive questions

> Scope revision: [Release baseline](RELEASE-BASELINE.md) supersedes earlier provider-selection, hybrid-coverage, hardware and capacity proposals in this document.

Status: proposed planning detail for review; extends the accepted project foundation.
Updated: 2026-10-11

## User outcome

In either entry path, the user should understand which supported architectures are viable, why they differ, what operating them requires, and what missing information could change the recommendation. The session ends with a reviewable decision record or a clear explanation of why a decision cannot yet be justified.

## Common opening

1. Choose “Within an existing organization” or “Starting from scratch.” Users can change paths without losing answers.
2. Choose a sample business web application or describe a product. Specification import is a proposed convenience, not a prerequisite for the sample journey.
3. Confirm a short product summary: intended users, main activities, data, and essential integrations.
4. Confirm extracted facts before using them as constraints. Label inferred information as unconfirmed.

The initial session should ask a small batch of high-impact questions, then show a provisional architecture comparison. Follow-up questions refine it. Question count depends on unresolved decisions; a short intake must not imply a complete enterprise assessment.

## Path A: within an existing organization

### Opening questions

| ID | Question | Answer structure | Decision affected |
| --- | --- | --- | --- |
| A1 | Is the deployment environment fixed or open for evaluation? | Mandated / preferred / open / unknown; cloud, on-premise, hybrid, or specified environment | Deployment feasibility |
| A2 | Are providers or services restricted? | Fixed provider / approved list / unrestricted / unknown; applicable restrictions | Eligible implementations |
| A3 | Which organizational capabilities must the application use? | Identity, authorization policy, network, logging, secrets, delivery tooling, other; details may be unknown | Required integrations and responsibilities |
| A4 | Which data handling or location requirements apply? | Data categories, allowed locations, known policies, unknowns | Storage and deployment boundaries |
| A5 | Who will operate the application? | Existing team, shared platform team, external support, undecided; skills and coverage | Operational feasibility |
| A6 | What budget and launch expectations apply? | Budget ranges, currency, time horizon, launch target, flexibility | Affordability and delivery complexity |

### Adaptive follow-ups

- Fixed identity: establish integration protocol and ownership; keep authentication and application authorization separate.
- Fixed on-premise deployment: ask what compute, networking, storage, backup, and support already exist and what the application must provide.
- Hybrid requirement: ask which workloads or data must cross environments and why; identify connectivity and outage implications.
- Required integration: establish whether it is essential for launch, where it runs, and its availability expectations.
- Unknown organizational policy: mark dependent options conditional and identify the policy owner or information needed. Never treat unknown as unrestricted.

### Example journey

A technical lead describes an internal application. Existing identity and a deployment region are mandatory; the hosting implementation is open. The workspace checks supported patterns, marks options that cannot meet the fixed requirements, and compares remaining alternatives. Changing the recovery requirement reveals additional infrastructure and operational work. The lead exports the selected design with unresolved integration details recorded.

## Path B: starting from scratch

### Opening questions

| ID | Question | Answer structure | Decision affected |
| --- | --- | --- | --- |
| B1 | What must the first release let users accomplish? | Main user journey, essential features, deferred features | Workload boundaries |
| B2 | When must it launch, and what can you spend? | Launch target; setup and recurring budget ranges; currency | Starting complexity and affordability |
| B3 | What usage do you expect? | Initial and growth ranges, concurrency if known, traffic bursts, unknown | Sizing and cost scenarios |
| B4 | What data and integrations will it handle? | Data categories, location restrictions, essential integrations | Baseline requirements |
| B5 | Who can build and maintain it? | Team skills, available maintenance time, incident coverage, external help | Operating model |
| B6 | Are any infrastructure choices already fixed? | None / mandated / preferred / unknown; deployment, provider, stack, or portability constraints | Remaining decision space |

### Adaptive follow-ups

- Low maintenance capacity: compare supported options by remaining customer responsibilities, including those of managed services.
- Uncertain usage: compare explicitly named workload scenarios rather than inventing one precise forecast.
- Tight budget: separate provider charges, setup effort, and recurring operating effort; identify missing cost inputs.
- Portability preference: ask which migration concerns matter and how much added complexity is acceptable.
- Availability need: ask about business impact and acceptable interruption before proposing redundancy.
- Future growth: ask what observable event would justify revisiting the starting design.

### Example journey

A small team describes a customer-facing web application with an uncertain audience and limited maintenance capacity. The workspace compares supported VPS and managed-cloud patterns under visible assumptions. The user changes the traffic scenario and inspects cost and operational differences, then chooses a starting design and exports its growth triggers and responsibilities.

## Shared clarification topics

Ask these when an answer could affect feasibility, ranking, or material risk:

- Workload: request patterns, background jobs, file handling, latency-sensitive or real-time behavior.
- Reliability: business impact of interruption, acceptable downtime, acceptable data loss, recovery ownership.
- Security: user types, identity sources, authorization responsibilities, exposure boundaries, secrets and audit requirements.
- Data: sensitivity, retention, residency, size, growth, backup and restore needs.
- Operations: deployment, updates, monitoring, support coverage, restore exercises, incident response.
- Dependencies: external services, connectivity, rate limits, and failure behavior.

Do not require users to know technical acronyms. Explain terms beside the question and permit ranges or “unknown.” Formal policy or compliance claims require evidence and review beyond a short questionnaire.

## Answer model

Each decision input records:

- Topic and value, including ranges and units where applicable.
- Classification: hard constraint, preference, assumption, or unknown.
- Origin: user answer, specification passage, catalogue fact, or system proposal.
- Confirmation state and applicable scope.
- Reason it matters and which decisions depend on it.
- Source date or version when relevant.

A confirmed fact can be a preference; confirmation alone must not make it mandatory. System-proposed assumptions require visible acknowledgement before appearing as accepted assumptions in a final record.

## Question selection rules

1. Resolve contradictions and hard feasibility blockers first.
2. Ask questions that distinguish the remaining supported alternatives.
3. Ask for missing cost and operational inputs that materially affect comparison.
4. Group lower-impact details into optional refinement.
5. Explain why each question is being asked.
6. Preserve previous answers, allow correction and undo, and recompute affected results.

If users cannot resolve a blocker, retain the unknown and explain conditional results. Do not repeatedly ask the same question or silently choose a favorable answer.

## Comparison and spatial exploration

Show a small set of supported alternatives with three clearly distinct states: viable under confirmed inputs, conditional on unresolved information, or excluded by a constraint. Unsupported requirements must be identified separately from infeasibility.

Before scoring, show exclusions and their reasons. For remaining alternatives, display cost assumptions, operational tasks, risks, dependencies, and growth implications. Any ranking must expose its criteria and user priorities.

Proposed hands-first interactions:

- Select a component to reveal its purpose, dependencies, responsibilities, and evidence.
- Select a requirement to highlight affected architecture components.
- Align alternatives for comparison using consistent component positions.
- Change one scenario input and show what changed and why.
- Inspect failure boundaries with explicitly authored scenarios; do not imply a live reliability simulation.
- Switch between launch and growth designs with stated change triggers.

Keep core controls reachable while seated, use progressive disclosure for detail, and avoid requiring users to read a full decision document inside the headset. Provide visible progress and clear waiting, failure, retry, and resume states.

## Decision and export

Before export, present the selected architecture, rationale, accepted assumptions, unresolved questions, and operating responsibilities for user review.

Possible outcomes:

- A selected supported architecture with a justified recommendation.
- A provisional comparison awaiting specific information.
- No supported option satisfies the confirmed constraints.
- The workload requires capabilities outside the current catalogue.

Exports include the diagram, requirements, comparison, rationale, evidence dates, assumptions, open issues, operational ownership, and review triggers. Record the architecture model version so exports remain traceable to the session state.

## Proposed acceptance criteria

- Both entry paths complete a hands-only sample journey through comparison, exploration, decision review, and export initiation.
- Mandatory constraints exclude incompatible options regardless of preference scores.
- Unknown answers remain visible and cannot produce an unconditional recommendation when they affect feasibility.
- Contradictory inputs produce a targeted explanation and a correction path.
- Changing a requirement updates affected comparisons and diagram information consistently.
- Diagram and Markdown describe the same version of the architecture model.
- Unsupported workloads receive an explicit boundary explanation.
- Users can pause, resume, revise answers, and recover from failed recommendation requests without losing confirmed input.
- Usability validation measures whether users can explain the chosen option, one material trade-off, and its operating responsibilities; speed alone is insufficient.

## Open planning decisions

- Exact first-release workload features and supported architecture patterns.
- Threshold for sufficient information and treatment of conditional rankings.
- Questionnaire interaction details, specification import, and exported diagram formats.
- Whether external AI is part of the first release and how the core journey works without it.
- Concrete usability targets and real-device validation plan.
