# Quest 3 physical-device test scenarios

## Current candidate: focused carousel (19 October)

The default route now presents one central reading card. Start the physical
retest with Q01 and Q18 below. Earlier multi-panel cases remain available through
Menu -> Next setting (three times) -> Open advanced, or `?classic` on the URL.
Advanced Controls -> Focused carousel returns to the new view. Do not treat the
older multi-panel smoke observation as a pass for this new candidate.

### Q18 — Focused carousel smoke test

1. Open the new candidate, seated. Only one reading surface should be visible.
   Read the title and short body without leaning forward. Record any blur.
2. Menu -> Enter immersive, then Close. Read the summary pages and acknowledge.
3. For each question, inspect all visible answers and the category icon. Highlight an answer, then Confirm answer. Highlighting alone must not record it. Keep the sample values for the first trial; Unknown remains an explicit choice where supported.
4. Browse architectures with Previous/Next option. Browse Summary/Cost/Risks
   with Previous/Next section. Cost must remain Cost when changing architecture.
   Record accidental selections and whether you know your current location.
5. Open Menu and Close it. The same architecture, section and detail page return.
   Try Recenter inside immersive and check that the surface is readable seated.
6. Decide -> Select this option or Keep uncertainty. Conditional/excluded options
   must not be selectable. Export, then leave immersive via Menu and confirm
   retrieval using Q09. Browsing alone must never record an architecture selection.
7. Try the text-size setting; record whether the larger size helps or clips.
8. On an accepted selection, observe the central prism nexus: two subtle cycles
   at 0.5 Hz, then steady. Browsing must not trigger feedback. Check reduced-motion
   behaviour where the browser exposes that preference. Confirm no card/camera
   movement or distracting flash, and that the vector remains readable.

9. Optionally use Type or dictate. Done must capture only a draft. Send to AI requires consent; inspect its proposed category or clarification. Confirm answer is required to record it. Check keyboard fallback when voice is unavailable, permission refusal, cancellation and stale-result handling. Live provider and speech behaviour require physical evidence.

Record PASS/FAIL/BLOCKED with observations and evidence under Q18 in the new run.
Hand pinch/click navigation is the initial headset route. Native hand swipes and
animated zoom are not implemented; desktop wheel/trackpad is an optional route.
Instant card changes keep the viewpoint stable. Stop if motion or reading causes
discomfort. All results for this candidate begin NOT_RUN.

Prepared 2026-10-18. **Every physical result starts NOT_RUN.** Browser automation, passing domain tests and generated fixtures do not establish headset behavior.

This is the execution companion to [Validation plan](VALIDATION-PLAN.md), for the current app in `../src/`. Use the browser edition first; the installed-app case is conditional on having a separately packaged candidate.

## Prepare once, then keep the same candidate

On the development PC, from `src/`:

```powershell
npm run check
npm run build
npx --no-install @iwsdk/cli dev status
```

If no managed server is running, start it with `npx --no-install @iwsdk/cli dev up --open`. Avoid `npm run dev` for reuse: this checkout currently maps it to an explicit restart. If the default port is occupied, select an alternate deliberately before starting:

```powershell
$env:ARCHITECTURE_DEV_PORT = '8082'
npx --no-install @iwsdk/cli dev up --open
```

Then run:

```powershell
npm run device:prepare
```

It creates a new ignored `.local/device-tests/<date>-<id>/` folder with:

- `run.json`: source/public-asset hashes, complete production-file hashes and fingerprint, build timestamp, current runtime URLs and the expected states of six fixtures.
- `results.csv`: Q01–Q18, all NOT_RUN, with columns for observations, input mode, evidence and issues.
- `fixtures/`: valid, unacknowledged backup JSON for repeatable reset/import.
- `README.md`: the URL and link back to this guide.

The command reads status and prepares files. It does not start/stop a server, select a headset, modify device settings or invoke AI. It can prepare a pack offline; a missing runtime/build is recorded and must be resolved before testing. Regenerate after source changes. Record a source fingerprint for each retest rather than combining results from different candidates.

Before starting or resuming a run, use `npm run device:verify -- .local/device-tests/<run-directory>`.
It checks the current source and every build file against the manifest, then restores
the six fixtures and compares expected engine states. A changed candidate fails
verification; build/prepare a new run instead of reusing its previous evidence.
This command does not alter the physical result ledger or establish a headset pass.

### Headset setup

1. Connect Quest 3 and the PC to the same reachable Wi-Fi network. For the built candidate, copy a **productionNetworkUrls** HTTPS URL from `run.json` (ending in `/dist/index.html`); pick the adapter your headset can reach. This serves the optimized build through the existing local server. The root **Network** URL runs development source and remains available for IWER/debugging. Record which edition you test; do not mix their performance results. A virtual adapter may also be listed. `localhost` on a headset refers to the headset, not the PC.
2. Open that exact URL in Quest Browser. Accept the certificate exception only for this known local development URL. Enter XR (the immersive session) using the page or Controls button. Permit the browser's immersive/hand input request if shown.
3. For the critical path use hands, seated at a comfortable height; put controllers down and let them sleep. Observe natural tracking rather than injecting automated controller poses. Do not enable IWER on the headset: IWER is the desktop emulator, not physical evidence.
4. In `run.json` / the result ledger record Quest model, OS and Browser versions, tested URL, tester, seated/standing position and input mode. `metavr device list` can discover an attached device; with multiple devices, explicitly choose the intended serial. USB developer access is optional for the manual Wi-Fi flow.
5. Record the current catalogue/rules identifiers from an export. Put screenshots, recordings, downloaded files and any logs beside `results.csv`. Capture actual observations rather than only the expected wording.

Use a fresh test origin/profile or a backed-up test project. Browser storage is per device and origin (including host and port): importing a fixture on the PC does not seed the headset. For the hands-only cases use built-in templates; fixture import is an optional reset convenience, never a prerequisite for completing the sample.

The connection and emulator distinction above follows the official [IWSDK testing guide](https://iwsdk.dev/guides/02-testing-experience.html), checked 2026-10-18. If Wi-Fi is blocked, follow its Chrome device port-forwarding fallback; verify a device serial before running any device-specific command. Do not disable OS certificate verification or headset boundaries globally.

## Run order and recording

Start with Q01–Q04 and Q09 (about 20–30 minutes). If those pass, cover Q05–Q14 in another session; run Q15 separately so recording/setup overhead does not distort performance. Q16 is a later formative study. Q17 applies only when testing an installed package. Durations are planning allowances, not measured completion times.

Use PASS, FAIL, BLOCKED or NOT_RUN. Use N/A only for the unbuilt installed-package route, with a reason. Every PASS needs an observation and evidence reference. Mark a case BLOCKED if its measurement/evidence cannot be collected. If discomfort occurs, stop that case and record it; do not force completion to satisfy a timing target.

## Q01 — Launch and native session

**Steps:** Open the prepared network URL. Read the start screen. Enter immersive, leave it through Controls, then re-enter. Keep the initial seated position for the first check.

**Pass:** No blank/frozen scene or fatal console error. The app shows the expected workspace and an actual native session, without the desktop emulator toolbar. Both enter and exit actions work. Save the URL, device/browser versions and a start-view capture. A desktop screenshot does not satisfy this case.

## Q02 — Readability, text size and seated comfort

**Steps:** At the default view read the main panel, all three option headings, Controls and a selected component's detail. Cycle text size 100% → 120% → 140% → 100%. Look aside and use Recenter. Repeat a dense Comparison and the tour card at the larger size.

**Pass:** Required controls and text can be found and read without standing or reaching. No overlapping panel blocks a critical action; larger text is not cut off. Recenter follows the current viewer position/gaze without changing inputs. Record the least readable item, comfortable scale, occlusion and discomfort; save representative default and enlarged views. Comfortable hands-on use, rather than desktop framing, decides this result.

## Q03 — Hands-only startup path

**Setup:** Start the sample journey; choose Starting from scratch. Alternatively open the built-in Customer-facing launch template. Keep budget/rates empty for this case.

**Steps:** Read and confirm the summary. Navigate the displayed questions using hands; keep the supplied launch assumptions and accountable owner. Open Compare, inspect each pattern and its cost/operations/recovery/growth views. In Review select Cloud, then export (retrieval is checked in Q09).

**Pass:** Complete without a controller, typing, the tour's Do it for me, or facilitator actions. Cloud is viable; On-premise and Hybrid are excluded by unavailable site capacity. Selection is distinct from recommendation. Costs remain unpriced, not zero. Record completion time, accidental selections and assistance.

## Q04 — Hands-only organization path

**Setup:** On Product open the Internal records application template (template 1 of 7). Read the constraint and assumption labels, then confirm.

**Steps:** Navigate its questions and compare all three patterns. Select the failed Cloud database block and read the linked residency rule and owner in Detail. Review, select On-premise and export.

**Pass:** Hands-only completion. Cloud is excluded by on-site data location; On-premise is viable; Hybrid remains conditional (including unconfirmed identity federation/link evidence). A conditional option cannot be recorded as viable. Record the finding text and actual selected option. Compare to `run.json`, not an assumed market/vendor capability.

## Q05 — Preview, cancel, apply and undo

**Setup:** Internal records template in Compare.

**Steps:** Change Data location to Open. Read the preview, cancel it and verify no committed input changed. Propose it again and apply; inspect the version and changed-component marks. Undo and review the restored inputs.

**Pass:** Nothing commits before Apply. Cloud changes from excluded to conditional, because organizational identity federation is still unverified; it does not become automatically viable. Apply creates a new version; Undo restores the former inputs under another unique version and clears the selection if required. Capture before/preview/after/undo evidence.

## Q06 — Unknowns, contradictions and unsupported recovery

**Steps:** Open Discovery: everything unknown; verify no unconditional recommendation. Set Deployment to Cloud mandated and Database location to Must stay on-site; inspect the contradiction and both correction routes. Then open High-availability request and inspect recovery findings.

**Pass:** Unknown is retained as unknown; contradictory inputs are retained and can be corrected. Unsupported recovery is explicitly a catalogue limit, not a claim that high availability is impossible. No unconditional recommendation or invalid selection is forced. Record the exact states and one clarification action.

## Q07 — Workload buttons and optional grab/drop

**Steps:** Open Document workflow with storage and jobs. Inspect Storage, Jobs and Queue across the three diagrams and their owners. Remove Queue with the Product button; add it again by grabbing a shelf block and releasing on an island. Remove it and add it with the button again. Repeat one off-island release.

**Pass:** Both addition routes have the same final workload; each intended action applies once. The block snaps/springs back after release without becoming stranded, and an off-island release does not add it. Core button use succeeds even if optional dragging fails. Exports include the same blocks, boundaries and responsibilities. Record grab/drop separately from button parity; no simulated grip counts as a physical hand pass.

## Q08 — Manual tour and original project restoration

**Steps:** Make a recognizable project change and note its inputs. Launch the guided tour. Perform all nine actions yourself; do not use Do it for me. At the completed state exit the tour. Repeat starting and exiting early.

**Pass:** Instructions, completion state and Next remain readable. The failed-block selection, preview/apply/undo and export steps work through normal hand input. Both exits restore the original project; tour changes do not overwrite its saved copy. Store a before/after backup or export and the completion capture.

## Q09 — Actual export delivery

**Steps:** Export from Q03 or Q04. Note version, retrieval code, expiry and URL. Leave immersive mode and open the retrieval page **in the headset browser**. Open/download Markdown, each of the three SVGs and the JSON bundle; confirm the files are accessible. Retrieve the same code from the PC/another device as an additional check.

**Pass:** An export button or code alone is insufficient. The headset can reach the artifacts, and Markdown/SVG/JSON agree on version, findings, inputs and selection. The companion browser can retrieve them through a reachable host. If testing with forwarded localhost, use the PC's network host for a different device; record that limitation. Do not call the local development certificate or link publicly usable. Delete the test server copy after saving evidence; its old retrieval URL must stop working.

## Q10 — Pause and system interruption

**Steps:** Record current inputs/version. Pause and resume using Controls. During another step open the system menu, return, leave the browser briefly and resume the immersive session.

**Pass:** Controls allow recovery without a reload or accidental decision. The app distinguishes interruption/paused state, preserves confirmed inputs and restores a usable view. Capture state before/after; record any lost selection or duplicated action.

## Q11 — Tracking loss and recovery

**Steps:** With controllers inactive, aim at an action but do not select. Move hands out of camera view for several seconds. Return them, wait for tracking, then intentionally select once. Repeat while holding a workload block if safe and comfortable.

**Pass:** Tracking loss does not confirm, delete or duplicate anything. The loss/recovery notice is understandable when tracking is unavailable, rays regain useful alignment and the block can be recovered. Record whether the browser retained input sources after poses were lost; that distinction matters when diagnosing a missing notice.

## Q12 — Reload and resume

**Steps:** Confirm inputs and make a recognizable scenario change. Exit immersive and reload the same origin. Select Resume saved project and re-enter. Separately start a tour and reload before exiting it.

**Pass:** Resume restores the latest saved real project and its context, not an uncommitted preview or the tour sandbox. Catalogue reevaluation is explicit; no silent data loss. Record inputs/selection before and after; do not require the numeric version to remain identical after restore.

## Q13 — Browser form, punctuation and backup recovery

Also exercise the merged in-headset keyboard: edit title/specification, cancel
an edit, supply the three rate fields (including zero), enter a rationale after
selecting an option, and verify selection is retained. Partial rate drafts must
not change committed prices. Check text size and seated keyboard reach. If
dictation is available, test permission denial and keyboard recovery separately;
its audio may use an external browser/vendor service. Do not dictate sensitive
content. Exit immersive and retrieve the local export drawer's files, then
verify Delete local copy removes both saved project and shelf while keeping the
open project. These additions require new physical evidence; earlier browser
results are insufficient.

**Steps:** In the browser preparation form use `Portal – launch — API` as a project title. Submit an empty name, a negative budget and a partially filled set of rates, then valid values. Confirm visible feedback even when scrolled. Import malformed JSON and a valid backup from the run pack. Read the resulting spatial title and export it.

**Pass:** Invalid submissions/imports preserve the current project, with visible, distinguishable feedback. Valid input applies once. The spatial title uses readable hyphen fallbacks; browser input, saved backup and Markdown/JSON preserve the original typographic dashes. Other language/glyph coverage must be recorded separately. PC execution is useful browser regression evidence, but mark the headset-specific form check separately if it is not done on the device.

## Q14 — Export failure and retry

**Steps:** Keep the app loaded. Temporarily interrupt the headset's network connection (restore the same network afterward). Attempt export, read the failure, restore connectivity and retry.

**Pass:** Visible failure and recovery guidance; confirmed decision unchanged; a later successful response produces a usable code. An indefinite spinner, repeated silent submission or lost state fails. Restore connectivity before ending the case. Do not perform an AI request to test network failure.

## Q15 — Sustained performance

**Setup:** Use Document workflow, add all five supported workload types and exercise the densest comparison/detail/tour states. Keep source and view scale recorded. Warm up for two minutes, then record ten minutes of interaction.

Use the production build URL for this measurement, and verify the main script is
loaded from `/dist/assets/`. Development-source timing is diagnostic only. Local
serving still does not establish deployed-host or installed-package performance.

**Steps:** Record selected display refresh rate, measured application frame cadence, available CPU/GPU timings, missed frames, thermal change and any hitches during changes/exports. Use physical-device instrumentation or remote Browser performance tools; document the chosen tool and sampling period before measuring.

**Proposed project gate:** Sustain at least 72 application frames/s when running at 72 Hz (13.89 ms frame budget); also report stalls and missed frames rather than averaging them away. This is a project target, not a quoted store certification rule. If the device selects another refresh rate, record its actual budget and whether the target is met. Without suitable measurements this case is BLOCKED, not PASS. Desktop/emulator rates are not headset evidence.

## Q16 — Comprehension and formative usability

Follow the five-participant plan in [Validation plan](VALIDATION-PLAN.md). Give both audiences a constraint/trade-off/unknown/change/export task. Alternate flat/spatial order and log familiarity and coaching.

**Proposed gate:** At least four of five complete the core task without assistance and correctly explain a mandatory constraint, operating responsibility, material trade-off and unresolved assumption. Record results per entry path, time, discomfort and wrong interpretations. A solo developer dry run is preparation, not five independent participants or proof of spatial superiority.

## Q17 — Installed immersive launch (only for a packaged candidate)

**Steps:** Record package/build identifiers and signing/channel context. Launch the installed candidate from its icon, complete a short path, close it and reopen. Repeat interrupted-session recovery.

**Pass:** Native immersive entry works from the icon, without relying on the browser's Enter XR button or the desktop emulator. Storage/export/backend behavior works in the packaged origin. This route needs its own evidence; a browser pass does not certify it. Mark N/A with a reason while no package is under test.

## Close the run

Restore network, input settings and any temporary device/debug changes. Release held controls, exit the immersive test session and retain only the intended test project. Delete the synthetic server exports after saving artifacts. Do not clear unrelated browser data or stop a shared dev server.

Fill observed results and evidence paths in `results.csv`; report failures using `case / source fingerprint / headset+Browser / steps / expected / observed / evidence`. Separate regressions from usability observations. Q01–Q14 must have a disposition and both hands-only paths plus real artifact delivery must pass before calling the physical workflow validated. Any hard-constraint bypass, mixed-version record, silent loss of confirmed input or broken hands-only path holds the candidate. Performance and the formative study keep their own unverified status until Q15/Q16 have evidence.
