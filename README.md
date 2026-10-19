# Architecture Decision Workspace — application guide

An IWSDK/WebXR app for comparing illustrative cloud, on-premise and hybrid
architectures for a business web application. It records project requirements,
explains model findings, and exports a consistent decision record.

For the project summary and goals, see the [project README](../README.md).
**This directory contains `package.json`: run all commands below here.**

## Setup and local startup

Use Node.js 24 (the package also declares supported Node 20/22 ranges) and npm.
From the project parent:

```powershell
cd src
npm ci
npm run check
npx --no-install @iwsdk/cli dev status
```

Reuse a running managed server. If none is running:

```powershell
$env:ARCHITECTURE_DEV_PORT = '8082'
npx --no-install @iwsdk/cli dev up --open
```

Use the actual local/network URLs reported by the tool; port and IP can differ
between machines. `npm run dev` explicitly **restarts** the managed server, so
use it when a restart is intended. `npm run dev:down` stops it.

On a headset, connect to the same reachable Wi-Fi as the PC and open its reported
HTTPS network URL in Quest Browser. `localhost` there refers to the headset.
Manually accept a certificate exception only for the known local test address.
USB developer access is optional for this manual browser route. See the official
[IWSDK testing guide](https://iwsdk.dev/guides/02-testing-experience.html).

## Focused user flow (default)

The default view presents one larger central card. Competing panels, workflow
islands and the workload shelf are hidden. The camera is not moved artificially.

1. Choose **Start**, or **Resume saved** when a local project exists.
2. Read the summary pages and **Acknowledge**. Samples are illustrative assumptions;
   acknowledgement does not verify them. **Other sample** switches the sample path.
3. Review one question at a time, with a category icon and **all available answers shown together**. Select an answer to highlight it, then **Confirm answer** to save and continue. A following question starts on its recorded value. **Back** returns to a previous question or summary page.
4. Browse the architecture cards using the navigation below.
5. Choose **Decide**. **Select this option** is enabled only when the model and
   acknowledgement permit selection. **Keep uncertainty** records no selection.
6. Choose **Export**. Leave immersive mode to retrieve or download the files.

| Navigation | Result |
| --- | --- |
| Previous / Next option | Cloud / On-premise / Hybrid; current section is retained |
| Previous / Next section | Summary / Cost / Risks for the current architecture |
| Next detail, when shown | Next short text page within that section |
| Desktop wheel / trackpad | Vertical section navigation; horizontal scrolling or Shift+wheel changes architecture |

**Type or dictate** opens the spatial keyboard; dictation appears where the browser supports it. Done captures a draft. **Send to AI** consents to sending that answer to the configured provider. AI proposes a supported answer with quoted words, or asks for clarification. **Use proposed answer** highlights the choice; **Confirm answer** saves it. Stale/cancelled responses are discarded. Direct choices work when AI is unavailable.

Browsing cards or answers never commits an architecture selection. Unknowns
remain explicit choices where supported. Conditional/excluded options cannot be
recorded as viable. Costs stay **unpriced** until complete scenario rates exist.

**Menu** offers one setting at a time; **Next setting** cycles through:

- **Immersive session:** enter or leave immersive mode. **Close** returns to the card.
- **Recenter:** reposition the workspace relative to the current viewer in immersive mode.
- **Text size:** cycle 100%, 120%, 140%; verify comfort and clipping on the headset.
- **Advanced workspace:** open the original detailed interface.

Answer choices form a visible selection group, separate from the two main actions per focused step and contextual navigation
and Menu/Back/Close. Explicit pinch/click controls are the initial headset route.
Native hand swipes, animated zoom, neighbour thumbnails and a diagram card are
follow-up work; card transitions are currently instantaneous.

The transparent Triad Decision Prism appears in the browser preview and focused
card header. An accepted architecture selection pulses only its central nexus at
0.5 Hz for two cycles (four seconds), then returns to steady. Browsing, restored
choices and rejected selections do not trigger it. Reduced-motion preference
disables animation. Browser CSS lives in `styles/app-mark.css`; the spatial card
uses a separate renderer-safe vector and runtime opacity feedback.

## Advanced workspace and project editing

Open it through Menu, or add `?classic` to the app URL (`&classic` if a query
already exists). **Controls -> Focused carousel** returns to the focused view.

- **Product:** edit the name, specification, budget and rates; browse templates;
  add/remove workload blocks. Spatial editing opens a modal keyboard. Cancel
  leaves the project unchanged. Rates commit when all three are supplied
  (zero is valid), or all three are cleared. Partial drafts are not autosaved.
- **Requirements:** review constraints, assumptions, unknowns and contradictions.
- **Compare:** inspect diagrams and cost/operations/recovery/growth views.
  Requirement changes use Preview -> Apply or Cancel; Undo restores prior inputs
  under a new version. Inspect components for findings and responsibilities.
- **Review:** record a viable selection or uncertainty, edit optional rationale,
  export, and manage saved copies. Rationale edits preserve the selection.
- **Guided tour:** practice on a sandboxed sample. Exiting restores the original
  project; the tour does not replace its saved copy.

The browser-only **Your project and AI** form supports your own project,
currency/budget/rates, backup import and optional AI proposals. It is separate
from the immersive UI. Storage is per browser/device/origin, so importing on the
PC does not seed headset storage. Malformed imports preserve the current project.

## Export and retrieval

Each frozen export includes `decision.md`, SVG diagrams for all three
architectures, and `bundle.json` with context, inputs, selection and findings.

The development/preview server's inbox returns a retrieval URL and code. Open
that URL outside immersive mode, on the headset or another reachable device.
Default retention is 24 hours, up to 50 entries in server memory; expiry,
eviction, deletion or a server restart removes a copy. Anyone with the code can
retrieve it while it exists. Use the URL shown by the app rather than a fixed IP.

The latest frozen bundle is also kept in the local export shelf when storage is
available. Outside immersive mode, its browser drawer downloads the bundle or
individual files. In-memory-only storage is labelled when durable storage fails.
The local shelf/download route can work without the inbox; a static host does
not provide the server inbox or AI middleware.

In Advanced Review, **Delete server copy** removes the current inbox export.
**Delete saved local copy** attempts to remove both the project backup and local
export shelf. It leaves the currently open project in memory; later edits save
again. Failures are displayed rather than reported as successful deletion.

## Data and optional services

Project text, inputs and rationale are stored in this origin's browser local
storage. They are not automatically encrypted or synchronised by the app.
There are no app accounts or app analytics. The optional inbox sends a frozen
bundle to the same server. The app's storage and transmission paths are described
in [Data and privacy](../docs/DATA-AND-PRIVACY.md); older planning records should
be read alongside the current [consolidation record](../docs/CONSOLIDATION-2026-10-18.md).

**Dictation** appears only when browser support exists. It may transmit audio to
a browser/vendor speech service. It is optional and has a keyboard fallback;
late results for cancelled/replaced fields are discarded. Actual headset speech
support and permission behaviour still need verification.

**AI assistance** is optional; the core engine works without it. Configure it on
the server machine, never by putting provider credentials in browser fields:

```powershell
npm run ai:setup
npm run ai:setup -- --status
npm run ai:setup -- --remove
```

The wizard writes the ignored `config/ai.local.json`; status masks credentials.
Server configuration is re-read per request. Environment configuration also
supports `AI_ENABLED`, `AI_PROVIDER`, `AI_MODEL`, `AI_BASE_URL`, `AI_MAX_CALLS`,
`AI_ALLOWED_ORIGINS` and the relevant provider API key. The local file takes
precedence field by field. Keep keys out of source control.

A user consent checkbox precedes a request to the configured external provider.
Extraction proposals require quoted evidence and user acceptance; explanations
can cite only existing findings. Provider data handling applies to those requests.
See [AI integration decision](../docs/AI-INTEGRATION-DECISION.md).

## Development and validation commands

| Command | Purpose |
| --- | --- |
| `npm run check` | TypeScript, UIKitML parsing and unit tests |
| `npm test` | Domain, presenter and server tests |
| `npm run test:coverage` | Coverage with explicit scope and regression floors |
| `npm run test:e2e` | Test-mode build and real-pointer browser journeys |
| `npm run test:e2e:quick` | Reuse the existing test build; rebuild after source changes |
| `npm run build` | Optimized production files in `dist/` |
| `npm run dev:status` | Managed server/browser status |
| `npm run device:prepare` | New ignored physical-test run, manifests, fixtures and blank ledger |
| `npm run device:verify -- .local/device-tests/<run-directory>` | Verify candidate hashes and fixture outcomes |

The E2E build uses `.local/e2e-build/` and a loopback test server with AI disabled.
Its read-only test bridge is excluded from ordinary production builds. CI runs
validation; it does not deploy the app.

For physical testing, first build and start/reuse the managed server, then
prepare a run. Use **productionNetworkUrls** from `run.json` (ending in
`/dist/index.html`) for the optimized candidate. The root URL runs development
source. Keep those editions and their performance evidence separate. Regenerate
a run when its hashed source, scripts, assets or build files change; retain old
ledgers as historical evidence. Preparation/verification never mark device passes.

## Current verification and remaining work

Recorded for the visible-answers/AI candidate on **19 October 2026**: 94 unit tests, eight
UIKitML files, both focused and advanced pointer journeys, coverage, production
build and candidate integrity passed. Coverage was 96.6% lines, 87.8% functions,
88.9% branches within the explicitly declared scope. Bundle-size and dependency
comment warnings remain. These are recorded results, not checks rerun by reading
this README.

The user's first headset smoke test identified excessive surfaces and distant,
blurry text. The new focused layout's readability, comfort, navigation and export
retrieval still require physical retesting. Sustained performance and broader
physical scenarios remain unverified. Follow **Q18** first in the
[physical-device guide](../docs/PHYSICAL-DEVICE-TESTS.md), then relevant advanced
cases. See [carousel results](../docs/CAROUSEL-RESULTS-2026-10-19.md) for the exact
candidate and evidence boundaries. Local success does not establish Store readiness.

## Source map

| Location | Responsibility |
| --- | --- |
| `src/decision.ts`, `catalogue.ts`, `intake.ts` | Rules, illustrative architecture catalogue, questions and validated context |
| `src/session.ts`, `changes.ts` | Versioning, preview/apply/undo, selection and restore |
| `src/presenter.ts`, `carousel.ts` | Focused and advanced UI state; bounded carousel navigation |
| `src/workspace.ts`, `ui-host.ts` | IWSDK adapter, scene panels, XR lifecycle, input and storage |
| `src/project-keyboard.ts`, `text-entry.ts`, `dictation.ts` | Modal text/numeric entry and optional speech |
| `src/project-editor.ts`, `export-shelf.ts` | Browser editor and local export drawer |
| `src/diagram*.ts`, `workload.ts`, `tour.ts` | Advanced diagrams, workload library and practice tour |
| `src/exports.ts`, `server/export-middleware.ts` | Frozen decision artifacts and temporary retrieval inbox |
| `server/ai-*.ts` | Optional server-side AI gateway/configuration |
| `public/ui/`, `src/assets.ts` | Horizon-kit UI documents and manifest registration |
| `public/scenes/main.iwsdk.scene.json` | World-space placement and authored views |
| `tests/`, `tests-e2e/`, `scripts/` | Automated checks and operational helpers |

The domain/presenter modules avoid IWSDK dependencies, allowing meaningful tests
without a headset. Focused placement is at authored eye height, 1.35 m forward;
Recenter uses the real head only in immersive mode. Display-only dash substitution
preserves original Unicode text in project storage and exports; it is not proof
of complete glyph coverage.

## Delivery and references

- [Documentation index](../docs/README.md)
- [Developer manual](../docs/DEVELOPER-MANUAL.md): separate hosting, packaging and tester-distribution work
- [Carousel plan](../docs/CAROUSEL-PLAN-2026-10-19.md) and [results](../docs/CAROUSEL-RESULTS-2026-10-19.md)
- [Selective consolidation](../docs/CONSOLIDATION-2026-10-18.md): donor recovery archive and preserved boundaries

Packaging templates live in `packaging/`; PWA files live under `public/`. Their
presence does not mean a hosted, signed, uploaded or approved release exists.
Historical donor plans remain under `../docs/imported-meta-vr-glasses/`.
Cover/banner/mark artwork is retained under `artifacts/` for project presentation.
