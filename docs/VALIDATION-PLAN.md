# Validation plan

> Scope revision: [Release baseline](RELEASE-BASELINE.md) supersedes earlier provider-selection, hybrid-coverage, hardware and capacity proposals in this document.

Status: proposed acceptance specification; no checks or user studies have been executed.
Updated: 2026-10-11

## Evidence policy

Record build, device/browser, catalogue and rule versions, scenario, expected result, observed result and limitations. Distinguish domain tests, emulator checks, real-device observations, and user research. A pass in one layer does not establish another.

## Domain acceptance suite

| Fixture | Expected result |
| --- | --- |
| Organizational mandatory region mismatch | Variant excluded with linked rule and input |
| Greenfield provider preference conflicts with hard budget | Preference cannot override affordability failure |
| Missing mandatory identity details | Relevant feasibility unknown; no unconditional recommendation |
| Contradictory deployment requirements | Clarification required; inputs retained |
| Unsupported hybrid topology | Coverage limitation, not universal infeasibility |
| All variants excluded | No recommendation; explain failures |
| Two viable variants with different strengths | Show trade-offs without invented superiority |
| Only one viable variant | Explain exclusions and qualified preference |
| Changed assumption | New snapshot; old result remains traceable |
| Outdated asynchronous explanation | Discard response associated with old input version |

## Calculation and export acceptance

Test billing units, period conversions, rounding, missing quantities, incomplete prices, expired evidence and separate currencies. Include scenario ranges that cross a hard budget. Verify that existing capacity is not treated as available or free without an explicit input.

For an exported snapshot, check component identifiers, graph connections, decision inputs, findings, cost scenarios, user selection, evidence references and versions against both diagram and Markdown. Include user text containing markup and malformed imports; neither may execute code or corrupt the current session.

## Interaction acceptance

On target hardware, complete both sample paths while seated without controllers, including actual artifact retrieval. Check point/select, back, cancel, undo, recenter, text sizing, help, tracking recovery, pause/resume, and request failure.

Verify that essential controls do not require reaching, standing, or eye tracking. Record readability problems and accidental selections. Test cold and resumed sessions, repeated scenario changes, and the maximum supported graph complexity.

Performance target proposal: sustained 72 fps on a compatible 72 Hz device configuration, with frame timing recorded; confirm against the chosen hardware and current competition requirements. Do not report desktop frame rate as headset performance. Exact measurement tools and thresholds require the device spike.

## Formative user evaluation

Recruit a small initial group spanning organizational and greenfield technical users; proposed minimum is five participants total. This is formative feedback, not statistically conclusive evidence.

Give equivalent spatial and flat consequence-exploration tasks with the same facts. Alternate task order where feasible and document prior familiarity. Avoid coaching answers or using identical task wording that simply encourages recall.

Ask each participant to:

1. Identify a mandatory constraint and its consequence.
2. Explain one meaningful cost/operations trade-off.
3. Identify an unresolved assumption.
4. Inspect a changed requirement and explain why the result changed.
5. Retrieve and interpret the exported decision artifact.

Proposed initial usability gate: at least four of five participants complete the core sample without facilitator intervention and correctly explain the constraint, trade-off and unknown. Record results per path; aggregate success must not hide a broken entrance. A gate miss requires an iteration or a documented limitation, not retroactive relabeling of success.

Measure time separately. The five-minute sample is a design target; rushing without comprehension is failure. Report discomfort, abandonment, incorrect interpretations and assistance alongside completion. Do not claim spatial superiority from this small sample alone.

## Release gate

No release candidate is ready while a known defect permits hard-constraint bypass, mixed-version exports, secret exposure, silent loss of confirmed input, or failure of the required hands-only sample journey. Lower-impact limitations must be documented with reproducible context.

Keep a concise evidence ledger linking check results and observations to the exact release candidate. Final competition compliance must be refreshed before publication.
