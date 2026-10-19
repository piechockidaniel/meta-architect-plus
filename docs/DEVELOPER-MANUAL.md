# Developer manual: from an empty Windows 11 PC to an Alpha build on the Meta developer portal

Updated: 2026-10-11
Platform: Windows 11 64-bit, PowerShell, no tools installed at the start.
Goal: run the workspace locally, test it on a Meta Quest 3, package it as a
Meta Horizon (Quest) app, upload it to the **ALPHA** channel of your app in the
Meta Quest Developer Dashboard, and invite internal testers.

Every command is PowerShell unless stated otherwise. Placeholders are written
`<LIKE-THIS>`; replace them with your values. Commands that need a real
interactive terminal (licence prompts, browser logins) are marked **(interactive)**.
Where a step depends on a web UI whose labels change over time, the manual tells
you what to look for rather than the exact button text.

---

## 0. What you will end up with

```
Windows PC ──npm run dev──► https://localhost:8081  (browser + emulator)
          └─Quest 3 on the same Wi-Fi ► https://<PC-IP>:8081 (dev testing)

npm run build ► dist/ ──vercel deploy──► https://<PROJECT>.vercel.app  (= <DOMAIN>)
                                               │
                      bubblewrap build ◄───────┘  (wraps <DOMAIN> into a signed APK)
                               │
          adb install (sideload, verify) ──► ovr-platform-util upload --channel ALPHA
                                                        │
                                  Developer Dashboard: add testers ► they install from the Library
```

The APK is a thin wrapper (a Trusted Web Activity) that loads your hosted web
app. Web changes ship by redeploying; only native changes (package id, icon,
version, app mode, signing) need a new APK and a new upload.

Time budget for a first pass: about half a day, most of it waiting on
downloads and account approvals.

---

## 1. Accounts (do these first; some have waiting periods)

| Account | Where | Why |
| --- | --- | --- |
| Meta account + **Meta developer organization** | developers.meta.com → Horizon OS / Quest developer dashboard | Required for Developer Mode on the headset, the Dashboard app entry, and uploads. Organization creation asks for verification (phone or payment method) and one org admin must later accept the Developer Distribution Agreement. |
| Meta Horizon mobile app on your phone, signed in with the same Meta account | App store on your phone | Turns on Developer Mode for the headset. |
| Vercel account (free) | vercel.com | Hosts the built web app at a public HTTPS URL. Any other HTTPS host works too (see §6.4). |
| GitHub/Git hosting (optional) | github.com | Where the repository lives; not required for the build. |

Tip: create the developer organization now; verification can take a while and
nothing in §7 works without it.

---

## 2. Install the tools

Open **PowerShell as a normal user** (Start → type `PowerShell`). `winget` is
built into Windows 11.

```powershell
# 2.1 Git
winget install --id Git.Git -e --source winget

# 2.2 Node.js LTS (the project requires Node 22.12+ or 24+; LTS satisfies this)
winget install --id OpenJS.NodeJS.LTS -e --source winget

# 2.3 Optional editor
winget install --id Microsoft.VisualStudioCode -e --source winget
```

Close and reopen PowerShell so `PATH` updates, then verify:

```powershell
git --version          # git version 2.x
node --version         # v22.12.0 or newer (v24.x is also fine)
npm --version          # 10.x or newer
```

**2.4 Meta Quest Developer Hub (MQDH).** Download the Windows installer from
the Meta developer site (Tools → Meta Quest Developer Hub), install it, and sign
in with your Meta developer account. MQDH bundles **ADB** (the Android Debug
Bridge) and is the easiest way to pair the headset, sideload APKs and read
logs. After installing, find the ADB path in MQDH (Settings → "ADB path" or
similar) and add that folder to your user `PATH`, or use the full path in the
commands below. Check:

```powershell
adb version            # Android Debug Bridge version 1.0.41 or newer
```

If `adb` is not found, open the folder shown in MQDH and run `.\adb.exe version`
there, or add it to PATH: Settings → System → About → Advanced system settings
→ Environment Variables → User `Path` → New.

**2.5 Tools that install themselves later:** the Android SDK and a Java 17 JDK
are downloaded by `bubblewrap doctor` in §6.2; the Vercel CLI runs through
`npx`; `ovr-platform-util.exe` is downloaded from the Dashboard in §7.3. Nothing
else is needed.

---

## 3. Get the code and run it on your PC

```powershell
mkdir C:\dev -Force
cd C:\dev
git clone <YOUR-REPO-URL> hackathon-meta
cd C:\dev\hackathon-meta\devpost-hackathon

npm install            # use install, not ci: package-lock may be refreshed on first install
npm run check          # typecheck + UIKitML validation + 57 tests; all must pass
```

Start the development server:

```powershell
npm run dev
```

This starts the IWSDK managed dev server on **https://localhost:8081** with a
locally generated certificate and opens a managed Chromium window that includes
the IWER headset emulator. The first time, accept the certificate warning. You
should see the decision panel, the controls panel and the "Start the sample
journey" button. Try: Start → Take the guided tour.

Useful while developing:

```powershell
npm run dev:status     # is the managed server/browser up?
npm run dev:down       # stop it
npm test               # run only the tests
npm run ui:validate    # validate the Horizon-kit panels
```

The dev server also prints **network URLs** such as `https://192.168.1.23:8081/`.
That is what the headset will use in §4.

---

## 4. Put the headset into developer mode and test the dev build

**4.1 Developer Mode (once).** On your phone, open the Meta Horizon app →
Menu → Devices → select your Quest 3 → **Developer Mode** → on. This only
appears once your Meta account belongs to a verified developer organization (§1).

**4.2 USB debugging (once).** Connect the headset to the PC with a USB-C data
cable. Put the headset on: a dialog asks to **Allow USB debugging** — tick
"Always allow from this computer" and accept. Then on the PC:

```powershell
adb devices            # one line with your headset serial and "device" (not "unauthorized")
```

MQDH → Device Manager shows the same headset; keep it "Active".

**4.3 Test the dev server on the headset.** With both devices on the same Wi-Fi:

1. Keep `npm run dev` running on the PC.
2. Note the network URL printed by the dev server (e.g. `https://192.168.1.23:8081/`).
3. In the headset, open the **Browser**, enter that URL, accept the certificate
   warning (Advanced → proceed), and press **Enter immersive** on the controls
   panel (or the page's Enter XR button).

If the headset cannot reach the PC (corporate Wi-Fi, client isolation), use USB
instead:

```powershell
adb reverse tcp:8081 tcp:8081
```

and open `https://localhost:8081/` in the headset browser.

What to verify now, with hands only (no controllers): the start screen, the
guided tour, selecting symbols on the 3D islands, dragging a block from the
library shelf onto an island, Recenter and Text size, and the export flow
(on the dev server the **export inbox** works and shows a retrieval code).
Record anything unreadable or unreachable in `docs/IMPLEMENTATION-STATUS.md`.

---

## 5. Prepare the app for packaging (already done in the repository)

These files are committed, so nothing to author — verify they are present and
adjust the texts if you rename the app:

| File | Purpose |
| --- | --- |
| `src/index.ts` | Auto-enters VR when launched as an installed app (`getDigitalGoodsService` gate). Browser tabs keep the normal Enter buttons. |
| `public/manifest.webmanifest` | Installable web app manifest: name `Architecture Decision Workspace`, short name `ArchDecide`, landscape, standalone, icons. |
| `public/icons/icon-192.png`, `icon-512.png`, `icon-512-maskable.png` | Launcher icons; the maskable one is full-bleed and opaque as required. |
| `index.html` | Links the manifest, theme colour and icon. |
| `packaging/twa-manifest.template.json` | Template for the APK wrapper configuration (§6.3). |
| `packaging/assetlinks.template.json` | Template for Digital Asset Links (§6.5). |

Build once and look inside the output:

```powershell
npm run build
dir dist               # index.html, assets\, icons\, manifest.webmanifest, scenes\, ui\
```

If you change the app name, change it in all three places: `manifest.webmanifest`
(`name`, `short_name`), `index.html` (`<title>`), and later `twa-manifest.json`.

---

## 6. Host the web app and package the APK

### 6.1 Deploy to Vercel (gives you `<DOMAIN>`)

```powershell
cd C:\dev\hackathon-meta\devpost-hackathon
npx -y vercel@latest login        # (interactive) choose e-mail or GitHub; confirm in the browser
npx -y vercel@latest whoami       # prints your user name when logged in
npm run build
npx -y vercel@latest deploy --prod --yes
```

The CLI prints two URLs. Use the **canonical alias** of the form
`https://<PROJECT>.vercel.app` as `<DOMAIN>` — **not** the long hashed
per-deployment URL, which returns 401 under deployment protection and would be
baked into a broken APK. If you are in a Vercel team, add `--scope <team-slug>`
(`npx -y vercel@latest teams ls` lists the slugs).

Verify the hosting contract before anything else depends on it:

```powershell
$D = "<PROJECT>.vercel.app"
foreach ($u in "/", "/manifest.webmanifest", "/icons/icon-512.png", "/icons/icon-512-maskable.png") {
  "$u " + (curl.exe -s -o NUL -w "%{http_code} %{content_type}" "https://$D$u")
}
```

All four must be `200`; the manifest must report `application/manifest+json`.

Note: Vercel serves the static build only. The optional **export inbox** and
**AI gateway** are Vite dev/preview-server middlewares and are therefore
unavailable on this host; the app detects that and falls back to browser
downloads, and AI stays disabled. That is fine for an internal Alpha. If you
need those features on the hosted build, see §6.4.

### 6.2 Install bubblewrap and let it fetch the Android toolchain (once)

```powershell
npm install -g @meta-quest/bubblewrap-cli
bubblewrap doctor                 # (interactive) answer Yes to install JDK 17 and the Android SDK, accept the SDK licence
```

This downloads into `%USERPROFILE%\.bubblewrap` and writes
`%USERPROFILE%\.bubblewrap\config.json`. Locate the two tools you will use:

```powershell
$KT = Get-ChildItem "$env:USERPROFILE\.bubblewrap\jdk" -Recurse -Filter keytool.exe | Select-Object -First 1 -ExpandProperty FullName
$BT = Get-ChildItem "$env:USERPROFILE\.bubblewrap\android_sdk\build-tools" | Sort-Object Name | Select-Object -Last 1 -ExpandProperty FullName
$KT; $BT                          # both paths must print
```

### 6.3 Create the signing key (once, and keep it forever)

The key is permanent: every future update must be signed with the same keystore,
alias and package id. Create it **outside** the repository:

```powershell
mkdir C:\dev\archdecide-twa -Force
cd C:\dev\archdecide-twa
& $KT -genkeypair -v -keystore C:\dev\archdecide-twa\android.keystore `
  -alias android -keyalg RSA -keysize 2048 -validity 10000 `
  -storepass "<STRONG-PASSWORD>" -keypass "<STRONG-PASSWORD>" `
  -dname "CN=Architecture Decision Workspace, O=<YOUR-ORG>, C=<CC>"

& $KT -list -v -keystore C:\dev\archdecide-twa\android.keystore -alias android `
  -storepass "<STRONG-PASSWORD>" -keypass "<STRONG-PASSWORD>" | Select-String "SHA256"
```

Copy the `SHA256:` fingerprint (uppercase, colon-separated) — §6.5 needs it.
Back up `android.keystore` plus the alias and passwords together (password
manager + offline copy). Losing them means the app can never be updated, only
replaced under a new package name.

### 6.4 Write `twa-manifest.json` and build the APK

```powershell
Copy-Item C:\dev\hackathon-meta\devpost-hackathon\packaging\twa-manifest.template.json C:\dev\archdecide-twa\twa-manifest.json
notepad C:\dev\archdecide-twa\twa-manifest.json
```

Edit: `packageId` (e.g. `com.yourorg.archdecide` — permanent, choose once),
`host` and the three URLs (`<PROJECT>.vercel.app`), `signingKey.path`
(absolute path to the keystore, with doubled backslashes as in the template),
`applicationId` (`"0"` until §7 gives you the real numeric App ID). Keep
`isMetaQuest: true` and `horizonOSAppMode: "immersive"` — this app is an
immersive WebXR app; `"2D"` would open it with a URL bar.

Build:

```powershell
cd C:\dev\archdecide-twa
$env:BUBBLEWRAP_KEYSTORE_PASSWORD = "<STRONG-PASSWORD>"
$env:BUBBLEWRAP_KEY_PASSWORD      = "<STRONG-PASSWORD>"
bubblewrap update
bubblewrap build
dir *.apk                          # app-release-signed.apk
```

Verify what you built (package name, app mode, and that the signer matches your keystore):

```powershell
& "$BT\aapt.exe" dump badging .\app-release-signed.apk | Select-String -Pattern "package:|APP_MODE|OCULUS"
& "$BT\apksigner.bat" verify --print-certs .\app-release-signed.apk | Select-String "SHA-256"
```

The SHA-256 here must equal the keytool fingerprint from §6.3.

### 6.5 Publish the Digital Asset Links (second deploy)

The installed app refuses to launch ("will not launch") until your origin
vouches for the package and certificate:

```powershell
cd C:\dev\hackathon-meta\devpost-hackathon
mkdir public\.well-known -Force
Copy-Item packaging\assetlinks.template.json public\.well-known\assetlinks.json
notepad public\.well-known\assetlinks.json     # set package_name and the SHA256 fingerprint
npm run build
npx -y vercel@latest deploy --prod --yes
curl.exe -s "https://<PROJECT>.vercel.app/.well-known/assetlinks.json"   # must print your JSON
curl.exe -s -o NUL -w "%{http_code}`n" "https://<PROJECT>.vercel.app/android.keystore"  # must be 404
```

Commit `public/.well-known/assetlinks.json` (it is public by design). Never
commit the keystore; `.gitignore` already excludes `*.keystore`, `*.apk`, `twa/`.

### 6.6 Sideload and test the real install path

```powershell
adb install -r C:\dev\archdecide-twa\app-release-signed.apk
```

In the headset: Library → filter **Unknown Sources** → launch
**ArchDecide**. Expected: it enters VR directly, no 2D page, no URL bar, and
the workspace appears with hands working. This is the only place the
auto-enter path can be verified (the gate does not exist in a browser).

| Symptom | Cause | Fix |
| --- | --- | --- |
| "will not launch" | asset links not live or wrong fingerprint/package | fix `assetlinks.json`, rebuild, redeploy; no new APK needed |
| Opens with a browser URL bar | `horizonOSAppMode` is `2D` | set `immersive`, `bubblewrap update && bubblewrap build`, reinstall |
| Opens flat, no URL bar, never enters VR | auto-enter code missing from the deployed bundle | `npm run build` + redeploy; confirm `src/index.ts` has the block |
| Blank/white page | `<DOMAIN>` unreachable from the headset (hashed URL, 401, typo) | fix `host`/URLs in `twa-manifest.json`, rebuild |

MQDH → Device Manager → Logs (or `adb logcat`) shows the browser console if
something fails silently.

### 6.7 Optional: hosting with the Node server (keeps export inbox and AI)

If the hosted build must keep the export inbox or the AI gateway, run the
built app behind the Vite preview server on a small Linux VM with HTTPS
(e.g. behind Caddy or nginx): `npm ci && npm run build && npm run preview -- --host 0.0.0.0 --port 8081`.
Set `AI_ALLOWED_ORIGINS=https://<DOMAIN>` and the AI variables from the README
if AI is wanted. Decide this consciously; see `docs/DATA-AND-PRIVACY.md`.

---

## 7. Create the app on the Meta developer portal and upload to ALPHA

### 7.1 Create the app entry

Developer Dashboard (developers.meta.com → Horizon/Quest developer dashboard)
→ your organization → **Create New App** → name `Architecture Decision
Workspace` (or your final name) → platform **Meta Horizon OS / Quest** → create.
Open the app: the numeric **App ID** is shown in the app's overview/URL; the
**App Secret** is under the **API** section. Treat the secret like a password.

Put the App ID into `twa-manifest.json` (`"applicationId": "<APP-ID>"`) and
rebuild once so the APK carries it:

```powershell
cd C:\dev\archdecide-twa
bubblewrap update; bubblewrap build
```

(No asset-links change is needed: package name and certificate are unchanged.)

### 7.2 Accept the Developer Distribution Agreement (org admin, once)

Dashboard → organization → **Legal documents** → Developer Distribution
Agreement → accept. If you skip this, the first upload fails with
"must first agree to our Developer Distribution Agreement"; accept it and retry
the identical command.

### 7.3 Download the upload tool

Dashboard → your app → **Distribution → Upload** (or Builds) → download
`ovr-platform-util` for **Windows**. Save it as
`C:\dev\archdecide-twa\ovr-platform-util.exe`. Check:

```powershell
cd C:\dev\archdecide-twa
.\ovr-platform-util.exe version
```

### 7.4 Upload the build to the ALPHA channel

```powershell
$env:OVR_APP_SECRET = "<APP-SECRET>"      # keep it out of files and history
.\ovr-platform-util.exe upload-quest-build `
  --app-id <APP-ID> `
  --app-secret $env:OVR_APP_SECRET `
  --apk .\app-release-signed.apk `
  --channel ALPHA `
  --age-group TEENS_AND_ADULTS `
  --notes "Internal alpha 0.1.0-alpha.1: Horizon-kit UI, 3D islands, guided tour" `
  --disable-progress-bar
```

`--age-group` is mandatory; pick `TEENS_AND_ADULTS` for this productivity app
unless your organization decides otherwise. A successful upload prints a
**Build ID** and a **test-results URL** — open it; it lists automated
compliance checks for the build. A warning about Quest 1 is harmless.

Other responses: "Version code must be higher" → bump `appVersionCode` in
`twa-manifest.json`, `bubblewrap update; bubblewrap build`, re-upload.
"Signature does not match previous build" → you signed with a different
keystore; use the original one.

### 7.5 Add internal testers and let them install

Dashboard → your app → **Distribution → Release Channels** → **Alpha** →
**Users / Manage users** → add testers by the e-mail of their Meta account (or
generate an invite link if offered). Each tester receives an invitation
(e-mail/notification) and must accept it with the same Meta account that is
signed in on their headset. After acceptance the app appears in their Quest
**Library** (it may take a few minutes; a headset restart helps), and updates
you upload to the channel replace it automatically.

Testers do not need Developer Mode for channel installs. Developer Mode is only
needed for sideloading (§6.6).

### 7.6 Store metadata (not needed for Alpha, needed before Store)

Listing text, screenshots, trailer, age rating questionnaire and privacy
policy URL are entered in the Dashboard, not by the upload tool. Uploading a
build never submits it for review; review starts only when a build is promoted
to the STORE channel and you press submit. Keep this for later; Alpha testing
works without it.

---

## 8. Iterating after the first Alpha

| You changed | Do |
| --- | --- |
| App code, UI, scenes, texts, icons, asset links | `npm run build` → `npx vercel deploy --prod --yes`. Installed apps pick it up on next launch. No upload. |
| Package id, launcher name/icon, version, app mode, signing | edit `twa-manifest.json`, bump `appVersionCode`, `bubblewrap update; bubblewrap build`, sideload-test, re-upload to ALPHA |
| Ready for wider testing | Dashboard → promote the build ALPHA → BETA (no rebuild) |

Each upload needs a higher `appVersionCode`; keep `appVersionName` meaningful
(`0.1.0-alpha.2`, ...). Record build IDs in `docs/IMPLEMENTATION-STATUS.md`.

---

## 9. Security and backup checklist

- [ ] `android.keystore`, alias and both passwords backed up together, outside the repo.
- [ ] `https://<DOMAIN>/android.keystore` returns 404 after every deploy.
- [ ] App Secret only in an environment variable or password manager; never in files, never pasted into chats.
- [ ] `assetlinks.json` committed (public by design); `.gitignore` excludes `*.keystore`, `*.apk`, `twa/`.
- [ ] Dashboard app has a privacy policy URL before any Store submission (`docs/DATA-AND-PRIVACY.md`).

---

## 10. Competition submission is a separate track

The Devpost submission needs the public web URL (`https://<DOMAIN>`), a demo
video and the written description — it does not require the Store app. Doing
the Alpha first simply gives you real testers earlier. Recheck the competition
rules page before submitting; see `docs/RELEASE-BASELINE.md` and
`docs/RELEASE-LIFECYCLE.md`.

---

## Appendix A: one-screen command summary

```powershell
# tools
winget install --id Git.Git -e; winget install --id OpenJS.NodeJS.LTS -e
# code
git clone <REPO> C:\dev\hackathon-meta; cd C:\dev\hackathon-meta\devpost-hackathon; npm install; npm run check; npm run dev
# host
npm run build; npx -y vercel@latest deploy --prod --yes          # -> https://<PROJECT>.vercel.app
# package (once: npm i -g @meta-quest/bubblewrap-cli; bubblewrap doctor; keytool -genkeypair ...)
cd C:\dev\archdecide-twa; bubblewrap update; bubblewrap build
# asset links -> public\.well-known\assetlinks.json -> npm run build -> vercel deploy
adb install -r .\app-release-signed.apk                         # test from the Library
.\ovr-platform-util.exe upload-quest-build --app-id <ID> --app-secret $env:OVR_APP_SECRET --apk .\app-release-signed.apk --channel ALPHA --age-group TEENS_AND_ADULTS
```

## Appendix B: where things live

| Thing | Location |
| --- | --- |
| Repository | `C:\dev\hackathon-meta\devpost-hackathon` |
| Packaging workspace (keystore, `twa-manifest.json`, APK, upload tool) | `C:\dev\archdecide-twa` (never inside the repo) |
| Android SDK / JDK installed by bubblewrap | `%USERPROFILE%\.bubblewrap` |
| Hosted app | `https://<PROJECT>.vercel.app` |
| Templates for the packaging files | `devpost-hackathon/packaging/` |
| Release process background | `docs/RELEASE-LIFECYCLE.md` |
