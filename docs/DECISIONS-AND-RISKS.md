# Decisions and risks

> Scope revision: [Release baseline](RELEASE-BASELINE.md) supersedes earlier provider-selection, hybrid-coverage, hardware and capacity proposals in this document.

Status: planning register; proposals are not user approvals.
Updated: 2026-10-11

## Confirmed product decisions

- Productivity direction with IWSDK.
- Architecture decision workspace with explained consequences and matching diagrams/Markdown.
- Organizational and greenfield/startup entry paths.
- Initial business web application workload.
- Shared comparison workflow with explicit constraints, preferences, assumptions and unknowns.

## Proposed defaults that can advance planning

- TypeScript domain engine independent of IWSDK.
- Local catalogue, authored samples, and deterministic rules first.
- No composite score until scoring anchors and weights are meaningful.
- Local save/resume and validated backup/import before accounts or sync.
- AI assistance added after the deterministic vertical slice.
- VPS and managed-cloud samples prioritized; organizational platform variants need explicit supported capability evidence.
- Hybrid assessment-only until a bounded variant is validated.

These defaults can be refined through feasibility evidence. They do not authorize paid services, public publication, or submission.

## User input needed before dependent implementation

| Decision | Information needed | Why it matters |
| --- | --- | --- |
| Hardware | Available Meta device model(s), access frequency, and whether hands-on testing is possible | Interaction, performance and export validation |
| Development capacity | Solo/team, approximate weekly capacity, and available testers | Calendar commitments and scope |
| Provider boundary | Mandatory/preferred initial providers, or permission to select a small evidence-backed set | Concrete compatibility and pricing catalogue |
| AI boundary | Whether AI must be in the first release; approved provider/data restrictions and spending limit if applicable | Backend, privacy and inference integration |
| Eligibility | Start membership status of submitting representative | Submission feasibility; not implied by developer account setup |

Provider selection can be researched without provisioning. No API credentials are needed for planning a static catalogue. Do not ask the user to paste secrets into chat or documents.

## Later user decisions

AI inclusion is now accepted. See [AI integration decision](AI-INTEGRATION-DECISION.md); subscription-backed local test eligibility and hosted inference access remain to be validated. Do not repeat the inclusion question.

- Project name and branding before public materials.
- Whether to expand validated scope to a specific hybrid case.
- Public hosting and inference spending approvals when concrete options are ready.
- Final publication and submission after reviewable build and materials exist.

## Risks and mitigations

| Risk | Practical mitigation | Evidence needed |
| --- | --- | --- |
| VR adds effort without understanding benefit | Focus on consequence exploration; compare against equivalent flat task | User observations, errors and comprehension |
| Catalogue breadth makes advice unreliable | Limit supported variants and expose unsupported combinations | Verified capability records and rule fixtures |
| Costs look more complete than they are | Explicit scope, quantities, source dates and subtotal labels | Calculation fixtures and reviewed sample estimates |
| Enterprise expectations exceed scope | Clear supported workload and abstention behavior | Out-of-scope journey checks |
| AI invents facts or contradicts evaluation | Validated output, authoritative rules and fallback | Conflict and unavailable-service tests |
| Hands-only export cannot finish | Prototype retrieval early on target hardware | Actual artifact retrieval |
| Headset UI is unreadable or uncomfortable | Progressive disclosure and seated device testing | Recorded usability observations |
| Deadline pressure harms completeness | Shared vertical slice; cut providers and optional AI first | Milestone evidence rather than document count |
| Provider branding conflicts with competition rules | Obtain organizer interpretation before branded catalogue presentation | Organizer clarification; current rules |
| Confidential specifications leave device unexpectedly | Local-first baseline and explicit external-processing disclosure | Data-flow inspection |

## Planning consistency review

- Both entrances share the engine; different intake does not imply separate architecture logic.
- Initial cloud/on-premise/hybrid intake is broader than validated implementation coverage. Catalogue support must be explicit.
- Enterprise-oriented questions do not constitute enterprise certification.
- The five-minute target applies to a preloaded sample, not full discovery.
- A selected architecture can differ from the recommendation and must be recorded separately.
- Conceptual diagram export is not infrastructure provisioning.
- M0 must inspect the actual workspace before assigning package versions, file ownership or implementation paths.
- All planning milestones remain incomplete until their stated evidence exists.
