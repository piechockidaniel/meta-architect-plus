/**
 * Platform-independent description of the 3D workflow diagrams plus the
 * deterministic layout that places every variant's blocks in the same slots.
 * The presenter builds the model; the IWSDK diagram system turns the layout
 * into meshes. Units are metres in island-local space (x across, y up, z
 * toward the viewer).
 */
import type { Boundary, ComponentId, Deployment } from './catalogue.js';
import type { RuleResult, State } from './decision.js';
import type { WorkloadId } from './workload.js';

export interface DiagramNodeModel {
  id: ComponentId;
  label: string;
  shortLabel: string;
  kind: 'base' | 'workload';
  present: boolean;
  boundary: string;
  result: RuleResult;
  focused: boolean;
  changed: boolean;
  linked: boolean;
}

export interface DiagramLinkModel {
  from: ComponentId;
  to: ComponentId;
  crossesBoundary: boolean;
}

export interface DiagramVariantModel {
  id: Deployment;
  label: string;
  state: State;
  inspected: boolean;
  nodes: DiagramNodeModel[];
  links: DiagramLinkModel[];
}

export interface DiagramModel {
  visible: boolean;
  variants: DiagramVariantModel[];
  workload: WorkloadId[];
  /** Workload blocks the library can still offer (not yet added). */
  available: WorkloadId[];
}

export interface BlockPlacement {
  id: ComponentId;
  position: [number, number, number];
  size: [number, number, number];
  present: boolean;
  boundaryColor: string;
  resultColor: string;
  emissive: string | null;
  label: string;
  sublabel: string;
  scale: number;
}

export interface LinkPlacement {
  from: ComponentId;
  to: ComponentId;
  start: [number, number, number];
  end: [number, number, number];
  color: string;
  radius: number;
}

export interface VariantLayout {
  blocks: BlockPlacement[];
  links: LinkPlacement[];
}

/** Island footprint in metres; three islands sit side by side in front of the user. */
export const ISLAND = { width: 0.56, depth: 0.7, spacing: 0.72 } as const;
/** Symbol footprint and height in metres (symbols are unit-sized, see diagram-shapes.ts). */
export const BLOCK_SIZE: [number, number, number] = [0.09, 0.085, 0.09];
const WORKLOAD_SIZE: [number, number, number] = [0.07, 0.065, 0.07];
/** Symbols stand on the boundary tile, which sits on the island base. */
const BLOCK_Y = 0.012;

/** Slot per base role; identical in every variant so the three islands align. */
const slots: Record<string, [number, number]> = {
  identity: [-0.16, -0.25],
  ingress: [0.16, -0.25],
  application: [0, -0.12],
  connectivity: [0, 0.0],
  database: [-0.16, 0.12],
  backup: [0.16, 0.12],
  monitoring: [0, 0.24],
};
const workloadRowZ = 0.34;

export const boundaryColors: Record<Boundary | 'unknown', string> = {
  'External hosting': '#4a8fd6',
  'Organization site': '#c98a2e',
  'Cross-environment link': '#9b6bd1',
  'Identity source': '#5f7d8c',
  'External dependency': '#b8507a',
  unknown: '#7b8794',
};

export const resultColors: Record<RuleResult, string> = {
  pass: '#dfe7ee',
  unknown: '#d89a2b',
  unsupported: '#8a6cc7',
  fail: '#d4384e',
};

export const emissiveColors = { focused: '#1877f2', changed: '#e0a100', linked: '#1877f2' } as const;

function boundaryColor(boundary: string): string {
  return (boundaryColors as Record<string, string>)[boundary] ?? boundaryColors.unknown;
}

export function slotFor(node: DiagramNodeModel, workloadIndex: number, workloadCount: number): [number, number] {
  const fixed = slots[node.id];
  if (fixed) return fixed;
  const pitch = 0.11;
  const x = (workloadIndex - (workloadCount - 1) / 2) * pitch;
  return [x, workloadRowZ];
}

export function layoutVariant(variant: DiagramVariantModel): VariantLayout {
  const workloadNodes = variant.nodes.filter((node) => node.kind === 'workload');
  const positions = new Map<ComponentId, [number, number, number]>();
  const blocks: BlockPlacement[] = variant.nodes.map((node) => {
    const [x, z] = slotFor(node, workloadNodes.indexOf(node), workloadNodes.length);
    const size = node.kind === 'workload' ? WORKLOAD_SIZE : BLOCK_SIZE;
    const position: [number, number, number] = [x, node.present ? BLOCK_Y : 0.006, z];
    positions.set(node.id, position);
    const emissive = node.focused ? emissiveColors.focused : node.changed ? emissiveColors.changed : node.linked ? emissiveColors.linked : null;
    const marker = node.result === 'unknown' ? '? ' : node.result === 'unsupported' ? '! ' : node.result === 'fail' ? 'X ' : '';
    return {
      id: node.id,
      position,
      size: node.present ? size : [size[0], 0.006, size[2]],
      present: node.present,
      boundaryColor: node.present ? boundaryColor(node.boundary) : boundaryColors.unknown,
      resultColor: node.present ? resultColors[node.result] : '#b5bec7',
      emissive,
      label: `${node.changed ? '* ' : ''}${node.linked ? '> ' : ''}${marker}${node.shortLabel}`,
      sublabel: node.present ? node.boundary : 'not needed',
      scale: node.focused ? 1.15 : 1,
    };
  });
  const links: LinkPlacement[] = [];
  for (const link of variant.links) {
    const from = positions.get(link.from);
    const to = positions.get(link.to);
    const fromNode = variant.nodes.find((node) => node.id === link.from);
    const toNode = variant.nodes.find((node) => node.id === link.to);
    if (!from || !to || !fromNode?.present || !toNode?.present) continue;
    links.push({
      from: link.from,
      to: link.to,
      start: [from[0], from[1], from[2]],
      end: [to[0], to[1], to[2]],
      color: link.crossesBoundary ? '#e0a100' : '#7fc4cc',
      radius: link.crossesBoundary ? 0.006 : 0.004,
    });
  }
  return { blocks, links };
}

/** Island centre offsets (x) for the three variants, in catalogue order. */
export function islandOffset(index: number, count = 3): number {
  return (index - (count - 1) / 2) * ISLAND.spacing;
}
