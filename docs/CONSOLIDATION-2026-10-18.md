# Selective consolidation — 18 October 2026

Status: selective consolidation completed and locally verified. Physical-device tests remain NOT_RUN.

Canonical project folder: `H:\Active Solutions\hackathon-meta`.
Application/command directory: `H:\Active Solutions\hackathon-meta\src`.
Retired donor working folder: `H:\Active Solutions\meta-vr-glasses`.

The donor was left unchanged (including its pre-existing dirty
`coverage/lcov.info`). It is no longer an executable dependency of the combined
application. The source and history needed to recover it are preserved at
`../archives/meta-vr-glasses-2026-10-18/`: `history.bundle` passes Git bundle
verification; `working-tree.zip` contains 116 tracked/nonignored files, checked
byte-for-byte against `working-tree-manifest.json`. Generated dependency,
browser, runtime and editor caches are excluded. No source folder was deleted.

## Ports and deliberate boundaries

- Pure keyboard state machine and tests; modal UIKitML keyboard, adapted to
  the existing main-panel position. Edit title, specification, budget/rates and
  rationale in the headset. Cancel never commits; stale drafts are rejected;
  all three rates commit atomically, retaining unknown/unpriced semantics.
- Rationale is optional, bounded, preserved through backup/restore and undo,
  and safely fenced in Markdown. Editing rationale retains selection. Legacy
  donor backups acquire unknown identity rather than invented evidence.
- Frozen local export shelf with browser download drawer, and deletion of
  both local keys. In-memory-only shelf status is explicit on storage failure.
  The existing server retrieval-code route and HTTP/2 fix remain intact.
- Storage writes/deletion propagate failure to the UI instead of reporting
  false success. The browser editor retains its sticky feedback.
- Optional capability-detected dictation with an external-processing notice,
  keyboard fallback and rejection of late results for cancelled/replaced fields.
  No speech service was invoked in verification. Actual headset/browser speech
  support and permission flows remain unverified.
- Coverage and real-pointer browser regression commands plus validation-only
  CI. Normal builds exclude the read-only test bridge. The dedicated test build
  and loopback server do not invoke AI. Remote CI/clean-install execution was
  not performed here.
- Original release, compliance, privacy, rights and hosting documents are
  preserved under `imported-meta-vr-glasses/`. They are historical inputs, not
  automatically transferred compliance or physical test results. The donor's
  auto-publishing Pages workflow was not activated. Its optional sound/haptics
  and unsupported input-internal adjustments remain recoverable in the source
  archive; they were not enabled in the combined app.

The richer engine, identity/federation evidence, workload library, teaching
templates, tour restoration, preview/apply/cancel/undo, Unicode preservation,
export v2 format, production icon subset and device-integrity tooling remain
authoritative. No whole-controller, whole-scene or domain-engine replacement
was performed. Both backup implementations used the same v1 label despite
different fields; the combined restore preserves rich inputs and donor rationale.

## Local validation

- TypeScript and seven UIKitML files passed; 81 unit tests passed.
- Coverage gate passed: approximately 96.6% lines, 87.9% functions, 89.7%
  branches in the explicitly listed unit-testable set. Regression floors are
  95/85/85%, with a 70% per-file line floor; runtime/DOM adapters and retained
  scaffold examples are excluded explicitly and require separate tests.
- Pointer-driven built-app journey passed in two consecutive final runs: custom name, cancel, workload,
  atomic rates including zero, confirmed selection, rationale, tour exit restoring
  the original project, server export, local shelf and deletion. The keyboard
  modal is inside the default desktop viewport; a compact baseline/final layout
  sheet is `src/artifacts/ui-runtime-review.jpg` relative to the project folder.
- Final production build passed, main JS approximately 2.55 MB minified /
  0.71 MB gzip. Existing size/dependency-comment warnings remain. A source scan
  confirmed `__architectureTest` absent from the production entry.
- New run: `src/.local/device-tests/2026-10-18-vXjGJP/`. Source fingerprint
  `e54e989df196c2b38fcacf6dfbfbadef2f36381bac5f35ca70db0cc6ce52f513`;
  build fingerprint `ea3d75c202d0d5b8aff77edb6a9bc44dabb1df37e38f8e13f7866a5b12d5ff1d`.
  All 29 build-file hashes and six fixture outcomes verified. All 17 physical
  results remain NOT_RUN; the physical guide includes the merged keyboard,
  rationale, dictation fallback, shelf and deletion checks.

The managed server/app/editor are ready on port 8082. Network candidate:
`https://192.168.31.87:8082/dist/index.html`. Recheck reachability/device state
before using it. No deployment, publication, inference, Git commit, source-folder
deletion or physical device mutation was performed.

Once working only from the canonical folder, the donor working checkout can be
removed independently of the app. Keep the recovery archive and the canonical
folder together. Existing old browser storage remains per origin/device; it
does not move automatically when a directory is removed.
