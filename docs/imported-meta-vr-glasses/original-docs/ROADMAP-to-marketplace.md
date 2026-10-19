# Architecture Decision Workspace (VR) — Roadmap from current state to Meta Horizon Store

> Active execution plan: [COMPLETION-PLAN.md](COMPLETION-PLAN.md). Historical baseline tables below are not current compliance evidence. Track actual results in [compliance/requirements-matrix.md](compliance/requirements-matrix.md).

Status date: October 2026. Baseline commit: `5fd1048 baseline`.

> **Re-sequenced on Oct 16, 2026** for the Meta VR Start Developer Competition (entry deadline
> **Nov 18, 2026, 12:00 PM PT**; see `docs/competition-checklist.md`). The competition requires a hosted
> WebXR link (GitHub Pages), a hands-first seated experience and a < 3 min video - not a store APK. So the
> order is now: **Phase 0 -> Phase 1 -> Phase 2 (slimmed) -> competition submission -> Phases 3-7 -> store**.
> Phase 0 and the GUI rebuild of Phase 1 are implemented in the repository (see "Progress log" at the end).

This document has three parts:

1. **Where we are** — an honest review of the codebase as it stands.
2. **Where we need to be** — what the product vision and the Meta VRC guidelines demand.
3. **How we get there** — a phased plan with milestones, deliverables, exit criteria and a VRC compliance matrix.

---

## Part 1 — Current state review

### 1.1 What exists

| Area | Files | Verdict |
|---|---|---|
| Decision engine (pure TS, no framework) | `src/decision.ts`, `src/intake.ts`, `src/session.ts`, `src/exports.ts` | **Solid core.** Deterministic evaluation of 3 deployment variants (cloud / on-premise / hybrid) against 8 inputs; states `viable / conditional / excluded / unsupported`; versioned snapshots; undo; validated backup/restore; Markdown + SVG export. 17 unit tests pass, strict TypeScript compiles clean. |
| Spatial UI (IWSDK + UIKitML) | `src/workspace.ts`, `public/ui/decision.uikitml`, `public/ui/architecture.uikitml`, `public/scenes/main.iwsdk.scene.json` | **Functional prototype, not a product UI.** One dense panel with ~40 flat `div` "buttons"; three "diagram" panels that are 2×3 grids of boxes with text instead of connection lines. No Horizon kit components used. |
| Browser-only overlay | `src/project-editor.ts` | DOM `<details>` form for product name, specification, budget, rates, backup import and AI calls. **Invisible in immersive mode** — so in VR the user cannot enter a single character of their own product. |
| AI assistance | `server/ai-service.ts`, `server/ai-middleware.ts` | Well-guarded (structured output, verbatim-quote check, rule-existence check, call allowance, origin check). But it is mounted **on the Vite dev/preview server** — there is no production backend. |
| Starter leftovers | `src/panel.ts`, `src/robot.ts`, `src/robot-component.ts`, `public/ui/welcome.uikitml`, `public/gltf/webxr-banner`, `public/textures/webxr.png`, `public/audio/chime.mp3`, stock assets in `src/assets.ts` | Dead code from the IWSDK template. `PanelSystem`/`RobotSystem` are never registered. |
| Tooling | `iwsdk.config.json`, `vite.config.ts`, `opencode.json`, `pnpm-workspace.yaml` | Works for local dev. `opencode.json` contains machine-specific Windows absolute paths. No README, no LICENSE file (source headers claim MIT), no CI. Package still named `devpost-hackathon`. |

### 1.2 Strengths to preserve

- **Engine/UI separation is clean.** `decision.ts` + `session.ts` have zero IWSDK/three imports. The same engine already serves both entrances (organization / greenfield) as the vision requires.
- **Honest epistemics baked in:** `unknown` ≠ `fail`, `unsupported` is never silently relaxed, costs are "unpriced" unless the user supplies rates, exclusions are listed, selection requires confirmed context + viable state. This is the product's differentiator and must survive the UI rebuild.
- **Versioned, reproducible artifacts:** every export carries `decision vN`; snapshots are isolated from later edits (tested).
- **AI is advisory only** and cannot override deterministic findings (tested).

### 1.3 Gaps against the vision

| Vision statement | Reality today |
|---|---|
| "Users describe their product" | Only via a 2D browser form that does not exist in VR. |
| "confirm constraints and assumptions" | Exists (guided intake, confirm button) but as wall-of-text in one panel. |
| "compare supported infrastructure designs" | Exists, but the three designs are identical 6-box grids; differences are only visible as text. |
| "explore how changes affect cost, dependencies, risks, operating responsibilities" | Cost: subtotal only if rates typed in browser. Dependencies: static edge list, not drawn. Risks: not modelled (only findings). Responsibilities: one sentence per component. No visual "what-if" diff. |
| "design the infrastructure in a 3-dimensional environment" | Nothing is 3D. Diagrams are flat panels at fixed positions; no grabbing, arranging, walking around, or depth. |
| "leave with an architecture diagram and a Markdown decision record" | Works in desktop browser via `<a download>`. **Unverified on Quest**; no share/QR/cloud path. |
| "GUI according to Meta rules" | `@pmndrs/uikit-horizon` (RLDS kit) is installed but the product panels use raw `div`s, custom hex colours and non-px units. |
| "on the marketplace" | No PWA manifest, no service worker, no packaging, no store assets, no privacy policy, no entitlement check, no offline notice, no loading indicator. |

### 1.4 Code-level findings (to fix during Phase 0/1)

1. `workspace.ts` is a 141-line god-system: binding, state, rendering and file download in one class with one-line handlers. Needs a view-model layer + per-stage renderers.
2. Hard-coded magic numbers (`% 6` components, `answer-0..4` slots, three fixed graph IDs). Catalogue growth will break the UI.
3. `decision.uikitml` uses unitless sizes (`width: 110; font-size: 2.1`) while `welcome.uikitml` uses px with Horizon `<Panel>/<Button>`. Pick one system (px + Horizon kit).
4. Status/feedback is a single text line at the bottom of a tall panel; errors thrown by `select()` land there and are easy to miss.
5. Colour is the only carrier of state (green viable / red excluded / yellow conditional) — fails VRC.Quest.Accessibility.6 recommendation.
6. `localStorage` is the only persistence; a single failed write shows a warning but data lives in one key with no history — risk under VRC.Quest.Functional.4.
7. AI middleware default `AI_ALLOWED_ORIGINS` is localhost only; `busy` flag is process-global (one request for all users) — fine for dev, not for a hosted service.
8. `opencode.json` absolute paths; `package.json` name/title; LICENSE missing; no README.

---

## Part 2 — Target state

### 2.1 Product definition (v1.0 store release)

**Name (working):** *Archiform* — *Architecture Decision Workspace for VR*. (Final name must pass VRC.Publishing.4 and a trademark check.)

**One-liner:** Stand inside your future system. Describe a business web application, confirm constraints, compare cloud / on-premise / hybrid designs as life-size 3D architectures, and walk out with a diagram and a decision record.

**Audience:** solution architects, CTOs/tech leads at SMEs, IT consultants, startup founders. Sitting or standing, single user, no locomotion required (everything reachable from one spot — VRC.Quest.Accessibility.9).

**Core loop (the four stages already in code, re-imagined spatially):**

1. **Entrance hall** — choose *New app in an existing organization* or *Greenfield / startup*. (Both feed the same engine.)
2. **Describe** — product name, one-paragraph specification, optional budget/rates. In-VR text entry (virtual keyboard + voice dictation where available) or "continue from the companion web page / QR code".
3. **Confirm** — guided intake as a sequence of cards; each answer visibly changes the three candidate architectures standing in the room.
4. **Compare** — three architectures as 3D "islands" side by side; components are nodes, dependencies are drawn links, boundaries (organization site / external hosting) are translucent volumes. Hovering/selecting a node shows responsibility, related findings, cost share. A **what-if dial** (usage launch→growth, recovery basic→HA, etc.) animates the deltas.
5. **Decide & export** — record the selection (requires confirmed context + viable state), review the Markdown record in-world, export via download, share sheet, QR code, or cloud link.

### 2.2 Non-goals for v1.0

- Multi-user / shared sessions.
- Editing the catalogue in VR.
- Vendor-specific pricing APIs (costs remain user-entered scenario rates).
- Mixed-reality passthrough mode (can be v1.1; if added, VRC.Quest.Functional.14 applies).

### 2.3 Distribution path

The app is WebXR (IWSDK / three.js). Meta's current route is a **Progressive Web App packaged into a signed APK** using `@meta-quest/bubblewrap-cli`. Select immersive mode for direct WebXR launch. Assess the applicable immersive Store VRCs; do not automatically combine the immersive and 2D columns. Hosting must support Digital Asset Links at the origin root, tied to the actual package and signing certificate.

> Verified 17 October 2026 against https://developers.meta.com/vr/documentation/web/pwa-packaging/. Recheck before packaging. Complete the documented immersive launch and origin-verification steps; do not assume an arbitrary WebView wrapper is equivalent.

Requirements this creates for us: HTTPS static hosting with a valid Web App Manifest and a service worker (offline core), a hosted AI backend (optional feature, may ship disabled), a privacy policy page, a support page, and a company website page.

---

## Part 3 — Phased plan

Team assumption: 1 XR/three.js developer, 1 TS/full-stack developer, 1 UX designer (part-time), QA with at least **two physical Quest devices** (Quest 3 and Quest 2 or 3S for the performance floor). Durations are calendar estimates at that staffing; phases 3 and 4 can overlap.

```
Phase 0  Foundations & hygiene                 1 week
Phase 1  Horizon-kit GUI rebuild               3 weeks
Phase 2  Spatial architecture model (3D)       4 weeks
Phase 3  In-VR input, persistence, export      3 weeks   (overlaps Phase 2)
Phase 4  Engine depth                          3 weeks   (overlaps Phase 2/3)
Phase 5  AI assistance – production path       2 weeks   (optional for v1.0)
Phase 6  VRC compliance, performance, QA       3 weeks
Phase 7  Packaging, store listing, submission  2 weeks + review cycles
                                               ≈ 16–18 weeks to first submission
```

### Phase 0 — Foundations & hygiene (1 week)

Goal: a clean, reproducible, documented repository that a second developer can clone and run.

- Remove starter leftovers: `panel.ts`, `robot.ts`, `robot-component.ts`, `welcome.uikitml`, banner GLTF, `webxr.png`, `chime.mp3`, stock desk/plant/robot entries in `assets.ts`; `components.ts` exports an empty list until Phase 2 adds real components.
- Rename package and `<title>`; add `README.md` (run, test, device deploy), `LICENSE`, `CONTRIBUTING.md`.
- Fix `opencode.json` to use relative commands (`npx iwsdk mcp stdio`, `npx metavr mcp server`).
- Add `.env.example` documenting `AI_*` variables; keep AI disabled by default.
- CI (GitHub Actions): `npm ci`, `typecheck`, `test`, `build`; upload `dist/` as artifact. Pin Node 22.
- Extract a **view-model** from `workspace.ts` (`src/ui/view-model.ts`: derives labels, colours, lists from a `Snapshot` + UI state, pure and testable) so the Phase 1 rebuild does not re-entangle logic with rendering.
- Add an ADR folder (`docs/adr/`) and write ADR-001 "WebXR + IWSDK + PWA packaging" and ADR-002 "Engine stays framework-free".

Exit criteria: CI green; `npm run dev` shows the existing workflow unchanged; no unused assets in `public/`.

### Phase 1 — GUI rebuilt on the Horizon kit ("Meta rules") (3 weeks)

Goal: every 2D-in-3D surface uses `@pmndrs/uikit-horizon` (Reality Labs Design System) components, px units, the kit's light/dark theme, and Quest-appropriate ergonomics. This phase answers "first we need a GUI according to Meta rules".

Design rules to adopt (from RLDS via the Horizon kit and from the VRCs):

- Components: `Panel`, `Button` (+`ButtonIcon`, `ButtonLabel`), `Toggle`, `Checkbox`, `RadioGroup`, `Dropdown`, `Slider`, `ProgressBar`, `Badge`, `Divider`, `Input`/`InputField`. No hand-rolled `div` buttons.
- Typography: minimum body 14 px at the kit's panel scale (≈ 1 m distance); headings 20–24 px; never below ~12 px (VRC.Quest.Accessibility.2).
- Panels: max ~400 px wide per panel at the reference scale; split content across several panels laid out on a gentle arc at 1.2–1.8 m, eye height, slight downward tilt. Never head-locked (VRC.Quest.Functional.10); use `Follower` with `PivotY` and a generous `maxAngle` for the *status toast* only.
- Targets: ≥ 44 px hit area, 8–12 px spacing; hover/pressed states from the kit; audio click + haptic pulse on confirm (VRC.Quest.Accessibility.3).
- State is never colour-only: add Lucide icons (`Check`, `AlertTriangle`, `Ban`, `HelpCircle`) and text labels to viable/conditional/excluded/unsupported (VRC.Quest.Accessibility.6).
- Colour scheme follows `ColorSchemeType` from IWSDK; offer a light/dark toggle in Settings (towards VRC.Quest.Accessibility.5).

Deliverables:

1. **Design system doc** `docs/design/ui-guidelines.md` + a Figma (or paper) board with the five scenes.
2. Panel set (UIKitML files under `public/ui/`):
   - `entrance.uikitml` — two large entrance cards (Organization / Greenfield) + Resume saved + Settings.
   - `describe.uikitml` — product name, specification, budget/rates with `InputField`s, consent/confirm `Checkbox`.
   - `intake.uikitml` — one question per card, `RadioGroup` answers, progress bar `n / N`, Previous/Next, classification badge (hard constraint vs scenario assumption).
   - `compare.uikitml` — three architecture summary cards with state badge, cost subtotal, open findings count, Inspect button; what-if controls as `Toggle`/`Dropdown`.
   - `inspector.uikitml` — selected component: responsibility, boundary, findings list, cost share.
   - `review.uikitml` — decision record preview (scrollable), Record selection, Undo, Export actions.
   - `toast.uikitml` — status/feedback (follower panel), with icon and auto-dismiss.
   - `settings.uikitml` — theme, text size (S/M/L scale), sound on/off, seated mode, reset view, privacy policy link, delete local data.
3. `src/ui/` systems: one system per panel, subscribing to `DecisionSession`; a `NavigationSystem` that shows/hides panels per stage and animates transitions (fade + small slide, 200–300 ms).
4. Desktop emulation parity: every action reachable with mouse in `iwsdk dev`.
5. UI snapshot tests for the view-model; manual checklist for panels on device.

Exit criteria: complete four-stage journey finishable in VR using controllers **and** hands, with only sample data (text entry comes in Phase 3). UX review on device with 3 external testers; legibility sign-off.

### Phase 2 — Spatial architecture model (4 weeks)

Goal: the thing that justifies VR — architectures as explorable 3D structures, and changes that are *seen*, not read.

- **Scene graph model** `src/spatial/`: an `ArchitectureIsland` per variant (cloud / on-premise / hybrid) placed on a 120° arc ~2 m from the user; each island has:
  - **Boundary volumes** — translucent rounded boxes for *Organization site* and *External hosting*; hybrid shows both with a drawn **connectivity link** that is highlighted when the connectivity/latency finding is `unknown` or `fail`.
  - **Component nodes** — low-poly 3D glyphs (identity key, ingress gateway, app tier, database cylinder, backup vault, monitoring tower) with floating Horizon `Badge` labels; instanced meshes, ≤ 2k triangles per island.
  - **Dependency links** — tube/line meshes from `variant.connections`; direction arrows; dashed when crossing a boundary.
  - **State visualisation** — node material + icon badge for pass/unknown/fail/unsupported; island-level state ring on the floor.
- **Interaction** (IWSDK `grabbing: true`, `RayInteractable`, `Pressed`, hover):
  - Point + select a node → inspector panel docks next to the node.
  - Grab an island to bring it closer / rotate it; double-press to reset layout. (Grip button for grabbing, VRC.Quest.Input.2.)
  - Keep `locomotion: false`; everything within reach of a seated user; "Reset view" recenters the arc (VRC.Quest.Functional.9).
- **What-if exploration:** changing any input re-evaluates instantly and animates: nodes that gain a failing finding pulse red then settle; islands that become excluded dim and sink 10 cm; cost subtotal counters tween. Keep a **diff strip** ("Since v6: hybrid → conditional (connectivity unknown)") generated from two snapshots (add `diffSnapshots()` to the engine; tested).
- **Dependency/ risk lens toggles:** *Responsibilities lens* colours nodes by owner (organization / provider / shared); *Risk lens* shows findings with weight; *Cost lens* scales node height by cost share when rates exist.
- Audio: subtle spatialized confirm/alert cues (VRC.Quest.Audio.1 recommended) — optional and mutable (Accessibility.1).
- Performance budget: ≤ 150 draw calls, ≤ 100k triangles in view, 72/90 Hz stable on Quest 2/3S; measure with `metavr perf` traces (VRC.Quest.Performance.1).

Exit criteria: a user can describe (sample), confirm, compare and decide entirely via the 3D islands + panels; what-if changes are visible within one frame; perf budget met on Quest 2-class hardware.

### Phase 3 — In-VR input, persistence, export (3 weeks, overlaps Phase 2)

Goal: the user's *own* product can be entered and taken out of the headset without a desktop browser.

- **Text entry in VR**
  - Horizon `InputField` wired to a spatial **virtual keyboard** panel (QWERTY + numeric + symbols; built from Horizon `Button`s; supports controllers and hand pinch). Evaluate whether the Quest system keyboard appears for WebXR inputs inside the packaged PWA — if it does, prefer it and keep ours as fallback.
  - **Voice dictation** via Web Speech API where the Quest browser/PWA exposes it; show a "dictation unavailable" state otherwise.
  - **Companion web page** (same build, desktop layout) where users paste a long specification; transfer via 6-digit pairing code or QR code through the hosted backend — or entirely offline by exporting/importing the JSON backup. Ship the offline path first.
- **Persistence** (VRC.Quest.Functional.4): move from a single `localStorage` key to IndexedDB with (a) autosave on every session notification, (b) a ring of the last 10 revisions, (c) explicit "Projects" list (multiple projects), (d) per-OS-user isolation comes for free from the Android profile, but test with two entitled users (VRC.Quest.Functional.12).
- **Export & share**: keep `<a download>` (verified on Quest Browser → Downloads folder, test inside PWA); add Web Share API (`navigator.share` with files) for sending to email/Drive; add **QR code** rendering of a short-lived backend link for the Markdown/SVG bundle; add "Copy Markdown to clipboard". Render the SVG diagram from the *3D layout* as well (top-down projection) so the exported diagram matches what the user saw.
- **Offline behaviour** (VRC.Quest.Functional.7): core loop must work offline; show a non-blocking notice when AI/share features need connectivity.

Exit criteria: a tester enters a 300-character specification in VR in < 3 minutes; the project survives app restart and headset reboot; Markdown + SVG arrive on a phone/laptop via at least two channels.

### Phase 4 — Engine depth (3 weeks, parallel with Phases 2–3)

Goal: the decision engine carries enough substance that professionals trust the output.

- **Catalogue as data** (`src/catalogue/*.json`, schema-validated with zod): variants, components, boundaries, connections, rules, responsibilities, cost drivers. Add at least: *managed cloud (PaaS)* vs *self-managed cloud (IaaS)*; *hybrid with DB on-prem* vs *hybrid with app on-prem*; optional components (cache, queue, object storage, CDN, WAF, secrets, CI/CD). Variants must declare `supported: true/false` so unsupported patterns stay explicitly unsupported.
- **Rules engine**: rules as data with `appliesTo`, `inputs`, `evaluate`, `severity`, `components`, `explanation`; keep current rule semantics and tests green; add rule tests per catalogue entry.
- **Risk register**: each finding optionally emits a risk (likelihood/impact/mitigation/owner) → appears in the Risk lens and in the Markdown record.
- **Operating responsibilities matrix**: component × (organization / provider / shared / unassigned) per variant; "unassigned" is a finding.
- **Cost model v2**: per-component monthly drivers × quantity scenario (launch/growth), user-supplied rates with currency, explicit exclusions, *and* a sensitivity view (±30 % on each rate) — never a market quote.
- **Decision record v2** (Markdown): context, constraints, assumptions, options considered with states, findings, risks, responsibilities, costs, selection + rationale (user-typed), review triggers, revision history (from the undo ring). Stable heading structure so records diff cleanly in git.
- **Snapshot diff** API for Phase 2's animations.

Exit criteria: ≥ 60 engine tests; catalogue schema documented; a sample decision record reviewed by two practising architects.

### Phase 5 — AI assistance, production path (2 weeks, optional for v1.0)

Decision point: ship v1.0 **without** AI (engine is complete without it) or with AI behind a hosted backend. Recommended: ship v1.0 with AI **present but disabled by default**, enabled via a user-entered pairing with the hosted service, so the store build has no dependency on it.

- Move `ai-middleware` to a small Node/Hono service (Docker, Fly.io/Render/Cloud Run) with per-user rate limits, request signing, and CORS allow-list of the PWA origin.
- Consent UI in VR (what is sent, to whom); log nothing but token counts.
- In-VR display of proposals with Accept-checked flow (port of the DOM version).
- Privacy policy must describe this data flow (VRC.Quest.Privacy.2/3).

### Phase 6 — VRC compliance, performance, accessibility, QA (3 weeks)

Goal: pass technical review the first time. Work from the VRC matrix in §3.1 and Meta's downloadable test plan.

- **Loading indicator in VR within 4 s** (Performance.3): lightweight first panel + progress bar while assets/UI JSON load; lazy-load islands.
- **Frame rate** (Performance.1): target 90 Hz on Quest 3, 72 Hz on Quest 2/3S; fixed foveation; no post-processing; `metavr perf` traces committed to `docs/perf/`.
- **Focus awareness** (Input.4): on `VisibilityState` hidden/blurred, stop processing input, hide controllers/hands, keep rendering; resume cleanly. Pause any audio/animation (Functional.2).
- **Hands ↔ controllers switching** (Input.7) and **system gesture reserved** (Input.8): test explicitly; ensure pinch is not bound to anything while the system gesture is active.
- **Never stuck** (Functional.3): every panel has a back/home; a "Reset workspace" in Settings; exceptions are caught at the system boundary and surfaced as toasts, not silent.
- **Data** (Functional.4): autosave, crash-safe IndexedDB writes, import/export.
- **Multiple users** (Functional.12): verify with a second entitled account.
- **Tracking metadata** (Tracking.1/2): declare *Sitting & Standing*, *Touch controllers + Hands*; everything reachable seated (Accessibility.9 setting "seated height offset").
- **Accessibility extras:** text scale S/M/L; light/dark theme; no audio required; one-controller operation (all actions are point-and-click); snap-rotate view 30° buttons (Accessibility.7) since locomotion is off.
- **Security** (Security.2): PWA requests no Android permissions beyond what the wrapper needs; microphone only when the user starts dictation, with an in-app explanation.
- **Entitlement check** (Security.1, recommended): evaluate Platform SDK availability for PWAs; if not available, document why in the submission notes.
- QA: use the current VRC overview and detailed requirement pages; Meta warns its downloadable test plans can be stale. Initial owner-confirmed device is Quest 3; test additional models before claiming support. Record failures and retests; exit when all applicable mandatory rows have evidence.

### Phase 7 — Packaging, store listing, submission (2 weeks + review cycles)

- **PWA**: `vite-plugin-pwa` (manifest: name, short_name, icons 512/192 PNG with transparent-background logo, `display: standalone`, theme colours; workbox precache of `dist/` so the core loop works offline). Host on HTTPS (Cloudflare Pages / Netlify / S3+CloudFront) with immutable asset caching and a versioned URL.
- **APK**: Meta Quest Bubblewrap, immersive mode, final package name, securely backed-up keystore and verified Digital Asset Links. Inspect signature, architecture, SDK support and size against Packaging VRCs rather than assuming tool defaults prove compliance. Smoke test the signed package from the headset library.
- **Developer Dashboard**: complete the current team/app data-protection steps and audience/content declarations. Use the actual data-flow inventory (local storage, hosting requests/logs, optional external speech processing, and any enabled AI); do not declare blanket zero collection or claim nonexistent share links.
- **Store assets** (Asset.1–9): logo on transparent background; cover art without taglines/text in top/bottom 20 %; hero art centred title; 5+ screenshots captured on Quest with `metavr capture` — no overlays, no other platforms' hardware; optional trailer ≤ 2 min; text ≥ 24 pt in artwork.
- **Copy** (Publishing.4–8, Content.1–2): name, short and long description, keywords matching in-app content; no Meta brand misuse.
- **Links** (Publishing.1–3, Privacy.1–4): website, support page, ToS, privacy policy (what data, how used, how to request deletion — "Delete local data" in Settings plus an email contact).
- **Submission notes**: how to reach each VRC-relevant feature in < 1 min (reviewers time-box), sample data path, offline behaviour, AI disabled by default.
- Submit; triage review feedback within 48 h; budget **two** review cycles.
- Post-launch: crash/usage telemetry **opt-in only** (privacy policy), feedback link in Settings, v1.1 backlog (passthrough mode, catalogue packs, shared sessions).

---

## 3.1 VRC compliance matrix (required rows = ✓, recommended = +)

| VRC | Req. | Current status | Action / phase |
|---|---|---|---|
| Packaging.1–6 (manifest, sig v2, no unsupported features, supported SDK, size, 64-bit) | ✓ | N/A (no APK yet) | Phase 7 PWA packaging |
| Audio.1 spatial audio | + | None | Phase 2 spatialized cues (optional) |
| Performance.1 refresh rate | ✓ | Unmeasured | Phase 2 budget, Phase 6 traces |
| Performance.3 head-tracked graphics or loader within 4 s | ✓ | No loader; assets lazy | Phase 6 loading panel |
| Performance.4 ≥ 85 % render scale | + | Default | Phase 6 verify |
| Functional.1 no crashes/freezes | ✓ | Unknown on device | Phase 6 QA |
| Functional.2 pause on OS request | ✓ | Not handled | Phase 6 |
| Functional.3 never stuck | ✓ | Graph mode has return; errors only in status line | Phase 1 nav + toasts |
| Functional.4 no data loss | ✓ | Single localStorage key | Phase 3 IndexedDB + revisions |
| Functional.5 positional + orientation tracking | ✓ | WebXR local-floor via IWSDK | Phase 6 verify |
| Functional.6 only Quest hardware in assets/title | ✓ | N/A | Phase 7 |
| Functional.7 offline notice | + | None | Phase 3 |
| Functional.9 reset forward orientation | ✓ | None | Phase 2 "Reset view" |
| Functional.10 no head-locked UI | + | Panels are world-locked (good) | Keep; follower only for toast |
| Functional.12 multiple entitled users | ✓ | Untested | Phase 6 |
| Functional.13 localization default | + | English only | v1.1 |
| Functional.14 passthrough launch | ✓ (if MR) | Not MR | N/A for v1.0 |
| Security.1 entitlement check ≤ 10 s | + | None | Phase 6 evaluate |
| Security.2 minimum permissions | ✓ | N/A | Phase 7 manifest review |
| Tracking.1/2 play mode + input metadata | ✓ | Hand tracking enabled in config | Phase 7 declare sitting/standing, controllers + hands |
| Input.1 menu button opens in-app menu | + | None | Phase 1 Settings on menu button |
| Input.2 grip for pickup | + | IWSDK default | Phase 2 verify |
| Input.3/5 hands and controllers aligned / animate | + | IWSDK default | Phase 6 verify |
| Input.4 focus-aware | ✓ | VisibilityState used only for XR buttons | Phase 6 |
| Input.7 hands ↔ controllers switching | ✓ | IWSDK default, untested | Phase 6 |
| Input.8 system gesture reserved | ✓ | Untested | Phase 6 |
| Asset.1–9 store art | ✓/+ | None | Phase 7 |
| Ads.1–7 | ✓ | No ads | N/A |
| Accessibility.1 playable without audio | + | Yes | Keep |
| Accessibility.2 legible text | + | Small unitless fonts | Phase 1 |
| Accessibility.3 visual/audio/haptic feedback | + | Visual only | Phase 1 |
| Accessibility.4 one hand/controller | + | Yes (point & click) | Keep, verify |
| Accessibility.5 display settings | + | None | Phase 1 theme + text scale |
| Accessibility.6 not colour-only | + | Colour-only | Phase 1 icons + labels |
| Accessibility.7 rotate view without moving | + | None | Phase 6 snap-rotate |
| Accessibility.8 multiple locomotion styles | + | No locomotion | N/A (document) |
| Accessibility.9 fixed-position usability | + | Mostly | Phase 2/6 seated setting |
| Streaming.1–4 | — | No streaming | N/A |
| Privacy.1–5 | ✓ | None | Phase 7 policy + data checks |
| Content.1–4 | ✓ | No UGC sharing | Phase 7 copy review |
| Publishing.1–8 | ✓ | None | Phase 7 |

## 3.2 Milestones

| # | Milestone | Target | Demo |
|---|---|---|---|
| M0 | Clean repo, CI green | end of week 1 | `npm run dev` unchanged |
| M1 | Horizon-kit GUI, full journey with sample data | week 4 | On-device walkthrough video |
| M2 | 3D islands with live what-if | week 8 | Change "data residency" and watch cloud sink |
| M3 | Own product in, artifacts out (VR-only) | week 10 | Type spec in VR, receive Markdown on phone |
| M4 | Engine v2 + decision record v2 | week 11 | Architect review of a record |
| M5 | VRC dry-run passed internally | week 14 | Test-plan CSV filled, perf traces |
| M6 | Store submission | week 16 | Dashboard "In review" |
| M7 | Approved & live | + review cycles | Store page |

## 3.3 Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| PWA packaging does not allow immersive WebXR sessions in the current Horizon OS release | Blocks store route | Verify in week 1 (`metavr docs`), prototype a packaged APK from the current build in Phase 0; fallback to a WebView/TWA wrapper |
| Text input in VR is slow/frustrating | Users abandon the Describe stage | Ship companion-page + QR/backup transfer first; voice dictation second; keyboard as fallback |
| Performance of three islands + panels on Quest 2/3S | Fails Performance.1 | Instancing, ≤ 150 draw calls, measure weekly from Phase 2 |
| Hand-tracking edge cases (Input.7/8) | Review failure | Early device tests; allow shipping "controllers only" in v1.0 metadata if needed |
| Privacy review of AI data flow | Delays | Ship AI disabled by default; policy covers optional flow |
| Scope creep in catalogue (Phase 4) | Slips M4 | Catalogue as data behind schema; new variants need tests before UI |
| `@iwsdk/*` 1.0.x API churn | Rework | Pin versions; upgrade only at phase boundaries with a smoke test |

## 3.4 Definition of done for v1.0

- All required (✓) VRC rows in §3.1 pass on Quest 3 and Quest 2/3S.
- Both entrances complete end-to-end in VR with hands and controllers, without a desktop browser.
- Markdown decision record + SVG diagrams exported through at least two channels from the headset.
- Engine tests ≥ 60, UI view-model tests ≥ 20, zero TypeScript errors, CI green.
- Privacy policy, support page, website live; store assets approved by the designer; submission notes written.

---

## Progress log

### 2026-10-16 - Phase 0 complete, Phase 1 implemented (pending device verification)

- Starter leftovers removed (robot, welcome panel, banner, stock assets). Package renamed.
- Code split into `src/core` (engine), `src/ui` (controller + view model + bindings, framework-free) and
  `src/runtime` (IWSDK glue, logic-free). The old 141-line `workspace.ts` god-system and the browser-only
  DOM form are gone; everything the form did is now reachable in VR.
- New engine modules: `text-entry.ts` (virtual keyboard state machine, numeric/text modes) and `diff.ts`
  (explains what a what-if change did, shown in the status line).
- Panels rebuilt on the Horizon kit in px: `workspace`, `inspector`, `keyboard`, `architecture`. State is
  conveyed by badge text + icon + tint (never colour alone). All copy ASCII (the MSDF font has no other glyphs).
- Hands-first text entry: in-VR keyboard (letters, digits, symbols, shift, backspace, clear, cancel/done) and
  optional dictation when the browser exposes speech recognition.
- Behaviour changes: autosave on every change; editing name/specification invalidates the acknowledgement;
  partial rate entry stays "unpriced" until all three rates exist; resume keeps the inspected option and drafts.
- Tests: 75 tests, coverage gate (lines 99.7 %, functions 98.5 %, branches 98.3 % over `src/core`, `src/ui`,
  `server`; every module must be loaded). Mutation spot-check: 16/16 injected bugs caught after adding
  three tests the sweep showed were missing (no-recommendation with several viable options, undo cap,
  comma in numeric entry).
- CI (`.github/workflows/ci.yml`) and GitHub Pages deployment (`pages.yml`).
- Server: AI middleware/service made injectable and fully tested; `/api/ai/status` reports 0 remaining
  requests when unavailable.

Open for the device session (see `docs/on-device-verification.md`): panel scale in metres, key hit areas,
download behaviour in-session, dictation availability, and the preview renderer's stray-line artefact.

### 2026-10-16 - Phase 2 (slimmed) implemented: 3D architecture islands

- `src/spatial/layout.ts` (pure, tested): three islands on a 3 m arc, centre island lifted above the
  workspace panel; components grouped into boundary volumes (organization site left, external hosting
  right, dependencies above) in compact grids; dependency links with cross-boundary flags; node/link
  status from findings; selection; footprint for the state ring.
- `src/runtime/island-scene.ts` (pure three.js) + `island-system.ts` (IWSDK wiring: `RayInteractable`,
  `Hovered` brightening, `Pressed` -> inspect component). Optional: construction failures are logged and
  the panel flow continues.
- Headless preview harness `scripts/preview/render-islands.mjs` renders the islands with the runtime code
  (see `docs/previews/islands-*.png`).
- Deferred to the full Phase 2 after the competition: grabbing/rotating islands, link routing around nodes,
  what-if animations, lenses (cost/risk/responsibility), spatial audio cues.

### 2026-10-17 - Verified against the real SDK; emulator hands-first pass; product increments

- Built `@iwsdk/*@1.0.1` from the monorepo source (`docs/sandbox-environment.md`); `npm run typecheck`,
  `vite build` and the app itself now run against the genuine runtime. Surprises found and fixed that way:
  UIKit units are centimetres (panels were metres wide), Vite's HTTP/1 fallback needs
  `shouldUpgradeCallback` on Node >= 22.21, and `@pmndrs/pointer-events` drops clicks whose release comes
  later than the click window (now widened to 2 s for hand/controller rays).
- `npm run test:e2e`: pointer-driven journey through the built app in headless Chromium (entrance, typing,
  requirements, compare, island node press, diagrams, record, export, export drawer, autosave, resume).
- `scripts/emulator/`: the IWSDK emulator (Quest 3 profile) completes the **entire journey in
  `immersive-vr` with hand tracking only** - controllers disconnected - by aiming and pinching.
- Product: loading indicator with offline notice; press/confirm/warning feedback (audio + haptics) with a
  sound toggle; Recenter (seated comfort); text size M/L/XL; what-if pulses on the 3D islands; rationale in
  the decision record; exports kept on the device and re-downloadable from a 2D drawer outside VR; one-time
  stage hints; production build verified from a sub-path (GitHub Pages).
- Headset-view captures: `docs/previews/headset-*.png`.
