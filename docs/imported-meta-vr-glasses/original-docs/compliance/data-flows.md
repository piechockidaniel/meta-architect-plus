# Data flow inventory and disclosure work

17 October 2026. Engineering inventory for D07/D08/D09. Not a published privacy policy or completed data-protection assessment. D07 owner selected supported dictation with disclosure; AI remains disabled. The keyboard now displays an external speech-processing notice before optional dictation where supported; README/loading copy no longer promise all processing stays on-device.

| Data / feature | Observed implementation | Disclosure / acceptance still needed |
|---|---|---|
| Product title, specification, constraints, rationale and rates | DecisionSession/controller stores versioned project and UI drafts in browser localStorage | Explain origin/browser-profile scope, local retention and device-access implications |
| Saved decision/export bundle | Separate localStorage export key; Markdown, SVG and JSON downloads | Explain local stored copy versus files in Downloads; deleting app storage cannot delete downloaded files |
| Preferences | Sound, text scale, draft rates and inspected variant in UI storage key | Include in deletion inventory |
| Delete saved copy | Attempts all three app keys and keeps open project in memory; later edits/preferences can autosave again | Failure now warns; success explains re-saving and separate downloaded files. Two regression tests cover this. Physical/browser storage-denial acceptance remains pending |
| Dictation | Uses browser SpeechRecognition/webkitSpeechRecognition when available, en-US, one-shot transcript | May use browser/vendor external processing. Verify actual browser behavior and disclosure before enabling in public release; microphone permission denial must not block keyboard use |
| Optional AI | Server provider configuration, bounded calls, structured project request; default disabled; no production backend in static build | If D07 enables it: inventory exact transmitted fields, processor/retention/region, limits, consent and operational backend. Mock tests are not live-provider validation |
| Hosting | Static assets fetched from chosen origin; provider not chosen | Host access logs/IP retention and infrastructure processors are unknown until D06 |
| Runtime diagnostics | Console errors/warnings; debug hook available with ?debug | Do not add remote telemetry implicitly; review release exposure and avoid private project data in shared logs |
| Public content sharing/accounts/ads/payments | None found in current application flow | Reassess if scope changes; private text entry alone does not establish social/UGC functionality |

Current blanket wording that everything stays on-device needs qualification if speech recognition or AI is enabled. The loading screen should describe the local decision engine accurately without implying browser speech processing is necessarily local.

Owner decisions still required: D07 AI/dictation, D08 retention/deletion promise, D09 publisher identity/contact. Policy drafting can use this inventory, but no placeholder policy should be published as final.
