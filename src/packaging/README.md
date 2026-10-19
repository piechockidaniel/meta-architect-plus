# Packaging templates

Copy, fill in, and keep the real files out of `public/` until they are meant to
be public:

| Template | Copy to | When |
| --- | --- | --- |
| `twa-manifest.template.json` | `C:\dev\archdecide-twa\twa-manifest.json` (a folder outside this repo) | before `bubblewrap update` |
| `assetlinks.template.json` | `public/.well-known/assetlinks.json` (this repo, then rebuild and redeploy) | after the keystore exists |

The keystore and its passwords never go into this repository or into
`public/`. See `../../docs/DEVELOPER-MANUAL.md` for the full procedure.
