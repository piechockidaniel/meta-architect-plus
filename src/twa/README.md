# TWA packaging workspace

`twa-manifest.example.json` is the template for `bubblewrap`. Copy it to
`twa-manifest.json` (git-ignored), fill in the domain, package id, Horizon App
ID and the absolute keystore path, then run `bubblewrap update && bubblewrap build`
here. Never put the keystore or passwords inside `public/` or this repository.
See `../../docs/RELEASE-LIFECYCLE.md` for the full alpha procedure.
