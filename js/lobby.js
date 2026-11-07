// Shared lift hall between the two flats, in the West Garden brand language:
// calacatta floor with a deep-green border, warm plaster, walnut fluted portals at the flat doors,
// a deep-green lacquer lift core with bronze doors, the WG mark, brass door numbers.
// World metres: x east, z south. The 94 m² flat sits at the origin, West Garden is offset east.
import * as THREE from 'three';
import { Batch, Frame, flatPoly } from '../apts/wg/geom.js';
import { MAT } from '../apts/wg/materials.js';

export const HALL = { x0: 6.6, x1: 18.605, z0: 9.72, z1: 12.0, H: 3.0 };
const T = 0.25; // wall thickness

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

// doors of the flats on the hall's north wall (world metres) — portals are drawn around them
const DOORS = [
  { x0: 8.23, x1: 9.33, top: 2.1, num: '104', apt: 'k94' },
  { x0: 15.135, x1: 16.215, top: 2.3, num: '103', apt: 'wg' },
];

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
  const M = {
    floor: Object.assign(MAT.stone_light.clone(), { name: 'lobby_floor' }),
    border: std('lobby_border', { color: '#1f3326', roughness: 0.22, metalness: 0.05 }),
    plaster: std('lobby_plaster', { color: '#e8e2d7', roughness: 0.9 }),
    green: std('lobby_green', { color: '#1e3a28', roughness: 0.32, metalness: 0.05 }),
    sage: std('lobby_sage', { color: '#93ad8d', roughness: 0.5 }),
    fluted: Object.assign(MAT.wood_fluted.clone(), { name: 'lobby_fluted' }),
    walnut: Object.assign(MAT.wood_dark.clone(), { name: 'lobby_walnut' }),
    bronze: std('lobby_bronze', { color: '#8a6a45', roughness: 0.32, metalness: 1 }),
    brass: std('lobby_brass', { color: '#c8a064', roughness: 0.28, metalness: 1 }),
    steel: std('lobby_steel', { color: '#5b5e60', roughness: 0.45, metalness: 0.6 }),
    ceiling: std('lobby_ceiling', { color: '#f2f0eb', roughness: 0.95 }),
    led: Object.assign(new THREE.MeshBasicMaterial({ color: '#ffe2b8' }), { name: 'lobby_led' }),
    glow: Object.assign(new THREE.MeshBasicMaterial({ color: '#fff0d6' }), { name: 'lobby_glow' }),
    plant: Object.assign(MAT.plant.clone(), { name: 'lobby_plant' }),
    pot: std('lobby_pot', { color: '#cfc6b8', roughness: 0.85 }),
    soil: std('lobby_soil', { color: '#3b2f25', roughness: 1 }),
    cushion: std('lobby_cushion', { color: '#93ad8d', roughness: 0.95 }),
  };
  const B = new Batch(), F = new Frame(B);
  const BC = new Batch(), FC = new Frame(BC);

  // floor: calacatta field + deep green border band
  const bw = 0.22;
  B.add(flatPoly([[x0 + bw, z0 + bw], [x1 - bw, z0 + bw], [x1 - bw, z1 - bw], [x0 + bw, z1 - bw]], 0, true), M.floor);
  for (const r of [[x0, z0, x1, z0 + bw], [x0, z1 - bw, x1, z1], [x0, z0 + bw, x0 + bw, z1 - bw], [x1 - bw, z0 + bw, x1, z1 - bw]]) B.add(flatPoly([[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]], 0, true), M.border);
  // thresholds into the flats
  for (const d of DOORS) B.add(flatPoly([[d.x0, z0 - 0.02], [d.x1, z0 - 0.02], [d.x1, z0 + 0.001], [d.x0, z0 + 0.001]], 0.001, true), M.border);

  // ---- wall faces (inner faces of the hall; the flats' facades are lined on the north side)
  const wallFace = (ax, az, bx, bz, mat, y0 = 0, y1 = H) => { // face looks to the left of a->b
    const L = Math.hypot(bx - ax, bz - az), cx = (ax + bx) / 2, cz = (az + bz) / 2, ry = Math.atan2(-(bz - az), bx - ax);
    F.sub(cx, 0, cz, ry).plane(L, y1 - y0, 0, (y0 + y1) / 2, 0, mat);
  };
  // north wall lining (z0), interrupted by the two flat doors
  const nz = z0 + 0.012;
  const cuts = [x0, ...DOORS.flatMap((d) => [d.x0 - 0.17, d.x1 + 0.17]), x1];
  for (let i = 0; i < cuts.length; i += 2) F.box(cuts[i + 1] - cuts[i], H, 0.012, (cuts[i] + cuts[i + 1]) / 2, 0, z0 + 0.006, M.plaster);
  for (const d of DOORS) { // over the door: plaster from the portal head to the ceiling
    F.box(d.x1 - d.x0 + 0.34, H - d.top - 0.16, 0.012, (d.x0 + d.x1) / 2, d.top + 0.16, z0 + 0.006, M.plaster);
  }
  wallFace(x1, z1, x0, z1, M.plaster);          // south
  wallFace(x0, z1, x0, z0, M.plaster);          // west
  wallFace(x1, z0, x1, z1, M.plaster);          // east
  // skirting (walnut, 80 mm) all round, broken at the doors
  for (let i = 0; i < cuts.length; i += 2) F.box(cuts[i + 1] - cuts[i], 0.08, 0.014, (cuts[i] + cuts[i + 1]) / 2, 0, nz + 0.007, M.walnut);
  F.box(x1 - x0, 0.08, 0.014, (x0 + x1) / 2, 0, z1 - 0.007, M.walnut);
  F.box(0.014, 0.08, z1 - z0, x0 + 0.007, 0, (z0 + z1) / 2, M.walnut);
  F.box(0.014, 0.08, z1 - z0, x1 - 0.007, 0, (z0 + z1) / 2, M.walnut);

  // ---- flat entrances: walnut fluted portal, brass number plate, a pair of glass sconces
  for (const d of DOORS) {
    const cx = (d.x0 + d.x1) / 2, w = d.x1 - d.x0, P = F.sub(cx, 0, nz, 0);
    P.box(0.17, d.top + 0.16, 0.05, -w / 2 - 0.085, 0, 0.025, M.fluted); P.box(0.17, d.top + 0.16, 0.05, w / 2 + 0.085, 0, 0.025, M.fluted);
    P.box(w + 0.34, 0.16, 0.05, 0, d.top, 0.025, M.fluted);
    P.box(w + 0.36, 0.012, 0.056, 0, d.top + 0.16, 0.028, M.bronze); // bronze reveal on the head
    const tex = canvasTex(512, 256, (g, W, Hh) => {
      g.fillStyle = '#1e3a28'; g.fillRect(0, 0, W, Hh);
      g.strokeStyle = '#c8a064'; g.lineWidth = 6; g.strokeRect(10, 10, W - 20, Hh - 20);
      g.fillStyle = '#d9b77a'; g.font = '600 150px Montserrat, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(d.num, W / 2, Hh / 2 + 8);
    });
    const plate = std('lobby_plate_' + d.num, { map: tex, roughness: 0.4, metalness: 0.2 });
    const px = w / 2 + 0.36;
    P.box(0.27, 0.14, 0.008, px, 1.515, 0.004, M.brass);
    P.plane(0.26, 0.13, px, 1.585, 0.0085, plate);
    for (const sx of [-1, 1]) { // slim sconces either side of the portal
      const S = P.sub(sx * (w / 2 + 0.6), 0, 0);
      S.box(0.05, 0.36, 0.02, 0, 1.62, 0.01, M.bronze);
      S.cyl(0.035, 0.035, 0.3, 0, 1.65, 0.075, M.glow, 20);
      S.box(0.02, 0.02, 0.06, 0, 1.78, 0.04, M.bronze);
    }
  }

  // ---- brand wall between the flats: deep green lacquer panel with the WG mark, bench below
  {
    const cx = 12.55, P = F.sub(cx, 0, nz, 0);
    const markTex = canvasTex(1024, 512, (g, W, Hh) => {
      g.fillStyle = '#1e3a28'; g.fillRect(0, 0, W, Hh);
      drawMark(g, W / 2 - 230, 120, 0.56, '#93ad8d');
      g.fillStyle = '#c3d3be'; g.font = '600 46px Montserrat, Arial, sans-serif'; g.textAlign = 'center';
      g.save(); g.translate(W / 2, 400); g.fillText('W E S T   G A R D E N', 0, 0); g.restore();
    });
    const panel = std('lobby_brand', { map: markTex, roughness: 0.3 });
    P.box(2.6, 1.3, 0.03, 0, 1.25, 0.015, M.green);
    P.plane(2.6, 1.3, 0, 1.9, 0.0305, panel);
    P.box(2.64, 0.012, 0.04, 0, 1.244, 0.02, M.bronze); P.box(2.64, 0.012, 0.04, 0, 2.55, 0.02, M.bronze);
    P.box(2.8, 0.01, 0.02, 0, 2.62, 0.01, M.led); // grazing light over the panel
    // bench: walnut slab on bronze legs, sage cushion
    const Bn = P.sub(0, 0, 0.3);
    Bn.box(1.9, 0.05, 0.42, 0, 0.4, 0, M.walnut);
    Bn.rbox(1.8, 0.07, 0.38, 0.03, 0, 0.45, 0, M.cushion);
    for (const sx of [-0.8, 0.8]) Bn.box(0.04, 0.4, 0.36, sx, 0, 0, M.bronze);
  }

  // ---- lift core on the south wall: deep green lacquer cladding, two bronze lift doors, call panels
  {
    const zc = z1 - 0.02, P = F.sub(12.55, 0, zc, Math.PI); // faces north
    P.box(4.6, H, 0.04, 0, 0, 0.0, M.green);
    for (const sx of [-1, 1]) { // local +z looks into the hall
      const L = P.sub(sx * 1.15, 0, 0.035);
      L.box(1.3, 2.35, 0.03, 0, 0, 0, M.bronze);        // portal frame
      L.box(1.1, 2.2, 0.02, 0, 0.02, 0.02, M.steel);    // doors
      L.box(0.006, 2.2, 0.024, 0, 0.02, 0.022, M.walnut); // centre split
      L.box(0.12, 0.022, 0.02, 0, 2.27, 0.02, M.led);   // floor indicator
    }
    { const C = P.sub(0, 0, 0.026); C.box(0.09, 0.2, 0.012, 0, 1.0, 0, M.brass); C.cylZ(0.016, 0.012, 0, 1.13, 0.008, M.glow, 18); C.cylZ(0.016, 0.012, 0, 1.06, 0.008, M.glow, 18); }
    P.box(4.6, 0.012, 0.06, 0, 2.6, 0.03, M.bronze);
  }

  // ---- stair door on the west end + sign; olive tree and a framed mirror at the east end
  {
    const P = F.sub(x0 + 0.012, 0, 10.86, Math.PI / 2); // faces east
    P.box(1.04, 2.18, 0.03, 0, 0, 0.015, M.walnut);
    P.box(0.94, 2.1, 0.02, 0, 0, 0.035, M.steel);
    P.box(0.3, 0.02, 0.03, 0.3, 1.0, 0.06, M.brass);
    const sign = canvasTex(512, 160, (g, W, Hh) => { g.fillStyle = '#1e3a28'; g.fillRect(0, 0, W, Hh); g.fillStyle = '#c3d3be'; g.font = '500 64px Roboto, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ЛЕСТНИЦА', W / 2, Hh / 2 + 4); });
    P.box(0.53, 0.17, 0.01, 0, 2.295, 0.005, M.green);
    P.plane(0.52, 0.16, 0, 2.38, 0.0105, std('lobby_sign', { map: sign, roughness: 0.4 }));
  }
  {
    const P = F.sub(x1 - 0.55, 0, 10.86, 0);
    P.lathe([[0, 0], [0.26, 0], [0.3, 0.08], [0.31, 0.52], [0.28, 0.56], [0, 0.56]], 0, 0, 0, M.pot, 40);
    P.cyl(0.27, 0.27, 0.01, 0, 0.53, 0, M.soil, 32);
    P.cyl(0.035, 0.05, 1.0, 0, 0.55, 0, M.walnut, 10);
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 140; i++) { // olive canopy: small leaf blades in a loose crown
      const a = rnd() * Math.PI * 2, r = 0.15 + rnd() * 0.42, y = 1.35 + rnd() * 0.75 - r * 0.3;
      P.sub(Math.cos(a) * r, y, Math.sin(a) * r, rnd() * 3, rnd() - 0.5, rnd() - 0.5).plane(0.09, 0.025, 0, 0, 0, M.plant);
    }
    const Mr = F.sub(x1 - 0.012, 0, 10.86, -Math.PI / 2);
    Mr.box(0.9, 1.9, 0.03, 0, 0.75, 0.015, M.bronze);
    Mr.box(0.84, 1.84, 0.01, 0, 0.78, 0.035, MAT.mirror_hall);
  }

  // ---- ceiling: flat plaster with a recessed linear light slot along the hall
  FC.add(flatPoly([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], H, false), M.ceiling);
  const zc = (z0 + z1) / 2;
  FC.box(x1 - x0 - 1.2, 0.006, 0.05, (x0 + x1) / 2, H - 0.008, zc, M.led);
  FC.box(x1 - x0 - 1.1, 0.012, 0.012, (x0 + x1) / 2, H - 0.014, zc - 0.035, M.bronze);
  FC.box(x1 - x0 - 1.1, 0.012, 0.012, (x0 + x1) / 2, H - 0.014, zc + 0.035, M.bronze);

  B.build(root, { name: 'lobby' });
  BC.build(ceil, { name: 'lobby-ceil', cast: true });

  // light: warm, always on (the hall has no windows)
  const lights = [];
  for (const x of [8.8, 12.55, 15.7]) {
    const L = new THREE.PointLight('#ffdcb2', 4.2, 7.5, 2); L.position.set(x, 2.6, zc); root.add(L); lights.push(L);
  }
  const collide = [[12.55 - 0.97, z0, 12.55 + 0.97, z0 + 0.55], [x1 - 0.9, 10.5, x1, 11.22]];
  const views = {
    hall: { p: [7.25, 11.25], look: [12.0, 1.45, 10.3] },
    k94: { p: [9.6, 11.2], look: [8.78, 1.4, 9.4] },
    wg: { p: [15.0, 11.2], look: [15.68, 1.4, 9.4] },
  };
  return { root, ceil, lights, collide, views };
}
