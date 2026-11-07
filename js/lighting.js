// One sky + sun for the whole floor; window sky lights and lamps come from each flat (offset into world space).
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function buildLighting(scene, renderer, apts) {
  RectAreaLightUniformsLib.init();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  for (const a of apts) {
    const MAT = a.M.MAT;
    for (const k in MAT) { const m = MAT[k]; if (m.isMeshStandardMaterial) m.envMapIntensity = k === 'glass' ? 0.12 : /mirror|chrome|brass|gilt|bronze|steel|glass|crystal/.test(k) ? 0.9 : 0.35; }
  }

  const hemi = new THREE.HemisphereLight('#e7eef5', '#8c7a66', 0.5);
  scene.add(hemi);

  // the floor spans ~19 × 12 m: one 4096 shadow map centred on it
  const C = new THREE.Vector3(9.3, 0, 5.6);
  const sun = new THREE.DirectionalLight('#fff1dc', 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  const sc = sun.shadow.camera; sc.left = -12; sc.right = 12; sc.top = 12; sc.bottom = -12; sc.near = 1; sc.far = 70;
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.02;
  sun.target.position.copy(C);
  scene.add(sun, sun.target);

  const rects = [], points = [], emissives = [], outs = [];
  for (const a of apts) {
    const [ox, oz] = a.offset, HEAD = a.PL.HEAD;
    for (const w of a.rects) {
      const len = w.b - w.a, h = (HEAD - w.sill) / 1000, cy = (w.sill + HEAD) / 2000;
      const L = new THREE.RectAreaLight('#dfe9f3', 6, len, h);
      if (w.side === 'N') { L.position.set(ox + (w.a + w.b) / 2, cy, oz + a.rectInset); L.lookAt(ox + (w.a + w.b) / 2, cy, oz + 2); }
      else { L.position.set(ox + a.rectInset, cy, oz + (w.a + w.b) / 2); L.lookAt(ox + 2, cy, oz + (w.a + w.b) / 2); }
      L.userData.k = w.k; scene.add(L); rects.push(L);
    }
    // interior lamps, merged per room/kind to keep the shader cost sane
    const groups = new Map();
    for (const l of a.LIGHTS) {
      if (l.kind === 'led' && !a.ledRooms.includes(l.room)) continue;
      const k2 = l.kind === 'sconce' || l.kind === 'spot' || l.kind === 'led' ? 'aux' : l.kind;
      const key = k2 === 'chandelier' || k2 === 'lamp' ? k2 + ':' + l.x.toFixed(1) + ':' + l.z.toFixed(1) : k2 + ':' + l.room;
      if (!groups.has(key)) groups.set(key, { ...l, n: 0, sx: 0, sy: 0, sz: 0, p: 0 });
      const g = groups.get(key); g.n++; g.sx += l.x; g.sy += l.y; g.sz += l.z; g.p += l.power;
    }
    for (const g of groups.values()) {
      const color = g.kind === 'led' ? '#ffd6a0' : g.kind === 'spot' ? '#fff0db' : '#ffd29c';
      const base = { chandelier: 9, lamp: 4, sconce: 3, led: 2, spot: 5 }[g.kind] || 4;
      const pl = new THREE.PointLight(color, base * Math.min(Math.max(g.p, 0.5), 1.2), g.kind === 'chandelier' ? 8 : 5, 2);
      pl.position.set(ox + g.sx / g.n, g.sy / g.n, oz + g.sz / g.n);
      pl.userData.base = pl.intensity; pl.visible = false;
      scene.add(pl); points.push(pl);
    }
    for (const [k, v] of a.emissives) if (a.M.MAT[k]) emissives.push([a.M.MAT[k], v]);
    outs.push(a.M.MAT);
  }

  function setMode(mode) {
    const day = mode === 'day', eve = mode === 'evening', night = mode === 'night';
    if (day) { sun.position.set(C.x - 9, 16, C.z - 15); sun.color.set('#fff3e2'); sun.intensity = 3.2; }
    if (eve) { sun.position.set(C.x - 20, 6.5, C.z - 7); sun.color.set('#ffb070'); sun.intensity = 1.5; }
    sun.visible = !night;
    hemi.intensity = day ? 0.55 : eve ? 0.14 : 0.04;
    hemi.color.set(day ? '#e7eef5' : eve ? '#f3d6bd' : '#55627a');
    for (const r of rects) { r.intensity = (day ? 7 : eve ? 1.4 : 0.15) * r.userData.k; r.color.set(day ? '#dfe9f3' : eve ? '#ffcf9f' : '#4a5b7a'); }
    for (const p of points) { p.visible = !day; p.intensity = p.userData.base * (night ? 1.15 : 1.0); }
    for (const [m, v] of emissives) if (m.emissiveIntensity !== undefined) m.emissiveIntensity = day ? 0 : v * (night ? 1.2 : 1);
    for (const MAT of outs) {
      if (MAT.led) MAT.led.color.set(day ? '#f2e6d6' : '#ffd9a8');
      if (MAT.spot) MAT.spot.color.set(day ? '#f4f1ea' : '#fff6e8');
      if (MAT.outside) MAT.outside.color.set(day ? '#ffffff' : eve ? '#f0b48a' : '#1c2436');
    }
    renderer.toneMappingExposure = day ? 1.0 : eve ? 1.0 : 1.05;
    renderer.shadowMap.needsUpdate = true;
  }
  return { sun, hemi, rects, points, setMode };
}
