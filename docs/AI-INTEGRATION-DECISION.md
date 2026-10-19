# AI integration decision

Updated: 2026-10-11
Status: AI inclusion accepted by user; SDK recommendation researched, not installed or live-tested.

This document supersedes earlier proposals that AI inclusion is undecided. Deterministic rules, cost calculations and useful outage fallback remain required.

## SDK recommendation

Use Vercel AI SDK Core behind a small application-owned AI service interface in the TypeScript backend. Its provider catalogue covers OpenAI, Anthropic, Google, Azure OpenAI, Amazon Bedrock and other vendors, with an OpenAI-compatible adapter for additional endpoints.

This is a recommendation for this project's stack and solo delivery capacity, not a proven claim of greatest coverage across all SDKs. Provider features differ, and compatibility must be validated per model and endpoint.

LiteLLM is a credible alternative for broader gateway operations: its Python SDK documents over 100 providers. Defer it unless centralized routing, budgets or a separately operated gateway justify another runtime/service. The native OpenAI SDK alone does not establish broad support for vendors with different protocols.

Use direct provider adapters initially rather than adding a commercial gateway dependency. Do not require Next.js or React for the IWSDK interface merely because the SDK supports them. Pin package versions after implementation preparation.

## Application contract

Expose operations for specification extraction and explanations grounded in validated findings. Keep provider/model configuration out of the domain model. Include request identifiers, input snapshot versions, cancellation, timeouts, bounded retries, usage reporting where available and normalized errors.

Maintain a capability record per configured model: text, structured output, streaming, supported schema restrictions, authentication and endpoint configuration. Validate generated objects independently. Do not treat OpenAI-compatible HTTP endpoints as proof of identical behavior.

Do not automatically fail over confidential input to a different provider. Any cross-provider fallback needs an approved data destination and budget. Tool execution, agent loops, speech and vision are not necessary for the first text-based assessment.

## OpenAI subscription for tests

The user intends to use the existing OpenAI subscription for tests. Official documentation describes a Sign in with ChatGPT plan-usage path for eligible open-source and locally hosted apps, including eligible Responses requests. It does not establish this project's or account's eligibility, nor that a generic API adapter automatically accepts subscription credentials.

Investigate the documented local authentication flow as a separate integration spike. Do not copy this chat's credentials, extract session cookies or expose tokens to the Quest frontend. A normal API-key integration and a subscription-authenticated integration are separate access paths.

The reviewed overview directs paid or remotely hosted app integrations to an interest form. Consequently, local subscription-backed testing cannot be assumed to authorize or sustain the publicly hosted judge experience. Establish that deployment's inference access independently; ordinary API usage has its own pricing.

No live inference, subscription registration or paid invocation has been performed. Until access is validated, use synthetic fixtures for transport-independent tests and label them as fixtures, not live AI results.

## First implementation evidence

1. Verify supported local subscription authentication and account eligibility.
2. Confirm the selected SDK can handle the documented inference endpoint and authentication; use an isolated adapter if required.
3. Run one synthetic extraction and one finding-grounded explanation with valid access.
4. Check schema failures, refusal, timeout, cancellation, stale responses and usage limits.
5. Configure and test a second vendor only when credentials/access are available; an adapter's existence is not cross-vendor proof.
6. Decide hosted inference access and cost before public release.

## Setup wizard: an operator tool, not an in-headset picker

The user proposed a wizard for choosing a vendor, model and API key. The idea
is right; the *location* needed to change. The planning package and
`docs/DATA-AND-PRIVACY.md` already commit to "keep keys server-side" and
"credentials never reach the browser" (`docs/RELEASE-BASELINE.md`,
`docs/TECHNICAL-ARCHITECTURE.md`). A wizard running inside the Quest app or a
web page would put the key in browser-reachable state — exactly what those
documents rule out — so it was reshaped into an **operator-run terminal
wizard** instead:

- `npm run ai:setup` (`devpost-hackathon/scripts/ai-setup.ts`) prompts for
  provider, model, API key, a per-run call budget and allowed browser
  origins, and writes `config/ai.local.json` — gitignored, `chmod 600`
  best-effort, read only by the server (`server/ai-config.ts`).
- The dev/preview server re-reads that file on every request
  (`server/ai-middleware.ts`), so re-running the wizard takes effect
  immediately, no restart, no redeploy.
- The wizard can run a schema-only availability check (no network call) and,
  only with explicit confirmation, one synthetic test request using the
  built-in sample project — never a user's real specification.
- Environment variables remain the fallback for hosted deployments where a
  wizard cannot write to the filesystem (e.g. a managed platform); the local
  file takes precedence field by field when both exist.
- The in-app browser form (`src/project-editor.ts`) only ever reads
  `{ available, reason }` from `/api/ai/status` and tells the user to run the
  wizard elsewhere — it never collects or displays a key.

This keeps the "server-side only" invariant intact while still giving a
guided, no-hand-edited-`.env` path to turning AI on or switching providers.

## Remaining decisions

- Hosted inference credentials/access and spending cap, once a concrete deployment option is prepared.
- Permitted data for live testing; proposed baseline is synthetic specifications only.
- Open-source/local-app eligibility for subscription testing must be checked, not inferred from subscription ownership.

## Sources reviewed

- AI SDK introduction: https://ai-sdk.dev/docs/introduction
- Provider catalogue and capability differences: https://ai-sdk.dev/providers/ai-sdk-providers
- OpenAI-compatible adapter: https://ai-sdk.dev/providers/openai-compatible-providers
- LiteLLM SDK: https://docs.litellm.ai/docs/python_sdk
- ChatGPT plan usage: https://developers.openai.com/siwc/token-sharing-open-source
- API pricing: https://developers.openai.com/api/docs/pricing
