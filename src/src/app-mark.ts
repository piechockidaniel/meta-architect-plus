import markSvg from '../assets/branding/app-mark.svg?raw';
import '../styles/app-mark.css';

/** Browser-only overlay. Immersive mode uses the world-space card's nexus. */
export function attachAppMark() {
  const element = document.createElement('div');
  element.className = 'app-mark-container';
  element.id = 'app-mark-preview';
  element.setAttribute('role', 'img');
  element.setAttribute('aria-label', 'Architecture Decision Workspace');
  element.style.cssText = 'position:fixed;right:16px;top:16px;z-index:20;pointer-events:none';
  // Trusted repository asset, never project/user text.
  element.innerHTML = markSvg;
  document.body.append(element);
  return {
    trigger: () => {
      element.dataset.decisionLocked = 'false';
      void element.offsetWidth; // restart only after an explicit accepted selection
      element.dataset.decisionLocked = 'true';
    },
    cancel: () => { element.dataset.decisionLocked = 'false'; },
    setImmersive: (immersive: boolean) => { element.style.display = immersive ? 'none' : 'inline-flex'; },
    dispose: () => element.remove(),
  };
}
