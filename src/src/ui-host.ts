/**
 * Minimal surface the presenter needs from the platform. The IWSDK system
 * implements it with UIKitML panels; tests implement it with fakes.
 */
import type { DecisionBundle } from './exports.js';
import type { DiagramModel } from './diagram-model.js';
import type { ChoiceKey, Inputs } from './decision.js';
import type { QualifiedAnswer } from './question-assist.js';

export interface UiElement {
  setProperties(properties: Record<string, unknown>): void;
  addEventListener(type: 'click', listener: () => void): void;
  removeEventListener(type: 'click', listener: () => void): void;
}

export interface UiPanel {
  requireElementById(id: string): UiElement;
  setVisible(visible: boolean): void;
}

export type PanelName = 'decision' | 'detail' | 'controls' | 'graph-cloud' | 'graph-on-premise' | 'graph-hybrid' | 'keyboard' | 'carousel';

export interface ExportReceipt {
  code: string;
  url: string;
  expiresAt: string;
}

export interface WorkspaceHost {
  questionAi?: {
    available: boolean;
    qualify(key: ChoiceKey, text: string, inputs: Inputs, version: number, signal: AbortSignal): Promise<QualifiedAnswer>;
  };
  decisionLocked?(): void;
  panel(name: PanelName): UiPanel;
  /** Optional 3D workflow diagrams; absent in the flat test host. */
  diagram?: { update(model: DiagramModel): void };
  xr: {
    available: boolean;
    launch(): void;
    exit(): void;
  };
  recenter(): void;
  setTextScale(scale: number): void;
  storage: {
    load(): string | null;
    save(value: string): void;
    remove(): void;
  };
  exports: {
    keep?(bundle: DecisionBundle): void;
    clearLocal?(): void;
    /** Server-side export inbox; rejects when unavailable. */
    inbox(bundle: DecisionBundle): Promise<ExportReceipt>;
    /** Browser download; returns false when the environment cannot download. */
    download(content: string, type: string, filename: string): boolean;
    /** Deletes a stored export early; resolves false when it no longer exists. */
    remove(code: string): Promise<boolean>;
  };
}
