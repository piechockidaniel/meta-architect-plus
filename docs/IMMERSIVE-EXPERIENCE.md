# Immersive experience and first five minutes

> Scope revision: [Release baseline](RELEASE-BASELINE.md) supersedes earlier provider-selection, hybrid-coverage, hardware and capacity proposals in this document.

Status: proposed interaction design; timing targets and usability benefits are unverified until tested.
Updated: 2026-10-11

## Experience promise

Help a seated user understand a consequential architecture trade-off, explore what changes under a different requirement, and leave with a reviewable decision record.

The central interaction is selecting a requirement or component and seeing its consequences across the architecture. Spatial depth must support comparison and dependency understanding rather than decorating a questionnaire.

## Workspace layout

- Center: the current architecture or aligned comparison, with an overview and progressive detail.
- Nearby primary panel: current step, focused explanation, next action, back, and help.
- On-demand detail panel: selected component, evidence, costs, responsibilities, or constraint findings.
- Persistent accessible controls: home, undo, pause, recenter, and text-size settings.

Essential information stays in the comfortable forward viewing area. Do not require users to turn behind them, stand, lean, or reach beyond comfortable seated range. Side detail is optional and can be brought to the center. Final sizes, distances, and text density require target-device testing.

Use stable layouts across alternatives so users can identify actual design differences. Represent logical boundaries through labeled groups and consistent layers. Spatial position is a layout aid, not a claim about physical distance, latency, or network topology.

## First-five-minutes sample journey

The following is a target for a preloaded sample. Full enterprise discovery is not expected to fit this timing.

| Target time | User activity | Product response |
| --- | --- | --- |
| 0:00–0:30 | Enter and select a large start target using hands | Teach the same selection action used throughout; show recenter and help |
| 0:30–1:00 | Choose organizational or greenfield sample | Show a short product summary and the scenario's already supplied facts |
| 1:00–1:45 | Confirm a few high-impact inputs | Explain constraint versus preference; keep sample assumptions labeled |
| 1:45–2:45 | Compare two supported alternatives | Align comparable components; expose one material difference and its reason |
| 2:45–3:45 | Change one requirement or scenario | Highlight changed components, costs, responsibilities, and feasibility findings |
| 3:45–4:30 | Inspect a consequence and its explanation | Connect the changed input to a rule, evidence, or calculation |
| 4:30–5:00 | Review and select an option or retain uncertainty | Create a decision record and initiate export through an in-scene action |

Do not auto-advance to meet timing. Allow users to pause or inspect details. Measure time, comprehension, and completion independently.

## Two tailored openings

### Organizational sample

An internal business web application has an existing identity requirement and deployment boundary. The user confirms what is mandatory, then explores how a recovery requirement changes the supported design and operating responsibilities.

Use concrete identity and region capabilities only after catalogue validation. Until then, prototype data must be labeled illustrative and must not imply a verified provider integration.

### Greenfield sample

A small team is launching a customer-facing business web application with a budget range and limited operating capacity. The user compares supported VPS and managed-cloud variants, then switches between stated usage scenarios to inspect cost and operating consequences.

Any numeric costs require the cost contract's inputs and sources. Design-stage figures are illustrative, not quotes.

Both openings converge on identical comparison, exploration, review, and export controls. Sample facts remain distinct from facts entered for a user's own project.

## Core interactions

| Action | Visible behavior | Decision value |
| --- | --- | --- |
| Select component | Highlight it and reveal purpose, dependencies, owner, and evidence | Explain what the component contributes |
| Select requirement | Highlight affected components and findings | Connect requirements to design choices |
| Compare alternatives | Align matching components; label additions, removals, and substitutions | Make differences traceable |
| Change scenario | Preview the change, then apply it as a new assessment version | Show consequences without losing the previous state |
| Inspect failure boundary | Display an authored failure scenario and affected paths | Explain modeled risks and recovery responsibilities |
| View launch/growth | Show the proposed changes and their triggers | Explain when additional complexity is justified |
| Review decision | Show recommendation, user selection, assumptions, and open issues | Prepare an accountable export |

Failure exploration is an explanation of validated model findings, not an executable reliability simulation. Growth variants require their own validation and must not imply automatic migration.

## Hand interaction contract

Use a consistent point-and-select interaction for the full critical path. Support direct touch where it is comfortable and verified, without making it necessary. Optional grabbing and repositioning may improve layout but must have button-based equivalents such as center, align, and reset.

Avoid gesture memorization, precision placement, two-handed requirements, prolonged arm elevation, and drag-only controls. Provide a visible selection state, immediate feedback, and a clear cancellation path.

Every critical action must be possible without pairing a controller: opening a sample, answering, navigating, comparing, changing a scenario, reviewing, and initiating export. Voice or keyboard conveniences cannot be the only route through a required step.

Eye tracking is not a baseline dependency. Any gaze interaction must be optional and tested on supported hardware, with hand selection remaining available.

## Information and visual language

- Use text and symbols alongside color for viable, conditional, excluded, and unsupported states.
- Distinguish confirmed facts, accepted assumptions, and unknowns.
- Show a concise reason first, with evidence and technical detail available on demand.
- Label every scenario, currency, estimate date, and incomplete cost subtotal.
- Emphasize changed findings without continuously animating the entire scene.
- Keep connections readable through filtering, focused highlighting, and a reset-to-overview action.

Do not display a dense matrix and full diagram simultaneously by default. Offer focused comparison views for cost, operations, recovery, and growth while retaining access to the overall architecture.

## Scenario change workflow

1. User selects a supported input to change.
2. Workspace shows the existing value, proposed value, and classification.
3. User applies the change.
4. A visible processing state explains what is being reevaluated.
5. Workspace highlights changes and summarizes their causes.
6. User can inspect details, undo, or keep the new version.

Preserve the distinction between a changed assumption and a changed hard requirement. Never relax mandatory requirements through a preset without showing the change for explicit user acceptance.

## Error, uncertainty, and resume behavior

- Unknown input: explain its effect and offer conditional exploration or a focused question.
- Contradiction: identify the conflicting inputs and let the user correct either one.
- No viable option: retain the architecture context and explain exclusions; do not silently recommend the least incompatible option.
- Unsupported capability: state the catalogue boundary and retain useful partial findings.
- Recommendation request failure: preserve answers and show retry or supported local exploration.
- Lost hand tracking: pause pending manipulation and keep visible recovery guidance; tracking recovery must not confirm an action.
- Interrupted XR session: restore the latest confirmed state and provide a clear resume action.
- Long processing: show progress state without inventing percentage completion; support cancellation where feasible.

## Export experience

The user reviews the current decision version and activates an in-scene export action. Provide diagram and Markdown artifacts generated from that version, with a visible completion or failure state.

Plan a fallback retrieval route if browser download behavior is unsuitable inside immersive mode. The complete hands-only retrieval path remains a technical validation requirement; an export button alone does not establish successful artifact delivery. Do not require a desktop handoff to finish the demonstrated sample journey.

Exports are private user artifacts by default. Sharing, public publishing, account creation, and infrastructure provisioning are separate capabilities outside this interaction scope.

## Demo story

Demonstrate a real decision rather than a tour of panels:

1. Establish the product and one meaningful constraint.
2. Show why two supported architectures differ.
3. Change one input and reveal the affected components and operating work.
4. Explain why the recommendation changes or remains stable.
5. Show the matching decision artifact.

Use real application interaction footage and identify any illustrative catalogue content. The demonstration must not imply live provider verification or infrastructure deployment that did not occur.

## Validation plan

First verify the full interaction flow in browser emulation, then test on the target Meta device. Emulator completion alone does not prove tracking quality, readable text, comfort, or sustained performance.

Proposed usability tasks:

- Complete either sample while seated using hands only.
- Identify which requirement excludes an alternative.
- Explain one cost versus operations trade-off in the user's own words.
- Predict which part of the architecture is affected by a requirement change, then inspect the result.
- Distinguish conditional findings from confirmed feasibility.
- Export the decision and verify that diagram and document match.
- Recover from tracking loss and an interrupted session without losing confirmed input.

Record assistance required, incorrect interpretations, task completion, session time, discomfort, and readability issues. Establish success thresholds before testing and revise them transparently when evidence warrants it.

Compare the consequence-exploration task against a simple flat representation using the same facts. The immersive benefit remains a hypothesis until tested; visual appeal is insufficient evidence of improved productivity.

## Next planning deliverable

Technical architecture: shared model and versioning, catalogue and rule evaluation, cost calculations, AI boundary, IWSDK presentation, persistence, export delivery, and validation seams. Final provider selection, hardware target, and export feasibility remain open decisions.
