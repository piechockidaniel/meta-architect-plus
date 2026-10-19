# Project documentation

Start with the [project overview](../README.md) for purpose and goals, or the
[application guide](../src/README.md) for setup and user instructions. The runnable
application is in `../src/`; run npm commands there.

The current default is the focused carousel. Read its
[plan](CAROUSEL-PLAN-2026-10-19.md),
[implementation and verification record](CAROUSEL-RESULTS-2026-10-19.md), and
[physical-device guide](PHYSICAL-DEVICE-TESTS.md) (Q18 first). The first headset
smoke test reported readability and density problems; the revised candidate's
physical retest is pending. Advanced workspace remains available through Menu.

The planning package below began on 2026-10-11. It records product scope and
proposals; it should not be read as evidence that every proposed feature,
deployment or submission has been completed. Later implementation records take
precedence for current behaviour and measured results.

Read [Release baseline](RELEASE-BASELINE.md) first. It records the user's latest hardware, capacity and generic cloud/on-premise/hybrid scope and supersedes earlier conflicting proposals.

The later [AI integration decision](AI-INTEGRATION-DECISION.md) records accepted AI inclusion, the recommended multi-provider SDK and subscription-test access limitations.

Then read in this order:

1. [Product brief](PRODUCT-BRIEF.md): consolidated purpose, users, value and scope.
2. [Project foundation](PROJECT-FOUNDATION.md): accepted direction and entry paths.
3. [User journeys and questions](USER-JOURNEYS-AND-QUESTIONS.md): intake and common decision flow.
4. [Recommendation contract](RECOMMENDATION-CONTRACT.md): supported scope, validation, costs and abstention.
5. [Immersive experience](IMMERSIVE-EXPERIENCE.md): first five minutes and spatial interactions.
6. [Technical architecture](TECHNICAL-ARCHITECTURE.md): modules, data contracts and integration boundaries.
7. [Validation plan](VALIDATION-PLAN.md): correctness, device and usefulness evidence.
8. [Delivery plan](DELIVERY-PLAN.md): milestone sequence and scope cuts.
9. [Decisions and risks](DECISIONS-AND-RISKS.md): proposed defaults, user inputs and consistency findings.
10. [Implementation status](IMPLEMENTATION-STATUS.md): plan-to-code matrix, automated evidence and what still needs the device.
11. [Data and privacy](DATA-AND-PRIVACY.md): what the app stores, where, for how long, and how users delete it.
12. [Release lifecycle](RELEASE-LIFECYCLE.md): Meta channel model (Alpha/Beta/RC/Store) and what an Alpha upload needs.
13. [Developer manual](DEVELOPER-MANUAL.md): step by step from an empty Windows 11 PC to an Alpha build with internal testers.
14. [Physical-device tests](PHYSICAL-DEVICE-TESTS.md): Quest 3 setup, 17 executable scenarios, pass criteria and the generated evidence ledger.
15. [Selective consolidation](CONSOLIDATION-2026-10-18.md): canonical folder, merged donor features, recovery archives and local verification.
16. [Imported release preparation](imported-meta-vr-glasses/README.md): donor compliance, rights and hosting records, with current boundaries and historical-status warnings.

## Next execution boundary

The implementation is in `../src/` (see the implementation status). Next work is real-device verification on the Meta Quest 3 using the physical-device test pack and the formative usability evaluation. Preparation is not a physical-test result. No public publishing, paid inference, infrastructure provisioning or submission has occurred.
