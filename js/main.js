// West Garden — two flats on one floor joined by a shared lift hall.
// Each flat keeps its own modules (materials, plan, furniture) in apts/<id>/ and is built at the origin,
// then moved to its place on the floor; walking crosses both, the overview shows one flat at a time.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import WG from '../apts/wg/index.js';
import K94 from '../apts/k94/index.js';
import { buildLobby, LOBBY_PRISMS, LOBBY_ROOM, HALL } from './lobby.js';
import { buildLighting } from './lighting.js';
import { Player } from './controls.js';
import { initUI, toast } from './ui.js';
import { frame } from '../apts/wg/util.js';

const $ = (s) => document.querySelector(s);
const setLoad = (p, t) => { $('#loadBar').style.width = Math.round(p * 100) + '%'; if (t) $('#loadStep').textContent = t; };
const APTS = [K94, WG];

function pointIn(x, y, poly) {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if (((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins; }
  return ins;
}

// ---- device profile. Two furnished flats are heavy: on phones the browser kills the tab when memory runs out
// and reloads the page (the "back to loading" loop). Phones get a lighter profile; a crash detected on the
// previous visit makes it lighter still, and a lost WebGL context restarts once in that lighter mode.
const LS = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* */ } }, del: (k) => { try { localStorage.removeItem(k); } catch (e) { /* */ } } };
const MOBILE = matchMedia('(pointer: coarse)').matches || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform));
let crashes = +LS.get('wgduo-crashes') || 0;
{ const run = +LS.get('wgduo-run') || 0; if (run && Date.now() - run < 180000) { crashes++; LS.set('wgduo-crashes', String(crashes)); } }
const LEVEL = Math.min(2, (MOBILE ? 1 : 0) + Math.min(crashes, 2));
const PROFILE = [
  { tex: 1, dpr: 1.5, shadow: 4096, mirror: 512, smaa: true },
  { tex: 0.5, dpr: 1.25, shadow: 2048, mirror: 128, smaa: true },
  { tex: 0.35, dpr: 1, shadow: 1024, mirror: 0, smaa: false },
][LEVEL];
globalThis.__wgTexScale = PROFILE.tex;
const beat = () => LS.set('wgduo-run', String(Date.now()));
addEventListener('pagehide', () => LS.del('wgduo-run'));
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') LS.del('wgduo-run'); else beat(); });

let dprNow = 1;
async function boot() {
  beat();
  const canvas = $('#gl');
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    crashes++; LS.set('wgduo-crashes', String(crashes)); LS.del('wgduo-run');
    $('#load').classList.remove('hidden');
    if (crashes <= 3) { $('#loadStep').textContent = 'Устройству не хватило памяти — перезапускаю в облегчённом режиме…'; setTimeout(() => location.reload(), 1500); }
    else $('#loadStep').textContent = 'Устройству не хватает видеопамяти для 3D-модели. Закройте другие вкладки и обновите страницу.';
  }, false);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  let quality = LS.get('wgduo-quality') || (LEVEL ? 'fast' : 'high');
  window.__wgQuality0 = quality; window.__wgLevel = LEVEL;
  const dprFor = (q) => Math.min(devicePixelRatio || 1, q === 'high' ? PROFILE.dpr : 1);
  const DPR = dprFor(quality);
  renderer.setPixelRatio(DPR);
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping !== undefined ? THREE.AgXToneMapping : THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#cfd9e3');
  const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.05, 400);

  // ---- materials of both flats (each has its own textures and finish options)
  let n = 0;
  await WG.M.buildMaterials(renderer, (label) => setLoad(0.03 + 0.03 * n++, 'West Garden: ' + label.toLowerCase() + '…'));
  await K94.M.buildMaterials(renderer, (label) => setLoad(0.03 + 0.03 * n++, '94 м²: ' + label.toLowerCase() + '…'));

  // ---- geometry: build each flat at the origin (door clamps work in its own coordinates), then move it
  for (const a of APTS) {
    setLoad(a === WG ? 0.62 : 0.5, `${a.name}: стены, проёмы и мебель…`); await frame();
    const root = new THREE.Group(); root.name = 'apt:' + a.id; scene.add(root);
    a.root = root;
    a.arch = a.PL.buildArchitecture(root);
    a.furn = a.buildRooms(root);
    // the city panorama must stay visible while the furniture of a flat is culled
    for (const o of [...a.furn.children]) if (o.name === 'furn:outside') root.add(o);
    root.updateMatrixWorld(true);
    if (a.CW.clampHinges && a.wallHit) { const c = a.CW.clampHinges(a.wallHit); if (c.length) console.info(a.id, 'hinges clamped:', c.join(' ')); }
    if (a.CW.computeConflicts) console.info(a.id, 'interlocked pairs:', a.CW.computeConflicts());
    root.position.set(a.offset[0], 0, a.offset[1]);
    root.updateMatrixWorld(true);
    for (const d of a.arch.doors) { d.apt = a; if (d.hinge) d.wh = [d.hinge[0] + a.offset[0], d.hinge[1] + a.offset[1]]; }
    for (const m of a.CW.MOVERS) m.apt = a;
  }
  setLoad(0.72, 'Лифтовой холл…'); await frame();
  const lobby = buildLobby(scene);

  // ---- world for walking: collision segments, furniture boxes, rooms and openings of both flats + the hall
  const segs = [], boxes = [], doors = [], movers = [], views = {};
  for (const a of APTS) {
    const [ox, oz] = a.offset;
    for (const s of a.PL.collisionSegments()) segs.push([s[0] + ox, s[1] + oz, s[2] + ox, s[3] + oz]);
    for (const b of a.COLLIDE) boxes.push([b[0] + ox, b[1] + oz, b[2] + ox, b[3] + oz]);
    doors.push(...a.arch.doors); movers.push(...a.CW.MOVERS);
    for (const [k, v] of Object.entries(a.VIEWS)) views[a.id + ':' + k] = { p: [v.p[0] + ox, v.p[1] + oz], look: [v.look[0] + ox, v.look[1], v.look[2] + oz] };
    a.homeW = [a.HOME[0] + ox, a.HOME[1] + oz, a.HOME[2] + ox, a.HOME[3] + oz];
  }
  for (const p of LOBBY_PRISMS) { const q = p.poly; for (let i = 0; i < q.length; i++) { const A = q[i], Bp = q[(i + 1) % q.length]; segs.push([A[0] / 1000, A[1] / 1000, Bp[0] / 1000, Bp[1] / 1000]); } }
  boxes.push(...lobby.collide);
  for (const [k, v] of Object.entries(lobby.views)) views['lobby:' + k] = v;
  const lobbyHit = { apt: null, room: LOBBY_ROOM };
  // entrance doorways (the wall thickness between a flat and the hall) count as walkable floor
  const ENTRY_ROOM = { id: 'entry', name: 'Вход' };
  const entries = APTS.flatMap((a) => a.PL.OPENINGS.filter((o) => o.kind === 'entry').map((o) => {
    const [ox, oz] = a.offset; const lo = (Math.min(o.a, o.b) + 40) / 1000, hi = (Math.max(o.a, o.b) - 40) / 1000;
    const r = o.axis === 'y' ? [ox + lo, oz + (o.w0 - 120) / 1000, ox + hi, oz + (o.w1 + 450) / 1000] : [ox + (o.w0 - 120) / 1000, oz + lo, ox + (o.w1 + 450) / 1000, oz + hi];
    return { r, hit: { apt: a, room: ENTRY_ROOM } };
  }));
  const world = {
    segs, boxes, doors, views,
    roomAt(x, z) {
      for (const a of APTS) { const r = a.PL.roomAt((x - a.offset[0]) * 1000, (z - a.offset[1]) * 1000); if (r) return { apt: a, room: r }; }
      if (x > HALL.x0 && x < HALL.x1 && z > HALL.z0 && z < HALL.z1) return lobbyHit;
      for (const e of entries) if (x > e.r[0] && x < e.r[2] && z > e.r[1] && z < e.r[3]) return e.hit;
      return null;
    },
    inOpening(x, z) {
      for (const a of APTS) { const [x0, z0, x1, z1] = a.bounds, lx = x - a.offset[0], lz = z - a.offset[1]; if (lx > x0 && lx < x1 && lz > z0 && lz < z1) return true; }
      return false;
    },
  };

  setLoad(0.8, 'Свет…'); await frame();
  const lighting = buildLighting(scene, renderer, APTS);
  lighting.sun.shadow.mapSize.set(PROFILE.shadow, PROFILE.shadow);
  lighting.setMode('day');

  // post-processing: N8AO (ambient occlusion, half-res) → output (tone map) → SMAA
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(innerWidth * DPR, innerHeight * DPR, { type: THREE.HalfFloatType }));
  composer.setPixelRatio(DPR); composer.setSize(innerWidth, innerHeight);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  let ao = null;
  if (LEVEL === 0) try { // ambient occlusion: desktop only (its buffers cost too much memory on phones)
    const { N8AOPass } = await import('n8ao');
    ao = new N8AOPass(scene, camera, innerWidth, innerHeight);
    Object.assign(ao.configuration, { aoRadius: 0.55, distanceFalloff: 0.45, intensity: 2.4, aoSamples: 12, denoiseSamples: 6, denoiseRadius: 10, halfRes: true, depthAwareUpsampling: true, gammaCorrection: false, color: new THREE.Color('#1a1410') });
    composer.addPass(ao);
  } catch (e) { console.warn('AO unavailable', e); }
  const applyQ = (q) => { if (ao) { ao.enabled = q === 'high'; renderPass.enabled = q !== 'high'; } };
  applyQ(quality);
  composer.addPass(new OutputPass());
  if (PROFILE.smaa) try { const { SMAAPass } = await import('three/addons/postprocessing/SMAAPass.js'); composer.addPass(new SMAAPass(innerWidth * DPR, innerHeight * DPR)); } catch (e) { console.warn('SMAA unavailable', e); }

  const player = new Player(camera, canvas, world, (t, isMover) => (isMover ? toggleMover(t) : toggleDoor(t)));
  player.movers = movers;
  function toggleMover(m) {
    const open = m.target < 0.5;
    if (open) for (const c of m.conflicts || []) c.target = 0; // a neighbour that would collide closes first
    m.target = open ? 1 : 0;
  }
  function toggleDoor(door) {
    const group = door.group ? doors.filter((d) => d.group === door.group && d.apt === door.apt) : [door];
    const open = door.target < 0.5;
    for (const d of group) d.target = open ? 1 : 0;
    toast(open ? 'Открыто' : 'Закрыто');
  }
  // both entrance doors stand open: the hall leads straight into either flat
  for (const d of doors) if (d.o && d.o.kind === 'entry') { d.open = d.target = 1; d.pivot.rotation.y = d.base + d.sign * d.max; }
  player.teleport('lobby:hall');

  // ---- overview cutaway: one horizontal clipping plane on every material (shadows clipped too),
  // flat dark green caps on the cut walls like the poché of a floor plan
  renderer.localClippingEnabled = true;
  const cutPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e5);
  scene.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m && !m.clippingPlanes) { m.clippingPlanes = [cutPlane]; m.clipShadows = true; }
  });
  const capMat = new THREE.MeshBasicMaterial({ color: '#1b2c21', toneMapped: false });
  const caps = new THREE.Group(); caps.name = 'cut-caps'; caps.visible = false; scene.add(caps);
  const addCaps = (prisms, ox, oz, skip, tag) => {
    for (const pr of prisms) {
      if (skip.includes(pr.kind)) continue;
      const sh = new THREE.Shape(pr.poly.map(([x, y]) => new THREE.Vector2(x / 1000 + ox, -(y / 1000 + oz))));
      const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(g, capMat); mesh.userData = { z: [pr.z0 / 1000, pr.z1 / 1000], tag };
      caps.add(mesh);
    }
  };
  for (const a of APTS) addCaps(a.PL.PRISMS, a.offset[0], a.offset[1], a.capSkip, a.id);
  addCaps(LOBBY_PRISMS, 0, 0, [], 'lobby');

  let cutH = 1.4, inOrbit = false, ovApt = WG, zone = 'lobby';
  const FULL = 3.1;
  function applyCut() {
    const on = inOrbit && cutH < FULL - 0.01;
    cutPlane.constant = on ? cutH : 1e5;
    caps.visible = on;
    if (on) for (const c of caps.children) { const [z0, z1] = c.userData.z; c.visible = c.userData.tag === ovApt.id && z0 < cutH && z1 > cutH; c.position.y = cutH + 0.0008; }
    renderer.shadowMap.needsUpdate = true;
  }
  // what is drawn: overview = one flat only; walking = both shells + the hall, furniture only where it can be seen
  function applyVisibility() {
    for (const a of APTS) {
      a.root.visible = !inOrbit || a === ovApt;
      a.arch.ceilGroup.visible = !inOrbit;
      a.furn.visible = inOrbit ? a === ovApt : (zone === 'lobby' || zone === a.id);
    }
    lobby.root.visible = !inOrbit; lobby.ceil.visible = !inOrbit;
    scene.traverse((o) => { if (o.name === 'furn:outside') o.visible = !inOrbit; });
    renderer.shadowMap.needsUpdate = true;
  }

  const ui = initUI({
    player, lighting, camera, apts: APTS, world, renderer,
    onModeChange: (m) => {
      inOrbit = m === 'orbit';
      // a plan has its entrance doors shut; walking reopens the ones that were open
      for (const d of doors) if (d.o && d.o.kind === 'entry') {
        if (inOrbit) { d.walkTarget = d.target; d.target = 0; } else if (d.walkTarget !== undefined) d.target = d.walkTarget;
      }
      scene.background.set(inOrbit ? '#dcd8cf' : '#cfd9e3');
      applyVisibility(); applyCut();
    },
    onOverviewApt: (a) => { ovApt = a; applyVisibility(); applyCut(); },
    onCut: (h) => { cutH = h; applyCut(); },
    cutH, FULL,
  });

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
  });

  window.__setQuality = (q) => { quality = q; LS.set('wgduo-quality', q); applyQ(q); const d = dprFor(q); dprNow = d; renderer.setPixelRatio(d); composer.setPixelRatio(d); composer.setSize(innerWidth, innerHeight); { const sm = q === 'high' ? PROFILE.shadow : Math.min(2048, PROFILE.shadow); lighting.sun.shadow.mapSize.set(sm, sm); } if (lighting.sun.shadow.map) { lighting.sun.shadow.map.dispose(); lighting.sun.shadow.map = null; } renderer.shadowMap.needsUpdate = true; };

  // mirrors: static cube reflections baked from a point in front of each mirror (re-baked on light / finish changes)
  const probes = [];
  if (PROFILE.mirror) for (const a of APTS) for (const [k, x, y, z] of a.mirrors) {
    const rt = new THREE.WebGLCubeRenderTarget(PROFILE.mirror, { type: THREE.HalfFloatType, generateMipmaps: false });
    const cam = new THREE.CubeCamera(0.05, 40, rt); cam.position.set(x + a.offset[0], y, z + a.offset[1]); scene.add(cam);
    const M = a.M.MAT[k]; M.envMap = rt.texture; M.envMapIntensity = 1; M.needsUpdate = true;
    probes.push({ M, cam, a });
  }
  let bakeIn = 0;
  const bakeMirrors = () => {
    const c = cutPlane.constant, cv = caps.visible; cutPlane.constant = 1e5; caps.visible = false; // mirrors always reflect the whole room
    const vis = APTS.map((a) => [a.root.visible, a.furn.visible]);
    for (const p of probes) {
      for (const a of APTS) { a.root.visible = true; a.furn.visible = a === p.a; }
      p.M.visible = false; p.cam.update(renderer, scene); p.M.visible = true;
    }
    APTS.forEach((a, i) => { a.root.visible = vis[i][0]; a.furn.visible = vis[i][1]; });
    cutPlane.constant = c; caps.visible = cv;
  };
  window.__bakeMirrors = () => { bakeIn = 3; };
  const setModeRaw = lighting.setMode; lighting.setMode = (m) => { setModeRaw(m); bakeIn = 3; };
  bakeIn = 3;

  setLoad(1, 'Готово'); await frame();
  // warm-up: compile with everything visible so crossing between the flats never stalls on shaders
  for (const a of APTS) a.furn.visible = true;
  renderer.compile(scene, camera);
  applyVisibility();
  $('#load').classList.add('hidden');
  ui.showStart();
  if (crashes && LEVEL) toast('Включён облегчённый режим: так модель стабильно работает на этом устройстве');
  setInterval(beat, 5000);
  // a long stable session means this profile is fine: forget older crashes (the level stays for this visit)
  setTimeout(() => { if (crashes) { crashes = Math.max(0, crashes - 1); LS.set('wgduo-crashes', String(crashes)); } }, 240000);

  const clock = new THREE.Clock();
  let slowFrames = 0, wasMoving = false, hoverTick = 0; dprNow = DPR;
  renderer.setAnimationLoop(() => {
    const dt = Math.min(0.05, clock.getDelta());
    let moving = false;
    for (const d of doors) {
      if (Math.abs(d.open - d.target) > 0.001) { moving = true; d.open += (d.target - d.open) * (1 - Math.exp(-dt * 5)); d.pivot.rotation.y = d.base + d.sign * d.open * d.max; }
    }
    for (const m of movers) {
      if (Math.abs(m.open - m.target) <= 0.001) continue;
      moving = true; m.open += (m.target - m.open) * (1 - Math.exp(-dt * 6)); if (Math.abs(m.open - m.target) <= 0.001) m.open = m.target;
      if (m.kind === 'hinge') m.inner.rotation[m.axis || 'y'] = m.sign * m.open * m.max;
      else if (m.kind === 'custom') m.apply(m.open);
      else m.inner.position.z = m.open * m.max;
      for (const me of m.inside) me.visible = m.open > 0.004;
    }
    if (moving || wasMoving) renderer.shadowMap.needsUpdate = true;
    if (bakeIn > 0 && --bakeIn === 0) bakeMirrors();
    if (++hoverTick % 6 === 0) {
      player.updateHover();
      if (player.mode === 'walk') { // which part of the floor are we in?
        const h = world.roomAt(player.pos.x, player.pos.z);
        const z = h ? (h.apt ? h.apt.id : 'lobby') : zone;
        if (z !== zone) { zone = z; applyVisibility(); }
      }
    }
    wasMoving = moving;
    player.update(dt);
    ui.update();
    composer.render();
    // adaptive resolution if the GPU struggles
    if (dt > 0.034) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 120 && dprNow > 0.75) { dprNow -= 0.15; renderer.setPixelRatio(dprNow); composer.setPixelRatio(dprNow); composer.setSize(innerWidth, innerHeight); slowFrames = 0; }
  });
  window.__app = { scene, camera, player, lighting, renderer, composer, ao, APTS, lobby, world, ui };
}

boot().catch((e) => { console.error(e); $('#loadStep').textContent = 'Ошибка: ' + e.message; });
void pointIn;
