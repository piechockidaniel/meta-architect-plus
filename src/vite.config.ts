/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { iwsdkDev } from '@iwsdk/vite-plugin-dev';
import { defineConfig } from 'vite';
import { aiMiddleware } from './server/ai-middleware.js';
import { exportMiddleware } from './server/export-middleware.js';
import { lucideSubset } from './scripts/lucide-subset.js';

// Keep the normal address stable; allow an explicit alternate test port when
// another application owns it. IWSDK still uses strictPort and reports the URL.
const devPort = Number(process.env.ARCHITECTURE_DEV_PORT ?? 8081);
if (!Number.isInteger(devPort) || devPort < 1 || devPort > 65535) {
  throw new Error('ARCHITECTURE_DEV_PORT must be an integer between 1 and 65535.');
}

export default defineConfig({
  plugins: [
    lucideSubset(),
    iwsdkDev(),
    {
      // Optional server features: AI assistance (credentials stay server-side)
      // and the export inbox used for hands-only artifact retrieval.
      name: 'architecture-workspace-api',
      configureServer(server) {
        server.middlewares.use(exportMiddleware());
        server.middlewares.use(aiMiddleware());
      },
      configurePreviewServer(server) {
        server.middlewares.use(exportMiddleware());
        server.middlewares.use(aiMiddleware());
      },
    },
  ],
  server: { host: '0.0.0.0', port: devPort, open: false },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV !== 'production',
    target: 'esnext',
    rollupOptions: { input: './index.html' },
  },
  esbuild: { target: 'esnext' },
  // @drawcall/uikitml otherwise pulls a second three/@pmndrs/uikit graph
  // (three@0.185 vs app super-three@0.181). Duplicate Component classes break
  // instanceof checks → "Only pmndrs/uikit components can be added as children".
  resolve: {
    dedupe: [
      'three',
      '@pmndrs/uikit',
      '@pmndrs/uikit-horizon',
      '@pmndrs/uikit-lucide',
    ],
  },
  optimizeDeps: {
    exclude: ['@babylonjs/havok'],
    include: [
      'three',
      '@pmndrs/uikit',
      '@pmndrs/uikit-horizon',
      '@pmndrs/uikit-lucide',
      '@drawcall/uikitml',
    ],
    esbuildOptions: { target: 'esnext' },
  },
  publicDir: 'public',
  base: './',
});
