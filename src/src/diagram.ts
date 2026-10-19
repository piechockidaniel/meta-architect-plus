/**
 * 3D workflow diagrams: one island per variant with aligned blocks, boundary
 * tiles and dependency links, plus a library shelf of grabbable workload
 * blocks. Pure three.js built from the presenter's DiagramModel; the owning
 * IWSDK system (src/workspace.ts) feeds hover, press, grab and release events.
 *
 * Comfort rules: islands are small, static and in front of the seated user;
 * nothing animates continuously; dropping a block snaps to an island and the
 * block springs back to the shelf, so no precision placement is required.
 */
import {
  BoxGeometry,
  CylinderGeometry,
  DistanceGrabbable,
  Group,
  Mesh,
  MeshStandardMaterial,
  MovementMode,
  RayInteractable,
  UIKitMLAsset,
  Vector3,
} from '@iwsdk/core';
import { createSymbol, disposeSymbolGeometries } from './diagram-shapes.js';
import type { SymbolInstance } from './diagram-shapes.js';
import type { Entity, UIKit, World } from '@iwsdk/core';
import { DiagramBlock, LibraryBlock } from './diagram-component.js';
import { ISLAND, islandOffset, layoutVariant } from './diagram-model.js';
import type { BlockPlacement, DiagramModel, LinkPlacement } from './diagram-model.js';
import type { ComponentId, Deployment } from './catalogue.js';
import { workloadIds, workloadLibrary } from './workload.js';
import type { WorkloadId } from './workload.js';

const LABEL_ASSET = 'node-label';
const LABEL_SCALE = 0.1;
const WORKLOAD_LABEL_SCALE = 0.07;
const DROP_RADIUS = 0.45;
const HOVER_EMISSIVE = '#3a3a3a';
const SHELF_PITCH = 0.11;

interface BlockView {
  /** Entity whose object3D is a Group holding the symbol, its boundary tile and the label entity. */
  entity: Entity;
  symbol: SymbolInstance;
  tile: Mesh<BoxGeometry, MeshStandardMaterial>;
  label: UIKitMLAsset | null;
  hovered: boolean;
  emissive: string | null;
}

interface LinkView {
  entity: Entity;
  mesh: Mesh<CylinderGeometry, MeshStandardMaterial>;
}

interface IslandView {
  id: Deployment;
  root: Entity;
  base: Mesh<BoxGeometry, MeshStandardMaterial>;
  blocks: Map<ComponentId, BlockView>;
  links: Map<string, LinkView>;
}

interface ShelfView {
  workloadId: WorkloadId;
  entity: Entity;
  symbol: SymbolInstance;
}

export interface DiagramCallbacks {
  onSelect(variant: Deployment, id: ComponentId): void;
  onDrop(workloadId: WorkloadId): void;
}

export class DiagramView {
  private islands: IslandView[] = [];
  private shelf: ShelfView[] = [];
  private disposed = false;
  private blockGeometry = new BoxGeometry(1, 1, 1);
  private linkGeometry = new CylinderGeometry(1, 1, 1, 10);
  private worldPosition = new Vector3();
  private islandPosition = new Vector3();
  private direction = new Vector3();
  private up = new Vector3(0, 1, 0);
  private lastModel: DiagramModel | null = null;

  constructor(
    private readonly world: World,
    private readonly diagramRoot: Entity,
    private readonly shelfRoot: Entity,
    private readonly callbacks: DiagramCallbacks,
  ) {
    this.buildShelf();
  }

  dispose(): void {
    this.disposed = true;
    for (const island of this.islands) {
      for (const block of island.blocks.values()) block.entity.dispose();
      for (const link of island.links.values()) link.entity.dispose();
      island.root.dispose();
    }
    for (const item of this.shelf) item.entity.dispose();
    this.islands = [];
    this.shelf = [];
    this.blockGeometry.dispose();
    this.linkGeometry.dispose();
    disposeSymbolGeometries();
  }

  // ---------------------------------------------------------------- model sync

  update(model: DiagramModel): void {
    if (this.disposed) return;
    this.lastModel = model;
    const root = this.diagramRoot.object3D;
    if (root) root.visible = model.visible;
    if (this.shelfRoot.object3D) this.shelfRoot.object3D.visible = model.visible;
    model.variants.forEach((variant, index) => {
      const island = this.islands[index] ?? this.createIsland(variant.id, index);
      const layout = layoutVariant(variant);
      island.base.material.color.set(variant.inspected ? '#d8e2ea' : '#c4ccd3');
      const seen = new Set<ComponentId>();
      for (const placement of layout.blocks) {
        seen.add(placement.id);
        const view = island.blocks.get(placement.id) ?? this.createBlock(island, placement.id);
        this.applyBlock(view, placement);
      }
      for (const [id, view] of island.blocks) {
        if (!seen.has(id) && view.entity.object3D) view.entity.object3D.visible = false;
      }
      const seenLinks = new Set<string>();
      for (const link of layout.links) {
        const key = `${link.from}->${link.to}`;
        seenLinks.add(key);
        const view = island.links.get(key) ?? this.createLink(island, key);
        this.applyLink(view, link);
      }
      for (const [key, view] of island.links) {
        if (!seenLinks.has(key) && view.entity.object3D) view.entity.object3D.visible = false;
      }
    });
    for (const item of this.shelf) {
      const available = model.available.includes(item.workloadId);
      for (const material of [...item.symbol.materials, ...item.symbol.accents]) {
        material.opacity = available ? 1 : 0.35;
        material.transparent = !available;
      }
    }
  }

  private createIsland(id: Deployment, index: number): IslandView {
    const group = new Group();
    group.position.set(islandOffset(index), 0, 0);
    group.rotation.y = (1 - index) * 0.2;
    const root = this.world.createTransformEntity(group, this.diagramRoot);
    const base = new Mesh(this.blockGeometry, new MeshStandardMaterial({ color: '#c4ccd3', roughness: 0.85, metalness: 0 }));
    base.scale.set(ISLAND.width, 0.012, ISLAND.depth);
    base.position.set(0, -0.006, 0.04);
    group.add(base);
    const island: IslandView = { id, root, base, blocks: new Map(), links: new Map() };
    this.islands[index] = island;
    return island;
  }

  private createBlock(island: IslandView, id: ComponentId): BlockView {
    const group = new Group();
    const symbol = createSymbol(id);
    const tile = new Mesh(this.blockGeometry, new MeshStandardMaterial({ color: '#7b8794', roughness: 0.9, metalness: 0 }));
    group.add(symbol.object, tile);
    const entity = this.world.createTransformEntity(group, island.root);
    entity.addComponent(RayInteractable);
    entity.addComponent(DiagramBlock, { variant: island.id, componentId: id });
    const view: BlockView = { entity, symbol, tile, label: null, hovered: false, emissive: null };
    island.blocks.set(id, view);
    void this.attachLabel(view, id);
    return view;
  }

  private async attachLabel(view: BlockView, id: ComponentId): Promise<void> {
    try {
      const label = await this.world.assets.instantiate<UIKitMLAsset>(LABEL_ASSET);
      if (this.disposed) return;
      const scale = workloadIds.includes(id as WorkloadId) ? WORKLOAD_LABEL_SCALE : LABEL_SCALE;
      label.scale.setScalar(scale);
      label.position.set(0, 0.085, 0);
      this.world.createTransformEntity(label, view.entity);
      view.label = label;
      if (this.lastModel) this.update(this.lastModel);
    } catch (error) {
      console.warn('Diagram label unavailable:', error);
    }
  }

  private applyBlock(view: BlockView, placement: BlockPlacement): void {
    const object = view.entity.object3D;
    if (!object) return;
    object.visible = true;
    object.position.set(placement.position[0], placement.position[1], placement.position[2]);
    // Symbols are unit-sized and stand on y = 0; scale them to the block footprint and height.
    view.symbol.object.visible = placement.present;
    view.symbol.object.scale.set(placement.size[0] * placement.scale, placement.size[1] * placement.scale, placement.size[2] * placement.scale);
    for (const material of view.symbol.materials) material.color.set(placement.resultColor);
    view.emissive = placement.emissive;
    this.applyEmissive(view);
    // Boundary tile: a flat plate under the symbol, coloured by deployment boundary.
    const height = placement.size[1] * placement.scale;
    view.tile.scale.set(placement.size[0] * 1.35, 0.006, placement.size[2] * 1.35);
    view.tile.position.set(0, -0.003, 0);
    view.tile.material.color.set(placement.present ? placement.boundaryColor : '#b5bec7');
    if (view.label) {
      view.label.visible = placement.present;
      view.label.position.set(0, height + 0.05, 0);
      view.label.requireElementById<UIKit.Text>('nl-title').setProperties({ text: placement.label });
      view.label.requireElementById<UIKit.Text>('nl-sub').setProperties({ text: placement.sublabel });
    }
  }

  private applyEmissive(view: BlockView): void {
    const color = view.emissive ?? (view.hovered ? HOVER_EMISSIVE : '#000000');
    for (const material of view.symbol.materials) {
      material.emissive.set(color);
      material.emissiveIntensity = view.emissive ? 0.6 : view.hovered ? 0.8 : 0;
    }
  }

  private createLink(island: IslandView, key: string): LinkView {
    const mesh = new Mesh(this.linkGeometry, new MeshStandardMaterial({ color: '#7fc4cc', roughness: 0.7, metalness: 0 }));
    const entity = this.world.createTransformEntity(mesh, island.root);
    const view: LinkView = { entity, mesh };
    island.links.set(key, view);
    return view;
  }

  private applyLink(view: LinkView, link: LinkPlacement): void {
    const object = view.entity.object3D;
    if (!object) return;
    object.visible = true;
    this.direction.set(link.end[0] - link.start[0], link.end[1] - link.start[1], link.end[2] - link.start[2]);
    const length = this.direction.length();
    object.position.set((link.start[0] + link.end[0]) / 2, (link.start[1] + link.end[1]) / 2, (link.start[2] + link.end[2]) / 2);
    object.scale.set(link.radius, Math.max(length, 0.001), link.radius);
    if (length > 0) {
      this.direction.normalize();
      object.quaternion.setFromUnitVectors(this.up, this.direction);
    }
    view.mesh.material.color.set(link.color);
  }

  // ---------------------------------------------------------------- shelf

  private buildShelf(): void {
    workloadIds.forEach((workloadId, index) => {
      const definition = workloadLibrary[workloadId];
      const group = new Group();
      const symbol = createSymbol(workloadId);
      symbol.object.scale.set(0.06, 0.055, 0.06);
      for (const material of symbol.materials) material.color.set(definition.tint);
      group.add(symbol.object);
      group.position.set((index - (workloadIds.length - 1) / 2) * SHELF_PITCH, 0.005, 0);
      const entity = this.world.createTransformEntity(group, this.shelfRoot);
      entity.addComponent(RayInteractable);
      entity.addComponent(LibraryBlock, { workloadId });
      entity.addComponent(DistanceGrabbable, {
        movementMode: MovementMode.MoveTowardsTarget,
        returnToOrigin: true,
        moveSpeedFactor: 0.02,
        translate: true,
        rotate: false,
        scale: false,
      });
      this.shelf.push({ workloadId, entity, symbol });
      void this.attachShelfLabel(entity, definition.shortLabel, definition.examples[0]);
    });
  }

  private async attachShelfLabel(parent: Entity, title: string, example: string): Promise<void> {
    try {
      const label = await this.world.assets.instantiate<UIKitMLAsset>(LABEL_ASSET);
      if (this.disposed) return;
      label.scale.setScalar(WORKLOAD_LABEL_SCALE);
      label.position.set(0, 0.075, 0);
      this.world.createTransformEntity(label, parent);
      label.requireElementById<UIKit.Text>('nl-title').setProperties({ text: title });
      label.requireElementById<UIKit.Text>('nl-sub').setProperties({ text: `e.g. ${example}` });
    } catch (error) {
      console.warn('Shelf label unavailable:', error);
    }
  }

  // ---------------------------------------------------------------- events from the system

  setHovered(entity: Entity, hovered: boolean): void {
    const view = this.findBlock(entity);
    if (!view) return;
    view.hovered = hovered;
    this.applyEmissive(view);
  }

  select(entity: Entity): void {
    const variant = entity.getValue(DiagramBlock, 'variant') as Deployment;
    const id = entity.getValue(DiagramBlock, 'componentId') as ComponentId;
    if (variant && id) this.callbacks.onSelect(variant, id);
  }

  /** Called when a shelf block is released: snap-to-island semantics, no precision placement. */
  released(entity: Entity): void {
    const workloadId = entity.getValue(LibraryBlock, 'workloadId') as WorkloadId;
    const object = entity.object3D;
    if (!workloadId || !object) return;
    object.getWorldPosition(this.worldPosition);
    let nearest = Number.POSITIVE_INFINITY;
    for (const island of this.islands) {
      const islandObject = island.root.object3D;
      if (!islandObject) continue;
      islandObject.getWorldPosition(this.islandPosition);
      const dx = this.islandPosition.x - this.worldPosition.x;
      const dz = this.islandPosition.z - this.worldPosition.z;
      nearest = Math.min(nearest, Math.sqrt(dx * dx + dz * dz));
    }
    if (nearest <= DROP_RADIUS) this.callbacks.onDrop(workloadId);
  }

  private findBlock(entity: Entity): BlockView | undefined {
    for (const island of this.islands) {
      for (const block of island.blocks.values()) if (block.entity === entity) return block;
    }
    return undefined;
  }
}
