/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import { WorkspaceSystem } from './workspace.js';

World.create(
  document.getElementById('scene-container') as HTMLDivElement,
  projectOptions,
).then((world) => {
  world.registerSystem(WorkspaceSystem);

  // Installed immersive PWA (Meta Horizon TWA): there is no 2D page to click,
  // so the app-icon tap is the user activation and must be spent on entering
  // XR right away. `getDigitalGoodsService` exists only inside the installed
  // app, so browser tabs and the emulator keep their normal Enter buttons.
  const nav = navigator as Navigator & {
    xr?: { isSessionSupported?: (mode: string) => Promise<boolean> };
  };
  if ('getDigitalGoodsService' in window && nav.xr?.isSessionSupported) {
    nav.xr
      .isSessionSupported('immersive-vr')
      .then((supported) => {
        if (supported) world.launchXR();
      })
      .catch(() => undefined);
  }
});
