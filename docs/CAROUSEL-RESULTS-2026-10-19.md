# Focused carousel candidate — 19 October 2026

Implemented the [first carousel iteration](CAROUSEL-PLAN-2026-10-19.md) in
`H:\Active Solutions\hackathon-meta\src`. Default route: one larger central
world-space reading card. Competing panels, islands and workload shelf are hidden
and shelf interactions cannot edit the focused session.

Horizontal navigation changes architecture; vertical navigation changes Summary,
Cost and Risks. The section stays fixed when changing architecture. Short text
pages replace long paragraphs. Desktop wheel/trackpad supports the axes; explicit
buttons provide the initial hand-pinch/controller route. Card changes are instant,
with no artificial camera movement. Native hand swipes, animated zoom, neighbour
thumbnails and a diagram card are deferred until physical feedback on this slice.

The short flow covers project acknowledgement, one answer at a time, browsing,
explicit selection or retained uncertainty, and export. No more than two main
actions appear per step; contextual navigation/Menu/Back/Close remain separate.
Unknown answers and domain viability gates are preserved. Browsing cannot edit
answers or select an architecture. Each following question starts on its recorded
answer. Back returns through questions and summary pages.

Menu contains session entry/exit, immersive-only recenter, text size and Advanced
workspace. Close restores the same card and detail page. Advanced Controls has a
Focused carousel return button. `?classic` opens the original workspace directly.
The browser editor, tour, keyboard, diagrams, richer engine, history and export
schemas remain available. This is a first focused prototype, not a replacement
for every advanced editing operation.

## Verified locally

- TypeScript passed; all eight UIKitML files parsed; 87 unit tests passed.
- Coverage gate: 96.4% lines, 87.1% functions, 89.3% branches in its explicitly
  declared scope, without relaxing thresholds.
- Both final real-pointer browser journeys passed: focused intake, both axes,
  wheel navigation, menu return, deliberate selection and export; advanced
  keyboard/rates/rationale, tour restoration, actual bundle download and deletion.
- Final focused journey asserts both competing-panel and workload-shelf hiding.
- Scene composition validated and rendered with carousel-panel present.
- Production build passed; normal production assets exclude the test bridge.
  Existing bundle-size and dependency-comment warnings remain.
- New run: `src/.local/device-tests/2026-10-19-4P4AWd/`.
  Source: `bc6c253215cbc9cb07f25ee2f746d0ff65ff699f149ef10ed7e0b0ef279a992f`.
  Build: `36d035b3a9ff4989a9308c0740f27829d7ba89c3eea7da07547ef7d879db6b4d`.
  All 30 production-file hashes and six fixture outcomes verified. All 18 physical
  cases begin NOT_RUN. Earlier prepared packs are superseded by this candidate.

## Next physical check

Open `https://192.168.31.87:8082/dist/index.html?carousel=20261019` in Quest Browser.
Use Menu to enter immersive, then Close. Follow Q18 in the
[physical guide](PHYSICAL-DEVICE-TESTS.md), starting with seated readability and
orientation on both axes. The earlier user-reported blur and density are not
considered resolved until this candidate is checked on the headset.

No physical headset actions, inference, deployment, publication or Git commit
were performed during this iteration.
