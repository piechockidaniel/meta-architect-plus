/**
 * ECS components for the 3D workflow diagrams. Declared system-free so the
 * editor can inspect them (see src/components.ts).
 */
import { createComponent, Types } from '@iwsdk/core';

/** A block inside a variant island; identifies which catalogue component it renders. */
export const DiagramBlock = createComponent('DiagramBlock', {
  variant: { type: Types.String, default: '' },
  componentId: { type: Types.String, default: '' },
});

/** A grabbable block on the library shelf; dropping it on an island adds the workload component. */
export const LibraryBlock = createComponent('LibraryBlock', {
  workloadId: { type: Types.String, default: '' },
});
