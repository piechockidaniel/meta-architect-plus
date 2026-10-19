# Product brief

> Scope revision: [Release baseline](RELEASE-BASELINE.md) supersedes earlier provider-selection, hybrid-coverage, hardware and capacity proposals in this document.

Status: consolidated planning proposal. Accepted decisions are identified in PROJECT-FOUNDATION.md; later design detail remains proposed.
Updated: 2026-10-11

## Product description

An immersive architecture decision workspace for people planning a business web application. Users describe their product, confirm constraints and assumptions, compare supported infrastructure designs, and explore how changes affect cost, dependencies, risks, and operating responsibilities. They leave with an architecture diagram and a consistent Markdown decision record.

The initial experience has two entrances: a new application within an existing organization, and a greenfield/startup product whose infrastructure starts from scratch. Both use the same decision engine and architecture model.

## Primary users and jobs

- Organizational technical lead: establish what is mandatory, evaluate remaining choices, and explain a design to stakeholders.
- Greenfield technical founder or lead: choose a sustainable starting design, understand maintenance work, and identify when growth justifies change.

Nontechnical founders can participate with plain-language explanations. The first release does not promise to replace specialist architecture review for arbitrary enterprise systems.

## Value proposition

Make infrastructure decisions traceable to requirements and operational reality. The distinctive experience is changing a requirement and inspecting the consequences across an aligned spatial comparison, with a durable decision artifact afterward.

Useful outcomes include rejecting incompatible options, exposing unknowns, explaining responsibilities, and identifying conditions that change the preferred design. A confident answer is not required when evidence is insufficient.

## First-release capability boundary

Included in the proposed scope: both sample entrances, adaptive questions, a small validated catalogue, deterministic constraints and cost scenarios, component inspection, consequence highlighting, decision review, local resume, and consistent export.

Deferred: provisioning, purchasing, autonomous deployment, organization accounts, collaboration, unrestricted provider coverage, arbitrary workload support, and compliance certification. Hybrid is captured as a requirement but needs a separately validated variant before a hybrid recommendation is supported.

AI is optional assistance for interpretation and explanation. The authored sample, rule evaluation, comparison, exploration, and export must work independently.

## Success hypotheses

1. Users can explain why an option fits their constraints and another does not.
2. Users can identify remaining operating responsibilities and material unknowns.
3. Spatial consequence exploration improves understanding enough to justify using a headset.
4. Exported artifacts are useful for a subsequent human review.

These are hypotheses, not measured benefits. VALIDATION-PLAN.md defines initial evaluation methods.

## Repeat usage

Return to reassess a changed requirement, review an assumption, compare a growth scenario, or revisit an operational burden. Preserve prior decision versions so users can see why the recommendation changed. Do not add artificial daily engagement mechanics to an occasional professional task.

## Product language

Use “supported option,” “conditional finding,” and “estimated cost.” Avoid unsupported claims such as optimal architecture, guaranteed savings, certified compliance, or enterprise-ready output.

No project name or tagline is selected yet. Naming is optional and does not block architecture planning.
