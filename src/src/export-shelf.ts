import type { DecisionBundle } from './exports.js';

export const EXPORT_SHELF_KEY = 'architecture-export-shelf-v2';
/** Browser-only recovery surface; keep the frozen export, not a live session reference. */
export function attachExportShelf(download: (content: string, type: string, name: string) => boolean) {
  const root = document.createElement('section');
  root.id = 'export-drawer'; root.setAttribute('aria-label', 'Export kept on this device');
  root.style.cssText = 'position:fixed;bottom:12px;left:12px;right:12px;z-index:19;background:#102132;color:#e9f3ff;padding:12px;border-radius:12px;font:14px system-ui;display:flex;gap:8px;flex-wrap:wrap';
  document.body.append(root);
  let bundle: DecisionBundle | null = null, immersive = false, durable = false;
  try {
    const raw = localStorage.getItem(EXPORT_SHELF_KEY);
    const parsed = raw && JSON.parse(raw);
    if (parsed?.schema === 'architecture-decision-bundle.v2' && typeof parsed.markdown === 'string' &&
      typeof parsed.context?.title === 'string' && Number.isSafeInteger(parsed.snapshot?.version) &&
      Object.keys(parsed.diagrams ?? {}).length === 3 && ['cloud', 'on-premise', 'hybrid'].every(id => typeof parsed.diagrams?.[id] === 'string')) { bundle = parsed; durable = true; }
  } catch { /* Corrupt shelf does not block the decision workspace. */ }
  const render = () => {
    root.hidden = immersive || !bundle;
    root.style.display = root.hidden ? 'none' : 'flex';
    root.replaceChildren();
    if (!bundle || immersive) return;
    const title = document.createElement('strong'); title.textContent = `Export ${durable ? 'saved on this device' : 'in memory (not saved)'}: ${bundle.context.title} / v${bundle.snapshot.version}`;
    root.append(title);
    const files: [string, string, string][] = [['Markdown', bundle.markdown, 'text/markdown'], ...Object.entries(bundle.diagrams).map(([id, svg]): [string, string, string] => [id, svg, 'image/svg+xml']), ['Full bundle', JSON.stringify(bundle, null, 2), 'application/json']];
    for (const [label, content, type] of files) {
      const button = document.createElement('button'); button.textContent = label; button.type = 'button';
      button.addEventListener('click', () => download(content, type, label === 'Full bundle' ? 'bundle.json' : label === 'Markdown' ? 'decision.md' : `${label}.svg`)); root.append(button);
    }
  };
  render();
  return {
    keep(value: DecisionBundle) { bundle = structuredClone(value); durable = false; render(); localStorage.setItem(EXPORT_SHELF_KEY, JSON.stringify(bundle)); durable = true; render(); },
    clear() { localStorage.removeItem(EXPORT_SHELF_KEY); bundle = null; render(); },
    setImmersive(value: boolean) { immersive = value; render(); },
    dispose() { root.remove(); },
  };
}
