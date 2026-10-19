import { WebGLRenderer, Scene, PerspectiveCamera, AmbientLight, DirectionalLight, HemisphereLight, Mesh, BoxGeometry, CylinderGeometry, MeshStandardMaterial, Group, Vector3, PCFSoftShadowMap } from 'three';
import { createSymbol } from '../../src/diagram-shapes.ts';
const W = 1024, H = 1024;
const canvas = document.getElementById('render-canvas') as HTMLCanvasElement; canvas.width = W; canvas.height = H;
const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true }); renderer.setSize(W, H, false); renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = PCFSoftShadowMap;
const scene = new Scene(); scene.add(new HemisphereLight(0xdfe9ff, 0x1b2a3a, 1.1)); scene.add(new AmbientLight(0xffffff, 0.35));
const key = new DirectionalLight(0xfff2e0, 2.6); key.position.set(2, 4, 2.5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); scene.add(key);
const rim = new DirectionalLight(0x7ad7ff, 1.2); rim.position.set(-3, 2, -3); scene.add(rim);
const camera = new PerspectiveCamera(28, 1, 0.05, 100); camera.position.set(2.1, 2.2, 2.75); camera.lookAt(0, 0.12, 0);
const root = new Group(); root.rotation.y = -0.2; scene.add(root);
const base = new Mesh(new BoxGeometry(1.5, 0.08, 1.2), new MeshStandardMaterial({ color: '#e6edf3', roughness: 0.9 })); base.position.y = -0.04; base.receiveShadow = true; base.castShadow = true; root.add(base);
const items: [string, string, string, [number, number, number], number][] = [
  ['database', '#ffffff', '#c98a2e', [-0.42, 0, 0.25], 0.55],
  ['application', '#ffffff', '#4a8fd6', [0.25, 0, -0.25], 0.55],
  ['jobs', '#ffffff', '#4a8fd6', [0.4, 0, 0.35], 0.42],
];
const cyl = new CylinderGeometry(1, 1, 1, 12), up = new Vector3(0, 1, 0), dir = new Vector3();
const link = (a: number[], b: number[], color: string, r = 0.025) => { const m = new Mesh(cyl, new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3 })); dir.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const len = dir.length(); m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); m.scale.set(r, len, r); m.quaternion.setFromUnitVectors(up, dir.normalize()); m.castShadow = true; root.add(m); };
for (const [id, color, tileColor, pos, size] of items) {
  const tile = new Mesh(new BoxGeometry(size * 1.35, 0.05, size * 1.35), new MeshStandardMaterial({ color: tileColor, roughness: 0.8 })); tile.position.set(pos[0], 0.025, pos[2]); tile.receiveShadow = true; root.add(tile);
  const sym = createSymbol(id as any); sym.object.position.set(pos[0], 0.05, pos[2]); sym.object.scale.set(size, size * 0.95, size);
  sym.object.traverse((o: any) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  for (const m of sym.materials) { m.color.set(color); m.roughness = 0.45; }
  root.add(sym.object);
}
link([-0.42, 0.3, 0.25], [0.25, 0.3, -0.25], '#f2b950', 0.03); link([0.25, 0.3, -0.25], [0.4, 0.25, 0.35], '#7fc4cc');
renderer.render(scene, camera); (window as any).done = true;
