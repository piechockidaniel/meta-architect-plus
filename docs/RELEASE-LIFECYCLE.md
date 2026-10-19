# Meta application lifecycle and the Alpha (internal testers) step

Updated: 2026-10-11
Status: process reference, grounded in the packaging/hosting skills already
vendored in this repo (`devpost-hackathon/.claude/skills/iwsdk-pwa-packaging`,
`.../iwsdk-hosting`) plus the Meta Horizon Store distribution model those
skills automate against. Recheck the live Developer Dashboard UI and the
competition rules before acting — dashboards change their labels more often
than APIs do, and I cannot browse them from here.

## Two separate "release" tracks — do not conflate them

1. **Devpost/competition submission.** A public build URL, a demo video and
   submission text on devpost.com. Governed by `docs/RELEASE-BASELINE.md` and
   the competition rules page. No Meta Horizon Store app is required for this.
2. **Meta Horizon Store distribution lifecycle.** A packaged Quest app
   (APK/AAB) registered in the **Meta Quest Developer Dashboard**, uploaded
   through build **channels**, installed on real headsets via **Meta Quest
   Developer Hub (MQDH)** or `adb`. This is the track your question is about,
   and the one "internal testers" belongs to.

You can — and for this project probably should — do track 2 even though the
competition only needs track 1: it gives you real-headset testers before any
public judging, independent of whether you also submit a hosted web build.

## The Store lifecycle, stage by stage

```
Draft app (Dashboard)
   -> Build uploaded to a channel: ALPHA -> BETA -> RC -> STORE
   -> Channel members test the build from the Quest Library
   -> Promote the same build (or a newer one) to the next channel
   -> STORE channel + "Submit for review" -> public Store listing
```

- An **app entry** in the Dashboard is not itself versioned; **builds** are,
  and each build is uploaded to exactly one channel at a time.
- **ALPHA / BETA / RC** are pre-release test channels with no store review
  gate — you control exactly who can install from them. **STORE** is the
  production channel and is what eventually goes through Meta's review.
- Promoting a build between channels (e.g. ALPHA → BETA) does not rebuild or
  re-sign anything; it is a Dashboard action on an already-uploaded build.
- Internal testers are **people you add to the ALPHA channel's release
  channel membership** in the Dashboard (Distribution → Channels → Alpha →
  add by Meta account/email). They receive an invite, accept it on their Quest
  account, and the app then appears in their headset's Library under that
  channel. This is a Dashboard/account action, not something the CLI does —
  `ovr-platform-util` only uploads the binary to the channel you name.

## What has to exist before an Alpha upload is possible

Your app today is an installable-but-unpackaged **immersive WebXR PWA**
(IWSDK, `world.xr.mode: "vr"`). The Store needs a signed **Android
TWA (Trusted Web Activity) APK** that wraps the live web app, not the web app
itself. Packaging reads the app **over the network**, so hosting comes first.

| Step | What it produces | Skill/owner |
| --- | --- | --- |
| 0. Confirm app mode | Immersive (already true — auto-enter-XR is required) | `iwsdk-pwa-packaging` step 0 |
| 1. Add auto-enter-XR | `world.launchXR()` gated on `getDigitalGoodsService`, in `src/index.ts` | `iwsdk-pwa-packaging` step 1 — **not yet in this repo** |
| 2. Host the built app | A public HTTPS origin serving `dist/` | `iwsdk-hosting` — **not yet hosted; no origin exists** |
| 3. Web app manifest + icons | `public/manifest.webmanifest`, 192/512/512-maskable icons, live on the origin | `iwsdk-pwa-packaging` step 3 — **not yet created** |
| 4. Package the APK | `bubblewrap init`/`update`/`build` → `app-release-signed.apk`; publish `.well-known/assetlinks.json` | `iwsdk-pwa-packaging` step 4 — **requires a one-time interactive `bubblewrap doctor`** |
| 5. Upload to ALPHA | `ovr-platform-util upload-quest-build --channel ALPHA ...` | `iwsdk-pwa-packaging` step 5 |
| 6. Add internal testers | Dashboard → Distribution → Channels → Alpha → add testers | Dashboard action, org admin or app admin |
| 7. Testers install | From the Quest Library (after accepting the invite) or sideload via MQDH for quicker iteration | Tester's headset |

Update: step 1 (auto-enter-XR), the web manifest, icons and the packaging
templates are now in the repository; the remaining work is the operational
part (hosting, keystore, APK, Dashboard) described step by step in
`DEVELOPER-MANUAL.md`. Concretely, before an Alpha build can be produced:

- Write the auto-enter-XR block (`iwsdk-pwa-packaging` step 1); verify it
  does **not** break the browser Enter-XR button (it is gated correctly only
  when `getDigitalGoodsService` is absent, i.e. in a normal tab).
- Choose and stand up a host for the built app (Vercel is the skill's
  recommendation; Route A if nothing exists yet). The export inbox and AI
  middleware need a Node server, so a static host alone (e.g. GitHub Pages)
  will silently disable those two optional features — acceptable for an
  internal Alpha, but should be a conscious choice, not a surprise.
- Generate `manifest.webmanifest` and icons and publish them.
- Decide and record the signing key policy once (new keystore vs. reuse) —
  this choice is permanent for the app's lifetime.
- Create the app entry in the Developer Dashboard to get a numeric App ID
  (can stay `0` for sideload-only testing, but the real ID is required before
  any Store-channel upload).

## First-run blockers to expect (so they don't look like failures)

- `bubblewrap doctor` needs a real interactive terminal once, to accept the
  Android SDK licence — cannot be scripted or run by an agent.
- The **first** `ovr-platform-util upload-quest-build` call almost always
  fails with *"must first agree to our Developer Distribution Agreement"*.
  Only an **org admin** can sign that agreement in the Dashboard; then retry
  the identical upload command.
- `--age-group` is required on every upload (`TEENS_AND_ADULTS` /
  `MIXED_AGES` / `CHILDREN`) — decide this for the project once.
- A successful upload returns a **Build ID** and a test-results URL
  (automated VRC/compliance checks) — check it before inviting testers.

## Recommended sequencing for this project

1. Finish the device-verification backlog already tracked in
   `docs/IMPLEMENTATION-STATUS.md` (symbols, tour, hands-only completion)
   using sideloaded dev builds — no Store upload needed for this.
2. Decide hosting (Vercel is the path of least resistance and keeps the
   export inbox and AI gateway working).
3. Add auto-enter-XR, manifest + icons, package with bubblewrap, sideload and
   verify on your own headset first — this is the same build you would upload.
4. Create the Dashboard app entry, resolve the DDA blocker, upload to
   **ALPHA**, add your internal testers, and only then iterate with their
   feedback.
5. Keep the Devpost submission (a plain hosted URL) independent of whether an
   Alpha Store build exists — the competition does not require one.

## Open decisions needed from you

- Keystore: generate new, or do you already have one for this org?
- Numeric Horizon App ID and org for the Dashboard entry (or proceed with
  `applicationId: 0` for sideload-only testing first).
- Hosting choice (Vercel by default per the skill, unless you already have a
  host).
- Age-group rating and the list of internal testers (Meta accounts/emails) to
  invite to the ALPHA channel.
- Whether the export inbox and AI features should be reachable on the Alpha
  build's public host, given `docs/DATA-AND-PRIVACY.md`.
