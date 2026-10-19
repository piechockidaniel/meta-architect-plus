/**
 * Generic 3D symbols for the workflow diagrams, built from primitives so they
 * are original, provider-neutral and cheap to render. Every symbol fits in a
 * unit-ish box (about 1 x 1 x 1) and is scaled by the diagram; its materials
 * are cloned per instance so state colours never leak between blocks.
 */
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
} from '@iwsdk/core';
import type { Object3D } from '@iwsdk/core';
import type { ComponentId } from './catalogue.js';

const geometries = {
  box: new BoxGeometry(1, 1, 1),
  cylinder: new CylinderGeometry(0.5, 0.5, 1, 20),
  cone: new CylinderGeometry(0.3, 0.5, 1, 16),
  sphere: new SphereGeometry(0.5, 16, 12),
  torus: new TorusGeometry(0.4, 0.1, 10, 24),
  tip: new ConeGeometry(0.5, 1, 16),
};

export interface SymbolInstance {
  object: Object3D;
  /** Primary materials that take the state colour. */
  materials: MeshStandardMaterial[];
  /** Accent materials that stay neutral dark (outlines, stands, pins). */
  accents: MeshStandardMaterial[];
}

type Part = { geometry: keyof typeof geometries; position: [number, number, number]; scale: [number, number, number]; rotation?: [number, number, number]; accent?: boolean };

function part(geometry: Part['geometry'], position: Part['position'], scale: Part['scale'], extra: Partial<Part> = {}): Part {
  return { geometry, position, scale, ...extra };
}

/** Each symbol is a list of primitive parts; y = 0 is the base the symbol stands on. */
const symbols: Record<ComponentId, Part[]> = {
  identity: [
    part('sphere', [0, 0.78, 0], [0.42, 0.42, 0.42]),
    part('cone', [0, 0.28, 0], [0.8, 0.56, 0.8]),
    part('box', [0, 0.02, 0], [0.9, 0.04, 0.9], { accent: true }),
  ],
  ingress: [
    part('box', [-0.35, 0.45, 0], [0.18, 0.9, 0.3]),
    part('box', [0.35, 0.45, 0], [0.18, 0.9, 0.3]),
    part('box', [0, 0.93, 0], [0.95, 0.16, 0.34]),
    part('box', [0, 0.02, 0], [1, 0.04, 0.5], { accent: true }),
  ],
  application: [
    part('box', [0, 0.12, 0], [0.95, 0.2, 0.75]),
    part('box', [0, 0.36, 0], [0.85, 0.2, 0.65]),
    part('box', [0, 0.6, 0], [0.75, 0.2, 0.55]),
    part('box', [0, 0.76, 0.2], [0.22, 0.12, 0.12], { accent: true }),
  ],
  connectivity: [
    part('torus', [-0.22, 0.45, 0], [0.9, 0.9, 0.9], { rotation: [0, 0, 0] }),
    part('torus', [0.22, 0.45, 0], [0.9, 0.9, 0.9], { rotation: [0, Math.PI / 2, 0] }),
  ],
  database: [
    part('cylinder', [0, 0.15, 0], [0.9, 0.26, 0.9]),
    part('cylinder', [0, 0.45, 0], [0.9, 0.26, 0.9]),
    part('cylinder', [0, 0.75, 0], [0.9, 0.26, 0.9]),
    part('cylinder', [0, 0.3, 0], [0.92, 0.03, 0.92], { accent: true }),
    part('cylinder', [0, 0.6, 0], [0.92, 0.03, 0.92], { accent: true }),
  ],
  backup: [
    part('cylinder', [-0.18, 0.14, 0.12], [0.7, 0.24, 0.7]),
    part('cylinder', [-0.18, 0.42, 0.12], [0.7, 0.24, 0.7]),
    part('cylinder', [0.22, 0.26, -0.18], [0.55, 0.18, 0.55], { accent: true }),
    part('cylinder', [0.22, 0.48, -0.18], [0.55, 0.18, 0.55], { accent: true }),
  ],
  monitoring: [
    part('cylinder', [0, 0.06, 0], [0.5, 0.08, 0.5], { accent: true }),
    part('cylinder', [0, 0.25, 0], [0.08, 0.35, 0.08], { accent: true }),
    part('box', [0, 0.7, 0], [1, 0.62, 0.08]),
    part('box', [-0.25, 0.6, 0.06], [0.12, 0.22, 0.04], { accent: true }),
    part('box', [0, 0.68, 0.06], [0.12, 0.38, 0.04], { accent: true }),
    part('box', [0.25, 0.64, 0.06], [0.12, 0.3, 0.04], { accent: true }),
  ],
  storage: [
    part('box', [0, 0.25, 0], [1, 0.5, 0.7]),
    part('box', [-0.25, 0.55, 0], [0.45, 0.12, 0.7]),
    part('box', [0, 0.3, 0.2], [0.8, 0.32, 0.04], { accent: true }),
  ],
  jobs: [
    part('torus', [0, 0.5, 0], [1, 1, 1], { rotation: [Math.PI / 2, 0, 0] }),
    part('cylinder', [0, 0.5, 0], [0.35, 0.22, 0.35], { accent: true }),
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((index) => {
      const angle = (index / 8) * Math.PI * 2;
      return part('box', [Math.cos(angle) * 0.5, 0.5, Math.sin(angle) * 0.5], [0.2, 0.22, 0.2], { rotation: [0, -angle, 0] });
    }),
  ],
  cache: [
    part('box', [0, 0.16, 0], [0.8, 0.2, 0.8]),
    part('box', [0, 0.3, 0], [0.45, 0.08, 0.45], { accent: true }),
    ...[-0.3, -0.1, 0.1, 0.3].flatMap((offset) => [
      part('box', [offset, 0.08, 0.46], [0.08, 0.16, 0.12], { accent: true }),
      part('box', [offset, 0.08, -0.46], [0.08, 0.16, 0.12], { accent: true }),
    ]),
  ],
  queue: [
    part('box', [0, 0.06, 0], [1.1, 0.08, 0.45], { accent: true }),
    part('box', [-0.35, 0.28, 0], [0.26, 0.36, 0.3]),
    part('box', [0, 0.28, 0], [0.26, 0.36, 0.3]),
    part('box', [0.35, 0.28, 0], [0.26, 0.36, 0.3]),
    part('tip', [0.62, 0.28, 0], [0.2, 0.22, 0.2], { rotation: [0, 0, -Math.PI / 2], accent: true }),
  ],
  integration: [
    part('box', [0, 0.3, 0], [0.6, 0.6, 0.45]),
    part('cylinder', [-0.15, 0.78, 0], [0.12, 0.36, 0.12], { accent: true }),
    part('cylinder', [0.15, 0.78, 0], [0.12, 0.36, 0.12], { accent: true }),
    part('cylinder', [0, 0.0, 0], [0.1, 0.3, 0.1], { accent: true, rotation: [0, 0, 0] }),
  ],
};

const ACCENT_COLOR = '#2b3440';

export function createSymbol(id: ComponentId): SymbolInstance {
  const object = new Group();
  const materials: MeshStandardMaterial[] = [];
  const accents: MeshStandardMaterial[] = [];
  const primary = new MeshStandardMaterial({ color: '#dfe7ee', roughness: 0.55, metalness: 0.05 });
  const accent = new MeshStandardMaterial({ color: ACCENT_COLOR, roughness: 0.7, metalness: 0.1 });
  materials.push(primary);
  accents.push(accent);
  for (const entry of symbols[id] ?? symbols.application) {
    const mesh = new Mesh(geometries[entry.geometry], entry.accent ? accent : primary);
    mesh.position.set(entry.position[0], entry.position[1], entry.position[2]);
    mesh.scale.set(entry.scale[0], entry.scale[1], entry.scale[2]);
    if (entry.rotation) mesh.rotation.set(entry.rotation[0], entry.rotation[1], entry.rotation[2]);
    mesh.castShadow = false;
    object.add(mesh);
  }
  return { object, materials, accents };
}

/** Geometries are shared by every symbol; dispose once when the diagram goes away. */
export function disposeSymbolGeometries(): void {
  for (const geometry of Object.values(geometries)) geometry.dispose();
}

export const symbolIds = Object.keys(symbols) as ComponentId[];
