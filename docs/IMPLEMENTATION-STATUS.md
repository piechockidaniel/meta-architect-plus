# Implementation status

Updated: 2026-10-11
Status: review of the planning package against the code in `devpost-hackathon/`. "Implemented" means the behaviour exists in code and is covered by automated checks run without a headset; it does not claim device validation.

## Summary

The first implementation now covers the shared vertical slice for both entry paths: intake with classification and contradictions, deterministic evaluation of the three conceptual variants, aligned spatial comparison with consequence highlighting, the scenario-change workflow (preview, apply as a new version, highlighted changes, keep or undo), authored failure boundaries, launch-to-growth paths, decision review with a separate user selection, and consistent Markdown/SVG/JSON export with a hands-only retrieval path. The GUI follows the official IWSDK UI guidance: Horizon kit components, world-space panels, stable element ids, one point-and-select action, persistent accessible controls.

Milestones M1 and M2 are complete against their exit criteria as far as automated evidence can establish. M3 is implemented but its exit criteria (seated hands-only completion on the Meta Quest 3, readability, export retrieval, timing) require the device session that has not yet happened. M4 and M5 have not started.

## Plan to implementation matrix

| Plan item (source) | Status | Where |
| --- | --- | --- |
| Two entry paths converging on one engine (Foundation) | Implemented | `intake.ts` path-specific questions A1-A6/B3-B6; `decision.ts` shared evaluation |
| Inputs distinguish hard constraints, assumptions, unknowns (Foundation, Journeys) | Implemented | `inputDefinitions` classification; product facts labelled; unknown never treated as permission |
| Contradictions first, with correction of either input (Journeys) | Implemented | `conflicts()`, requirements banner with two "Revisit" buttons, `prioritizedQuestions()` |
| Viable / conditional / excluded / unsupported states (Contract) | Implemented | `stateOf()`; badges with text markers and colour |
| Mandatory constraint cannot be overridden by preference (Contract, M1) | Implemented, tested | `tests/decision.test.ts` |
| Abstention when no unique unconditional option (Contract) | Implemented | `recommendation === null` with reasons; review stage explains |
| Cost contract: quantities, units, formulas, completeness, exclusions, currency, estimate date (Contract) | Implemented | `CostEstimate` line items; cost view; Markdown table |
| Operating model contract: owners per task (Contract) | Implemented | `responsibilities` per variant; operations view; Markdown table |
| Evidence records and catalogue/rule versions (Contract, Architecture) | Implemented (illustrative only) | `catalogue.ts` evidence; versions on every snapshot and export |
| Versioned snapshots, undo, restore validation (Architecture) | Implemented, tested | `session.ts` |
| Scenario change: select input, show existing vs proposed and classification, apply, explain reevaluation, highlight changes, inspect/undo/keep (Immersive) | Implemented | `session.preview()`, `changes.ts`, decision panel change blocks, `*` markers |
| Select component: purpose, dependencies, owner, evidence (Immersive) | Implemented | Detail panel component view |
| Select requirement: highlight affected components and findings (Immersive) | Implemented | `>` markers across all diagrams; detail requirement view |
| Compare alternatives: aligned components; additions, removals, substitutions labelled (Immersive) | Implemented | Fixed slots incl. hybrid-only connectivity; per-panel difference line |
| Inspect failure boundary (Immersive) | Implemented | Authored scenarios per variant; affected components marked |
| View launch/growth with triggers (Immersive) | Implemented | Growth view; usage scenario input |
| Review decision: recommendation, selection, assumptions, open issues (Immersive) | Implemented | Review stage; `reversalConditions`, `openIssues` |
| Large start target, first-five-minutes sequence (Immersive) | Implemented | Start stage; stepper; stage buttons |
| Persistent controls: home, undo, pause, recenter, text size; help (Immersive) | Implemented | Controls panel; `WorkspaceSystem.recenter()` and text scale |
| Text and symbols alongside colour; reset-to-overview (Immersive) | Implemented | Markers `? ! X * >`; "Reset to overview" |
| Unknown input, no viable option, unsupported capability, request failure messages (Immersive) | Implemented | Finding reasons, status line, export failure state |
| Lost hand tracking guidance; tracking recovery does not confirm (Immersive) | Implemented (needs device check) | `WorkspaceSystem.update()` polls `session.inputSources`; alert text; no auto-confirm |
| Interrupted XR session: restore latest confirmed state, clear resume action (Immersive) | Implemented | In-memory state kept; autosave to browser storage; Resume on start screen; system blur pauses |
| Export in-scene with completion/failure state and fallback retrieval (Immersive, Architecture) | Implemented (needs device check) | Export inbox middleware + retrieval page; browser download fallback |
| Exports escape user text; imports validated (Architecture) | Implemented, tested | `exports.ts`, `restoreInputs`, `validateBundle` |
| Local persistence, JSON backup/import, deletion (Architecture) | Implemented | Autosave; project editor import/delete |
| Optional AI gateway with validated structured output (AI decision) | Implemented earlier; updated for `identity` | `server/ai-service.ts` |
| UI per official IWSDK guidance: Horizon kit, Lucide icons, stable ids, world-space panels, RayInteractable nodes (iwsdk-ui skill) | Implemented | `public/ui/*.uikitml`, scene JSON |
| Template library with walk-throughs (user request, 2026-10-11) | Implemented, tested | `templates.ts`; Product stage browser; detail panel walk-through |
| 3D interactive workflow diagrams on every stage after start (user request) | Implemented (needs device check) | `diagram-model.ts`, `diagram.ts`; islands under `diagram-root`; hover/select via `DiagramBlock` queries |
| Workload block library with drag and drop plus button equivalents (user request, reshaped per interaction contract) | Implemented (needs device check) | `workload.ts`; shelf under `library-shelf` with `DistanceGrabbable`; snap-to-island drop; Product stage buttons |
| Meaningful 3D symbols instead of cubes (user request) | Implemented; rendered with three.js, device check pending | `diagram-shapes.ts`; `artifacts/diagram-symbols.jpg`, `artifacts/diagram-islands.jpg` |
| Optional guided walk-through before real work (user request) | Implemented, tested | `tour.ts`; start screen and controls panel buttons; sandboxed sample restored on exit |
| Guided tour never loses the real project on interruption (user-reported bug) | Fixed, tested | `presenter.ts` `persist()`/`startTour()`/`exitTour()`; `tests/tour.test.ts` "never overwrites...interrupted" |
| AI vendor/key setup wizard (user request, reshaped to an operator-run terminal tool for the reason in `AI-INTEGRATION-DECISION.md`) | Implemented, tested | `scripts/ai-setup.ts`, `server/ai-config.ts`; `tests/ai-config.test.ts` |
| PII and data handling definition (user request) | Implemented | `DATA-AND-PRIVACY.md`; in-app help text; delete local copy and delete server export controls; `DELETE /api/exports/<code>` |

## Validation scenarios (Recommendation contract)

| Scenario | Evidence |
| --- | --- |
| Mandatory identity integration unknown | `decision.test.ts`: cloud conditional, no recommendation |
| Preferred provider violates hard constraint | Not applicable: no provider preferences in the generic catalogue; deployment mandate test covers precedence |
| Workload exceeds validated coverage (high availability) | `decision.test.ts`: unsupported, never relaxed |
| All variants fail | `decision.test.ts`: explanation, no recommendation |
| Price input missing | `decision.test.ts`: unpriced, open issue |
| Usage range crosses hard budget | `decision.test.ts`: growth scenario excluded |
| Existing platform capacity unknown | Conditional via capacity rule (`intake.test.ts` priority) |
| User revises an accepted assumption | `session.test.ts`, `changes.test.ts` |
| AI explanation conflicts with rules | `ai.test.ts` |
| Diagram and Markdown agree | `exports.test.ts` |
| Fixed region conflict | Out of scope for the generic catalogue (no regions modelled) |

## Not yet done

1. Real-device verification on Meta Quest 3: readability of the authored scales and distances, seated reach, hand-only completion of both samples, export retrieval from the headset browser, frame timing. The layout values are deliberately easy to tune in the scene JSON.
2. Formative usability evaluation and the flat-versus-spatial comparison (M4).
3. Demonstration assets, submission materials and a frozen release candidate (M5).
4. Live AI access checks (subscription eligibility, hosted inference) remain as described in the AI integration decision.
5. Budget as a guided in-headset question: the hard budget and rates are entered in the browser form; the headset shows them and evaluates affordability. A headset-side numeric entry was deferred as a hands-only typing burden.
6. Rendering caveat: the headless preview renderer shows occasional one-pixel stray lines on Horizon buttons caused by a uikit instancing quirk; confirm whether the headset renderer shows it.
7. 3D diagrams and shelf could not be exercised outside the IWSDK runtime: verify label legibility at the island distance, hover/select on blocks, pinch-grab of shelf blocks (`grabbing.useHandPinchForGrab`), the snap-to-island drop radius (0.45 m) and that `world.assets.instantiate('node-label')` resolves as documented.
8. Privacy notice URL and the decision whether the public host keeps the export inbox (see DATA-AND-PRIVACY.md).

## Evidence ledger

- `npm test`: domain, intake, changes, session, exports, templates, diagram model, tour (incl. interrupted-tour recovery), AI config wizard, presenter, export inbox, AI validation; 64 tests (run 2026-10-11).
- `npm run ui:validate`: all four panels parse with the Horizon kit.
- Harness renders of the real panels driven by the real presenter (light and dark schemes) reviewed for overlap, clipping and contrast; stored under `devpost-hackathon/artifacts/`.
