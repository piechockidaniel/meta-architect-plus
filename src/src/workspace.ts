/**
 * IWSDK adapter: resolves the scene-authored Horizon-kit panels, implements the
 * WorkspaceHost contract (XR session, recenter, text size, storage, export
 * retrieval) and feeds session/tracking state to the presenter. Business rules
 * live in the domain modules; this system only renders and relays.
 */
import { createSystem, Euler, Grabbed, Hovered, Pressed, Quaternion, UIKitMLAsset, Vector3, VisibilityState } from '@iwsdk/core';
import type { Entity } from '@iwsdk/core';
import { sample } from './decision.js';
import { DiagramView } from './diagram.js';
import { DiagramBlock, LibraryBlock } from './diagram-component.js';
import type { DecisionBundle } from './exports.js';
import { WorkspacePresenter, presenterPanelNames } from './presenter.js';
import { attachProjectEditor } from './project-editor.js';
import { DecisionSession } from './session.js';
import { attachExportShelf } from './export-shelf.js';
import { dictationSupport } from './dictation.js';
import { DecisionPulse } from './decision-pulse.js';
import { attachAppMark } from './app-mark.js';
import { qualifyProposal } from './question-assist.js';
import { applicableQuestions } from './intake.js';
import type { ExportReceipt, PanelName, UiPanel, WorkspaceHost } from './ui-host.js';

export const STORAGE_KEY = 'architecture-workspace-v2';
/** Scene node ids (public/scenes/main.iwsdk.scene.json) for each presenter panel. */
const panelNodeIds: Record<PanelName, string> = {
  carousel: 'carousel-panel',
  keyboard: 'project-keyboard',
  decision: 'decision-panel',
  detail: 'detail-panel',
  controls: 'controls-panel',
  'graph-cloud': 'graph-cloud',
  'graph-on-premise': 'graph-on-premise',
  'graph-hybrid': 'graph-hybrid',
};
const WORKSPACE_NODE = 'workspace';
const DIAGRAM_NODE = 'diagram-root';
const SHELF_NODE = 'library-shelf';
/** Eye height the authored layout was designed around; recenter re-bases to the real head. */
const AUTHORED_EYE_HEIGHT = 1.5;
const TRACKING_CHECK_INTERVAL = 0.5;

export class WorkspaceSystem extends createSystem({
  hoveredBlocks: { required: [DiagramBlock, Hovered] },
  pressedBlocks: { required: [DiagramBlock, Pressed] },
  heldLibraryBlocks: { required: [LibraryBlock, Grabbed] },
}) {
  private presenter!: WorkspacePresenter;
  private diagram!: DiagramView;
  private panels = new Map<PanelName, UIKitMLAsset>();
  /** Authored node scale per panel; entities are re-resolved by node id when needed. */
  private authoredScales = new Map<PanelName, number>();
  private headPosition = new Vector3();
  private headQuaternion = new Quaternion();
  private headForward = new Vector3();
  private rootEuler = new Euler();
  private trackingTimer = 0;
  private immersive = false;
  private exportShelf!: ReturnType<typeof attachExportShelf>;
  private appMark!: ReturnType<typeof attachAppMark>;
  private decisionPulse = new DecisionPulse();
  private nexus!: import('./ui-host.js').UiElement;
  private nexusStyle = { backgroundOpacity: 1 };
  private motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  private questionAi = {
    available: false,
    qualify: async (key: import('./decision.js').ChoiceKey, text: string, inputs: import('./decision.js').Inputs, version: number, signal: AbortSignal) => {
      const response = await fetch('/api/ai/assist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
        body: JSON.stringify({ action: 'qualify', key, specification: text, inputs, version, consent: true }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI qualification unavailable.');
      if (data.version !== version) throw new Error('AI response belongs to another project version.');
      return qualifyProposal(key, text, data.result);
    },
  };

  init(): void {
    for (const name of presenterPanelNames) {
      const nodeId = panelNodeIds[name];
      this.panels.set(name, this.world.requireSceneObject<UIKitMLAsset>(nodeId));
      this.authoredScales.set(name, this.world.requireSceneEntity(nodeId).object3D?.scale.x ?? 1);
    }
    this.world.requireSceneEntity(WORKSPACE_NODE);

    this.diagram = new DiagramView(this.world, this.world.requireSceneEntity(DIAGRAM_NODE), this.world.requireSceneEntity(SHELF_NODE), {
      onSelect: (variant, id) => { if (!this.presenter.focusedMode) this.presenter.focusComponent(variant, id); },
      onDrop: (workloadId) => { if (!this.presenter.focusedMode) this.presenter.toggleWorkload(workloadId, true); },
    });
    this.cleanupFuncs.push(() => this.diagram.dispose());

    const session = new DecisionSession(sample('greenfield'));
    this.exportShelf = attachExportShelf(download);
    this.cleanupFuncs.push(() => this.exportShelf.dispose());
    this.presenter = new WorkspacePresenter(this.createHost(), session);
    this.presenter.focusedMode = !new URLSearchParams(location.search).has('classic');
    this.presenter.bind();
    let active = true;
    void fetch('/api/ai/status').then(response => response.json()).then(status => {
      if (active) { this.questionAi.available = status.available === true; this.presenter.render(); }
    }).catch(() => { /* Direct answer choices remain available offline. */ });
    this.cleanupFuncs.push(() => { active = false; });
    this.appMark = attachAppMark();
    this.nexus = this.panels.get('carousel')!.requireElementById('fc-mark-nexus');
    this.cleanupFuncs.push(() => this.appMark.dispose(), session.subscribe(() => {
      if (session.snapshot.selection === null) { this.decisionPulse.cancel(); this.appMark.cancel(); }
    }));
    const reduceMotion = () => { if (this.motionPreference.matches) this.decisionPulse.cancel(); };
    this.motionPreference.addEventListener('change', reduceMotion);
    this.cleanupFuncs.push(() => this.motionPreference.removeEventListener('change', reduceMotion));
    // Desktop trackpad/wheel navigation is optional; explicit controls also work in XR.
    let lastCarouselScroll = 0;
    const scrollCarousel = (event: WheelEvent) => {
      if (!this.presenter.focusedMode || this.presenter.focusStep !== 'browse' || event.ctrlKey) return;
      event.preventDefault();
      const now = performance.now();
      if (now - lastCarouselScroll < 300 || Math.max(Math.abs(event.deltaX), Math.abs(event.deltaY)) < 8) return;
      lastCarouselScroll = now;
      const horizontal = event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY);
      const delta = Math.sign(horizontal ? event.deltaX || event.deltaY : event.deltaY);
      this.presenter.moveCarousel(horizontal ? delta : 0, horizontal ? 0 : delta);
    };
    this.world.renderer.domElement.addEventListener('wheel', scrollCarousel, { passive: false });
    this.cleanupFuncs.push(() => this.world.renderer.domElement.removeEventListener('wheel', scrollCarousel));
    const speech = dictationSupport();
    const keyboard = this.panels.get('keyboard')!;
    keyboard.requireElementById('entry-dictate').setProperties({ display: speech ? 'flex' : 'none' });
    keyboard.requireElementById('entry-dictation-notice').setProperties({ display: speech ? 'flex' : 'none' });
    let stopSpeech: (() => void) | null = null;
    const dictate = () => {
      stopSpeech?.();
      const entry = this.presenter.keyboard.entry;
      if (!entry || !speech) return;
      stopSpeech = speech(text => {
        // A late result must never populate a cancelled or different field.
        if (this.presenter.keyboard.entry !== entry) return;
        this.presenter.keyboard.entry = { ...entry, value: Array.from(text).slice(0, entry.maxLength).join('') };
        this.presenter.render();
      }, () => { stopSpeech = null; });
    };
    keyboard.requireElementById('entry-dictate').addEventListener('click', dictate);
    this.cleanupFuncs.push(() => { stopSpeech?.(); keyboard.requireElementById('entry-dictate').removeEventListener('click', dictate); });
    this.cleanupFuncs.push(() => this.presenter.dispose());

    // 3D diagram interaction: hover feedback, point-and-select, and snap-to-island drops from the shelf.
    const onHover = (entity: Entity) => this.diagram.setHovered(entity, true);
    const onUnhover = (entity: Entity) => this.diagram.setHovered(entity, false);
    const onPress = (entity: Entity) => this.diagram.select(entity);
    const onRelease = (entity: Entity) => this.diagram.released(entity);
    this.cleanupFuncs.push(
      this.queries.hoveredBlocks.subscribe('qualify', onHover),
      this.queries.hoveredBlocks.subscribe('disqualify', onUnhover),
      this.queries.pressedBlocks.subscribe('qualify', onPress),
      this.queries.heldLibraryBlocks.subscribe('disqualify', onRelease),
    );

    this.cleanupFuncs.push(
      this.world.visibilityState.subscribe((state) => {
        const immersive = state !== VisibilityState.NonImmersive;
        if (immersive !== this.immersive) {
          this.immersive = immersive;
          this.presenter.setImmersive(immersive);
          this.exportShelf.setImmersive(immersive);
          this.appMark.setImmersive(immersive);
        }
        this.presenter.setBlurred(state === VisibilityState.VisibleBlurred || state === VisibilityState.Hidden);
        if (!immersive) this.presenter.setTrackingLost(false);
      }),
    );

    // Browser-only preparation surface (own project, rates, backup import, AI assistance).
    this.cleanupFuncs.push(attachProjectEditor(session, () => this.presenter.render(), STORAGE_KEY, () => {
      this.presenter.deleteLocalCopy();
      if (this.presenter.statusText.includes('could not')) throw new Error(this.presenter.statusText);
    }));
    // Read-only test observation, excluded from ordinary production builds.
    if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
      const target = window as unknown as { __architectureTest?: unknown };
      const probe = {
        read: () => structuredClone({ stage: this.presenter.stage, context: session.context, snapshot: session.snapshot,
          entry: this.presenter.keyboard.entry, actions: this.presenter.actionSequence, lastAction: this.presenter.lastAction,
            tour: this.presenter.tour?.stepIndex ?? null, exportState: this.presenter.exportState,
            focusedMode: this.presenter.focusedMode, focusStep: this.presenter.focusStep,
            question: applicableQuestions(session.snapshot.inputs)[this.presenter.questionIndex], answerDraft: this.presenter.answerDraft,
            questionAiAvailable: this.questionAi.available,
            carousel: this.presenter.carousel,
            visiblePanels: presenterPanelNames.filter(name => this.panels.get(name)?.visible),
            shelfVisible: this.world.requireSceneEntity(SHELF_NODE).object3D?.visible,
            decisionPulseActive: this.decisionPulse.active, nexusOpacity: this.nexusStyle.backgroundOpacity }),
        point: (id: string, panel: PanelName = 'decision') => {
          const asset = this.panels.get(panel)!;
          const element = asset.requireElementById(id);
          const position = element.getWorldPosition(new Vector3()).project(this.world.camera);
          const rect = this.world.renderer.domElement.getBoundingClientRect();
          return { x: rect.left + (position.x + 1) * rect.width / 2, y: rect.top + (1 - position.y) * rect.height / 2,
            visible: asset.visible && element.isVisible.peek() && !element.isClipped.peek(),
            hovered: element.hoveredList.peek().length > 0, actions: this.presenter.actionSequence };
        },
      };
      target.__architectureTest = probe;
      this.cleanupFuncs.push(() => { if (target.__architectureTest === probe) delete target.__architectureTest; });
    }
  }

  update(delta: number): void {
    if (this.decisionPulse.active || this.nexusStyle.backgroundOpacity !== 1) {
      this.nexusStyle.backgroundOpacity = this.decisionPulse.advance(delta);
      this.nexus.setProperties(this.nexusStyle);
    }
    if (!this.immersive) return;
    this.trackingTimer += delta;
    if (this.trackingTimer < TRACKING_CHECK_INTERVAL) return;
    this.trackingTimer = 0;
    const xrSession = (this.world as { session?: XRSession | null }).session;
    const sources = xrSession?.inputSources;
    this.presenter.setTrackingLost(sources !== undefined && sources.length === 0);
  }

  private createHost(): WorkspaceHost {
    const uiPanel = (name: PanelName): UiPanel => {
      const asset = this.panels.get(name);
      if (!asset) throw new Error(`Panel ${name} is not placed in the scene.`);
      return {
        requireElementById: (id) => {
          const element = asset.requireElementById(id);
          // Exact runtime names keep controls addressable for `iwsdk ui inspect` and ECS queries.
          element.name = `${name}:${id}`;
          return element;
        },
        setVisible: (visible) => {
          asset.visible = visible;
            if (name === 'carousel') asset.requireElementById('fc-root').setProperties({ display: visible ? 'flex' : 'none' });
          // Coplanar modal panels must leave UIKit's hit-test/layout tree too;
          // Object3D visibility alone can leave an invisible ray target.
          if (name === 'keyboard') asset.requireElementById('entry-root').setProperties({ display: visible ? 'flex' : 'none' });
          if (name === 'decision') asset.requireElementById('dp-root').setProperties({ display: visible ? 'flex' : 'none' });
        },
      };
    };
    return {
      questionAi: this.questionAi,
      decisionLocked: () => {
        this.decisionPulse.trigger(this.motionPreference.matches);
        this.appMark.trigger();
      },
      panel: uiPanel,
      diagram: { update: (model) => this.diagram.update(model) },
      xr: {
        available: this.world.xrEnabled,
        launch: () => this.world.launchXR(),
        exit: () => this.world.exitXR(),
      },
      recenter: () => this.recenter(),
      setTextScale: (scale) => this.setTextScale(scale),
      storage: {
        load: () => safeStorage(() => localStorage.getItem(STORAGE_KEY)) ?? null,
        save: (value) => localStorage.setItem(STORAGE_KEY, value),
        remove: () => localStorage.removeItem(STORAGE_KEY),
      },
      exports: {
        keep: bundle => this.exportShelf.keep(bundle),
        clearLocal: () => this.exportShelf.clear(),
        inbox: (bundle) => storeInInbox(bundle),
        download: (content, type, filename) => download(content, type, filename),
        remove: (code) => removeFromInbox(code),
      },
    };
  }

  /** Re-base the authored layout on the current head position and horizontal gaze direction. */
  private recenter(): void {
    // The flat browser uses its authored camera, not the tracked player head.
    // Re-basing against that inactive head would move the card out of view.
    if (!this.immersive) return;
    const root = this.world.requireSceneEntity(WORKSPACE_NODE).object3D;
    if (!root) return;
    this.player.head.updateWorldMatrix(true, false);
    this.player.head.getWorldPosition(this.headPosition);
    this.player.head.getWorldQuaternion(this.headQuaternion);
    this.headForward.set(0, 0, -1).applyQuaternion(this.headQuaternion);
    this.headForward.y = 0;
    if (this.headForward.lengthSq() < 1e-6) this.headForward.set(0, 0, -1);
    this.headForward.normalize();
    const yaw = Math.atan2(-this.headForward.x, -this.headForward.z);
    root.position.set(this.headPosition.x, this.headPosition.y - AUTHORED_EYE_HEIGHT, this.headPosition.z);
    this.rootEuler.set(0, yaw, 0);
    root.quaternion.setFromEuler(this.rootEuler);
  }

  private setTextScale(scale: number): void {
    for (const [name, authoredScale] of this.authoredScales) {
      this.world.requireSceneEntity(panelNodeIds[name]).object3D?.scale.setScalar(authoredScale * scale);
    }
  }
}

function safeStorage<T>(action: () => T): T | undefined {
  try {
    return action();
  } catch {
    return undefined;
  }
}

function download(content: string, type: string, filename: string): boolean {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') return false;
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}

async function removeFromInbox(code: string): Promise<boolean> {
  const response = await fetch(`/api/exports/${encodeURIComponent(code)}`, { method: 'DELETE' });
  return response.ok;
}

/** Hands-only retrieval path: store the bundle server-side and show a code/URL usable from any device. */
async function storeInInbox(bundle: DecisionBundle): Promise<ExportReceipt> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch('/api/exports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bundle),
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => ({}))) as { code?: string; path?: string; expiresAt?: string; error?: string };
    if (!response.ok || !data.code || !data.path || !data.expiresAt) {
      throw new Error(data.error ?? `export inbox responded ${response.status}`);
    }
    return { code: data.code, url: `${location.origin}${data.path}`, expiresAt: data.expiresAt };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('export inbox timed out');
    throw error instanceof Error ? error : new Error('export inbox unavailable');
  } finally {
    clearTimeout(timeout);
  }
}
