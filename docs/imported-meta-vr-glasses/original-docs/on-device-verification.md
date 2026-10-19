# On-device verification checklist

The unit suite covers the engine, the controller, the view model and the code/markup contract. What it
cannot cover is the IWSDK runtime (`src/runtime/`), panel sizing in metres, input devices and the
browser features of the headset. Run this list on a real device after every change to the runtime,
the scene or the panels. Record results in the PR.

Setup: `npm run dev`, open the URL on the headset (same network, accept the dev certificate), or use the
emulator for steps marked (E).

> **Verified in the real IWSDK 1.0.1 runtime (headless Chromium, pointer events) by `npm run test:e2e`:**
> panels load with no warnings; every stage switches; answer buttons swap variants; `setProperties({ text })`
> on spans inside `ButtonLabel`; `display` toggling of Badge wrappers; diagram mode; node clicks in the 2D
> diagrams and on the 3D islands (RayInteractable + Pressed); keyboard typing; Markdown download; autosave
> and resume after reload. Items below marked (E2E) are covered by that suite; the rest still need a headset.

## A. Runtime wiring (blocking)

- [x] (E2E) Console shows no `[workspace] no element with id` warnings on load. Any warning means the
      view model paints an id the markup lacks at runtime (the static test guards the markup, the
      runtime guards the UIKit instance).
- [x] (E2E) Console shows no `requireElementById` / `requireSceneObject` errors.
- [x] (E2E) Home -> Organization -> Describe -> Requirements -> Compare -> Review: every section switches,
      the stepper highlights the active stage.
- [x] (E2E) Answer buttons: the selected answer shows the filled (primary) variant with a check icon.
- [x] (E2E) `setProperties({ text })` updates text on `<span id>` inside `ButtonLabel` (e.g. `label-budget`
      changes after entering a budget).
- [x] (E2E) `display: none` toggling works for Badge wrappers (state badges switch when cycling "Data location").
- [x] (E2E) Diagrams button hides workspace + inspector and shows the three diagram panels; each node
      click updates the inspected component; "Back to comparison" returns.
- [x] (E2E, screenshot) Graph node background tints change with findings (blue / amber / red) and the icons match.

## A2. 3D islands (blocking for the competition demo)

- [x] (E2E) Islands appear from the Requirements stage onward and hide on Home/Describe, while the keyboard is
      open and in diagram mode.
- [x] (E2E) Console shows no `[islands] 3D view unavailable` warning (if it does, the panel flow still works -
      attach the logged error).
- [ ] Hovering a node with a hand ray brightens it; pinching selects it, the inspector shows that component
      and the stage switches to Compare.
- [ ] Changing an answer re-tints nodes and rings immediately (e.g. Data location -> on premise turns the
      cloud database red and the cloud ring red).
- [ ] Labels (canvas sprites) are legible at 3 m; if not, raise `nodeSize`/label sizes in
      `src/spatial/layout.ts` and `src/runtime/island-scene.ts`.
- [ ] The right island does not intersect the inspector panel; the centre island is visible above the
      workspace panel from a seated position.

## B. Panel sizing and placement

- [ ] Workspace panel reads comfortably at arm's length plus ~0.5 m; body text >= 14 px equivalent.
      If too small/large, tune `transform.scale` in `public/scenes/main.iwsdk.scene.json` (not the px
      values in the markup).
- [ ] Inspector sits to the right without overlapping the workspace; both inside a ~60 deg horizontal FoV.
- [ ] Keyboard appears below and closer; keys are hittable with a hand ray without covering the value field.
- [ ] Diagram panels do not intersect each other or the keyboard.
- [ ] Nothing is head-locked; panels stay in place when turning the head.

## C. Hands-first (competition requirement: complete the whole journey without a controller)

> **Verified in the IWSDK emulator** (`iwsdk dev up --headless`, Meta Quest 3 profile, `immersive-vr`,
> input mode *hand*, controllers disconnected) by `scripts/emulator/run-detached.sh`: entrance, keyboard
> typing (shift, letters, space, digit), acknowledge, requirements answer, compare, record selection,
> 2D diagram node, review and home - every step by aiming the right hand and pinching. Real-hand ergonomics
> (pinch reliability, fatigue, ray jitter) still need a headset.
>
> Finding from that work: `@pmndrs/pointer-events` emits `click` only if release follows press within a
> window (800 ms for XR rays in IWSDK). The app widens it to 2 s for hand and controller rays
> (`WorkspaceSystem.widenClickWindow`) so a slow, deliberate pinch is never dropped silently.

- [ ] Hand rays select every Button and every `cursor: pointer` div (cards, keys, graph nodes).
- [ ] Pinch on keyboard keys is reliable at the chosen key size (52 x 46 px). Enlarge if misses > 1 in 10.
- [ ] Shift -> letter -> shift resets; Backspace; Space; Clear; Cancel; Done all respond.
- [ ] Enter a 300-character specification in under 3 minutes with hands only.
- [ ] Switching hands <-> controllers mid-session keeps working (VRC.Quest.Input.7); the system gesture
      never triggers app actions (VRC.Quest.Input.8).
- [ ] Controller: trigger selects, grip is unused (nothing grabbable yet).

## D. Browser features

- [ ] Markdown / SVG / bundle downloads land in the headset Downloads folder (Quest Browser). Note the
      behaviour inside an immersive session vs after exiting.
- [ ] Dictate button appears only if speech recognition exists; if it appears, dictation fills the value
      and still requires Done.
- [ ] Reload the page -> Resume saved project restores title, answers, draft rates and inspected option.
- [ ] Private/incognito mode: storage failure shows the warning toast, app keeps working.

## E. Comfort and VRC spot checks

- [ ] Cold start to first head-tracked frame < 4 s on Quest 2/3S class hardware (VRC.Quest.Performance.3).
- [ ] Stable 72/90 Hz while all panels are visible (`metavr perf` trace attached to the PR).
- [ ] Take the headset off and on (pause/resume): state intact, no frozen input (VRC.Quest.Functional.2, Input.4).
- [ ] Seated, 2 ft radius: every control reachable without leaning (competition "airplane seat test").
- [ ] Colour-blind check: every state is readable from badge text and icons alone.

## Resolved

- The stray line between Lucide icons seen in `@drawcall/uikitml render` previews does **not** appear in the
  real IWSDK runtime (verified by screenshots from `npm run test:e2e`); it is a preview-renderer artefact.
- Panel scale: UIKit units are centimetres (100 = 1 m at scale 1), so px panels need scene scales of
  ~0.14-0.15; set in `public/scenes/main.iwsdk.scene.json` and verified visually in the runtime.
