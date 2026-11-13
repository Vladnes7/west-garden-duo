// One sky + sun for the whole floor; window sky lights and lamps come from each flat (offset into world space).
// Time of day is continuous: setTime(0..1) runs morning → day → sunset → dusk → night, blending every light,
// the sky behind the windows and the lamps. setMode('day' | 'evening' | 'night') stays as three presets of it.
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// keyframes: sun = direction to the sun (it shines through the north and west facades), lamp = how much the lamps are on,
// top / hor = sky colours, ground = tint of the city below the horizon, glow = sun halo on the horizon, night = city lights
const KEYS = [
  { t: 0.00, name: 'Утро', gain: 1.35, sun: [7, 6.5, -15], sunCol: '#ffd3a8', sunI: 5.0, hemiI: 0.24, hemiCol: '#dde6f2', rectI: 2.6, rectCol: '#e6ecf5', lamp: 0, exp: 1.0, top: '#6d9bcf', hor: '#f7dcc2', ground: '#f4e7da', glow: 0.8, glowCol: '#ffd9a8', night: 0, cloud: '#fff4e8' },
  { t: 0.33, name: 'День', gain: 1.45, sun: [-7, 9.5, -15], sunCol: '#fff3e2', sunI: 4.9, hemiI: 0.32, hemiCol: '#e7eef5', rectI: 3.6, rectCol: '#dfe9f3', lamp: 0, exp: 1.0, top: '#5a90cc', hor: '#d9e6f0', ground: '#ffffff', glow: 0.2, glowCol: '#fff6e6', night: 0, cloud: '#ffffff' },
  { t: 0.66, name: 'Закат', gain: 1.35, sun: [-10, 4.6, -15], sunCol: '#ff9a52', sunI: 6.5, hemiI: 0.13, hemiCol: '#f1c8a6', rectI: 1.1, rectCol: '#ffb681', lamp: 0.12, exp: 1.05, top: '#3c5c98', hor: '#ffa35f', ground: '#dba07c', glow: 1.7, glowCol: '#ffb24a', night: 0.12, cloud: '#ffb48c' },
  { t: 0.82, name: 'Сумерки', gain: 1.1, sun: [-11, 0.5, -15], sunCol: '#ff7a3a', sunI: 0, hemiI: 0.07, hemiCol: '#8088aa', rectI: 0.4, rectCol: '#6f7fb0', lamp: 1.0, exp: 1.05, top: '#1b2749', hor: '#8a5f86', ground: '#4b475a', glow: 0.45, glowCol: '#ff7d55', night: 0.75, cloud: '#6b5a7c' },
  { t: 1.00, name: 'Ночь', gain: 1.0, sun: [-11, 0.5, -15], sunCol: '#ff7a3a', sunI: 0, hemiI: 0.04, hemiCol: '#55627a', rectI: 0.15, rectCol: '#4a5b7a', lamp: 1.15, exp: 1.05, top: '#060a16', hor: '#1a2238', ground: '#141a28', glow: 0, glowCol: '#000000', night: 1, cloud: '#1c2438' },
];
export const TIME_PRESET = { day: 0.33, evening: 0.66, night: 1 };
export function timeName(t) { let best = KEYS[0]; for (const k of KEYS) if (Math.abs(k.t - t) < Math.abs(best.t - t)) best = k; return best.name; }

// sky behind the windows: the flats' city panorama below the horizon, a painted sky with drifting clouds above it
function skyMaterial(map) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, fog: false, depthWrite: false,
    uniforms: {
      map: { value: map }, top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, ground: { value: new THREE.Color() },
      glowCol: { value: new THREE.Color() }, cloudCol: { value: new THREE.Color() },
      glow: { value: 0 }, gain: { value: 1 }, night: { value: 0 }, sunU: { value: 0 }, time: { value: 0 },
    },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform sampler2D map; uniform vec3 top, hor, ground, glowCol, cloudCol; uniform float glow, gain, night, sunU, time; varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
      void main() {
        const float HZ = 0.70; // horizon in the panorama
        vec3 city = texture2D(map, vUv).rgb * ground;
        // lit windows of the night city: sparse warm dots, denser towards the horizon
        vec2 cell = floor(vUv * vec2(2600.0, 520.0)); float h = hash(cell);
        float lit = step(0.986, h) * smoothstep(0.30, 0.68, vUv.y) * step(vUv.y, HZ - 0.004);
        city += night * lit * mix(vec3(1.0, 0.72, 0.38), vec3(0.75, 0.85, 1.0), step(0.9975, h)) * 1.0;
        float s = clamp((vUv.y - HZ) / (1.0 - HZ), 0.0, 1.0);
        vec3 sky = mix(hor, top, pow(s, 0.55));
        float du = abs(fract(vUv.x - sunU + 0.5) - 0.5);
        float halo = exp(-du * du * 240.0) * exp(-s * 5.0) + 0.35 * exp(-du * du * 30.0) * exp(-s * 2.2);
        sky += glowCol * glow * halo;
        float c = fbm(vec2(vUv.x * 46.0 + time * 0.012, s * 9.0 + 3.0));
        float cm = smoothstep(0.50, 0.78, c) * smoothstep(0.02, 0.22, s) * (1.0 - 0.5 * s);
        sky = mix(sky, cloudCol + glowCol * glow * halo * 0.6, cm * 0.8);
        // stars
        float st = step(0.9975, hash(floor(vUv * vec2(1800.0, 600.0)))) * smoothstep(0.15, 0.5, s) * night * (1.0 - cm);
        sky += vec3(st) * 0.8;
        vec3 col = mix(city, sky, smoothstep(HZ - 0.002, HZ + 0.045, vUv.y));
        col = mix(col, mix(hor, glowCol, 0.25 * glow) * (1.0 - 0.55 * night), 0.42 * exp(-abs(vUv.y - HZ) * 34.0)); // haze on the horizon
        gl_FragColor = vec4(col * mix(1.0 + (gain - 1.0) * 0.3, gain, smoothstep(HZ - 0.03, HZ + 0.05, vUv.y)), 1.0);
      }`,
  });
}

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

  // the panorama cylinder keeps its geometry and gets the sky shader
  let sky = null;
  scene.traverse((o) => { if (o.isMesh && o.name === 'furn:outside') { if (!sky) sky = skyMaterial(o.material.map); o.material = sky; } });

  const cA = new THREE.Color(), cB = new THREE.Color();
  const mixCol = (target, a, b, f) => target.copy(cA.set(a)).lerp(cB.set(b), f);
  const bg = new THREE.Color('#cfd9e3'), ORBIT_BG = new THREE.Color('#dcd8cf');
  let orbit = false, now = TIME_PRESET.day, lampsOn = false;
  const applyBg = () => { if (scene.background && scene.background.isColor) scene.background.copy(orbit ? ORBIT_BG : bg); };

  function setTime(t) {
    now = t = Math.max(0, Math.min(1, t));
    let i = 0; while (i < KEYS.length - 2 && t > KEYS[i + 1].t) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    let f = (t - a.t) / (b.t - a.t); f = f * f * (3 - 2 * f);
    const L = (k) => a[k] + (b[k] - a[k]) * f;

    const dir = new THREE.Vector3(...a.sun).normalize().lerp(new THREE.Vector3(...b.sun).normalize(), f).normalize();
    sun.position.copy(C).addScaledVector(dir, 30);
    mixCol(sun.color, a.sunCol, b.sunCol, f);
    sun.intensity = L('sunI'); sun.visible = sun.intensity > 0.02;
    hemi.intensity = L('hemiI'); mixCol(hemi.color, a.hemiCol, b.hemiCol, f);
    const rI = L('rectI');
    for (const r of rects) { r.intensity = rI * r.userData.k; mixCol(r.color, a.rectCol, b.rectCol, f); }

    const lamp = L('lamp'), on = lamp > 0.02;
    for (const p of points) { p.visible = on; p.intensity = p.userData.base * lamp; }
    for (const [m, v] of emissives) if (m.emissiveIntensity !== undefined) m.emissiveIntensity = v * lamp * 1.05;
    const warm = Math.min(1, lamp * 1.4);
    for (const MAT of outs) {
      if (MAT.led) mixCol(MAT.led.color, '#f2e6d6', '#ffd9a8', warm);
      if (MAT.spot) mixCol(MAT.spot.color, '#f4f1ea', '#fff6e8', warm);
    }
    lampsOn = on;

    if (sky) {
      const u = sky.uniforms;
      mixCol(u.top.value, a.top, b.top, f); mixCol(u.hor.value, a.hor, b.hor, f); mixCol(u.ground.value, a.ground, b.ground, f);
      mixCol(u.glowCol.value, a.glowCol, b.glowCol, f); mixCol(u.cloudCol.value, a.cloud, b.cloud, f);
      u.glow.value = L('glow'); u.gain.value = L('gain'); u.night.value = L('night');
      u.sunU.value = Math.atan2(dir.x, dir.z) / (Math.PI * 2);
      bg.copy(u.top.value);
    }
    applyBg();
    renderer.toneMappingExposure = L('exp');
    renderer.shadowMap.needsUpdate = true;
  }
  const api = {
    sun, hemi, rects, points,
    setTime: (t) => setTime(t),
    setMode: (mode) => api.setTime(TIME_PRESET[mode] ?? TIME_PRESET.day),
    getTime: () => now,
    lampsOn: () => lampsOn,
    setOrbit: (v) => { orbit = v; applyBg(); },
    tick: (dt) => { if (sky) sky.uniforms.time.value += dt; },
  };
  return api;
}
