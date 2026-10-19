# Technical architecture

> Scope revision: [Release baseline](RELEASE-BASELINE.md) supersedes earlier provider-selection, hybrid-coverage, hardware and capacity proposals in this document.

Status: proposed design; package versions, provider bindings, and device behavior are not yet verified.
Updated: 2026-10-11

## Design objective

Use one versioned decision model to drive validation, comparisons, spatial presentation, and exported documentation. Keep mandatory constraints and cost calculations deterministic and inspectable. Both entry paths use the same domain engine.

## Proposed implementation shape

A TypeScript application with an IWSDK presentation layer and a framework-independent domain engine. Start with a curated local catalogue and local sample journeys. Add a small backend only for features that require protected credentials or server processing, such as external AI interpretation.

The engine must run without XR or external AI, making meaningful correctness tests possible independently of headset interaction. Exact dependencies and module paths will be selected after checking the existing workspace and current official SDK documentation during implementation preparation.

## Logical modules

| Module | Responsibility | Boundary |
| --- | --- | --- |
| Intake | Two entry paths, question selection, input confirmation | Does not infer mandatory facts silently |
| Domain model | Requirements, architecture graphs, versions, scenarios | No SDK objects or generated prose as authoritative state |
| Catalogue | Validated patterns, provider variants, evidence and pricing metadata | Unsupported combinations remain explicit |
| Validation | Pass/fail/unknown constraint evaluation | AI cannot override findings |
| Cost engine | Unit-based scenario calculations and completeness | No invented prices or hidden defaults |
| Comparison | Findings, priorities, sensitivity and recommendation status | Exclusions precede ranking |
| Explanation | Traceable explanations of authoritative findings | Generated text cannot change evaluation results |
| IWSDK presentation | Hands-first navigation, graph layout, inspection and comparison | Renders model state; does not own business rules |
| Session store | Confirmed input, drafts, version history and resume | Validates imported and restored data |
| Export | Diagram and Markdown from one snapshot | No mixed-version output |
| Optional AI gateway | Protected external inference and validated response handling | No credentials in browser assets |

## Shared data contracts

### Project and inputs

- Project: identifier, schema version, entry path, workload summary and creation/update timestamps.
- DecisionInput: identifier, topic, typed value, units, classification, origin, confirmation state and scope.
- Scenario: identifier, named workload assumptions, currency and time horizon.
- InputConflict: affected input identifiers, reason, blocking status and resolution prompt.

Preserve explicit unknowns rather than converting missing fields to permissive values. Validate ranges, units, enumerations, references and unsupported fields at every import or AI boundary.

### Catalogue and architecture

- CatalogueSnapshot: version, supported variants, evidence records and freshness policy.
- Variant: pattern identifier, prerequisites, capabilities, limitations and component graph.
- Component: stable identifier, role, deployment boundary, ownership and catalogue reference.
- Connection: stable identifier, source, destination, purpose and dependency semantics.
- EvidenceRecord: claim identifier, source URL, source date, verification date and expiry policy.
- PriceRecord: service/region, currency, billing unit, price, effective date, terms and evidence reference.

Graph validation checks unique identifiers, valid connection references and required component roles. Connections do not imply an operational integration has been tested.

### Evaluation and decision

- RuleFinding: rule/version, affected inputs and components, pass/fail/unknown, reason and evidence references.
- CostEstimate: scenario, line items, formulas, units, totals/subtotals, exclusions and completeness.
- Comparison: eligible alternatives, conditional alternatives, exclusions and unsupported requirements.
- Recommendation: status, preferred alternative if justified, reasons, reversal conditions and open issues.
- DecisionSnapshot: immutable identifier, input version, catalogue/rule versions, evaluations, architecture graphs and user selection.

User selection remains separate from the system recommendation. Explanations reference findings and are stored with their source snapshot.

## State and reevaluation

User edits are drafts until applied. Applying a change creates a new input version and triggers validation, calculations and comparison. Only publish a complete evaluation snapshot to the presentation layer; do not show a new graph with old costs as though they belong together.

Initial implementation may reevaluate the entire small supported catalogue. Dependency-aware incremental evaluation is optional later work, not a prerequisite for correctness.

Cancel or disregard outdated asynchronous responses using request and input version identifiers. Undo returns to a previous confirmed snapshot. Failed processing preserves the last confirmed result and clearly labels it as belonging to the previous inputs.

## Question selection

Use explicit topic dependencies and unresolved findings to choose follow-ups: contradictions first, mandatory unknowns second, comparison-changing inputs third. Keep rule-driven questions available without AI. AI may propose wording or extraction but must return validated structured candidates for user confirmation.

## Recommendation and cost evaluation

Use the recommendation contract as the authoritative behavioral specification. Begin with transparent comparisons rather than a composite score. Record evidence gaps and partial estimates independently from feasibility.

Store monetary amounts with explicit currency and controlled precision. Keep quantities and billing periods explicit; avoid accidental mixing of hours, months, bytes and request counts. Define rounding and period conversion before adding provider pricing. Catalogue prices are dated estimates, not live billing guarantees.

## AI integration

Optional server endpoint accepts only the required project context and returns structured extraction or explanation candidates. Validate response shape and references, enforce timeouts and request limits, and reject results that invent catalogue identifiers or contradict authoritative findings.

External AI is unavailable until its provider, cost boundary and data handling are chosen. Explain what information leaves the browser before users send confidential specifications. Do not log raw specifications, credentials or sensitive attachments by default. Treat supplied documents as data, not executable instructions.

## Persistence and privacy

Proposed first release: local browser persistence with explicit save/resume and JSON backup/import. Warn that local browser storage can be cleared and that it is not a team collaboration or cross-device sync service. Validate backups before restoring them and preserve the current session if import fails.

Separate demo sessions from user projects. Include clear local deletion controls. Browser-local storage is not a claim of encryption or enterprise-grade security. Account-based sharing and organization tenancy remain outside the first release.

## Diagram and export pipeline

Generate a readable static diagram and Markdown from a frozen DecisionSnapshot. Proposed diagram outputs: SVG plus a text-based graph representation where practical. Final format selection depends on safe rendering and browser retrieval verification.

Escape user text in diagrams and Markdown generation. Do not execute imported markup, scripts or arbitrary diagram directives. Validate identifiers and URLs used in exports.

Validate export initiation and artifact retrieval on the target device. If immersive downloads are unsuitable, design and test a hands-only in-browser retrieval flow. This is an early feasibility gate because incomplete retrieval breaks the end-to-end journey.

## XR presentation

Maintain a mapping from stable domain component identifiers to scene entities. Selecting a requirement queries findings and graph references to highlight affected components. Comparison layout aligns equivalent roles across variants; deterministic layouts reduce unnecessary movement.

Use progressive disclosure, capped visible complexity and optional animation. Avoid blocking rendering while waiting for AI or evaluation. Measure device performance and tune layout complexity with real scenes, rather than assuming desktop emulation performance predicts headset behavior.

## Verification layers

- Domain fixtures: mandatory failures, unknowns, conflicts, unsupported capabilities and recommendation abstention.
- Calculation fixtures: units, ranges, missing prices, stale evidence and currency separation.
- Snapshot/export checks: graph identifiers, findings, costs, assumptions and versions agree.
- Interaction checks: both hands-only paths, undo, resume, tracking loss and export delivery.
- Real-device checks: comfort, readability, responsiveness and sustained performance.
- Usability comparison: consequence understanding with the spatial and flat representations of the same facts.

## Open technical decisions

- Supported device and test access.
- Current IWSDK version and generated project conventions.
- First validated provider/service variants and evidence freshness limits.
- Final graph/export format and retrieval behavior.
- AI inclusion, provider, budget and privacy settings.
- Whether any backend beyond optional AI is necessary.
