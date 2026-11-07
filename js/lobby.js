// Shared lift hall between the two flats, in the West Garden brand language, residential-club level:
// calacatta floor with bronze inlay joints and a verde marble border, warm stucco walls with bronze reveals,
// full-height walnut fluted portals at the flat doors, a verde marble lift core with deep bronze portals and
// floor displays, a floating ceiling raft with LED coves and downlights, a deep-green brand wall with a console.
// World metres: x east, z south. The 94 m² flat sits at the origin, West Garden is offset east.
import * as THREE from 'three';
import { Batch, Frame, flatPoly } from '../apts/wg/geom.js';
import { MAT } from '../apts/wg/materials.js';

export const HALL = { x0: 6.6, x1: 18.605, z0: 9.72, z1: 12.0, H: 3.0 };

// solids (mm, like the flats' PRISMS) — for collisions and the overview cut caps
const R = (x0, x1, y0, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
export const LOBBY_PRISMS = [
  { poly: R(6350, 18855, 12000, 12250), z0: 0, z1: 3100, kind: 'wall' },   // south (lift core)
  { poly: R(6350, 6600, 8790, 12000), z0: 0, z1: 3100, kind: 'wall' },     // west end (stairs)
  { poly: R(18605, 18855, 9720, 12000), z0: 0, z1: 3100, kind: 'wall' },   // east end
  { poly: R(6600, 7550, 8790, 9720), z0: 0, z1: 3100, kind: 'wall' },      // infill against the 94 m² facade step
  { poly: R(10260, 11550, 7740, 9720), z0: 0, z1: 3100, kind: 'wall' },    // infill between the flats
];
export const LOBBY_ROOM = { id: 'lobby', name: 'Лифтовой холл', poly: R(6600, 18605, 9720, 12000) };

// doors of the flats on the hall's north wall (world metres); z = the doorway through the wall (threshold)
const DOORS = [
  { x0: 8.23, x1: 9.33, top: 2.1, num: '104', z: [9.40, 9.725] },
  { x0: 15.135, x1: 16.215, top: 2.3, num: '103', z: [9.30, 9.725] },
];
const LIFT_X = 12.55;

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
const WG_PATHS = [
  'M55 58 C120 72 200 140 238 240 C252 280 262 330 242 392 C180 340 110 250 80 165 C68 128 58 95 55 58 Z',
  'M250 296 C262 240 280 175 304 130 C318 104 333 88 350 86 C367 88 382 104 396 130 C420 175 438 240 452 298 L478 392 L350 252 L242 392 Z',
  'M440 296 C462 250 492 205 545 168 L600 230 L572 336 L478 392 L462 392 Z',
  'M866 200 C800 204 720 208 662 215 C720 236 800 256 866 260 Z',
];
function drawMark(g, x, y, s, color) {
  g.save(); g.translate(x, y); g.scale(s, s); g.translate(-50, -48);
  g.fillStyle = color; for (const p of WG_PATHS) g.fill(new Path2D(p));
  g.strokeStyle = color; g.lineWidth = 72; g.stroke(new Path2D('M802.2 138.3 A136 136 0 1 0 830.3 236.2'));
  g.restore();
}

export function buildLobby(scene) {
  const root = new THREE.Group(); root.name = 'lobby'; scene.add(root);
  const ceil = new THREE.Group(); ceil.name = 'lobby-ceiling'; root.add(ceil);
  const { x0, x1, z0, z1, H } = HALL;
  const std = (name, o) => Object.assign(new THREE.MeshStandardMaterial(o), { name });
  const clone = (m, name, o = {}) => Object.assign(m.clone(), { name }, o);
  const M = {
    floor: clone(MAT.stone_light, 'lobby_floor', { roughness: 0.16 }),
    verde: clone(MAT.k_splash, 'lobby_verde', { roughness: 0.1 }),
    stucco: clone(MAT.w_hall, 'lobby_stucco'),
    green: std('lobby_green', { color: '#1e3a28', roughness: 0.28, metalness: 0.05 }),
    fluted: clone(MAT.wood_fluted, 'lobby_fluted'),
    walnut: clone(MAT.wood_dark, 'lobby_walnut'),
    bronze: std('lobby_bronze', { color: '#8a6a45', roughness: 0.3, metalness: 1 }),
    bronzeBrushed: std('lobby_bronze_b', { color: '#7d6143', roughness: 0.42, metalness: 1 }),
    brass: std('lobby_brass', { color: '#c8a064', roughness: 0.26, metalness: 1 }),
    gap: std('lobby_gap', { color: '#1a1714', roughness: 0.9 }),
    ceiling: std('lobby_ceiling', { color: '#f2efe9', roughness: 0.95 }),
    led: Object.assign(new THREE.MeshBasicMaterial({ color: '#ffe0b0' }), { name: 'lobby_led' }),
    glow: Object.assign(new THREE.MeshBasicMaterial({ color: '#fff1da' }), { name: 'lobby_glow' }),
    alabaster: std('lobby_alabaster', { color: '#f3e7d3', roughness: 0.6, emissive: '#ffd9a6', emissiveIntensity: 0.9 }),
    black: std('lobby_black', { color: '#141414', roughness: 0.15, metalness: 0.2 }),
    plant: clone(MAT.plant, 'lobby_plant'),
    pot: std('lobby_pot', { color: '#cfc6b8', roughness: 0.85 }),
    ceramic: std('lobby_ceramic', { color: '#e9e2d6', roughness: 0.35 }),
    soil: std('lobby_soil', { color: '#3b2f25', roughness: 1 }),
    mirror: clone(MAT.mirror, 'lobby_mirror'),
  };
  const B = new Batch(), F = new Frame(B);
  const BC = new Batch(), FC = new Frame(BC);

  // ---- floor: calacatta slabs 1200 wide with bronze inlay joints, verde marble border, raised verde thresholds
  const bw = 0.24, fx0 = x0 + bw, fx1 = x1 - bw, fz0 = z0 + bw, fz1 = z1 - bw;
  B.add(flatPoly([[fx0, fz0], [fx1, fz0], [fx1, fz1], [fx0, fz1]], 0, true), M.floor);
  for (const r of [[x0, z0, x1, fz0], [x0, fz1, x1, z1], [x0, fz0, fx0, fz1], [fx1, fz0, x1, fz1]]) B.add(flatPoly([[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]], 0, true), M.verde);
  for (const z of [fz0, fz1]) F.box(fx1 - fx0 + 0.008, 0.0012, 0.008, (fx0 + fx1) / 2, 0, z, M.brass);
  for (const x of [fx0, fx1]) F.box(0.008, 0.0012, fz1 - fz0, x, 0, (fz0 + fz1) / 2, M.brass);
  F.box(fx1 - fx0, 0.001, 0.005, (fx0 + fx1) / 2, 0, (fz0 + fz1) / 2, M.bronze);
  for (let x = fx0 + 1.2; x < fx1 - 0.3; x += 1.2) F.box(0.005, 0.001, fz1 - fz0, x, 0, (fz0 + fz1) / 2, M.bronze);
  for (const d of DOORS) F.box(d.x1 - d.x0 + 0.02, 0.008, d.z[1] - d.z[0], (d.x0 + d.x1) / 2, 0, (d.z[0] + d.z[1]) / 2, M.verde);

  // ---- walls: warm stucco with vertical bronze reveals every 1.2 m and a recessed bronze skirting
  const nz = z0 + 0.012;
  const cuts = [x0, ...DOORS.flatMap((d) => [d.x0 - 0.22, d.x1 + 0.22]), x1];
  for (let i = 0; i < cuts.length; i += 2) F.box(cuts[i + 1] - cuts[i], H, 0.012, (cuts[i] + cuts[i + 1]) / 2, 0, z0 + 0.006, M.stucco);
  const face = (ax, az, bx, bz, mat, y0 = 0, y1 = H) => { // plane looking to the left of a->b
    const L = Math.hypot(bx - ax, bz - az), cx = (ax + bx) / 2, cz = (az + bz) / 2, ry = Math.atan2(-(bz - az), bx - ax);
    F.sub(cx, 0, cz, ry).plane(L, y1 - y0, 0, (y0 + y1) / 2, 0, mat);
  };
  face(x1, z1, x0, z1, M.stucco); face(x0, z1, x0, z0, M.stucco); face(x1, z0, x1, z1, M.stucco);
  const reveal = (x, z, ry) => F.sub(x, 0, z, ry).box(0.008, H - 0.1, 0.004, 0, 0.09, 0.002, M.bronze);
  for (let x = 7.2; x < x1 - 0.3; x += 1.2) {
    if (DOORS.some((d) => x > d.x0 - 1.0 && x < d.x1 + 1.0) || Math.abs(x - LIFT_X) < 1.4) continue;
    reveal(x, nz, 0);
  }
  for (let x = 7.2; x < x1 - 0.3; x += 1.2) if (Math.abs(x - LIFT_X) > 2.8) reveal(x, z1, Math.PI);
  // skirting: dark shadow gap + bronze strip, broken at the doors and the lift core
  const skirt = (xa, xb, z, ry) => { const S = F.sub((xa + xb) / 2, 0, z, ry); S.box(xb - xa, 0.07, 0.006, 0, 0, 0.003, M.gap); S.box(xb - xa, 0.012, 0.01, 0, 0.07, 0.005, M.bronze); };
  for (let i = 0; i < cuts.length; i += 2) skirt(cuts[i], cuts[i + 1], nz, 0);
  skirt(x0, LIFT_X - 2.75, z1, Math.PI); skirt(LIFT_X + 2.75, x1, z1, Math.PI);
  { const S = F.sub(x0, 0, (z0 + z1) / 2, Math.PI / 2); S.box(z1 - z0, 0.07, 0.006, 0, 0, 0.003, M.gap); S.box(z1 - z0, 0.012, 0.01, 0, 0.07, 0.005, M.bronze); }
  { const S = F.sub(x1, 0, (z0 + z1) / 2, -Math.PI / 2); S.box(z1 - z0, 0.07, 0.006, 0, 0, 0.003, M.gap); S.box(z1 - z0, 0.012, 0.01, 0, 0.07, 0.005, M.bronze); }

  // ---- flat entrances: full-height walnut fluted portal, bronze inner reveal, brass number plate, alabaster sconces
  for (const d of DOORS) {
    const cx = (d.x0 + d.x1) / 2, w = d.x1 - d.x0, P = F.sub(cx, 0, nz, 0);
    for (const sx of [-1, 1]) {
      P.box(0.22, H, 0.06, sx * (w / 2 + 0.11), 0, 0.03, M.fluted);
      P.box(0.014, d.top + 0.2, 0.066, sx * (w / 2 + 0.007), 0, 0.033, M.bronze);
    }
    P.box(w + 0.44, H - d.top - 0.2, 0.06, 0, d.top + 0.2, 0.03, M.fluted);
    P.box(w + 0.03, 0.2, 0.066, 0, d.top, 0.033, M.walnut);
    P.box(w + 0.03, 0.014, 0.07, 0, d.top + 0.193, 0.035, M.bronze);
    const tex = canvasTex(512, 256, (g, W, Hh) => {
      g.fillStyle = '#1e3a28'; g.fillRect(0, 0, W, Hh);
      g.strokeStyle = '#c8a064'; g.lineWidth = 5; g.strokeRect(14, 14, W - 28, Hh - 28);
      g.fillStyle = '#e0c088'; g.font = '600 140px Montserrat, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(d.num, W / 2, Hh / 2 + 8);
    });
    const plate = std('lobby_plate_' + d.num, { map: tex, roughness: 0.35, metalness: 0.15 });
    const px = w / 2 + 0.42;
    P.box(0.27, 0.14, 0.008, px, 1.515, 0.004, M.brass);
    P.plane(0.26, 0.13, px, 1.585, 0.0085, plate);
    for (const sx of [-1, 1]) {
      const S = P.sub(sx * (w / 2 + 0.75), 0, 0);
      S.box(0.06, 0.5, 0.012, 0, 1.45, 0.006, M.bronze);
      S.box(0.12, 0.42, 0.06, 0, 1.49, 0.05, M.alabaster);
      S.box(0.124, 0.012, 0.064, 0, 1.49, 0.05, M.bronze); S.box(0.124, 0.012, 0.064, 0, 1.898, 0.05, M.bronze);
    }
  }

  // ---- brand wall between the flats: deep green panel with the WG mark in a bronze frame, floating console, vase
  {
    const P = F.sub(LIFT_X, 0, nz, 0);
    const markTex = canvasTex(1024, 640, (g, W, Hh) => {
      g.fillStyle = '#1e3a28'; g.fillRect(0, 0, W, Hh);
      drawMark(g, W / 2 - 238, 150, 0.58, '#9fb79a');
      g.fillStyle = '#c3d3be'; g.font = '600 44px Montserrat, Arial, sans-serif'; g.textAlign = 'center';
      g.fillText('W E S T   G A R D E N', W / 2, 470);
      g.fillStyle = '#c8a064'; g.fillRect(W / 2 - 60, 510, 120, 3);
    });
    const panel = std('lobby_brand', { map: markTex, roughness: 0.62 });
    P.box(2.4, 1.5, 0.03, 0, 1.15, 0.015, M.green);
    P.plane(2.4, 1.5, 0, 1.9, 0.0305, panel);
    for (const y of [1.12, 2.65]) P.box(2.46, 0.03, 0.05, 0, y, 0.025, M.bronze);
    for (const sx of [-1, 1]) P.box(0.03, 1.56, 0.05, sx * 1.215, 1.12, 0.025, M.bronze);
    P.box(2.7, 0.01, 0.02, 0, 2.78, 0.01, M.led); // grazing light over the panel
    // floating walnut console with a bronze edge, ceramic vase with olive branches, a bronze bowl
    const C = P.sub(0, 0, 0.01);
    C.box(1.8, 0.07, 0.36, 0, 0.82, 0.18, M.walnut); C.box(1.802, 0.012, 0.362, 0, 0.82, 0.18, M.bronze);
    C.lathe([[0, 0], [0.09, 0], [0.13, 0.12], [0.11, 0.3], [0.05, 0.38], [0.055, 0.42], [0, 0.42]], -0.45, 0.89, 0.18, M.ceramic, 40);
    let seed = 3; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 7; i++) {
      const a = rnd() * 6.28, tilt = 0.25 + rnd() * 0.4, L = 0.6 + rnd() * 0.5, bx = -0.45, by = 1.28, bz = 0.18;
      const pts = [[bx, by, bz], [bx + Math.cos(a) * tilt * L * 0.5, by + L * 0.55, bz + Math.sin(a) * tilt * L * 0.25], [bx + Math.cos(a) * tilt * L, by + L, bz + Math.sin(a) * tilt * L * 0.4]];
      C.tube(pts, 0.005, M.walnut, 8, false, 5);
      for (let k = 0; k < 10; k++) { const t = k / 9, p = pts[1].map((v, j) => v + (pts[2][j] - v) * t); C.sub(p[0], p[1], p[2], rnd() * 6, rnd() - 0.5, rnd() - 0.5).plane(0.05, 0.022, 0, 0, 0, M.plant); }
    }
    C.lathe([[0, 0], [0.04, 0], [0.16, 0.06], [0.17, 0.07], [0, 0.02]], 0.45, 0.89, 0.18, M.bronzeBrushed, 40);
  }

  // ---- lift core: verde marble, deep bronze portals, brushed bronze doors, floor displays, call panel
  {
    const P = F.sub(LIFT_X, 0, z1 - 0.03, Math.PI); // local +z looks north into the hall
    P.box(5.5, H, 0.03, 0, 0, 0.015, M.verde);
    for (const sx of [-1, 1]) P.box(0.24, H, 0.07, sx * 2.62, 0, 0.035, M.fluted); // fluted walnut pilasters
    for (const sx of [-1, 1]) {
      const L = P.sub(sx * 1.15, 0, 0.03);
      for (const jx of [-1, 1]) L.box(0.12, 2.42, 0.08, jx * 0.62, 0, 0.04, M.bronze);   // deep bronze jambs
      L.box(1.36, 0.18, 0.08, 0, 2.24, 0.04, M.bronze);                                     // head
      L.box(1.12, 2.24, 0.01, 0, 0, 0.005, M.gap);                                          // shadow behind the doors
      for (const hx of [-1, 1]) L.box(0.553, 2.22, 0.02, hx * 0.279, 0.01, 0.025, M.bronzeBrushed); // recessed door leaves
      L.box(0.004, 2.22, 0.022, 0, 0.01, 0.026, M.gap);                                     // centre split
      const dTex = canvasTex(256, 96, (g, W, Hh) => { g.fillStyle = '#0d0c0b'; g.fillRect(0, 0, W, Hh); g.fillStyle = '#ffb35c'; g.font = '600 56px Montserrat, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(sx < 0 ? '▲ 10' : '10 ▼', W / 2, Hh / 2 + 3); });
      L.box(0.3, 0.11, 0.012, 0, 2.275, 0.086, M.black);
      L.plane(0.28, 0.1, 0, 2.33, 0.0925, Object.assign(new THREE.MeshBasicMaterial({ map: dTex }), { name: 'lobby_floor_display' + sx }));
    }
    const Cp = P.sub(0, 0, 0.03);
    Cp.box(0.12, 0.3, 0.012, 0, 0.98, 0.006, M.brass);
    for (const y of [1.06, 1.18]) { Cp.cylZ(0.024, 0.008, 0, y, 0.016, M.bronze, 24); Cp.cylZ(0.016, 0.006, 0, y, 0.021, M.glow, 24); }
    P.box(5.5, 0.012, 0.05, 0, 2.86, 0.055, M.bronze);
  }

  // ---- west end: stair door in a bronze frame with a sign; east end: olive tree and a tall bronze-framed mirror
  {
    const P = F.sub(x0 + 0.012, 0, 10.86, Math.PI / 2); // faces east
    P.box(1.12, 2.24, 0.04, 0, 0, 0.02, M.bronze);
    P.box(0.98, 2.16, 0.02, 0, 0, 0.045, M.walnut);
    P.box(0.3, 0.022, 0.03, 0.3, 1.0, 0.07, M.brass);
    const sign = canvasTex(512, 160, (g, W, Hh) => { g.fillStyle = '#1e3a28'; g.fillRect(0, 0, W, Hh); g.fillStyle = '#c3d3be'; g.font = '500 62px Roboto, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ЛЕСТНИЦА', W / 2, Hh / 2 + 4); });
    P.box(0.53, 0.17, 0.01, 0, 2.395, 0.005, M.bronze);
    P.plane(0.5, 0.15, 0, 2.48, 0.0105, std('lobby_sign', { map: sign, roughness: 0.4 }));
  }
  {
    const P = F.sub(x1 - 0.55, 0, 10.86, 0);
    P.lathe([[0, 0], [0.24, 0], [0.3, 0.1], [0.32, 0.56], [0.29, 0.6], [0, 0.6]], 0, 0, 0, M.pot, 48);
    P.cyl(0.28, 0.28, 0.01, 0, 0.57, 0, M.soil, 32);
    P.tube([[0, 0.58, 0], [0.05, 1.0, 0.02], [-0.02, 1.4, -0.03]], 0.035, M.walnut, 12, false, 8);
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 220; i++) { // olive canopy: small leaf blades in a loose crown
      const a = rnd() * Math.PI * 2, r = 0.12 + rnd() * 0.45, y = 1.4 + rnd() * 0.8 - r * 0.3;
      P.sub(Math.cos(a) * r, y, Math.sin(a) * r, rnd() * 3, rnd() - 0.5, rnd() - 0.5).plane(0.09, 0.025, 0, 0, 0, M.plant);
    }
    const Mr = F.sub(x1 - 0.012, 0, 10.86, -Math.PI / 2);
    Mr.box(1.0, 2.3, 0.04, 0, 0.35, 0.02, M.bronze);
    Mr.box(0.92, 2.22, 0.01, 0, 0.39, 0.045, M.mirror);
  }

  // ---- ceiling: plaster with a floating raft (LED coves round it) and recessed downlights
  FC.add(flatPoly([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], H, false), M.ceiling);
  const zc = (z0 + z1) / 2, rx0 = x0 + 0.35, rx1 = x1 - 0.35, rz0 = z0 + 0.32, rz1 = z1 - 0.32;
  FC.box(rx1 - rx0, 0.1, rz1 - rz0, (rx0 + rx1) / 2, H - 0.16, zc, M.ceiling);
  for (const z of [rz0 - 0.02, rz1 + 0.02]) FC.box(rx1 - rx0, 0.006, 0.02, (rx0 + rx1) / 2, H - 0.075, z, M.led);
  for (const x of [rx0 - 0.02, rx1 + 0.02]) FC.box(0.02, 0.006, rz1 - rz0, x, H - 0.075, zc, M.led);
  for (let x = x0 + 1.0; x < x1 - 0.6; x += 1.5) {
    FC.cyl(0.045, 0.045, 0.004, x, H - 0.164, zc, M.black, 24);
    FC.cyl(0.03, 0.03, 0.002, x, H - 0.166, zc, M.glow, 24);
  }

  B.build(root, { name: 'lobby' });
  BC.build(ceil, { name: 'lobby-ceil', cast: true });

  // light: warm, always on (the hall has no windows)
  const lights = [];
  for (const x of [8.8, 11.3, 13.8, 15.7]) {
    const L = new THREE.PointLight('#ffd9ac', 4.0, 7, 2); L.position.set(x, 2.55, zc); root.add(L); lights.push(L);
  }
  const collide = [[LIFT_X - 0.92, z0, LIFT_X + 0.92, z0 + 0.4], [x1 - 0.9, 10.5, x1, 11.22]];
  const views = {
    hall: { p: [7.25, 11.25], look: [12.0, 1.45, 10.3] },
    k94: { p: [9.6, 11.2], look: [8.78, 1.4, 9.4] },
    wg: { p: [15.0, 11.2], look: [15.68, 1.4, 9.4] },
  };
  return { root, ceil, lights, collide, views };
}
