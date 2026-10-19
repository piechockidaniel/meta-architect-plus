# Data handling and privacy

Updated: 2026-10-11
Status: implemented behaviour of the current build plus the policy it follows. Review against the competition rules and Meta platform policies before publication; publish a privacy notice with the hosted build.

## Principles

1. Local first. The workspace is useful without any account, server or network call beyond loading the page.
2. No personal data is required. Nothing asks for a name, e-mail, organization or device identifier. The only free text is the product name and specification the user chooses to write.
3. Nothing leaves the device silently. Every transfer is an explicit user action with a visible explanation: export to the inbox, AI assistance with a consent checkbox.
4. Users can delete what the app holds about them from inside the app.
5. The app never logs specification text, inputs or export contents on the server.

## Data inventory

| Data | Contains PII? | Where it lives | Retention | How to delete |
| --- | --- | --- | --- | --- |
| Decision inputs (deployment policy, data location, identity source, capacity, owner, recovery, usage, workload blocks, currency, budget, rates) | No; categorical and numeric choices | Browser local storage key `architecture-workspace-v2` (autosaved after each change) and in memory | Until deleted or the browser clears site data | Review stage: "Delete saved local copy"; browser form: "Delete local saved project"; browser site-data settings |
| Product name and specification text | Only if the user types it; templates contain none | Same local storage key and in memory | Same as above | Same as above |
| Confirmation flag, user selection, decision version | No | Same | Same | Same |
| Export bundle (Markdown, SVG, JSON of the above) | Same as the inputs and text it contains | Dev/preview server memory under a random 8-character code; never written to disk | 24 hours, at most 50 entries, oldest evicted first; server restart clears all | Review stage: "Delete server copy now"; `DELETE /api/exports/<code>`; automatic expiry |
| AI request (specification text or current findings) | Same as the text; sent only after the consent checkbox | Transmitted to the configured external provider from the server; not stored by this app | Provider terms apply; this app keeps no copy | Do not enable AI, or do not tick consent |
| Hand-tracking, head pose, controller input | Processed on device by the browser/runtime; never read by the app beyond pointer hits and the "no input sources" check | Not stored | n/a | n/a |
| Analytics, telemetry, crash reports | None collected by the app | n/a | n/a | n/a |

The app creates no cookies and no accounts. Browser local storage is per origin and per browser profile; it is not encrypted at rest by the app and is not synchronised across devices, which the help panel states.

## Focused question capture (19 October update)

Typed or dictated answer drafts stay in application memory. Done captures a draft; it does not save a project answer. Send to AI is explicit consent to transmit the captured words for the current question to the configured provider. The question qualifier sends the question, allowed values and captured text to the model, requires a supporting quote or clarification, and never applies a response automatically. Accepted categorical answers enter the normal project backup only after Confirm answer. Drafts are not automatically backed up.

Voice capture uses the browser's optional speech-recognition service, which may process audio externally after the user's action and permission. This app sends the resulting text to AI only after Send to AI. The keyboard and direct answer choices remain available without speech support. The browser editor continues to use its separate AI consent checkbox.

## Transfers and third parties

- Page load: static assets from the hosting origin only. Fonts used by the UI kit are bundled; no third-party font or CDN request is made by the application code.
- Export inbox: same-origin `POST /api/exports`; cross-origin requests are rejected. The retrieval URL is shown to the user only. Anyone holding the code can read the export until it expires or is deleted; treat the code like a link to a private document.
- AI assistance (optional): only when the operator configures a provider server-side (`npm run ai:setup`, writing the gitignored `config/ai.local.json`; never entered in the headset or browser) and the user ticks the consent box. The request carries the specification or current findings plus categorical inputs; the server enforces a request allowance and never logs bodies. Credentials never reach the browser.
- No data is sent to Meta by the application. Platform-level data handling by the Meta Quest browser and Horizon OS is governed by Meta's own policies.

## User guidance shown in the app

- Help panel: "Your data" line summarising local storage, export retention and AI consent.
- Review stage: data note plus "Delete saved local copy" and "Delete server copy now" buttons.
- Browser form: consent checkbox text names the destination ("the configured external AI service") before any AI request.
- Templates and samples contain no personal data and are labelled illustrative.

Users should avoid entering personal data about third parties in the specification; the app treats the specification as data, never as instructions, and stores it only as described above.

## Security measures in this build

- Input validation on restore/import (`restoreInputs`, `validateContext`, `validateBundle`); malformed data never replaces the current session.
- Markdown and SVG exports escape user text; the retrieval page escapes titles and sets `Content-Security-Policy: default-src 'none'`.
- Export codes use 40 bits of randomness from an unambiguous alphabet; entries expire and are bounded in number and size (2 MB request limit).
- AI responses are validated against schemas and existing findings before anything is shown; nothing is applied without the user accepting it.

## Open items before publication

1. Publish a privacy notice URL alongside the hosted build and reference it in the submission form; Meta and the competition organisers may require it.
2. Decide whether the export inbox stays enabled on the public host. If the host is static, the inbox is simply unavailable and the app falls back to browser downloads.
3. If AI is enabled on the public host, name the provider in the notice and confirm its data retention terms.
4. Confirm with the organisers whether the hosted demo may store any user content at all; if not, disable the inbox middleware for the public build.
