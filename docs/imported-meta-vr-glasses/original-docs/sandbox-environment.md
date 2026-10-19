# Building and running against the real SDK without registry access

The project depends on `@iwsdk/*@1.0.1`. When the npm registry is unavailable or incomplete, the SDK can
be built from the monorepo source (`immersive-web-sdk-main.zip`) and installed from tarballs:

```sh
# in the SDK checkout
echo "manage-package-manager-versions=false" >> .npmrc
pnpm install --no-frozen-lockfile --ignore-scripts
for p in locomotor xr-input scene-composition core vite-plugin-dev cli; do (cd packages/$p && pnpm run build && pnpm pack --pack-destination /tmp/iwsdk-tgz); done
```

Then install the tarballs into a throwaway directory with a copy of this project's `package.json` where
`@iwsdk/core`, `@iwsdk/cli` and `@iwsdk/vite-plugin-dev` point at `file:` tarballs (plus `overrides` for
`@iwsdk/locomotor`, `@iwsdk/xr-input`, `@iwsdk/scene-composition`), and symlink its `node_modules` here.

Deviations used in the sandbox (none affect application code):

| Package | Published | Sandbox | Why |
|---|---|---|---|
| `vite` | 7.3.7 | 7.3.7 built from `vite-7.3.7.zip` (workspace trimmed to `packages/vite`, `launch-editor` 2.14.2 -> 2.14.1) | 7.3.7 missing from the mirror |
| `@pmndrs/uikit*` (SDK monorepo lock) | 1.0.74 | 1.0.76 | 1.0.74 missing from the mirror |
| `@iwer/devui`, `@iwer/sem` (emulator, dev only) | 2.5.0 | 2.4.0 | missing from the mirror |
| `rollup-plugin-worker64` (SDK build only) | 0.2.1 | local shim that inlines the locomotion worker as a Blob | not in the mirror |

With that in place `npm run typecheck`, `npm run build`, and `npm run test:e2e` run against the genuine
`@iwsdk/core@1.0.1` runtime. CI uses the published packages via `npm ci`.

The full list of lockfile entries the mirror cannot serve is in `docs/missing-dependencies.md`
(`npm run deps:check` regenerates it).
