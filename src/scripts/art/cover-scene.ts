import { WebGLRenderer, Scene, PerspectiveCamera, AmbientLight, DirectionalLight, HemisphereLight, Mesh, BoxGeometry, CylinderGeometry, MeshStandardMaterial, Group, Vector3, PlaneGeometry, ShadowMaterial, PCFSoftShadowMap } from 'three';
import { createSymbol } from '../../src/diagram-shapes.ts';
import { layoutVariant, islandOffset, ISLAND } from '../../src/diagram-model.ts';
import { WorkspacePresenter } from '../../src/presenter.ts';
import { DecisionSession } from '../../src/session.ts';
import { sample } from '../../src/decision.ts';

const W = 2560, H = 1440;
const canvas = document.getElementById('render-canvas') as HTMLCanvasElement;
canvas.width = W; canvas.height = H;
const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setSize(W, H, false); renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = PCFSoftShadowMap;
const scene = new Scene();
scene.add(new HemisphereLight(0xdfe9ff, 0x1b2a3a, 1.1));
scene.add(new AmbientLight(0xffffff, 0.35));
const key = new DirectionalLight(0xfff2e0, 2.6); key.position.set(2.5, 4, 2.5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -2; key.shadow.camera.right = 2; key.shadow.camera.top = 2; key.shadow.camera.bottom = -2; key.shadow.camera.near = 0.5; key.shadow.camera.far = 12; scene.add(key);
const rim = new DirectionalLight(0x7ad7ff, 1.4); rim.position.set(-3, 2, -3); scene.add(rim);
const camera = new PerspectiveCamera(30, W / H, 0.05, 100); camera.position.set(2.05, 1.95, 2.7); camera.lookAt(0.72, -0.1, -0.35);

const nullPanel = { requireElementById: () => ({ setProperties() {}, addEventListener() {}, removeEventListener() {} }), setVisible() {} };
let model: any = null;
const presenter = new WorkspacePresenter({ panel: () => nullPanel, diagram: { update: (m) => { model = m; } }, xr: { available: false, launch() {}, exit() {} }, recenter() {}, setTextScale() {}, storage: { load: () => null, save() {}, remove() {} }, exports: { inbox: async () => { throw new Error(); }, download: () => false, remove: async () => false } } as any, new DecisionSession({ ...sample('organization'), identity: 'application', connectivity: 'verified', latency: 'tolerant', workload: ['storage', 'jobs', 'queue', 'cache', 'integration'] }));
presenter.bind(); presenter.goTo('compare'); presenter.inspect('hybrid'); presenter.focusComponent('hybrid', 'connectivity');

const root = new Group(); root.position.set(0.75, 0, -0.3); root.rotation.y = -0.62; scene.add(root);
const floor = new Mesh(new PlaneGeometry(10, 10), new ShadowMaterial({ opacity: 0.35 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -0.02; floor.receiveShadow = true; scene.add(floor);
const box = new BoxGeometry(1, 1, 1), cyl = new CylinderGeometry(1, 1, 1, 12);
const S = 1.5; // enlarge islands for the hero
model.variants.forEach((variant: any, i: number) => {
  const island = new Group(); island.position.set(islandOffset(i) * S, 0, (i === 1 ? -0.1 : 0.08) * S); island.rotation.y = (1 - i) * 0.25; island.scale.setScalar(S); root.add(island);
  const base = new Mesh(box, new MeshStandardMaterial({ color: variant.inspected ? '#e6edf3' : '#cfd8e0', roughness: 0.9 })); base.scale.set(ISLAND.width, 0.014, ISLAND.depth); base.position.set(0, -0.007, 0.04); base.receiveShadow = true; base.castShadow = true; island.add(base);
  const layout = layoutVariant(variant);
  for (const b of layout.blocks) {
    const g = new Group(); g.position.set(...b.position); island.add(g);
    const sym = createSymbol(b.id); sym.object.visible = b.present; sym.object.scale.set(b.size[0] * b.scale, b.size[1] * b.scale, b.size[2] * b.scale);
    sym.object.traverse((o: any) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    for (const m of sym.materials) { m.color.set(b.resultColor); m.roughness = 0.45; if (b.emissive) { m.emissive.set(b.emissive); m.emissiveIntensity = 0.7; } }
    g.add(sym.object);
    const tile = new Mesh(box, new MeshStandardMaterial({ color: b.present ? b.boundaryColor : '#b5bec7', roughness: 0.8 })); tile.scale.set(b.size[0] * 1.35, 0.006, b.size[2] * 1.35); tile.position.set(0, -0.003, 0); tile.receiveShadow = true; g.add(tile);
  }
  const up = new Vector3(0, 1, 0), dir = new Vector3();
  for (const l of layout.links) {
    const m = new Mesh(cyl, new MeshStandardMaterial({ color: l.color, emissive: l.color, emissiveIntensity: 0.25 })); dir.set(l.end[0] - l.start[0], l.end[1] - l.start[1], l.end[2] - l.start[2]); const len = dir.length();
    m.position.set((l.start[0] + l.end[0]) / 2, (l.start[1] + l.end[1]) / 2 + 0.02, (l.start[2] + l.end[2]) / 2); m.scale.set(l.radius, len, l.radius); m.quaternion.setFromUnitVectors(up, dir.normalize()); island.add(m);
  }
});
renderer.render(scene, camera);
(window as any).done = true;
