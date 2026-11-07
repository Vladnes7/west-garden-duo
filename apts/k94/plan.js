// Architecture: walls (from PDF vectors), openings, floors, ceilings, mouldings, windows, doors.
import * as THREE from 'three';
import { WALLS, WINDOWS } from './plan-data.js';
import { MAT } from './materials.js';
import { Batch, Frame, mat4, quad, flatPoly, sweep, wallSweep, wallFrame, PROFILES, pointInPoly, signedArea, planarUV, orientTo } from './geom.js';

export const CEIL = 3.0;   // finished ceiling (3200 rough - 100 floor - 100 GKL)
export const WALL_TOP = 3.1;
const S = 0.001;            // mm -> m

// ---------------- Rooms (finished contours, mm; x east, y south) ----------------
export const ROOMS = [
  { id: 'living', name: 'Кухня-гостиная', wall: 'w_living', floor: 'floor_wood', base: 'trim',
    poly: [[5790, 0], [11250, 0], [11250, 4670], [9280, 4670], [9280, 4030], [9210, 4030], [9210, 5530], [3010, 5530], [3010, 3550], [4110, 3550], [4110, 4130], [5424, 4130], [5476, 4126], [5527, 4115], [5576, 4097], [5622, 4072], [5664, 4041], [5701, 4004], [5732, 3962], [5757, 3916], [5775, 3867], [5786, 3816], [5790, 3764]] },
  { id: 'girls', name: 'Комната девочек', wall: 'w_girls', floor: 'floor_wood', base: 'trim', poly: [[0, 0], [2940, 0], [2940, 5530], [0, 5530]] },
  { id: 'boy', name: 'Комната мальчика', wall: 'w_boy', floor: 'floor_wood', base: 'trim',
    poly: [[3010, 0], [5650, 0], [5650, 3830], [5647, 3870], [5636, 3909], [5619, 3945], [5596, 3978], [5568, 4006], [5535, 4029], [5499, 4046], [5460, 4057], [5420, 4060], [4180, 4060], [4180, 3480], [3010, 3480]] },
  { id: 'bed', name: 'Спальня', wall: 'w_bed', floor: 'floor_wood', base: 'trim', poly: [[0, 5600], [4000, 5600], [4000, 8490], [0, 8490]] },
  { id: 'wardrobe', name: 'Гардеробная', wall: 'w_wardrobe', floor: 'floor_wood', base: 'trim', poly: [[4070, 5600], [5500, 5600], [5500, 6530], [5130, 6530], [5130, 8490], [4070, 8490]] },
  { id: 'bath', name: 'Ванная', wall: 'w_bath', floor: 'floor_bath', poly: [[5960, 5600], [7780, 5600], [7780, 6530], [7110, 6530], [7110, 6580], [7780, 6580], [7780, 7320], [7110, 7320], [7110, 8490], [5400, 8490], [5400, 6600], [5960, 6600]] },
  { id: 'hall', name: 'Прихожая', wall: 'w_living', floor: 'floor_hall', base: 'trim', poly: [[7850, 5600], [9210, 5600], [9210, 7450], [7850, 7450]] },
  { id: 'vest', name: 'Прихожая', wall: 'w_hall', floor: 'floor_hall', base: 'w_hall', poly: [[7850, 7450], [9210, 7450], [9210, 7510], [9960, 7510], [9960, 9420], [7850, 9420], [7850, 8490], [7180, 8490], [7180, 7390], [7850, 7390]] },
  { id: 'shower', name: 'Санузел', wall: 'w_shower', floor: 'floor_wc', poly: [[9280, 4740], [10590, 4740], [10590, 5705], [9280, 5705]] },
  { id: 'wc', name: 'Санузел', wall: 'w_wc', floor: 'floor_wc', poly: [[9280, 5705], [10590, 5705], [10590, 5730], [10690, 5730], [10690, 5970], [11250, 5970], [11250, 7440], [9280, 7440]] },
];
export const UI_ROOM = { living: 'living', girls: 'girls', boy: 'boy', bed: 'bed', wardrobe: 'wardrobe', bath: 'bath', hall: 'hall', vest: 'hall', shower: 'wc', wc: 'wc' };

export function roomAt(x, y) { // mm
  for (const r of ROOMS) if (pointInPoly(x, y, r.poly)) return r;
  return null;
}

// ---------------- Openings ----------------
// axis 'x': wall runs N-S (thickness along x: w0..w1), span along y a..b
// axis 'y': wall runs E-W (thickness along y: w0..w1), span along x a..b
export const OPENINGS = [
  { id: 'd_girls', kind: 'door', axis: 'x', w0: 2940, w1: 3010, a: 3930, b: 4830, top: 2430, hinge: 'b', swing: -1, open: 0.95 },
  { id: 'd_boy', kind: 'door', axis: 'y', w0: 3480, w1: 3550, a: 3110, b: 4010, top: 2430, hinge: 'a', swing: -1, open: 0.95 },
  { id: 'd_bed', kind: 'door', axis: 'y', w0: 5530, w1: 5600, a: 3055, b: 3955, top: 2430, hinge: 'b', swing: 1, open: 0.95 },
  { id: 'd_bath', kind: 'door', axis: 'y', w0: 5530, w1: 5600, a: 6060, b: 6860, top: 2430, hinge: 'b', swing: 1, open: 0.95 },
  { id: 'd_wc', kind: 'hidden', axis: 'x', w0: 9210, w1: 9280, a: 5910, b: 6710, top: 2430, hinge: 'b', swing: -1, open: 0 },
  { id: 'd_entry', kind: 'entry', axis: 'y', w0: 9420, w1: 9720, a: 8230, b: 9330, top: 2100, hinge: 'b', swing: 1, open: 0 },
  { id: 'd_shower', kind: 'shower', axis: 'y', w0: 5680, w1: 5730, a: 9385, b: 10585, top: 2650, swing: 1, open: 0.0 },
  { id: 'a_ward', kind: 'arch', axis: 'x', w0: 4000, w1: 4070, a: 6545, b: 7545, top: 2450 },
  { id: 'a_hall', kind: 'portal', axis: 'y', w0: 5530, w1: 5600, a: 7850, b: 9210, top: 2800 },
];
export const SILL = 400, HEAD = 2750;

// ---------------- Prisms (wall solids) ----------------
function rect(x0, x1, y0, y1) { return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; }
function openingRect(o) { return o.axis === 'x' ? rect(o.w0, o.w1, o.a, o.b) : rect(o.a, o.b, o.w0, o.w1); }

export const PRISMS = [];   // {poly(mm), z0, z1, kind}
for (const p of WALLS) {
  const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
  const bb = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  // toilet installation ledge in WC: H = 1200
  const ledge = bb[2] >= 7240 && bb[3] <= 7440 && bb[0] >= 9280 && bb[1] <= 11250 && bb[3] - bb[2] <= 200;
  PRISMS.push({ poly: p, z0: 0, z1: ledge ? 1200 : WALL_TOP * 1000, kind: ledge ? 'ledge' : 'wall', bb });
}
for (const o of OPENINGS) {
  const top = o.kind === 'arch' || o.kind === 'portal' ? null : o.top;
  if (top) PRISMS.push({ poly: openingRect(o), z0: top, z1: WALL_TOP * 1000, kind: 'lintel' });
}
for (const w of WINDOWS) {
  const r = w.side === 'N' ? rect(w.a, w.b, -300, 0) : rect(-300, 0, w.a, w.b);
  PRISMS.push({ poly: r, z0: 0, z1: SILL, kind: 'sill' });
  PRISMS.push({ poly: r, z0: HEAD, z1: WALL_TOP * 1000, kind: 'lintel' });
}

function insideSolid(x, y, z) {
  for (const p of PRISMS) if (z >= p.z0 && z <= p.z1 && pointInPoly(x, y, p.poly)) return true;
  return false;
}

// ---------------- Build ----------------
export function buildArchitecture(scene) {
  const root = new THREE.Group(); root.name = 'architecture'; scene.add(root);
  const ceilGroup = new THREE.Group(); ceilGroup.name = 'ceilings'; root.add(ceilGroup);
  const B = new Batch(), BC = new Batch();
  for (const k of ['cur_living', 'cur_girls', 'cur_boy', 'cur_bed', 'sheer', 'curtain_bath', 'glass_fluted', 'glass', 'glass_display']) MAT[k].side = THREE.DoubleSide;

  // ---- wall prisms ----
  for (const pr of PRISMS) {
    let poly = pr.poly;
    const ccwScreen = signedArea(poly) < 0; // interior on left of travel
    const z0 = pr.z0 * S, z1 = pr.z1 * S;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1) continue;
      const tx = (b[0] - a[0]) / L, ty = (b[1] - a[1]) / L;
      // outward normal (plan): left normal = (ty, -tx); outward is right normal when interior is left
      const ox = ccwScreen ? -ty : ty, oy = ccwScreen ? tx : -tx;
      // sample runs along edge
      const step = 10, n = Math.max(1, Math.round(L / step));
      const zm = (pr.z0 + Math.min(pr.z1, 2900)) / 2;
      let runStart = 0, runKey = null;
      const keyAt = (t) => {
        const x = a[0] + tx * t + ox * 40, y = a[1] + ty * t + oy * 40;
        if (insideSolid(x, y, zm)) return 'skip';
        const r = roomAt(x, y);
        return r ? r.wall : (pr.kind === 'wall' || pr.kind === 'ledge' ? 'plaster' : 'plaster');
      };
      const flush = (t0, t1, key) => {
        if (key === 'skip' || t1 - t0 < 0.5) return;
        const x0 = (a[0] + tx * t0) * S, y0 = (a[1] + ty * t0) * S, x1 = (a[0] + tx * t1) * S, y1 = (a[1] + ty * t1) * S;
        // quad faces LEFT of travel: we need outward; travel direction such that outward is on left
        const g = ccwScreen ? quad(x1, y1, x0, y0, z0, z1) : quad(x0, y0, x1, y1, z0, z1);
        // uv along wall in world meters (continuous across segments)
        const uvA = g.attributes.uv; const u0 = Math.abs(tx) > Math.abs(ty) ? Math.min(x0, x1) : Math.min(y0, y1);
        for (let k = 0; k < uvA.count; k++) uvA.setX(k, uvA.getX(k) + u0);
        B.add(g, key);
      };
      for (let k = 0; k <= n; k++) {
        const t = (k / n) * L;
        const key = k === n ? null : keyAt(t + (L / n) / 2);
        if (key !== runKey) { if (runKey !== null) flush(runStart, t, runKey); runStart = t; runKey = key; }
      }
    }
    // caps
    const pm = poly.map(([x, y]) => [x * S, y * S]);
    B.add(flatPoly(pm, z1, true), pr.kind === 'ledge' ? 'sill' : (pr.kind === 'sill' ? 'plaster' : 'cut'));
    if (pr.z0 > 0) B.add(flatPoly(pm, z0, false), 'plaster');
  }

  // ---- floors ----
  for (const r of ROOMS) B.add(flatPoly(r.poly.map(([x, y]) => [x * S, y * S]), 0, true), r.floor);
  // thresholds under door/arch openings
  for (const o of OPENINGS) {
    const r = openingRect(o);
    const c = [(r[0][0] + r[2][0]) / 2, (r[0][1] + r[2][1]) / 2];
    const n = o.axis === 'x' ? [1, 0] : [0, 1];
    const sides = [roomAt(c[0] + n[0] * 120, c[1] + n[1] * 120), roomAt(c[0] - n[0] * 120, c[1] - n[1] * 120)].filter(Boolean);
    const floor = sides.some((q) => q.floor === 'floor_wood') ? 'floor_wood' : (sides[0] ? sides[0].floor : 'floor_wood');
    B.add(flatPoly(r.map(([x, y]) => [x * S, y * S]), 0, true), floor);
  }

  // ---- ceilings ----
  buildCeilings(BC);

  // ---- mouldings ----
  buildMouldings(B, BC);

  // ---- windows ----
  buildWindows(B);

  B.build(root, { name: 'arch' });
  BC.build(ceilGroup, { name: 'ceil', cast: true });

  // ---- doors (animated, separate) ----
  const doors = buildDoors(root);
  return { root, ceilGroup, doors };
}

// ---------------- Ceilings ----------------
// main poly at CEIL; slots (curtain pockets) at 3.1; boxes at 2.8 (with fascias)
const CEILINGS = [
  { room: 'living', main: [[5790, 170], [10650, 170], [10650, 4070], [9280, 4070], [9280, 4030], [9210, 4030], [9210, 5530], [3010, 5530], [3010, 3550], [4110, 3550], [4110, 4130], [5424, 4130], [5527, 4115], [5622, 4072], [5701, 4004], [5757, 3916], [5786, 3816], [5790, 3764]],
    slots: [rect(5790, 10650, 0, 170)], boxes: [rect(10650, 11250, 0, 4670), rect(9280, 10650, 4070, 4670)], cornice: true },
  { room: 'girls', main: [[150, 170], [2940, 170], [2940, 4900], [150, 4900]], slots: [rect(0, 2940, 0, 170), rect(0, 150, 170, 5530)], boxes: [rect(150, 2940, 4900, 5530)], cornice: true },
  { room: 'boy', main: [[3010, 170], [5650, 170], [5650, 3480], [3010, 3480]], slots: [rect(3010, 5650, 0, 170)],
    boxes: [[[4180, 3480], [5650, 3480], [5650, 3830], [5636, 3909], [5596, 3978], [5535, 4029], [5460, 4057], [5420, 4060], [4180, 4060]]], cornice: true },
  { room: 'bed', main: [[150, 5600], [4000, 5600], [4000, 8490], [150, 8490]], slots: [rect(0, 150, 5600, 8490)], boxes: [], cornice: true },
  { room: 'wardrobe', main: ROOMS[4].poly, slots: [], boxes: [], cornice: true },
  { room: 'hall', main: [[7850, 5600], [9210, 5600], [9210, 7510], [9260, 7510], [9260, 9420], [7850, 9420]], slots: [], boxes: [rect(7180, 7850, 7390, 8490), rect(9260, 9960, 7510, 9420)], cornice: true },
  { room: 'bath', main: [[5960, 5600], [7110, 5600], [7110, 8490], [5400, 8490], [5400, 6600], [5960, 6600]], slots: [], boxes: [rect(7110, 7780, 5600, 6530), rect(7110, 7780, 6530, 7320)], cornice: false, low: 2950 },
  { room: 'shower', main: ROOMS[8].poly, slots: [], boxes: [], cornice: false },
  { room: 'wc', main: ROOMS[9].poly, slots: [], boxes: [], cornice: false },
];
export const CEIL_SPECS = CEILINGS;

function buildCeilings(BC) {
  for (const c of CEILINGS) {
    const h = (c.low || CEIL * 1000) * S;
    BC.add(flatPoly(c.main.map(([x, y]) => [x * S, y * S]), h, false), 'ceiling');
    for (const s of c.slots) {
      BC.add(flatPoly(s.map(([x, y]) => [x * S, y * S]), WALL_TOP - 0.002, false), 'plaster');
    }
    for (const bx of c.boxes) BC.add(flatPoly(bx.map(([x, y]) => [x * S, y * S]), 2.8, false), 'ceiling');
    // fascias: vertical faces along main-poly edges that border a slot (2.8..3.1) or a box (2.8..CEIL)
    const mp = c.main;
    for (let i = 0; i < mp.length; i++) {
      const a = mp[i], b = mp[(i + 1) % mp.length];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 5) continue;
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      const nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L; // one side
      for (const sgn of [1, -1]) {
        const px = mx + nx * sgn * 30, py = my + ny * sgn * 30;
        const inSlot = c.slots.some((s) => pointInPoly(px, py, s));
        const inBox = c.boxes.some((s) => pointInPoly(px, py, s));
        if (!inSlot && !inBox) continue;
        const h0 = 2.8, h1 = inSlot ? WALL_TOP : h;
        // face toward the main ceiling side (opposite of sgn)
        const g1 = quad(a[0] * S, a[1] * S, b[0] * S, b[1] * S, h0, h1);
        const g2 = quad(b[0] * S, b[1] * S, a[0] * S, a[1] * S, h0, h1);
        BC.add(g1, 'ceiling'); BC.add(g2, 'ceiling');
      }
    }
  }
}

// ---------------- Mouldings: cornices, baseboards, wall panels ----------------
function inward(poly) { return signedArea(poly) > 0 ? poly.slice().reverse() : poly; }

function buildMouldings(B, BC) {
  // cornices along ceiling contours (hung below ceiling)
  for (const c of CEILINGS) {
    if (!c.cornice) continue;
    const path = inward(c.main).map(([x, y]) => [x * S, y * S]);
    const geos = sweep(path, PROFILES.cornice, true, CEIL - 0.2);
    const mat = c.room === 'hall' ? 'trim' : 'trim';
    for (const g of geos) BC.add(g, mat);
    // dentil band
    dentils(BC, path, CEIL - 0.2);
  }
  // baseboards along floor contours minus openings
  for (const r of ROOMS) {
    if (!r.base) continue;
    const poly = inward(r.poly);
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 5) continue;
      const tx = (b[0] - a[0]) / L, ty = (b[1] - a[1]) / L;
      const ox = -ty, oy = tx; // left normal = interior; outward = -left
      // find solid runs
      const n = Math.max(1, Math.round(L / 10));
      let s0 = null;
      const runs = [];
      for (let k = 0; k <= n; k++) {
        const t = (k / n) * L;
        const solid = k < n && insideSolid(a[0] + tx * (t + L / n / 2) - ox * 35, a[1] + ty * (t + L / n / 2) - oy * 35, 50);
        if (solid && s0 === null) s0 = t;
        if (!solid && s0 !== null) { runs.push([s0, t]); s0 = null; }
      }
      for (const [t0, t1] of runs) {
        // extend into corners so mitres meet (only when the run touches the edge end)
        const path = [[(a[0] + tx * t0) * S, (a[1] + ty * t0) * S], [(a[0] + tx * t1) * S, (a[1] + ty * t1) * S]];
        const geos = sweep(path, PROFILES.base, false, 0);
        for (const g of geos) B.add(g, r.base);
      }
    }
  }
}

function dentils(B, path, y0) {
  const F = new Frame(B);
  const N = path.length;
  // offsets into room: use same miter logic roughly by insetting each segment
  for (let i = 0; i < N; i++) {
    const a = path[i], b = path[(i + 1) % N];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.15) continue;
    const tx = (b[0] - a[0]) / L, tz = (b[1] - a[1]) / L;
    const nx = tz, nz = -tx; // left = interior
    const ry = Math.atan2(-tz, tx);
    for (let s = 0.07; s < L - 0.06; s += 0.032) {
      const x = a[0] + tx * s + nx * 0.04, z = a[1] + tz * s + nz * 0.04;
      F.box(0.016, 0.03, 0.014, x, y0 + 0.066, z, 'trim', ry);
    }
  }
}

// ---------------- Windows ----------------
function buildWindows(B) {
  const F = new Frame(B);
  const y0 = SILL * S, y1 = HEAD * S;
  for (const w of WINDOWS) {
    let mem = w.m.map(([a, b]) => [a, b]);
    const corner = w.a === -300;
    // bars are members <= 80mm; panes are the rest
    let bars = mem.filter(([a, b]) => b - a <= 80);
    if (corner) { bars = bars.filter(([a, b]) => a > -250); bars.unshift([-200, -150]); }
    const along = (t) => t * S; // axis coordinate
    const depth = -0.175; // frame centre (inside wall at -200..-150 mm)
    const place = (u, d) => w.side === 'N' ? [u, d] : [d, u]; // returns [x, z]
    const startU = corner ? -200 : w.a, endU = w.b;
    // outer frame top/bottom & transom
    const L = (endU - startU) * S, cu = (startU + endU) / 2 * S;
    const horiz = (yy, hh) => {
      const [x, z] = place(cu, depth);
      F.box(w.side === 'N' ? L : 0.07, hh, w.side === 'N' ? 0.07 : L, x, yy, z, 'win_frame');
    };
    horiz(y0, 0.07); horiz(y1 - 0.07, 0.07); horiz(2.2, 0.05);
    for (const [a, b] of bars) {
      const [x, z] = place((a + b) / 2 * S, depth);
      const wd = (b - a) * S;
      F.box(w.side === 'N' ? wd : 0.07, y1 - y0, w.side === 'N' ? 0.07 : wd, x, y0, z, 'win_frame');
    }
    // glass panes between bars
    const sorted = bars.slice().sort((p, q) => p[0] - q[0]);
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i][1], b = sorted[i + 1][0]; if (b - a < 100) continue;
      const [x, z] = place((a + b) / 2 * S, depth);
      const wd = (b - a) * S;
      F.box(w.side === 'N' ? wd : 0.006, y1 - y0 - 0.14, w.side === 'N' ? 0.006 : wd, x, y0 + 0.07, z, 'glass');
      // sash handle on the middle sash
      if (i === Math.floor((sorted.length - 1) / 2) && b - a > 300) {
        const [hx, hz] = place(b * S - 0.06, depth + 0.05);
        F.box(0.02, 0.14, 0.02, hx, 1.25, hz, 'win_frame');
      }
    }
    // stone sill board (room side), from frame to 40mm proud of wall
    {
      const [x, z] = place(cu, (-0.15 + 0.04) / 2);
      F.box(w.side === 'N' ? L + 0.06 : 0.19, 0.03, w.side === 'N' ? 0.19 : L + 0.06, x, y0, z, 'sill');
    }
    // venetian blinds (dark wood), partially lowered, per pane group
    const slatsTo = 1.75;
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i][1], b = sorted[i + 1][0]; if (b - a < 100) continue;
      const wd = (b - a) * S - 0.01;
      const [x, z] = place((a + b) / 2 * S, -0.12);
      for (let yy = y1 - 0.05; yy > slatsTo; yy -= 0.045) {
        const g = planarUV(new THREE.BoxGeometry(w.side === 'N' ? wd : 0.05, 0.003, w.side === 'N' ? 0.05 : wd));
        B.add(g, 'blind', mat4(x, yy, z, 0, w.side === 'N' ? 0.35 : 0, w.side === 'N' ? 0 : 0.35));
      }
      F.box(w.side === 'N' ? wd : 0.055, 0.02, w.side === 'N' ? 0.055 : wd, x, slatsTo - 0.02, z, 'blind');
      F.box(w.side === 'N' ? wd : 0.06, 0.05, w.side === 'N' ? 0.06 : wd, x, y1 - 0.05, z, 'blind');
    }
  }
}

// ---------------- Doors ----------------
function oframe(o) {
  // returns helpers in plan mm → world meters for an opening
  const along = o.axis === 'y' ? [1, 0] : [0, 1];       // span direction (x,y plan)
  const nrm = o.axis === 'y' ? [0, 1] : [1, 0];          // thickness direction (+)
  const c = (o.w0 + o.w1) / 2;
  const P = (u, d) => o.axis === 'y' ? [u * S, (c + d) * S] : [(c + d) * S, u * S]; // u along span(mm), d offset from centre (mm)
  return { along, nrm, c, P, th: o.w1 - o.w0 };
}

function casing(B, o, side, mat) {
  // side: +1 → face at w1 (positive normal), -1 → face at w0
  const { along, nrm, th } = oframe(o);
  const faceD = side > 0 ? o.w1 : o.w0;
  const t = [along[0], 0, along[1]], n = [nrm[0] * side, 0, nrm[1] * side];
  const origin = o.axis === 'y' ? [0, 0, faceD * S] : [faceD * S, 0, 0];
  const a = o.a * S, b = o.b * S, top = o.top * S;
  const prof = [[0, 0], [0, 0.022], [0.012, 0.024], [0.03, 0.021], [0.055, 0.017], [0.075, 0.012], [0.085, 0.009], [0.085, 0]];
  // path in (u along t, v height). For side -1 the tangent flips orientation of left normal: compensate by reversing
  const path = side > 0 ? [[b, 0], [b, top], [a, top], [a, 0]] : [[b, 0], [b, top], [a, top], [a, 0]];
  const geos = wallSweep(path, prof, false, origin, t, n);
  for (const g of geos) { planarUV(g); B.add(g, mat); }
  void th;
}

function jambs(B, o, mat) {
  const { P, th } = oframe(o);
  const F = new Frame(B);
  const d = (th + 20) * S, top = o.top * S;
  const jw = 0.02;
  const [x1, z1] = P(o.a + 10, 0), [x2, z2] = P(o.b - 10, 0), [xm, zm] = P((o.a + o.b) / 2, 0);
  const W = (o.b - o.a) * S;
  if (o.axis === 'y') {
    F.box(jw, top, d, x1, 0, z1, mat); F.box(jw, top, d, x2, 0, z2, mat); F.box(W, jw, d, xm, top - jw, zm, mat);
  } else {
    F.box(d, top, jw, x1, 0, z1, mat); F.box(d, top, jw, x2, 0, z2, mat); F.box(d, jw, W, xm, top - jw, zm, mat);
  }
}

// Panel door leaf in local coords: hinge at origin, width along +X, thickness along Z, height Y.
function panelLeaf(B, w, h, t, mat, handleMat, opts = {}) {
  const F = new Frame(B);
  F.box(w, h, t, w / 2, 0, 0, mat);
  if (!opts.flush) {
    for (const side of [1, -1]) {
      const z = side * (t / 2 + 0.004);
      const panels = [[0.12, 0.85], [0.98, h - 0.12]];
      for (const [p0, p1] of panels) {
        const x0 = 0.12, x1 = w - 0.12, mw = 0.018;
        F.box(x1 - x0, mw, 0.008, (x0 + x1) / 2, p0, z, mat);
        F.box(x1 - x0, mw, 0.008, (x0 + x1) / 2, p1 - mw, z, mat);
        F.box(mw, p1 - p0, 0.008, x0 + mw / 2, p0, z, mat);
        F.box(mw, p1 - p0, 0.008, x1 - mw / 2, p0, z, mat);
        // inner bead
        F.box(x1 - x0 - 0.07, 0.006, 0.004, (x0 + x1) / 2, p0 + 0.035, z, mat);
        F.box(x1 - x0 - 0.07, 0.006, 0.004, (x0 + x1) / 2, p1 - 0.041, z, mat);
      }
    }
  }
  // lever handles both sides
  for (const side of [1, -1]) {
    const z = side * (t / 2);
    F.cylZ(0.026, 0.012, w - 0.07, 1.0, z + side * 0.006, handleMat, 24);
    F.cylZ(0.008, 0.05, w - 0.07, 1.0, z + side * 0.03, handleMat, 12);
    F.box(0.13, 0.016, 0.018, w - 0.07 - 0.06, 0.992, z + side * 0.055, handleMat);
    F.cylZ(0.009, 0.01, w - 0.07, 0.92, z + side * 0.004, handleMat, 12); // key
  }
  // hinges
  if (!opts.noHinges) for (const y of [0.25, h / 2, h - 0.25]) F.cyl(0.008, 0.008, 0.1, 0.0, y, 0, handleMat, 10);
}

function buildDoors(root) {
  const doors = [];
  for (const o of OPENINGS) {
    const { P, nrm, th } = oframe(o);
    const B = new Batch();
    if (o.kind === 'door' || o.kind === 'hidden' || o.kind === 'entry') {
      if (o.kind !== 'hidden') {
        jambs(B, o, o.kind === 'entry' ? 'door_entry' : 'door');
        casing(B, o, 1, o.kind === 'entry' ? 'door_entry' : 'trim');
        casing(B, o, -1, o.kind === 'entry' ? 'door_entry' : 'trim');
      } else {
        jambs(B, o, 'oak_dark');
      }
      B.build(root, { name: o.id + '-frame' });
      // leaf group
      const W = (o.b - o.a - 24) * S, H = (o.top - 26) * S, T = o.kind === 'entry' ? 0.07 : 0.04;
      const leafB = new Batch();
      const mat = o.kind === 'entry' ? 'door_entry' : o.kind === 'hidden' ? 'oak_dark' : 'door';
      panelLeaf(leafB, W, H, T, mat, o.kind === 'entry' ? 'brass' : 'brass', { flush: o.kind === 'hidden', noHinges: o.kind === 'hidden' });
      if (o.kind === 'entry') { const F = new Frame(leafB); F.cylZ(0.008, T + 0.01, W / 2, 1.55, 0, 'brass', 12); }
      const pivot = new THREE.Group(); pivot.name = o.id;
      const meshes = leafB.build(pivot, { name: o.id });
      const hingeU = o.hinge === 'a' ? o.a + 12 : o.b - 12;
      const [hx, hz] = P(hingeU, 0);
      pivot.position.set(hx, 0.006, hz);
      // closed direction (from hinge toward other jamb)
      const dir = o.hinge === 'a' ? [o.axis === 'y' ? 1 : 0, o.axis === 'y' ? 0 : 1] : [o.axis === 'y' ? -1 : 0, o.axis === 'y' ? 0 : -1];
      const base = Math.atan2(-dir[1], dir[0]);
      // pick rotation sign that swings toward desired side
      const want = [nrm[0] * o.swing, nrm[1] * o.swing];
      const test = (s) => { const a = base + s * Math.PI / 2; return Math.cos(a) * want[0] + (-Math.sin(a)) * want[1]; };
      const sign = test(1) > test(-1) ? 1 : -1;
      const door = { id: o.id, o, pivot, meshes, base, sign, open: o.open, target: o.open, max: Math.PI / 2 * 0.98, interactive: true, W, hinge: [hx, hz] };
      pivot.rotation.y = base + sign * door.open * door.max;
      for (const m of meshes) m.userData.door = door;
      root.add(pivot); doors.push(door);
    } else if (o.kind === 'shower') {
      doors.push(...showerDoors(root, o));
    } else if (o.kind === 'arch') {
      archOpening(root, o, 500);
    } else if (o.kind === 'portal') {
      archOpening(root, o, 680, true);
    }
    void th;
  }
  return doors;
}

// Arched opening lintel (wall above arch with semicircular cut) + optional black metal portal.
function archOpening(root, o, R, portal = false) {
  const B = new Batch();
  const W = (o.b - o.a) * S, top = o.top * S;
  const spring = top - Math.min(R * S, W / 2);
  const r = Math.min(R * S, W / 2);
  const { P, th } = oframe(o);
  // shape in (u, v) local: u from 0..W, v height. Solid = rect [0,W]x[spring, WALL_TOP] minus arch (ellipse)
  const sh = new THREE.Shape();
  sh.moveTo(0, WALL_TOP); sh.lineTo(0, spring);
  // arch from left springing to right springing over the top (elliptic if r < W/2)
  const rx = W / 2, ry = top - spring;
  sh.absellipse(W / 2, spring, rx, ry, Math.PI, 0, true);
  sh.lineTo(W, WALL_TOP); sh.lineTo(0, WALL_TOP);
  const g = new THREE.ExtrudeGeometry(sh, { depth: th * S, bevelEnabled: false, curveSegments: 48 });
  // local: x=u, y=v, z=thickness(0..th). Map to world.
  const [ox, oz] = P(o.a, -th / 2);
  let M;
  if (o.axis === 'y') M = new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)).setPosition(ox, 0, oz);
  else M = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0)).setPosition(ox, 0, oz);
  g.applyMatrix4(M);
  // split triangles by facing for room materials
  const gi = g.toNonIndexed(); gi.computeVertexNormals();
  const pos = gi.attributes.position, nor = gi.attributes.normal;
  const buckets = {};
  for (let i = 0; i < pos.count; i += 3) {
    const nx = nor.getX(i), nz = nor.getZ(i);
    const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3, cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    let key = 'plaster';
    if (Math.abs(nx) > 0.9 || Math.abs(nz) > 0.9) {
      const r = roomAt((cx + nx * 0.05) * 1000, (cz + nz * 0.05) * 1000);
      if (r) key = r.wall;
    }
    (buckets[key] ||= []).push(i);
  }
  for (const key in buckets) {
    const arr = [];
    for (const i of buckets[key]) for (let k = 0; k < 3; k++) arr.push(pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k));
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); gg.computeVertexNormals(); planarUV(gg);
    B.add(gg, key);
  }
  // casing-like trim around arch on both faces
  const F = new Frame(B);
  if (!portal) {
    // Sheets 31/32: solid oak casing 132 mm wide on both faces + oak lining on the reveal (no plaster edge).
    const cw = 0.132, lin = 0.012, ct = 0.02, seg = 48;
    const arc = (ox, oy, inset, reverse) => {
      const pts = []; for (let k = 0; k <= seg; k++) { const a = Math.PI - (k / seg) * Math.PI; pts.push([W / 2 + Math.cos(a) * (rx + ox), spring + Math.sin(a) * (ry + oy)]); }
      return reverse ? pts.reverse() : pts;
    };
    // U-shaped band between an outer outline (offset `out`) and an inner one (offset `inn`), both following the opening
    const band = (out, inn) => {
      const sh = new THREE.Shape();
      sh.moveTo(-out, 0); sh.lineTo(-out, spring);
      for (const [u, v] of arc(out, out)) sh.lineTo(u, v);
      sh.lineTo(W + out, 0); sh.lineTo(W - inn, 0); sh.lineTo(W - inn, spring);
      for (const [u, v] of arc(-inn, -inn, 0, true)) sh.lineTo(u, v);
      sh.lineTo(inn, spring); sh.lineTo(inn, 0); sh.lineTo(-out, 0);
      return sh;
    };
    // local frame: x = along span from o.a, y = up, z = across the wall; proper rotation (no mirroring)
    const place = (sh, z0, depth) => {
      const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 4 });
      g.translate(0, 0, z0); planarUV(g);
      let M;
      if (o.axis === 'y') { const [x0, z00] = P(o.a, -th / 2); M = new THREE.Matrix4().makeTranslation(x0, 0, z00); }
      else { const [x0, z00] = P(o.a, th / 2); M = new THREE.Matrix4().makeRotationY(-Math.PI / 2).setPosition(x0, 0, z00); }
      g.applyMatrix4(M); B.add(g, 'arch_oak');
    };
    const T = th * S;
    place(band(cw, 0), -ct, ct);                 // casing, first face
    place(band(cw, 0), T, ct);                   // casing, second face
    place(band(0, lin), -0.002, T + 0.004);      // reveal lining
  }
  else {
    // black metal portal following arch, inner sidelight bars, ornament
    const steel = 'black';
    const inset = 0.03, bw = 0.045;
    const pts = [];
    const R2x = rx - inset, R2y = ry - inset;
    for (let k = 0; k <= 40; k++) { const a = Math.PI - (k / 40) * Math.PI; pts.push([W / 2 + Math.cos(a) * R2x, spring + Math.sin(a) * R2y]); }
    const toW = (u, v, d = 0) => { const [x, z] = P(o.a + u * 1000, d); return [x, v, z]; };
    const tubeAlong = (list, r) => F.tube(list, r, steel, list.length * 3, false, 6);
    // outer frame: posts + arch (square-ish profile approximated by tube)
    for (const d of [-20, 20]) {
      tubeAlong([toW(inset, 0, d), toW(inset, spring, d)], 0.022);
      tubeAlong([toW(W - inset, 0, d), toW(W - inset, spring, d)], 0.022);
      tubeAlong(pts.map(([u, v]) => toW(u, v, d)), 0.022);
    }
    // inner arch line & sidelight bars
    const ip = []; for (let k = 0; k <= 40; k++) { const a = Math.PI - (k / 40) * Math.PI; ip.push([W / 2 + Math.cos(a) * (R2x - 0.16), spring + Math.sin(a) * (R2y - 0.16)]); }
    tubeAlong(ip.map(([u, v]) => toW(u, v, 0)), 0.012);
    tubeAlong([toW(0.17, 0, 0), toW(0.17, spring, 0)], 0.014);
    tubeAlong([toW(W - 0.17, 0, 0), toW(W - 0.17, spring, 0)], 0.014);
    tubeAlong([toW(0.03, spring, 0), toW(W - 0.03, spring, 0)], 0.012);
    // ornament: circle + two C scrolls at the crown
    const crown = spring + R2y - 0.16;
    const ring = []; for (let k = 0; k <= 36; k++) { const a = (k / 36) * Math.PI * 2; ring.push(toW(W / 2 + Math.cos(a) * 0.09, crown - 0.13 + Math.sin(a) * 0.09, 0)); }
    tubeAlong(ring, 0.011);
    for (const s of [-1, 1]) {
      const sc = []; for (let k = 0; k <= 30; k++) { const a = (k / 30) * Math.PI * 1.5; const rr = 0.07 + k * 0.004; sc.push(toW(W / 2 + s * (0.19 + Math.cos(a) * rr * 0.6), crown - 0.2 + Math.sin(a) * rr * 0.6, 0)); }
      tubeAlong(sc, 0.009);
    }
    // glazing in side lights
    for (const u of [0.1, W - 0.1]) {
      const [x, z] = P(o.a + u * 1000, 0);
      F.box(o.axis === 'y' ? 0.1 : 0.006, spring - 0.02, o.axis === 'y' ? 0.006 : 0.1, x, 0.01, z, 'glass');
    }
  }
  B.build(root, { name: o.id });
}

// Double arched shower doors with bronze frame & fluted glass (each leaf its own pivot)
function showerDoors(root, o) {
  const { P, nrm } = oframe(o);
  const out = [];
  const W = (o.b - o.a) * S, H = o.top * S, half = W / 2;
  const r = half; const spring = H - r;
  for (const leaf of [0, 1]) {
    const B = new Batch(); const F = new Frame(B);
    const lw = half - 0.004;
    // local: hinge at x=0, leaf extends +x; for leaf 1 mirrored by rotation later
    const bw = 0.03;
    const outline = [];
    // arch quarter for this leaf: the leaf covers u in [0, half] where u=0 is hinge (outer jamb)
    for (let k = 0; k <= 20; k++) { const a = Math.PI - (k / 20) * (Math.PI / 2); outline.push([half + Math.cos(a) * (r - 0.005), spring + Math.sin(a) * (r - 0.005)]); }
    F.box(bw, spring, 0.03, bw / 2, 0, 0, 'bronze');
    F.box(bw, H - 0.02, 0.03, lw - bw / 2, 0, 0, 'bronze');
    F.box(lw, bw, 0.03, lw / 2, 0, 0, 'bronze');
    F.box(lw, 0.025, 0.03, lw / 2, 0.75, 0, 'bronze');
    F.box(lw, 0.025, 0.03, lw / 2, 1.85, 0, 'bronze');
    F.tube(outline.map(([u, v]) => [u, v, 0]), 0.016, 'bronze', 40, false, 6);
    // glass: rectangle part + arch fill (approx via shape)
    const sh = new THREE.Shape(); sh.moveTo(0.01, 0.02); sh.lineTo(lw - 0.01, 0.02); sh.lineTo(lw - 0.01, H - 0.02);
    for (let k = 20; k >= 0; k--) { const a = Math.PI - (k / 20) * (Math.PI / 2); sh.lineTo(half + Math.cos(a) * (r - 0.02), spring + Math.sin(a) * (r - 0.02)); }
    sh.lineTo(0.01, 0.02);
    const g = new THREE.ShapeGeometry(sh, 16); g.computeVertexNormals(); planarUV(g);
    B.add(g, 'glass_fluted', mat4(0, 0, 0.002));
    // pull handle
    F.box(0.018, 0.5, 0.02, lw - 0.06, 0.8, 0.04, 'bronze'); F.box(0.018, 0.5, 0.02, lw - 0.06, 0.8, -0.04, 'bronze');
    F.box(0.012, 0.012, 0.09, lw - 0.06, 0.82, 0, 'bronze'); F.box(0.012, 0.012, 0.09, lw - 0.06, 1.28, 0, 'bronze');
    const pivot = new THREE.Group(); pivot.name = o.id + leaf;
    const meshes = B.build(pivot, { name: o.id + leaf });
    const hingeU = leaf === 0 ? o.a + 3 : o.b - 3;
    const [hx, hz] = P(hingeU, 0);
    pivot.position.set(hx, 0, hz);
    const dir = leaf === 0 ? [1, 0] : [-1, 0];
    const base = Math.atan2(-dir[1], dir[0]);
    const want = [nrm[0] * o.swing, nrm[1] * o.swing];
    const test = (s) => { const a = base + s * Math.PI / 2; return Math.cos(a) * want[0] + (-Math.sin(a)) * want[1]; };
    const sign = test(1) > test(-1) ? 1 : -1;
    const door = { id: o.id + leaf, o, pivot, meshes, base, sign, open: 0, target: 0, max: Math.PI / 2 * 0.95, interactive: true, W: lw, hinge: [hx, hz], group: o.id };
    pivot.rotation.y = base;
    for (const m of meshes) m.userData.door = door;
    root.add(pivot); out.push(door);
  }
  // transom wall above already handled by lintel prism (top 2650). Add bronze frame on jambs
  const B = new Batch(); const F = new Frame(B);
  const [x0, z0] = P(o.a - 5, 0), [x1, z1] = P(o.b + 5, 0), [xm, zm] = P((o.a + o.b) / 2, 0);
  F.box(0.03, H, 0.06, x0, 0, z0, 'bronze'); F.box(0.03, H, 0.06, x1, 0, z1, 'bronze'); F.box(W + 0.04, 0.03, 0.06, xm, H - 0.03, zm, 'bronze');
  B.build(root, { name: 'shower-frame' });
  return out;
}

// ---------------- Collision segments (2D, meters) ----------------
export function collisionSegments() {
  const segs = [];
  for (const p of PRISMS) {
    if (p.z0 > 900) continue; // lintels don't block
    const poly = p.poly;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      segs.push([a[0] * S, a[1] * S, b[0] * S, b[1] * S]);
    }
  }
  // entrance door always closed; window line blocks
  return segs;
}
