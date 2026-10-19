# Requirements and evidence matrix

Updated 17 October 2026. This is an execution tracker, not a certificate of compliance.

Sources: [current VRC overview](https://developers.meta.com/vr/resources/publish-quest-req/), [current PWA packaging guide](https://developers.meta.com/vr/documentation/web/pwa-packaging/), supplied competition Official Rules in `docs/`. Current web sources checked 17 October. Requirement wording below is summarized; open each linked VRC from the overview before implementing its exact acceptance test.

Target: immersive WebXR PWA; initial physical verification device **Quest 3**, confirmed by owner. Additional device support is not claimed. New Experience division confirmed by owner: conceived and first developed within the window, no earlier prototype/codebase. Membership and other personal eligibility remain unverified.

Legend: **R** required in immersive Store column; **G** recommended; **C** conditional; **Retired** excluded. **Partial** means implementation exists but acceptance evidence is incomplete. **Unverified** means no current acceptance result. **Missing** means required release artifact not found locally. **N/A** means current scope does not exercise the feature, subject to recheck at release. Local checks never prove on-device compliance.

Owner: **E** engineering, **T** physical tester + engineering evidence, **U** owner/account holder. Decision IDs refer to [completion plan](../COMPLETION-PLAN.md).

## Store VRCs

| VRC (prefix VRC.Quest unless shown) | Level/applicability | Current status and evidence | Next acceptance test / owner |
|---|---|---|---|
| Packaging.1 | R | Missing release manifest | Inspect generated release manifest against detailed VRC / E |
| Packaging.2 | R | Missing signed APK | Verify APK v2 signature on final artifact / E |
| Packaging.3 | R | Unverified until package exists | Reject unsupported required Android features / E |
| Packaging.4 | R | Partial: IWSDK 1.0.1 in package.json | Verify supported SDK/toolchain and actual release dependencies / E |
| Packaging.5 | R | Unverified APK size | Measure final APK/any expansion files against limits / E |
| Packaging.6 | R | Unverified architecture | Inspect final package for 64-bit compliance / E |
| Audio.1 | G | Partial: synthesized cues; no spatial audio evidence | Check sound behavior; spatialization optional / T |
| Performance.1 | R | Unverified hardware frame timing | Capture declared refresh-rate performance on Quest 3 in worst-case stages / T |
| Performance.2 | Retired | N/A | No work |
| Performance.3 | R | Partial: index.html has DOM loader only | Measure head-tracked launch within 4 s or demonstrate in-VR loader / T |
| Performance.4 | G | Unverified render scaling | Measure scaling against recommendation / T |
| Functional.1 | R | Partial: local build/unit/runtime checks | Signed install and crash/freeze-free device journeys / T |
| Functional.2 | R | Unverified lifecycle | System pause, removal and resume on device / T |
| Functional.3 | R | Partial: controller flows/back navigation | Both entrances, cancel, blocked outcomes, diagrams and export without dead ends / T |
| Functional.4 | R | Partial: autosave/restore tests | Reload, interruption, storage failure and export integrity / T |
| Functional.5 | R | Partial: SDK world tracking | Verify positional and orientation response / T |
| Functional.6 | R | Unverified final assets | Review title/store assets for prohibited platform devices / E |
| Functional.7 | G, connectivity-dependent | Partial: offline notice, local engine | First load/cache loss/offline behavior and clear user notices / T |
| Functional.8 | Retired | N/A | No work |
| Functional.9 | R when Local tracking | Partial: WorkspaceSystem.recenter | Verify configured space and forward reset seated / T |
| Functional.10 | G | Partial: world-space authored panels | Confirm no uncomfortable head-locked UI / T |
| Functional.11 | Retired | N/A | No work |
| Functional.12 | R | Unverified packaged multi-user operation | Separate entitled profiles; full functionality and correct data isolation / T/U |
| Functional.13 | G when localized | N/A: English-only release | Recheck if localization added / E |
| Functional.14 | R when passthrough launch | N/A: current xr mode vr | Recheck if MR mode added / E |
| Security.1 | G | No entitlement integration evidenced | Decide applicability for free PWA; do not call this mandatory from overview alone / E |
| Security.2 | R | Unverified generated permissions | Minimal supported permissions; dictation behavior tied to D07 / E |
| Tracking.1 | R | Missing final sitting/play-mode metadata | Match seated claim to real movement requirements / T/U |
| Tracking.2 | R | Missing final input metadata | Declare only tested inputs and confirm dashboard settings / T/U |
| Input.1 | G | Unverified controller menu behavior | Check detailed recommendation if controller support declared / T |
| Input.2 | G when objects picked up | N/A: no user-facing object grabbing in current flow | Recheck feature scope; config flag alone does not prove grabbing feature / E |
| Input.3 | G | Unverified alignment | Compare actual and rendered hands/controllers / T |
| Input.4 | R | Unverified focus behavior | Continue rendering, suppress input, hide hands/controllers when unfocused / T |
| Input.5 | G when hand tracking | Partial: SDK hand tracking enabled | Verify hand pose/orientation/animation / T |
| Input.6 | Retired | N/A | No work |
| Input.7 | R with hand tracking | Unverified switching | Alternate controller/hands without stuck or duplicate input / T |
| Input.8 | R with hand tracking | Unverified system gesture isolation | Reserved gesture triggers no application action / T |
| Asset.1 | R | Missing final transparent logo | Inspect alpha and current dashboard specifications / E; D05 |
| Asset.2 | R | Missing final cover art | Clear branding; no extraneous banners/taglines / E |
| Asset.3 | G | Missing cover art | Inspect top/bottom text safe zones / E |
| Asset.4 | G | Missing hero art if used | Check centered branding / E |
| Asset.5 | R | Partial: preview captures only | Capture representative screenshots with no extraneous overlays / E/T |
| Asset.6 | R | Missing final description/media set | Check other-platform headset/controller/logo exclusions / E |
| Asset.7 | R if trailer supplied | Missing Store trailer | Duration at most 2 minutes, distinct from competition limit / E |
| Asset.8 | G | Missing final artwork | Inspect artwork text sizes / E |
| Asset.9 | R if immersive image layers used | N/A: none currently supplied | Check transparency if layers added / E |
| Asset.10 | G if Quest Pro exclusive footage | N/A: Quest 3 target | Recheck if such media added / E |
| Ads.1 | R if advertising | N/A: no advertising in current scope | Recheck built app and commercial model / E |
| Ads.2 | R if ad-supported | N/A | Correct Contains Ads declaration if scope changes / U |
| Ads.3 | R if advertising | N/A | No immersive/stereoscopic/head-tracked ads / E |
| Ads.4 | R if interfering ads | N/A | Clear dismissal if introduced / E |
| Ads.5 | R if interfering ads | N/A | No prohibited consecutive-action placements / E |
| Ads.6 | R if advertising | N/A | No impaired device functionality / E |
| Ads.7 | R if advertising | N/A | No accidental-click inducement / E |
| Accessibility.1 | G | Partial: visible states, sound optional | Complete with sound off / T |
| Accessibility.2 | G | Partial: text-scale options | Readability and target size at each scale / T |
| Accessibility.3 | G | Partial: visual/audio/haptic feedback | Confirm clear, nonessential audio and safe missing actuators / T |
| Accessibility.4 | G | Partial: ray-based UI | Complete each journey with one hand / T |
| Accessibility.5 | G | No contrast/brightness controls evidenced | Assess legibility needs and bounded display options / E/T |
| Accessibility.6 | G | Partial: badges/icons/text beyond tint | Confirm state comprehension without relying on color / T |
| Accessibility.7 | G | Partial: recenter available | Assess view access without neck rotation; recenter alone is not full proof / T |
| Accessibility.8 | G when locomotion used | N/A: locomotion disabled | Recheck if introduced / E |
| Accessibility.9 | G for sitting/standing | Partial: stationary flow/recenter | Fixed-position access on device / T |
| Streaming.1 | G if immersive streaming | N/A: local rendering, hosted assets are not streamed head-tracked video | Recheck if streaming added / E |
| Streaming.2 | R if immersive streaming | N/A | Review allowed source restrictions if added / E/U |
| Streaming.3 | R if cloud immersive streaming | N/A | Connectivity notices if applicable / E |
| Streaming.4 | R if cloud immersive streaming | N/A | Audience restrictions if applicable / U |
| Privacy.1 | R | Missing team-managed policy URL | Publish approved policy and test public URL / E/U; D07–D09 |
| Privacy.2 | R | Missing collection disclosure | Inventory local data, hosting logs, speech and optional AI / E/U |
| Privacy.3 | R | Missing processing disclosure | Explain actual data use/processors; correct on-device claims / E/U |
| Privacy.4 | R | Partial deletion control; no policy | Test deletion/re-save behavior and explain retention/deletion / E/T/U |
| Privacy.5 | R | Unverified account checks | Complete actual team/app data-protection checks / U |
| VRC.Content.1 | R | Partial: business-tool content | Full relevant content-policy review, including final materials / E/U |
| VRC.Content.2 | R | Missing final metadata | Match listing to actual supported experience / E |
| VRC.Content.3 | R if UGC scope applies | Unverified applicability: private authored text only | Assess detailed policy; add conduct reporting if scope requires / E/U |
| VRC.Content.4 | G if UGC scope applies | Unverified applicability | Hiding controls if required by actual sharing/content scope / E |
| VRC.Publishing.1 | R | Unverified public app website | Correct public page and owner / E/U; D06 |
| VRC.Publishing.2 | R if support link supplied | Missing final support URL | Link directly to support / E/U |
| VRC.Publishing.3 | R if TOS link supplied | Not selected | Supply accurate TOS page if selected / E/U |
| VRC.Publishing.4 | R | Working title only | Approve name and check content/rights / U/E; D05 |
| VRC.Publishing.5 | R | Missing final short description | Review accurate policy-compliant copy / E/U |
| VRC.Publishing.6 | R | Missing final long description | Review accurate policy-compliant copy / E/U |
| VRC.Publishing.7 | R | Missing keywords | Relevant truthful search terms / E |
| VRC.Publishing.8 | R if Meta branding used | Unverified final assets/metadata | Check brand compliance if used; distinguish dependency attribution / E |

## Competition Official Rules

| Clause / obligation | Current status | Next action / owner |
|---|---|---|
| Section 2: age/residence/exclusions/representative and one-entry limit | Unverified private eligibility | Owner confirms O01 privately / U |
| Section 2: active developer access and Start membership | Unverified | Confirm active by submission; do not request credentials / U |
| Section 3: register and submit all fields during entry period | Unverified account state | Review actual Devpost entry before authorized submission / U |
| Section 4.2: VR/MR app for Meta devices | Partial: IWSDK VR build | Quest 3 acceptance journey / T |
| Section 4.3: Productivity alignment | Supported by implemented purpose | Final track selection / U |
| Section 4.4: New Experience provenance | Owner confirmed 17 October: entirely new within window | Preserve provenance statement and available records / U/E |
| Section 4.5: hands-first mandatory | Partial: prior emulator evidence only | End-to-end Quest 3 hands-only recording, including output retrieval / T |
| Section 4.5: seated/stationary guideline | Unverified physical ergonomics | Two-foot-radius stationary usability session / T |
| Section 4.5: fast start/pause/resume/complete moment guideline | Partial: save/resume code | Measure start and a complete <=10 minute journey; interruption test / T |
| Section 4.5: original core, discouraged thin wrapper | Supported by deterministic engine | Demonstrate workflow with AI unavailable / E/T |
| Section 4.6–8: accessible hosted WebXR project until announcement | Workflow exists; live URL unverified | Choose origin, verify free judge access; no APK required for WebXR entry / E/U; D06 |
| Section 4.9: demonstration video | Missing final public video | Actual headset or allowed emulator footage, under 3 min, public YouTube/Vimeo / E/U; D11 |
| Section 4.9: inspiration/build/future plans/target launch | Missing final description | Draft from implemented scope; owner chooses target launch date / E/U |
| Section 4.9: selected track and division | Owner provenance confirmed; dashboard unverified | Select Productivity/New Experience during authorized entry / U |
| Section 4.10: original project | Partial: code inspection is not ownership proof | Rights/provenance inventory / E/U |
| Section 4.11 and funding provisions on p4 | Unverified | Owner confirms no disqualifying funding/support; retain private record / U |
| Section 4.12: permitted tools and third-party rights | Public dependencies evident; rights inventory incomplete | Audit dependency/asset licenses and permitted availability / E/U |
| Section 4.13: applicable platform policies | Partial | Close relevant VRC/content/privacy rows; owner terms review / E/U |
| Section 4.14–15: harmful content/public suitability | Partial: inspected business-tool scope | Review final app/media and appropriate audience / E/U |
| Section 4.16: English or permitted translations/subtitles | App English; entry materials missing | Review all final materials / E |
| Section 4.17: persons/third-party rights/lawful content | Partial | Clear demo identities, assets and audio; owner confirms rights / E/U |
| Section 4.18: no implied sponsor association | Partial: neutral app UI | Final app/metadata/media check / E |
| Section 4.19: commercial branding/advertising restrictions | Partial: markup checks | Review actual app, footage and submission materials / E |
| Section 4.20–21: participation obligations/rights | Unverified owner matters | Owner reviews confirmations before submission / U |
| Section 4 p4: free sufficient access, consistent function | Unverified hosting/device evidence | Test exact public URL on Quest 3 through announcement / E/T |
| Section 4 p4: no post-entry-period alterations | Release mechanism not frozen | Separate immutable competition artifact from later Store deployments / E/U |
| Section 3: preserve entry and records | Not assembled | Source/build archive, text, video reference and accepted-entry confirmation / E/U |
| Section 6: judging quality and hardware performance | Unverified hardware; design implemented | Device evidence; minimum 60 fps judging language does not replace Store refresh targets / T |

## Evidence rules and next gates

- Reference exact source/build identifier and device/browser/OS version for each acceptance result.
- Do not mark package, privacy, dashboard, physical-device or live-hosting rows Pass on unit tests alone.
- Prior emulator documentation remains prior evidence until rerun and logged; do not relabel it as physical Quest 3 evidence.
- First gate: repaired Windows tooling, all local checks and real runtime E2E pass. Then resolve origin D06 and execute physical acceptance journeys.
- No external publication/submission occurs until the concrete candidate and materials are reviewed under D12.
