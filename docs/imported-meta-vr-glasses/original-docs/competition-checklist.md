# Meta VR Start Developer Competition 2026 - compliance checklist

> Execution update, 17 October: owner confirms New Experience provenance and Meta Quest 3 as the initial physical test device. Use [compliance/requirements-matrix.md](compliance/requirements-matrix.md) for current evidence; unchecked physical tests remain unverified. A recent repository date is not independent provenance proof. Hosting remains undecided; GitHub Pages is one permitted option, not compulsory.

Source: `docs/Meta VR Start Developer Competition 2026_ Accelerate your VR development journey.pdf`
(Official Rules). Dates: entry period ends **November 18, 2026, 12:00 PM PT**; judging to ~December 9;
winners ~December 11. The project must stay reachable, free of charge, until the winner announcement.
Once the entry period ends the submission cannot be changed.

## Eligibility and administrative (owner actions)

| Item | Rule | Status / action |
|---|---|---|
| Start Program membership | Representative must be a Start member at submission | Confirm membership; keep the confirmation email |
| Developer account | Active Meta developer account | Confirm |
| One entry per person / representative | Sec. 2 | Single submission from this repository |
| Division | *New Experience*: conceived and built after Sep 24, 2026; no pre-existing codebase | Repository history starts Oct 16, 2026. Confirm no earlier prototype existed; otherwise submit as *Adapted* and describe the new features |
| No Meta funding | Sec. 4.11 | Confirm none received |
| Permitted tools | Public SDKs only | IWSDK 1.0.1, Horizon kit, three.js: all public |
| Third-party licences | Sec. 4.12 | Lucide (ISC), pmndrs/uikit (SIL/MIT per package), IWSDK (MIT). Add `LICENSE` and a `THIRD_PARTY_NOTICES.md` |

## Track, division and content requirements

| Requirement | The test (from the rules) | Where we stand |
|---|---|---|
| Track: **Productivity** | Multi-panel workspace, creative/decision tool | Matches the product exactly |
| **Hands-first** (required for Productivity) | Complete the entire experience without ever pairing a controller | Every action is a point-and-pinch on a Horizon Button or pointer div; text entry via in-VR keyboard + optional dictation. Verify on device (checklist C) |
| Seated-optimised | Every interaction within a 2 ft radius | Locomotion off; panels on a 1.5 m arc at eye height; nothing requires standing or turning >45 deg |
| Easy to get into / out of | Fast cold start, clean pause/resume, satisfying in <= 10 min | Static site, no login; autosave on every change; Resume on Home. Measure cold start (<4 s) |
| Original, not a wrapper | Remove the third-party service: is there still a project? | Deterministic engine is the product; AI is optional and disabled in the public build |
| English only | Sec. 4.16 | All copy English |
| No brand names / corporate logos | Sec. 4.19 | Vendor-neutral catalogue ("External hosting", "Organization site"); enforced by `tests/markup.test.ts` |
| No association with Sponsor implied | Sec. 4.18 | No Meta/Quest/Horizon wording in app copy or store-style assets; enforced by the same test |
| No identifiable persons | Sec. 4.17 | No photos or names in assets or video |
| Content rating | Suitable for public forum; Developer Content Guidelines | Business content only |

## Submission package (Devpost)

| Item | Requirement | Plan |
|---|---|---|
| Hosted link (IWSDK path) | Public HTTPS URL judges can open on a headset | GitHub Pages via `.github/workflows/pages.yml`; custom domain optional. Keep `main` frozen after Nov 18 |
| Demo video | < 3 min, real footage from a headset or the XR simulator, public on YouTube/Vimeo, honest representation, not AI-generated | Record with `metavr capture` on Quest 3; script: 20 s problem, 90 s journey (two entrances, what-if, diagrams, export), 20 s outcome |
| Text description | Inspiration, how it was built, future plans, target launch date | Draft in `docs/submission/description.md` (to write); launch date = roadmap M7 |
| Track + division selection | Productivity; New Experience (or Adapted, see above) | |
| Screenshots / changelog | Recommended | Capture from device; keep changelog from git history |
| Retain copies | Rules require keeping a copy of everything submitted | Tag the release `competition-2026`; archive video and text in `docs/submission/` |

## Judging criteria (equal 25 % each) and what we do about them

- **Innovation & creativity**: a decision workspace instead of a game; spatial depth used for side-by-side
  architectures; hands-first from the first second. Phase 2 (3D islands) is the main lever here.
- **Experience design**: clear onboarding on the Home panel, one question per card, every change explained
  in the status line, FoV-aware layout (essential UI within ~60 deg), seated.
- **Technical implementation**: hand tracking, >= 60 fps (target 72/90), zero crashes; traces in the PR.
- **Polish & presentation**: Horizon kit throughout, consistent copy, sound cues (optional), honest trailer.

Special awards worth targeting: *Best First Five Minutes* (onboarding + sample entrances), *Boldest Original
Concept*, *Best Accessibility Forward* (icons + text for every state, one-hand use, no audio required,
dictation as an alternative to typing). *Best Agentic Interaction* only if the hosted AI path ships and the
"take it away" test still passes.

## Schedule to the deadline (Oct 16 -> Nov 18)

| Week | Focus | Exit |
|---|---|---|
| Oct 16-20 | Phase 0 done (this commit), Pages live, device smoke test of the new panels | Checklist A and B green |
| Oct 21-27 | Phase 1 polish on device: sizing, key hit areas, sound/haptic cue, text scale setting | Checklist C green; 3 external hands-only testers finish the journey |
| Oct 28-Nov 7 | Phase 2 (3D architecture islands + live what-if animation) behind a toggle so the panel flow always works | 72/90 Hz with islands visible |
| Nov 8-12 | Freeze features; perf traces; fix list; write description; record trailer | Zero P0/P1 |
| Nov 13-16 | Buffer; final Pages deploy; tag `competition-2026`; submit on Devpost (do not wait for the last day) | Submitted |
| Nov 17-18 | Only hotfixes that do not change the experience | |
