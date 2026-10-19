import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { Plugin } from 'vite';

/** UIKitML's runtime namespace otherwise retains every Lucide icon. Keep the
 * authored icons in production; development retains the complete authoring kit. */
export function lucideSubset(): Plugin {
  const virtualId = '\0architecture-lucide-subset';
  let exports = '';
  return {
    name: 'architecture-lucide-subset', apply: 'build', enforce: 'pre',
    configResolved(config) {
      const entry = createRequire(import.meta.url).resolve('@pmndrs/uikit-lucide');
      const available = new Set([...readFileSync(entry, 'utf8').matchAll(/export \* from "\.\/([A-Za-z0-9]+)\.js"/g)].map(m => m[1]));
      if (available.size === 0) throw new Error('Lucide export format changed; review production icon subset.');
      const tags = new Set<string>();
      const directory = path.join(config.root, 'public/ui');
      for (const file of readdirSync(directory).filter(file => file.endsWith('.uikitml'))) {
        for (const match of readFileSync(path.join(directory, file), 'utf8').matchAll(/<([A-Z][A-Za-z0-9]*)\b/g)) {
          if (available.has(match[1])) tags.add(match[1]);
        }
      }
      if (tags.size === 0) throw new Error('No authored Lucide icons found; review UI asset path.');
      exports = `export { ${[...tags].sort().join(', ')} } from '@pmndrs/uikit-lucide';`;
    },
    resolveId(source, importer) {
      if (source === '@pmndrs/uikit-lucide' && importer?.replace(/\\/g, '/').endsWith('/@drawcall/uikitml/dist/kits.js')) return virtualId;
    },
    load(id) { if (id === virtualId) return exports; },
  };
}
