# Device and runtime verification ledger

17 October 2026. **Physical Quest 3 results: not yet recorded.** Owner confirmed Quest 3 availability, not completion of any test. Capture model, OS, browser version, source snapshot/archive hash, exact URL/package version and test date before executing.

## Local baseline

- TypeScript and all four Horizon UIKitML panels pass after Windows-safe CLI invocation.
- Unit suite: 93 passing tests, including deletion-failure warning and re-save behavior.
- Coverage gate: passes at 98.4% lines, 98.3% functions, 98.4% branches over its defined covered modules. Runtime glue is not covered by these percentages.
- Negative coverage check: a temporary unloaded source module was correctly rejected; the temporary module was then removed.
- Fresh production build passes after deletion handling and dictation disclosure changes. Large-main-chunk warning remains; hardware startup/performance are unverified.
- Browser runtime suite: **3/3 pass**, Chromium headless shell 156.0.8078.4, Playwright 1.64.0, software WebGL, Windows. Pointer-driven layout, journey/export and reload/resume tests completed in 39.3 seconds. This is not physical hands/headset evidence.
- Matching browser installed under ignored `.temp/playwright`, avoiding another workspace's shared installation lock. Reproduce locally in PowerShell with `$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.temp/playwright'` followed by `npm run test:e2e`. A normal Playwright install or CI does not need this local path override.
- metavr device list returned no connected devices during this session. Physical validation awaits connection and a tester.
- CI and clean registry installation: not executed on a remote runner; local passing checks are not CI evidence.
- No Git metadata in this checkout. Do not invent commit IDs or claim history coverage; archive/hash the candidate when frozen.

## Physical Quest 3 session protocol

For each row record Pass/Fail, actual behavior, logs/capture reference and retest result. All rows below start **Unverified**.

| Test | Steps | Expected / evidence |
|---|---|---|
| Q3-01 hosted cold start | Fresh browser load of exact public URL; record network/cache state | Usable tracked frame timing; no missing assets or development backend dependency |
| Q3-02 organization hands-only | Controllers absent; enter title/specification; acknowledge; answer all questions; inspect panels/islands; what-if; rationale; export | No controller/desktop dependency; complete moment timed; saved outputs retrievable |
| Q3-03 greenfield hands-only | Repeat Q3-02 for greenfield path | Correct path-specific questions/findings and usable result |
| Q3-04 seated and text scaling | Stationary seated user; M/L/XL; recenter at varied seated heights; open keyboard/inspector/diagrams | No required lean/large physical movement, clipping or unreadable essential UI; note comfortable viewing angles |
| Q3-05 one-hand operation | Complete essential controls with left hand, then right | Reliable targeting and pinch; note failures/fatigue |
| Q3-06 export and restore | Export Markdown/SVG/bundle; retrieve outside immersion if necessary; reload; Resume | Files and saved decision agree; no data loss; clear hand-operable route |
| Q3-07 delete and failures | Delete saved copy; reload; verify absent; separately edit after deletion to confirm disclosed re-save behavior | Truthful result; downloaded files explicitly separate; storage denial yields warning rather than false success |
| Q3-08 focus/system gestures | Open system overlay, reserved gesture, tracking interruption; return | Rendering/input/hand visibility follow applicable Input VRCs; no unintended action |
| Q3-09 input switching | Hands → controllers → hands during several stages | No frozen, duplicate or stale input; selected input metadata matches claim |
| Q3-10 pause/resume | Remove headset, system pause, return; repeat during keyboard entry | Correct pause and preserved coherent state; no frozen audio/input |
| Q3-11 performance | Capture worst-case all-island comparison, typing, what-if and diagram stages | Meets current declared refresh-rate requirements; no sustained violation; attach trace |
| Q3-12 offline/storage | Disconnect after load; separately first-load without cache; denied/full storage | Clear limits and notices; no misleading offline promise or lost work without warning |
| Q3-13 signed package | Install final signed artifact; launch from library; exit/relaunch; update | Verified origin/app mode, signature and permissions; acceptance journeys remain functional |
| Q3-14 multiple users | Use distinct entitled headset profiles with same packaged app | Correct per-profile behavior/isolation and full functionality |

Do not collect private project data in shared recordings. Use the provided samples or artificial test names. Failed or skipped hardware tests remain visible; emulator results use a separate heading with their actual environment.
