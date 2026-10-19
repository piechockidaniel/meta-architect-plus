/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { AssetType, defineAssets } from '@iwsdk/core';

// Evaluated by both the runtime and the editor: keep this module deterministic
// and side-effect free (see AGENTS.md).
const publicAssetUrl = (filePath: string): string =>
  `${import.meta.env.BASE_URL}${filePath.replace(/^\/+/u, '')}`;

export default defineAssets({
  'carousel-panel': { url: publicAssetUrl('ui/carousel.uikitml'), type: AssetType.UIKitML, name: 'Focused carousel' },
  'project-keyboard': { url: publicAssetUrl('ui/keyboard.uikitml'), type: AssetType.UIKitML, name: 'Project keyboard' },
  'decision-panel': {
    url: publicAssetUrl('ui/decision.uikitml'),
    type: AssetType.UIKitML,
    name: 'Decision Panel',
  },
  'architecture-panel': {
    url: publicAssetUrl('ui/architecture.uikitml'),
    type: AssetType.UIKitML,
    name: 'Architecture Panel',
  },
  'detail-panel': {
    url: publicAssetUrl('ui/detail.uikitml'),
    type: AssetType.UIKitML,
    name: 'Detail Panel',
  },
  'controls-panel': {
    url: publicAssetUrl('ui/controls.uikitml'),
    type: AssetType.UIKitML,
    name: 'Controls Panel',
  },
  'node-label': {
    url: publicAssetUrl('ui/node-label.uikitml'),
    type: AssetType.UIKitML,
    name: 'Diagram Node Label',
  },
});
