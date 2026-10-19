# Initial dependency and asset rights inventory

Inspected 17 October 2026. This inventory is not a completed distribution notice or owner-rights attestation. Installed versions can differ from declared ranges and must be reconciled against a clean release install. In particular, installed UIKit packages are 1.0.76 and Vite 7.3.7; see `../sandbox-environment.md` for previous sandbox deviations.

| Component | Locally observed metadata/license files | Release action |
|---|---|---|
| Project-authored code/UI/diagrams | README claims ownership; root LICENSE absent | D09 owner chooses project license and confirms authorship; do not infer license from starter |
| IWSDK core/CLI/reference/dev plugin 1.0.1 | MIT in package metadata | Preserve relevant copyright/license notices in distribution |
| three alias super-three 0.181.0 | MIT in installed metadata | Include actual redistributed package notices and any bundled third-party components |
| UIKit/Horizon/Lucide 1.0.76 | SEE LICENSE IN LICENSE; inspected files include multiple copyright notices and permission text | Preserve complete actual license files; audit icon provenance separately rather than assuming one license covers all |
| MSDF fonts 1.0.76 | Multi-font license file; includes Apache font section and additional sections | Identify fonts actually shipped (build includes Inter); preserve applicable font notices and terms |
| AI SDK/provider packages | Apache-2.0 metadata | Backend-only/disabled does not automatically remove distributed attribution obligations; inspect bundle/artifact contents |
| Zod 4.6.5 | MIT metadata | Preserve license for redistributed code |
| TypeScript 5.9.3 | Apache-2.0 metadata | Build tool; distinguish release redistribution from development installation |
| Vite 7.3.7, tsx 4.23.15, type packages | MIT metadata | Distinguish tooling and bundled runtime pieces; preserve any redistributed obligations |
| Meta VR CLI 1.8.1 | Meta Platform Technologies SDK License metadata | Development tool; read actual terms before redistributing any of its materials |
| Store logo, cover art and demo audio | Final assets not created/selected | Original or explicitly cleared materials; record source and license/owner permission |
| Supplied competition/VRC PDFs | External requirement references | Keep as assessment references; do not claim ownership or include in public app bundle |

Remaining: full transitive runtime/dependency inventory; bundled font/icon inspection; complete notices for the final built artifacts; owner rights confirmation; final source-code license choice. This document deliberately does not state that all licenses have been cleared.
