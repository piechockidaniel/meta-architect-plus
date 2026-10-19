# Meta Architect + — final delivery plan

Finalized 17 October 2026, version 1.0. Working project label: Meta Architect +. Current application title and package remain Architecture Decision Workspace until D05 is resolved; this document does not silently rename public assets.

Execution started with owner approval. Confirmed: competition first; existing core scope; New Experience provenance; Quest 3 as initial physical target; AI disabled; supported dictation retained with processing disclosure. Owner confirms DNS control of connect-the-dots.biz and selected Cloudflare Pages configuration preparation for architecture.connect-the-dots.biz. Local configuration exists; no deployment, DNS change, purchase or account verification is claimed. See [requirements matrix](compliance/requirements-matrix.md) and [hosting preparation](CLOUDFLARE-HOSTING.md).

## Execution summary

This is the authoritative delivery plan; older roadmap baseline sections are historical. A finalized plan may contain explicit pending owner choices and unexecuted release gates. Plan completion does not mean application or submission completion.

| Workstream | Current evidence | Next deliverable |
|---|---|---|
| Requirements | Matrix covers all 84 VRC IDs in supplied PDF plus competition obligations | Resolve conditional policy rows against actual release scope |
| Local engineering | 93 unit tests, four panel validations, coverage, build and three browser runtime tests passed in recorded 17 October session | Clean installation/CI proof and production URL validation |
| Hosting | Pages configuration prepared; hostname and free static approach selected | Approved candidate, account access, project creation, CNAME/TLS and live verification |
| Physical usability | Quest 3 available per owner; no physical results recorded | Execute Q3-01–12 in device ledger on hosted experience |
| Store packaging | Missing manifest/icons, signing identity, generated package and asset links | Early signed immersive prototype after identity/origin decisions |
| Privacy/rights | Data-flow and initial license inventories drafted; dictation disclosure/deletion warnings implemented | Owner-reviewed policy, complete notices, account declarations |
| Competition materials | Description draft exists | Video, launch-date statement, eligibility record, accepted submission |

Local results above are the recorded session evidence in [device-results.md](compliance/device-results.md), not newly rerun checks at document finalization. No physical headset, live hosting, CI or Store acceptance is inferred from them.

## Outcome and scope

Deliver two independently verifiable outcomes:

1. A complete competition entry: hosted WebXR experience, hands-first journey, reliable seated use, public demonstration video, required description, eligibility evidence, and preserved submission materials.
2. A Store release candidate: packaged immersive WebXR application, applicable VRC evidence, privacy documentation, listing assets, complete dashboard configuration, and an approved submission.

Competition readiness does not establish Store readiness. Local builds and emulation do not establish physical-headset compliance. Engineering implementation has been authorized and started. External publication, account attestations, signing-key selection and submission remain explicit gates; local preparation does not authorize spending.

The supplied competition rules set the deadline at 18 November 2026, 12:00 PM Pacific time (21:00 Europe/Warsaw), with winner announcement around 11 December. Recheck the official event page before submission. Keep the entry freely accessible through the actual announcement and preserve its deadline state.

## Status labels and responsibilities

- **[DECISION Dxx]**: your choice is needed before dependent work can be finalized. Recommendations below are proposals, not accepted decisions.
- **[OWNER ACTION Oxx]**: requires your account, records, legal identity, device access, or explicit external-action authorization; it is not necessarily a product decision.
- **[ENGINEERING]**: routine implementation, investigation, documentation, and local verification that can proceed after implementation is authorized.
- **[DEVICE TEST]**: requires physical-headset evidence; a human tester may need to perform gestures and evaluate comfort.
- **[RELEASE GATE]**: work must pass before the relevant submission.

## Historical audit and current baseline

Audit run on 17 October: TypeScript passed; 91 unit tests passed; production build passed. The combined check failed during UIKitML validation: the CLI rejected its arguments for all four panels. Treat this as incomplete validation, not four proven panel defects. Coverage was not reached by that combined command. Production build warned about a roughly 6.63 MB minified main chunk; this is a startup investigation target, not proof of a VRC failure.

Subsequent engineering closed the Windows CLI path and coverage comparison failures. Current recorded result: 93 unit tests, all four panels, typecheck, coverage gate, fresh production build and 3/3 pointer-driven runtime tests pass. Deployment workflow now runs the full `npm run check`; remote execution and clean dependency installation remain unverified.

Code includes deterministic decisions, two entrances, immersive keyboard, optional dictation, autosave/resume, exports, recenter, text scaling, sound controls, and 3D comparison islands. Existing documentation reports pointer-driven runtime tests and hands-only emulator journeys; these were not rerun during the audit. Physical-device checklist items remain open.

No PWA manifest, signed Android release artifact, Digital Asset Links configuration, published privacy policy, or final Store listing package was found in the inspected project. Hosting workflow exists; live deployment and dashboard state were not verified. Absence in this checkout does not prove absence in an external account.

## Your decision register

Confirmed choices are recorded here so they are not asked again. Pending choices are required only at their stated gate.

| ID | Status | Confirmed choice or remaining owner decision |
|---|---|---|
| D01 | CONFIRMED | Competition first; early packaging investigation alongside competition work |
| D02 | OWNER CONFIRMED | New Experience; preserve provenance and other eligibility records before submission |
| D03 | CONFIRMED, CLAIMS PENDING | Quest 3 physical target; supported inputs and any other device claims follow actual tests |
| D04 | CONFIRMED | Existing core scope; no accounts, multiplayer or new AI service in first release |
| D05 | DECISION REQUIRED | Final public name/branding. Meta Architect + is a working label; review sponsor/brand rules before public use. Choose Android package identifier before signing |
| D06 | PREPARATION APPROVED | Cloudflare Pages and architecture.connect-the-dots.biz; actual account access, candidate review and DNS/deployment pending |
| D07 | CONFIRMED | AI disabled; retain supported dictation with disclosure and keyboard fallback |
| D08 | DECISION REQUIRED | Approve local save/delete promise: open project survives deletion, later edits save again, downloaded files separate; no remote telemetry added |
| D09 | DECISION REQUIRED | Publisher identity, public contact, project license, ownership confirmation and complete third-party notices |
| D10 | DECISION REQUIRED | Store pricing and intended audience; competition access remains free |
| D11 | DECISION REQUIRED | Narration/captions, footage/audio rights, video approval and target launch date for competition text |
| D12 | RELEASE GATE | Review exact candidate, DNS/deployment, public video, competition submission, signing key/package and Store submission at respective gates |

### Decision detail and dependencies

| ID | Decision needed | Recommended starting choice | Blocks | Needed by |
|---|---|---|---|---|
| D01 | Delivery order: competition first or Store first? | Competition first; Store work proceeds alongside it only when it does not threaten the entry | Scheduling and release priorities | Before implementation scheduling |
| D02 | Competition division: New Experience or Adapted? | New Experience only with evidence that conception and project code began within the window; otherwise assess Adapted and document significant changes | Division claim and entry description | Before submission drafting is finalized |
| D03 | Supported headset models and input claims | Name a narrow initial set you can physically test; use Quest 3 as the first test device if available, then test every other declared model | Test matrix, performance targets, listing claims | Before device validation |
| D04 | Release scope | Keep both entrances, deterministic comparison, existing islands, rationale and exports; defer multiplayer, accounts, new AI workflow and large spatial features | Feature freeze and acceptance journeys | Before implementation |
| D05 | Public product name and visual identity | Retain Architecture Decision Workspace unless you want a rename; create original Store branding | Icons, cover art, website, package identity | Before final assets and packaging |
| D06 | Public hosting origin and ownership | Use a stable HTTPS origin you control; verify ability to serve /.well-known/assetlinks.json at the origin root before choosing Store hosting | Hosted release, Digital Asset Links, privacy URLs | Before packaging prototype |
| D07 | AI and dictation in the public release | Keep AI disabled for the first release. Keep dictation only if its processing behavior is understood, disclosed, and verified; the keyboard must remain sufficient | Privacy, backend scope, testing and claims | Before privacy text and freeze |
| D08 | Data persistence and deletion promise | Local storage only; explain retained drafts/exports and exactly what Delete removes. No telemetry for the initial release unless deliberately selected | Privacy wording and deletion acceptance | Before privacy publication |
| D09 | Publisher identity, contact, code license and third-party notices | Publish under your actual authorized identity; choose a code license deliberately and preserve all third-party obligations | Public notices, support, rights evidence and Store metadata | Before public release materials |
| D10 | Store commercial model and audience | Free initial release; choose intended audience and complete the applicable rating questionnaire truthfully | Dashboard configuration, rating and billing scope | Before Store submission |
| D11 | Demo presentation and rights | English narration/captions, actual headset or allowed emulator footage, original/cleared audio | Final competition video and Store trailer | Before recording/editing |
| D12 | Release acceptance and external submission | Review the frozen candidate and final materials before approving publication/submission | Competition submission and Store upload/review submission | At each final release gate |

D09 includes separate legal choices: a public source-code license is not automatically required to distribute the app, but permission to use and redistribute dependencies/assets and their required notices is necessary. Do not label the app MIT solely because a starter file contains an MIT header.

## Owner actions, separate from decisions

| ID | Required owner action | Evidence/result |
|---|---|---|
| O01 | Confirm age, residence, eligible representative, Start membership, developer access, one-entry limit, excluded relationships, and applicable funding restrictions | Private eligibility checklist with confirmation dates; no sensitive records in Git |
| O02 | Provide project provenance and funding/asset rights records | Division rationale and dependency/asset rights inventory; first commit alone does not prove conception date |
| O03 | Make declared physical devices and a tester available | Model/OS/browser matrix and completed test sessions |
| O04 | Supply or approve hosting/dashboard access and publisher contact | Verified origin, app ownership and public contact; keep credentials local |
| O05 | Complete dashboard declarations, rating and data-protection steps requiring account-holder attestations | Actual dashboard results, not a locally checked box |
| O06 | Authorize publication, any public GitHub creation/push, video upload, competition submission and Store submission when final materials are reviewable | Explicit authorization for the particular external action; preparing this plan does not grant it |

## Phase 0 — Reconcile requirements and freeze the target

**Dependencies:** D01–D04; O01–O03 can proceed in parallel.

1. [ENGINEERING] Build a requirement matrix with one row per current VRC and competition clause. Record required/recommended/conditional, applicability, implementation, test, evidence path and unresolved item. Use Pass, Fail, Unverified or Not applicable with a reason.
2. [ENGINEERING] Update the old roadmap: replace the obsolete create-pwa packaging assumption with the current Meta Quest Bubblewrap route; assess immersive mode rather than automatically applying both Store columns. Retain historical progress as history.
3. [ENGINEERING] Keep competition-specific obligations distinct: hands-first is mandatory; seated optimization and short-session design are guidelines; hardware performance also affects judging.
4. [ENGINEERING] Define two acceptance journeys, one per entrance: create project, enter requirements, compare, inspect findings/islands, change an assumption, record rationale, export, resume saved work, and delete saved data.
5. [ENGINEERING] Identify conditional areas: passthrough, advertising, network streaming, shared/public user content, purchases, and localization. Do not add unrelated features merely to satisfy inapplicable rows.

**Exit:** agreed scope, division pending/confirmed with evidence, device targets, and a traceable matrix. No unsupported compliance claims.

## Phase 1 — Restore trustworthy local and CI checks

**Dependencies:** no product decision required for initial investigation.

1. [ENGINEERING] Inspect the installed/pinned UIKitML CLI help, reproduce its argument parsing on Windows, and correct the validator invocation. Distinguish shell path quoting from actual syntax incompatibility. Pin the intended tool version.
2. [ENGINEERING] Validate all four panels and correct actual schema/component errors if found.
3. [ENGINEERING] Run typecheck, panel validation, coverage gate, production build and the existing runtime E2E suite. Review failures before adding tests; add focused regression coverage only for meaningful fixes.
4. [ENGINEERING] Reproduce installation/build in CI using the lockfile. CI and Pages workflow definitions now include the essential gates; verify actual execution and dependency availability without overwriting the existing local runtime installation.
5. [ENGINEERING] Exercise a hosted subpath and production asset URLs. Confirm development/debug facilities and optional API behavior are appropriate in the production build.

**Exit:** all required checks green, coverage gate actually executed, runtime journey passes, and logs identify the exact source snapshot. Passing this phase is local/runtime evidence only.

## Phase 2 — Prove the hosting and packaged-app route early

**Dependencies:** D03, D05, D06; O04 for external account work.

1. [ENGINEERING] Prepare a staging production build. Verify HTTPS, MIME types, asset paths, browser startup, no dependency on a development server, and coherent AI-unavailable behavior.
2. [ENGINEERING] Confirm the final origin can host /.well-known/assetlinks.json. A project subpath alone does not establish control over the origin root.
3. [ENGINEERING] Add the Web App Manifest and correctly sized original icons. Plan service-worker caching/offline behavior against the current PWA preparation guidance; do not treat every offline feature as a universal VRC mandate.
4. [ENGINEERING] Generate the Android project with the current Meta Quest Bubblewrap CLI. Select immersive app mode and verify the documented immersive launch requirements. Choose the final package identifier only after D05/D06.
5. [ENGINEERING] Configure signing securely and generate Digital Asset Links for the actual release certificate. Keep keystore/passwords out of source control and chat; arrange a secure backup.
6. [DEVICE TEST] Test install, launch from the app library, immersive entry, origin verification, exit, relaunch and the two acceptance journeys. Inspect package manifest, permissions, signing, architecture, SDK support and size against applicable Packaging VRCs.
7. [ENGINEERING] Define cache-update behavior so a future web deployment cannot silently change the frozen competition candidate or mismatch the Store package.

**Exit:** hosted candidate works and a signed staging package launches correctly on a declared device. If packaging fails, retain the hosted competition path and resolve the specific blocker; do not substitute an unverified wrapper architecture.

## Phase 3 — Finish the hands-first product journey

**Dependencies:** D04, D07; physical sessions require O03.

1. [DEVICE TEST] Start with controllers absent/unpaired and complete both journeys using hands. Include immersive keyboard, every required field, review, export retrieval, exit and resume. Repeat with each hand separately where practical.
2. [ENGINEERING] Fix measured hand-ray/pinch failures, lost actions, clipping, ambiguous states, keyboard targeting and dead ends. Confirm the widened click window does not introduce accidental activation.
3. [DEVICE TEST] Verify the seated two-foot-radius guideline through stationary interaction: ray distance to an island is not physical reach distance. Check the actual movement demanded, neck rotation and comfortable field of view.
4. [DEVICE TEST] Check text scaling, recentering at different seated heights, inspector overlap, diagram panels, keyboard occlusion, and node label legibility on every declared model.
5. [DEVICE TEST] Confirm Markdown/SVG/bundle export retrieval on the headset and packaged app. If exiting immersion is necessary, explain the step in the app and verify it remains hands-operable.
6. [ENGINEERING] Complete D08 review and hardware storage acceptance. Implemented: deletion attempts every app key, warns on failure and explains re-saving after edits and separate downloads; two regression tests pass. Open project remains in memory. Browser/device behavior and privacy-policy wording still need acceptance.
7. [DEVICE TEST] Time a new-user complete moment within ten minutes and collect feedback on effort, clarity and fatigue. Use several independent testers if available; tester count is an internal quality target, not an invented competition requirement.

**Exit:** recorded hands-only completion, no required controller/desktop dependency, legible seated UI, retrievable output and understood save/delete behavior.

## Phase 4 — Close runtime and performance VRC evidence

**Dependencies:** declared model matrix and hosted candidate for competition/browser tests. Only packaged launch, install/update and multi-user Store tests require a packaged candidate; do not block competition hardware validation on packaging.

1. [DEVICE TEST] Measure launch to head-tracked graphics; verify the four-second requirement or a valid in-VR loading indicator. The current DOM progress bar alone is insufficient evidence.
2. [ENGINEERING] Profile main-bundle cost, UI parsing, font initialization and island creation. Optimize observed bottlenecks with lazy loading/caching or reduced scene complexity, preserving acceptance journeys.
3. [DEVICE TEST] Capture frame timing during typing, all-islands comparison, what-if updates, diagrams and exports. Use the current VRC refresh-rate requirements for each target; the competition's minimum 60 fps judging language is not a substitute for Store targets.
4. [DEVICE TEST] Test headset removal, system menu/overlay, focus loss, interruption and return. Confirm correct pause behavior, rendering, hidden hands/controllers and ignored input while unfocused. Verify SDK handling rather than assuming it.
5. [DEVICE TEST] Switch hands/controllers; invoke reserved system gestures; lose/recover tracking; recenter; reload/resume. Check multi-user behavior on the packaged app where applicable.
6. [DEVICE TEST] Test storage denied/full, malformed saved data, connectivity loss, refresh and restart. Confirm warnings and graceful recovery; distinguish first-load/offline-cache limits from the offline decision engine.
7. [ENGINEERING] Store results with build identifier, device model, OS/browser versions, steps, expected/actual behavior, logs/capture paths and retest status. Use anonymized records without tokens or personal data.

**Exit:** no unresolved mandatory failure on any declared device; evidence references cover each applicable runtime VRC. Untested rows remain Unverified.

## Phase 5 — Privacy, content, rights and publishing materials

**Dependencies:** D05, D07–D10; O02, O04, O05.

1. [ENGINEERING] Inventory actual data flows: local projects/drafts/exports; hosting logs; optional speech recognition; optional AI; diagnostics. Browser speech recognition may involve an external processor; investigate rather than claiming all processing stays on-device.
2. [ENGINEERING] Draft and publish a team-managed privacy policy describing collection, use, storage, third parties and deletion. Ensure launch-screen/README privacy claims match enabled features. Owner reviews identity/contact and factual processing statements.
3. [ENGINEERING] Prepare a valid app website and support page/contact. Add Terms of Service only if selected/appropriate; a support or TOS link, when supplied, must resolve to the correct page.
4. [ENGINEERING] Inventory dependency, font, icon and artwork licenses. Preserve required attribution and prepare third-party notices. Obtain owner confirmation for owned materials and any rights not evidenced locally.
5. [ENGINEERING] Prepare accurate title, short/long description, keywords, supported inputs/modes and device claims. Complete conditional content-policy review; determine applicability of user-content requirements from actual sharing functionality rather than assuming private text entry is social UGC.
6. [ENGINEERING] Create compliant transparent logo and cover art; capture representative app screenshots; check current dimensions/safe areas in the dashboard. Keep emulator captures accurately labeled and avoid unsupported feature/device claims.
7. [ENGINEERING] Create separate video exports: competition video under three minutes; Store trailer no longer than two minutes. Use permitted actual application footage and cleared audio.
8. [OWNER ACTION O05] Complete rating, audience, data-protection and publisher declarations in the actual dashboard.

**Exit:** privacy/content/publishing matrix complete, working URLs, rights evidence, reviewed assets and account declarations. A local checklist does not stand in for dashboard completion.

## Phase 6 — Competition submission and freeze

**Dependencies:** phases 0, 1, 3; relevant performance evidence from phase 4; competition materials from phase 5. Store packaging need not block this WebXR entry.

1. [ENGINEERING] Verify the publicly accessible headset URL, no payment/login barrier, required assets, final description, track/division, public YouTube/Vimeo video and testing instructions.
2. [OWNER ACTION O01/O02] Resolve all eligibility/provenance confirmations; do not submit a New Experience claim based only on a recent Git history date.
3. [DECISION D12] Review the actual URL, recorded candidate and exact submission fields; obtain authorization before changing Devpost state or uploading public materials.
4. [OWNER ACTION O06] Submit early enough to correct access/processing failures. Confirm actual accepted submission state; a screenshot of a draft is insufficient.
5. [ENGINEERING] Preserve source snapshot, built static artifacts, checksums, final text, video master/public link, submission confirmation and a private eligibility record. Use a tag if a repository is available and authorized; otherwise preserve an equivalent immutable source archive.
6. [ENGINEERING] Freeze the submitted candidate at the deadline. Automatic deployment from main must not alter that entry after the entry period. Use separate release locations or another verified immutable hosting strategy for subsequent Store work.
7. [ENGINEERING] Maintain free judge access through the actual winner announcement. If an issue arises after freeze, review the rules/contact route before altering the entry.

**Exit:** accepted complete submission, preserved deadline version, tested public access and known ownership of continued availability.

## Phase 7 — Store submission and review response

**Dependencies:** phases 0–5; D12; O04–O06.

1. [ENGINEERING] Recheck current publishing requirements and finalize the applicable immersive-app matrix. Do not promote recommended VRCs to mandatory without a separate policy basis; entitlement checks are marked recommended in the reviewed overview.
2. [ENGINEERING] Produce the signed release package from the approved snapshot. Verify production origin/certificate links, version identifiers, permissions, launch mode and the exact hosted web version it loads.
3. [DEVICE TEST] Run a final install/update and critical-journey smoke test on every supported model. Confirm the package and metadata describe the same experience.
4. [DECISION D12 / OWNER ACTION O06] Review exact package, listing, privacy/data declarations, pricing and audience; authorize upload and review submission.
5. [ENGINEERING] Record actual dashboard validation/review results. Resolve concrete findings, repeat affected checks and preserve release evidence. Do not label uploaded, submitted, approved and publicly available as the same state.
6. [DECISION D12] Approve public availability when review succeeds and all declared launch dependencies work.

**Exit:** Store approval recorded; public availability separately verified if publication is authorized. Review duration is external and cannot be guaranteed by this schedule.

## Budget and effort envelope

Selected hosting preparation: **Cloudflare Pages Free, expected incremental USD 0/month** for static assets, no Functions/database/AI backend. Use architecture.connect-the-dots.biz under the existing domain; no additional domain purchase is planned. See [cost assumptions and current provider sources](CLOUDFLARE-HOSTING.md). Existing domain renewal, Codex plan/usage, internet and electricity are separate. No paid service, asset purchase, contractor or paid tier has been approved.

Quest 3 is already available. No additional headset is budgeted; do not claim untested hardware support to avoid buying another device. Dictation uses browser support, not a newly purchased speech API. Any charge-bearing requirement discovered during setup is presented with an exact amount/terms before commitment. Store fees remain an explicit account-stage cost verification task; absence of a known fee is not a guarantee of no fee.

The following are provisional human engineering/QA effort ranges, not a price quote or a promise of AI completion time. They exclude completed local fixes, account waiting, Meta review queues and optional feature work. Device findings may change the estimate; re-estimate after the first Quest 3 session.

| Remaining work | Planning effort | Main uncertainty |
|---|---:|---|
| Clean dependency/CI proof and staging hosting | 4–8 h | Registry/toolchain access; DNS/TLS setup |
| Manifest, original icons, immersive launch, signing and prototype | 8–16 h | Public identity/signing choice and packaged WebXR behavior |
| Quest 3 journeys, ergonomics and observed bug fixes | 12–24 h | Real targeting, keyboard/exports and comfort |
| Performance/lifecycle investigation and retest | 8–20 h | Startup bundle and hardware frame timings |
| Policy, notices, metadata and owner review preparation | 8–16 h | Publisher details, speech processing and license inventory |
| Competition video, final text, freeze and accepted-entry verification | 6–12 h | Recording quality and owner/account readiness |
| Store candidate, listing assets and first review response allowance | 8–16 h | Actual dashboard/reviewer findings |
| **Remaining working range** | **54–112 h** | Not a contractor quotation; additional review rounds are outside the range |

## Scheduled milestones

Dates are planning targets, assuming access to physical devices and prompt resolution of required choices.

| Target window | Deliverable | Primary gates |
|---|---|---|
| 17–20 October | Scope/decision register, requirement matrix, validator and local/CI baseline | D01–D04; O01/O02 started |
| 20–24 October | Verified hosting and early packaged immersive prototype | D05/D06; O03/O04 |
| 24–31 October | Hands-only journeys, export completion, seated usability fixes | D07/D08; physical sessions |
| 1–7 November | Performance/lifecycle evidence and privacy/rights/listing drafts | D09/D10; declared model coverage |
| 8–12 November | Feature freeze, final regression, video and description | D11; no unresolved competition blockers |
| 13–16 November | Review and submit competition entry; verify acceptance/access | D12; O06 |
| 17–18 November | Submission buffer and deadline freeze | No unreviewed feature changes |
| After competition candidate freeze | Finish any remaining Store-only gates, submit and address review | Separate release path; D12; O05/O06 |

Critical path: scope and device access → trustworthy checks → real hands-only journey → measured runtime behavior → final hosted candidate/video → authorized competition submission.

Store critical path additionally includes origin control → packaging/signing/asset links → packaged-device tests → privacy/listing/account declarations → authorized review submission.

If time is short, defer optional AI, extra spatial interactions and cosmetic refinements. Do not defer mandatory hands-only operation, data integrity, required disclosure, or submission access.

## Evidence and delivery structure

Current and planned evidence artifacts:

- [requirements-matrix.md](compliance/requirements-matrix.md): exists; 84 VRC IDs plus competition obligations; acceptance evidence still incomplete.
- [device-results.md](compliance/device-results.md): exists; local baseline and unexecuted Q3-01–14 protocol.
- [data-flows.md](compliance/data-flows.md): exists; policy drafting input, not an approved public policy.
- [rights-inventory.md](compliance/rights-inventory.md): exists; initial inventory, not complete legal/redistribution clearance.
- `docs/compliance/performance/`: planned captures and bounded conclusions; not yet recorded.
- [description-draft.md](submission/competition/description-draft.md): exists; final description, test instructions, video references, freeze manifest and accepted-entry confirmation still required.
- `docs/submission/store/`: planned metadata, asset inventory, review notes and release checklist.
- A separately secured owner record for eligibility, private confirmations and signing-key recovery information; never put credentials or personal attestations in public artifacts.

For every gate, record owner, status, evidence and remaining blocker. Use one summary that reports competition-ready and Store-ready independently.

## Ordered execution backlog

Each task closes with an artifact or observed result. Work can proceed across independent rows without repeatedly asking about confirmed choices.

| Task | Deliverable / definition of done | Dependencies | Responsibility |
|---|---|---|---|
| T01 | Reconcile lockfile/current runtime in a separate clean install; run `npm run check`, `npm run build`, `npm run test:e2e`; record exact versions/results | None; registry/runtime access | Engineering |
| T02 | Resolve D05 public name and final Android package identifier; record original branding direction | Owner choice; brand/sponsor review | **OWNER DECISION** then engineering |
| T03 | Review deployable candidate and Free plan; create Pages project, verify HTTPS assets, associate custom hostname and exact CNAME/TLS result | T01, account/DNS access, D12 deployment gate | Engineering + **OWNER ACTION** |
| T04 | Execute hosted Quest 3 Q3-01–12 protocol; record OS/browser/version and evidence for both entrances | T03, connected Quest 3, tester | Engineering + **OWNER DEVICE SESSION** |
| T05 | Fix observed hand/keyboard/export/data-loss/comfort blockers and retest affected journey | T04 findings; D08 deletion promise | Engineering |
| T06 | Add manifest/icons and installed immersive launch behavior; secure chosen signing identity and actual asset links; produce signed prototype | T02/T03, explicit key selection, D12 signing gate | Engineering + **OWNER DECISION** |
| T07 | Capture startup/performance/focus/pause/gesture evidence and resolve measured failures | Hosted candidate; T06 only for packaged variants | Engineering + device tester |
| T08 | Finalize privacy, support, ownership/license notices and required account declarations | D08/D09, actual host/speech data flows, O01/O02/O05 | Engineering + **OWNER REVIEW/ACTION** |
| T09 | Record <3 minute competition footage, finish description and launch-date statement, verify track/division/eligibility | T04/T05/T07, D11, owner confirmations | Engineering + **OWNER DECISION** |
| T10 | Run competition release gate, approve/upload/submit exact entry; preserve accepted-entry state and immutable deadline artifact | T01/T03/T05/T07–09, D12 | Engineering + **OWNER RELEASE APPROVAL** |
| T11 | Finish signed Store package, website/listing/assets/privacy/audience settings; run Q3-13/14 and remaining applicable VRC tests | T06/T08, D10, account access | Engineering + **OWNER REVIEW/ACTION** |
| T12 | Approve Store submission, record actual review findings, retest changes and verify publication if authorized | T11, all mandatory Store rows evidenced, D12 | Engineering + **OWNER RELEASE APPROVAL** |

T06 and Store-only tasks must not prevent a compliant hosted WebXR competition entry. Keep early packaging as a risk-reduction task; defer remaining Store-only work if it threatens the competition window. T10 approval never automatically authorizes T12.

## Release acceptance checklists

### Competition candidate

- [ ] All required competition matrix rows satisfied, with private eligibility/funding/rights records confirmed by owner.
- [ ] Exact hosted HTTPS URL is free, reachable without judge account barriers and tested on Quest 3.
- [ ] Both hands-only journeys complete, including text input, saved state and usable exports; required input failures closed.
- [ ] Hardware performance/reliability evidence recorded; seated/short-session guidelines evaluated honestly.
- [ ] English description, approved target launch statement, selected Productivity/New Experience fields and public <3 minute video complete.
- [ ] Final candidate and actual submission fields approved under D12; accepted submission state verified before deadline.
- [ ] Source/build checksums and submission materials preserved; no subsequent automatic deployment alters deadline state; availability maintained through actual announcement.

### Store candidate

- [ ] All applicable required VRC rows have direct evidence; optional recommendations identified separately and conditional applicability justified.
- [ ] Signed immersive package and exact hosted content pass install/update/launch, origin verification and Q3-13/14.
- [ ] Declared devices, inputs and audience match verified behavior; permissions, SDK, signature, architecture and sizes checked on actual package.
- [ ] Privacy URL, accurate collection/use/deletion policy, owner/team checks, notices and rights complete.
- [ ] Listing name/descriptions/keywords/URLs, icons/covers/screenshots and optional <=2 minute trailer reviewed against current requirements.
- [ ] Owner approves signing choice, commercial terms and exact Store candidate; actual account submission/review result recorded.
- [ ] Store approval and public availability verified separately; no claim of launch before the actual public page/package is accessible.

## Decisions requested at the next work boundaries

1. **Before branding/packaging:** D05 public app name and Android package identifier. Working label Meta Architect + does not imply cleared public branding.
2. **Before live staging:** D12 candidate deployment approval and O04 local Cloudflare/DNS account access. Provider and hostname do not need to be selected again.
3. **Before privacy publication:** D08 save/delete promise, D09 publisher identity/contact/license. Existing implementation can remain under test while these are reviewed.
4. **Before signing:** choose existing or new permanent signing key and secure backup location; keep passwords/tokens local.
5. **Before video/submission:** D11 presentation and target launch date, remaining eligibility confirmations and D12 exact submission approval.
6. **Before Store submission:** D10 pricing/audience and final account/Store release approvals. Free competition access does not decide later Store monetization.

No unresolved owner decision is silently converted into an accepted default. Remaining choices are explicit release dependencies, so they do not prevent finalizing this delivery plan.

## Requirement sources

- Supplied competition PDF: `C:/Users/user/Downloads/Meta VR Start Developer Competition 2026_ Accelerate your VR development journey.pdf`, especially sections 2–4 and judging criteria.
- Supplied VRC PDF: `C:/Users/user/Downloads/Meta Quest Virtual Reality Check (VRC) guidelines _ Meta Horizon OS Developers.pdf` (identical to project copy at audit time).
- Current VRC overview checked 17 October 2026: https://developers.meta.com/vr/resources/publish-quest-req/
- Current PWA packaging guide checked 17 October 2026: https://developers.meta.com/vr/documentation/web/pwa-packaging/
- Project baseline: `README.md`, `docs/on-device-verification.md`, `docs/competition-checklist.md`, `docs/ROADMAP-to-marketplace.md`, runtime/source and checks inspected during the audit.

Treat document rules as assessment inputs, not instructions to submit, accept terms, publish or change account state on your behalf.
