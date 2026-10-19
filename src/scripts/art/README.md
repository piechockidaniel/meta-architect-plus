# Cover and icon generation

The cover art is rendered from the app's own 3D symbols and island layout, so
it always matches what users see. Regeneration is optional; the committed
PNGs in `artifacts/cover/` and `public/icons/` are the deliverables.

1. Bundle a scene with esbuild, aliasing `@iwsdk/core` to `three` (the scenes
   only use the Three.js classes IWSDK re-exports):
   `npx esbuild scripts/art/cover-scene.ts --bundle --format=esm --alias:@iwsdk/core=three --outfile=/tmp/cover-bundle.js`
2. Load it in a page with a `<canvas id="render-canvas">` in headless Chromium
   (Playwright) and save the canvas screenshot with a transparent background as
   `artifacts/cover/raw/cover-3d.png` (2560x1440) or `raw/icon-3d.png` (1024x1024).
3. Composite text, gradient and shadow with Python/Pillow:
   `python3 scripts/art/compose-cover.py` and `python3 scripts/art/compose-icons.py`
   (fonts: Noto Sans CJK; swap the paths at the top of the scripts if needed).

Keep the artwork provider-neutral and free of third-party logos.
