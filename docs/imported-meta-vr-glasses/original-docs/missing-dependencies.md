# Dependency availability report

`npm ci` installs exactly what `package-lock.json` pins. In a restricted environment (registry
mirror, air-gapped CI) any pinned entry the registry cannot serve aborts the install. This file is the
current list for the sandbox used to develop this project; regenerate it with:

```sh
node scripts/check-deps.mjs        # exit code 1 and a list when something is missing
```

Last run: 66 of 346 lockfile entries unavailable from the sandbox mirror. Everything marked
**provided** has been supplied as source and built/packed locally (see `docs/sandbox-environment.md`).

| Package (pinned) | Needed by | Status in sandbox |
|---|---|---|
| `@iwsdk/core`, `cli`, `vite-plugin-dev`, `locomotor`, `xr-input`, `scene-composition` @1.0.1 | app runtime / dev tooling (direct) | **provided** - built from `immersive-web-sdk-main.zip` |
| `vite@7.3.7` | build + dev server (direct) | **provided** - built from `vite-7.3.7.zip` |
| `@iwsdk/reference@1.0.1` | AI-agent docs search (direct, dev only) | not installed; not needed to build or run |
| `@meta-quest/metavr@1.8.1` | Meta VR CLI (direct, dev only; downloads a binary at install) | not installed; not needed to build or run |
| `@iwer/devui@2.5.0`, `lucide-react@1.55.0` | emulator dev UI via `@iwsdk/vite-plugin-dev` | substituted `@iwer/devui@2.4.0` (headless emulator works) |
| `playwright@1.64.0`, `playwright-core@1.64.0` | uikitml preview, vite-plugin-dev managed browser, e2e | substituted `1.58.2` (matching installed Chromium build) |
| `rollup@4.64.5` + 24 `@rollup/rollup-*` platform binaries | vite | substituted `4.62.x`; only the host platform binary is ever installed |
| `postcss@8.5.29`, `nanoid@3.3.20` | vite | substituted `8.5.28` / `3.3.19` |
| `three-mesh-bvh@0.9.16` | `@iwsdk/core` | substituted `0.9.15` |
| `ai@7.0.137`, `@ai-sdk/anthropic@4.0.78`, `@ai-sdk/google@4.0.93`, `@ai-sdk/openai@4.0.91`, `@ai-sdk/openai-compatible@3.0.67`, `@ai-sdk/gateway`, `@ai-sdk/provider`, `@ai-sdk/provider-utils` | optional AI assistance (server) | substituted previous minor versions; unit tests pass with `ai/test` mocks |
| `@types/node@26.6.5` | typecheck | substituted `@types/node@22` |
| `@sentry/*@10.76.2`, `@opentelemetry/*@2.12.0`, `cjs-module-lexer`, `es-module-lexer` | telemetry inside `@drawcall/uikitml` CLI (transitive) | substituted previous versions; never executed by the app |
| `express@5.3.0`, `express-rate-limit@8.7.1`, `hono@4.13.13`, `@hono/node-server@2.1.4` | `@modelcontextprotocol/sdk` used by the IWSDK CLI MCP server (transitive) | substituted previous versions |

Also not on the mirror, although the app lockfile already pins the available `1.0.76`: the SDK
monorepo's own lockfile wants `@pmndrs/uikit*@1.0.74` (overridden to 1.0.76 for the SDK build).

## Practical consequences

- On a machine with the public npm registry, `npm ci` resolves all of the above and none of this applies.
- If your registry is restricted the same way, the packages to provide as tarballs (`npm pack <name>@<version>`
  from a machine that can reach npm) are the ones in the table; the `@rollup/rollup-*` binaries are only needed
  for your host platform, and `@iwsdk/reference` / `@meta-quest/metavr` can be removed from `devDependencies`
  if you do not use the AI-agent tooling.
- Node: with Node >= 22.21 Vite 7.3.7's HTTPS dev server still needs the `shouldUpgradeCallback` shim in
  `vite.config.ts` (verified with the real 7.3.7 build: without the shim the dev server crashes on the first
  WebSocket upgrade).
