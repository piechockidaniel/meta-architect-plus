# Focused carousel iteration

User smoke-test findings: too many simultaneous surfaces, distant/blurry text,
too much reading, and difficulty staying focused. These are reported physical
observations, not automated pass results.

## First implementation

1. One central world-space reading surface, larger type, no surrounding text
   panels or islands in focused mode. Keep the camera and physical viewpoint stable.
2. Horizontal navigation switches Cloud / On-premise / Hybrid. Vertical navigation
   switches Summary / Cost / Risks. Keep the section when changing architecture.
3. Short text pages, no nested scrolling paragraphs. Explicit navigation controls
   work with existing click/pinch selection; desktop wheel/trackpad is optional.
4. Separate browse, decide, and export states. Two main actions at most per state,
   with contextual navigation/Menu/Back/Close. Unknown remains a real answer.
5. Put session entry/exit, recenter, text size and advanced mode inside one menu.
6. Preserve the existing engine, confirmation gates, persistence, export schemas,
   and advanced editing/tour. Keep original workspace available with `?classic`.

This first version uses instantaneous card changes as its reduced-motion default.
It does not move the camera, animate the whole environment, or rely on hover.
The focus surface is centred at authored eye height, 1.35 m forward, about 1.2 m
wide. Physical comfort and readability must be evaluated on the headset.

## Validation and exit criteria

- Unit checks: bounded axes; retained section; browsing cannot change a snapshot;
  explicit selection and uncertainty; unknown answers; hidden competing surfaces.
- Real pointer browser checks: short intake, both axes, wheel fallback, menu return,
  recorded choice, and actual export; preserve advanced editor regression.
- Typecheck, UIKitML parsing, coverage gate, production build, new integrity manifest.
- Headset retest: read central card seated; switch both axes; know current location;
  no accidental selections; use Menu/Close and session exit; compare 100% and larger
  text. Record readability, blur, confusion and discomfort separately.

Physical retest is pending. Native hand-swipe recognition, animated zoom, neighbour
thumbnail cards, and a spatial-diagram card are follow-up candidates after this
central-card interaction passes. Explicit buttons provide the initial XR route.
