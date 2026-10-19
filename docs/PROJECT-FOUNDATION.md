# Project foundation

> Scope revision: [Release baseline](RELEASE-BASELINE.md) supersedes earlier provider-selection, hybrid-coverage, hardware and capacity proposals in this document.

Status: planning; no implementation authorized by this document.
Updated: 2026-10-11

## Product purpose

An immersive architecture decision workspace that helps users turn a product specification, known boundaries, and explicit assumptions into viable infrastructure options, justified recommendations, architecture diagrams, and matching Markdown documentation.

The workspace explains costs, risks, dependencies, operational responsibilities, and evolution paths. Users retain the final architecture decision.

## Accepted scope

- Competition direction: Meta VR Start Developer Competition 2026, Productivity, using IWSDK.
- Initial supported workload: a business web application.
- Two entry paths: existing organizational context and greenfield/startup.
- Both paths converge into one decision workflow and share architecture models, validation, comparison, and the immersive workspace.
- Inputs distinguish hard constraints, preferences, assumptions, and unknowns.
- Diagrams and Markdown documentation must describe the same architecture.

## Entry path A: existing organizational context

Audience: technical leads evaluating a new application within an established organization.

Opening questions identify mandatory deployment policies, approved or fixed providers, identity and access requirements, required middleware, existing integrations, data restrictions, budget, and operational ownership.

For each area, establish whether it is mandated, preferred, open for evaluation, or unknown. Do not ask users to choose a deployment model when choosing it is the assistance they need.

Outcome: an architecture that fits existing boundaries, with explicit explanations of remaining choices and rejected alternatives.

## Entry path B: greenfield/startup

Audience: founders and technical leads starting a product with infrastructure set up from scratch.

Opening questions establish product goals, launch timeline, budget, workload expectations, data sensitivity, team skills, maintenance capacity, and growth uncertainty.

Evaluate cloud, VPS, on-premise, and hybrid approaches where supported and appropriate. Help users select providers and components, distinguish launch necessities from deferred capabilities, understand migration implications, and assign operational responsibilities.

Greenfield does not mean unconstrained. Budget, skills, time, and data requirements remain decision inputs.

Outcome: a sustainable starting architecture with justified future changes and observable triggers for reviewing the decision.

## Shared user journey

1. Select an entry path and describe the product.
2. Confirm extracted requirements and classify constraints, preferences, assumptions, and unknowns.
3. Answer focused follow-up questions that could change the decision.
4. Validate supported architecture options against mandatory constraints.
5. Compare viable options, costs, risks, operational work, and evolution paths.
6. Explore dependencies and consequences through spatial interactions.
7. Review the recommendation, alternatives, evidence, and unresolved questions.
8. Select an option and export consistent architecture diagrams and Markdown documentation.

If information is insufficient or no supported option satisfies the constraints, explain that result rather than inventing a definitive recommendation.

## Proposed reliability design — pending detailed planning

- Maintain a shared structured architecture model for diagrams, comparisons, and exports.
- Enforce hard constraints before ranking feasible options.
- Use a curated, versioned component and compatibility catalogue.
- Calculate costs from visible workload assumptions and dated sources; distinguish infrastructure spending from operating effort.
- Use AI to assist interpretation and explanation, with explicit validation of its structured outputs.
- Link recommendations to inputs, evidence, and assumptions; expose which changes could reverse a decision.
- Keep core comparison and exploration useful when AI assistance is unavailable.

## Proposed immersive value — pending validation

Prioritize understanding consequences: reveal component dependencies, highlight affected components when a requirement changes, align alternative architectures for comparison, and inspect failure boundaries and launch-to-growth changes.

Design for seated, hands-first use. Avoid requiring long specification entry inside the headset. Provide a complete hands-only sample journey while planning convenient specification import separately.

## Planning deliverables

1. Product definition and measurable user outcomes for both entry paths.
2. Detailed journeys and adaptive question model.
3. Recommendation contract: supported workloads and patterns, validation, evidence, costs, and abstention behavior.
4. Immersive interaction design and first-five-minutes experience.
5. Technical architecture and data contracts.
6. Delivery milestones, acceptance criteria, validation, and submission checklist.

## Open decisions

- Supported architecture patterns, providers, regions, and pricing assumptions for the first release.
- Exact question sequence and conditions for requesting additional information.
- Recommendation ranking criteria and how user priorities affect them.
- Diagram formats and Markdown export structure.
- Persistence, specification import, and handling of confidential product information.
- Target Meta devices and real-device validation access.
- AI provider and invocation budget, if AI is included.
- Competition division and confirmation of Start membership.
- Organizer interpretation of provider names and branding under rule 4.19.

## Competition references

- Overview: https://start-developer-competition-26.devpost.com/
- Rules: https://start-developer-competition-26.devpost.com/rules
- IWSDK: https://developers.meta.com/vr/develop/iwsdk/

These references were consulted in the planning conversation on 2026-10-11. Recheck requirements before submission. Eligibility, publication, and submission remain separate actions.
