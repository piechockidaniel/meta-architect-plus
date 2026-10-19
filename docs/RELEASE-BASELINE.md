# Release baseline — 2026-10-11

This revision supersedes earlier provider-selection, hardware, capacity and hybrid-coverage proposals in the planning package. Detailed reliability and interaction contracts remain applicable unless explicitly narrowed below.

## Confirmed by user

- Target testing device: Meta Quest 3.
- Delivery capacity: solo, 10–20 hours per week.
- First-release comparison level: generic cloud, on-premise and hybrid architectures; no provider selection or branded service catalogue.
- Active Meta VR Start membership and configured account: user-confirmed, not independently verified. Account email is intentionally omitted from project planning artifacts.
- Both organizational and greenfield entry paths remain in scope.

## Generic architecture catalogue

Deployment location and operating model are separate dimensions. A remotely hosted virtual machine may be self-managed; on-premise infrastructure may be operated by another team. Do not infer staffing from the cloud label.

Use three narrowly authored conceptual variants for the same business web application:

| Variant | Boundary | Explicit assumptions and responsibilities |
| --- | --- | --- |
| Cloud | Application and database in a generic external hosting environment | Runtime and database management arrangements stated separately; identity, monitoring, backups and recovery owners specified |
| On-premise | Application and database at one organizational site | Capacity, networking, facilities, hardware maintenance and recovery arrangements must be known or conditional |
| Hybrid | Application in external hosting; database retained on-premise | Supported only as this bounded example; private connectivity, identity integration, latency tolerance, outage behavior and split ownership must be explicit |

Hybrid is now a conceptual first-release comparison, replacing the prior assessment-only proposal. This does not validate arbitrary hybrid topologies or any real provider implementation. Missing connectivity or latency evidence yields conditional findings. Never recommend hybrid merely as a compromise between the other choices.

The catalogue supports conceptual design compatibility. Outputs must distinguish a generic supported pattern from a deployable, vendor-validated design. Do not assert actual regional availability, protocol compatibility or service guarantees without concrete evidence.

## Costs at this abstraction level

Keep formulas, cost drivers and resource quantities visible. Monetary outputs require user-supplied unit rates or explicitly illustrative sample rates. Without those inputs, show an unpriced estimate and cost categories, not a market quote or blanket claim that one deployment model is cheaper.

On-premise scenarios include hardware acquisition or amortization assumptions, facilities and maintenance as applicable. Hybrid includes both environments and connectivity. Keep operating effort separate. Availability and cost comparisons depend on the specific modeled arrangements, not on the deployment label alone.

## AI boundaries

Update: the user has accepted AI inclusion. [AI integration decision](AI-INTEGRATION-DECISION.md) supersedes the optional-inclusion proposal below and defines the SDK recommendation and test access investigation. Outage fallback remains required.

Competition rules explicitly contemplate AI experiences and discourage thin wrappers. Reviewed rules do not specify a mandatory inference provider or a blanket ban on AI-generated code. Publicly available or Start-accessible tooling, third-party permissions, originality, policy compliance and accurate presentation still apply. This is a reading of the published rules, not an organizer ruling.

Proposed first release: deterministic assessments and authored sample journeys first; optional AI for specification extraction and finding-grounded explanations afterward. AI cannot invent cost rates, override hard constraints, or promote assumptions into confirmed facts.

No paid invocation is authorized by asking about AI boundaries. Before enabling external inference, decide provider, spending cap and permitted data. Keep keys server-side and preserve useful sample functionality if inference fails. Voice is optional and cannot replace the hands-only critical path.

The AI backend vendor and the infrastructure vendors evaluated by the product are distinct concerns. Provider-neutral architecture output does not by itself settle all branding or third-party requirements for an AI integration.

## Competition presentation

Generic components avoid the specific provider-name/logo issue identified under rule 4.19. They do not constitute a blanket competition-compliance guarantee. Use neutral component labels and original graphics. Preserve accurate sources and licenses without turning the experience into advertising.

Rules reviewed on 2026-10-11: https://start-developer-competition-26.devpost.com/rules

## Capacity-based delivery proposal

Approximately five and a half weeks remain until the published November 18 deadline: roughly 55–110 hours at the stated weekly capacity, depending on actual availability. Plan the core around the lower end and treat additional time as contingency or polish.

| Period | Focus | Approximate core budget |
| --- | --- | --- |
| October 12–18 | Workspace inspection, Quest 3 interaction/export spike, schemas | 10 h |
| October 19–25 | Three conceptual variants, deterministic rules, sample inputs and costs | 10 h |
| October 26–November 1 | Shared end-to-end flow, spatial comparison and consequence change | 10 h |
| November 2–8 | Both entrances, artifact retrieval, resume and device fixes | 10 h |
| November 9–15 | Usability checks, reliability fixes and demonstration materials | 10 h |
| November 16–18 | Final checks and submission buffer | About 5 h, subject to availability |

This is an estimate, not a delivery guarantee. It has limited room for unrestricted specification ingestion, extensive user research, optional AI or sophisticated animations. Keep a complete preloaded sample per entrance as the essential delivery; reuse the same question and comparison engine for user-entered projects within the supported workload.

If feasibility spikes exceed the initial budget, cut optional AI, extra scenarios and visual effects first. Keep both entrances, honest uncertainty, hands-only operation, consistent exports and real-device verification.

## Remaining user decisions

- Whether live AI assistance is required in the submitted first release. Recommended default: optional until the deterministic flow is complete.
- If required: approved inference provider, maximum spending and whether only synthetic specifications may be sent.

Hardware, weekly capacity, generic provider scope and membership no longer require repeated clarification. Publication and submission will require review of concrete artifacts later.
