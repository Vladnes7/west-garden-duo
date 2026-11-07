// Room fit-out per design renders. Coordinates in meters (x east, z south), from sheet 14 (furniture plan).
import * as THREE from 'three';
import { Batch, Frame, mat4, sweep, wallFrame, PROFILES, planarUV } from './geom.js';
import * as P from './pieces.js';
import * as CW from './casework.js';

const HP = Math.PI / 2, PI = Math.PI;

export function buildRooms(scene) {
  const group = new THREE.Group(); group.name = 'furniture'; scene.add(group);
  CW.setRoot(group);
  const B = new Batch();
  const W = new Frame(B);
  living(B, W); kitchen(B, W); girls(B, W); boy(B, W); bedroom(B, W); wardrobeRoom(B, W); hall(B, W); bath(B, W); wc(B, W);
  curtains(B);
  void outside; // the merged floor uses West Garden's panorama
  B.build(group, { name: 'furn' });
  return group;
}

// ------------------------------------------------------------ LIVING
function living(B, W) {
  // rug & seating
  P.rug(W.sub(7.4, 0, 2.45), 3.0, 2.9, 'rug_living');
  P.sofaModular(W.sub(5.84, 0.012, 0.3), 'sofa', { w: 2.6, d: 0.95, chaiseW: 1.0, chaiseD: 1.6, chaiseLeft: true });
  // sofa cushions
  const S = W.sub(5.84, 0.012, 0.3);
  P.restPillow(S, 0.5, 0.45, 0.16, 1.35, 0.42, 0.33, 'pillow_stripe', 0.1, -0.35);
  P.restPillow(S, 0.5, 0.45, 0.16, 1.85, 0.42, 0.33, 'pillow_white', -0.05, -0.35);
  P.restPillow(S, 0.5, 0.45, 0.16, 2.3, 0.42, 0.33, 'pillow_stripe', -0.15, -0.35);
  P.restPillow(S, 0.5, 0.45, 0.16, 0.45, 0.42, 0.33, 'pillow_white', 0.1, -0.35);
  // coffee table cube + decor
  const ct = W.sub(7.52, 0.012, 1.945);
  P.coffeeCube(ct, 0.9, 0.38, 'coffee');
  P.vaseGinger(ct, 0.15, 0.38, -0.1, 0.9);
  P.books(ct, -0.18, 0.38, 0.15, 0.3);
  // armchairs facing the table
  P.armchair(W.sub(6.70, 0.012, 3.56, 2.67));
  P.armchair(W.sub(7.94, 0.012, 3.56, -2.89));
  P.floorLamp(W, 6.08, 3.05, 'living');
  // TV wall (west face x = 5.79): strips at z .82, 1.12, 3.14, 3.44 ; TV centred z=2.13
  for (const z of [0.82, 1.12, 3.14, 3.44]) W.box(0.008, 2.68, 0.016, 5.794, 0.1, z, 'bronze');
  W.box(0.006, 2.68, 2.02, 5.792, 0.1, 2.13, 'w_living'); // niche panel (slightly proud)
  W.rbox(0.035, 0.84, 1.46, 0.004, 5.81, 0.73, 2.13, 'appliance', 0, 2);
  W.box(0.002, 0.8, 1.42, 5.829, 0.75, 2.13, 'tv');
  // dining
  P.diningTable(W.sub(9.36, 0.012, 1.47), 1.0, 'travertine', 'wood_dark');
  for (let i = 0; i < 4; i++) {
    const a = PI / 4 + i * HP;
    const x = 9.36 + Math.cos(a) * 0.62, z = 1.47 + Math.sin(a) * 0.62;
    P.chairBoucle(W.sub(x, 0.012, z, Math.atan2(9.36 - x, 1.47 - z)));
  }
  P.vaseBranches(W, 9.36, 0.762, 1.47, 1.1);
  // chandeliers + rosettes
  P.rosette(W, 7.45, 2.2, 0.36); P.chandelierShades(W, 7.45, 2.2, 'living', { arms: 8, R: 0.5, drop: 0.95 });
  P.rosette(W, 9.36, 1.47, 0.3); P.chandelierShades(W, 9.36, 1.47, 'living', { arms: 6, R: 0.42, drop: 1.05 });
  // corridor art on wall x=9.21 (west face of wall 124), facing west
  P.frameArt(W, 0.46, 0.56, 9.21, 1.62, 4.78, -HP, 'art1');
  P.frameArt(W, 0.46, 0.56, 9.21, 1.0, 4.78, -HP, 'art2');
  P.pictureLight(W, 9.21, 2.28, 4.78, -HP);
  // corridor ceiling spots
  for (const x of [3.55, 5.0, 6.5, 8.0]) P.spot(W, x, 4.85);
  P.spot(W, 3.55, 4.1);
}

// ------------------------------------------------------------ KITCHEN
function kitchen(B, W) {
  // East run: origin at front line x=10.65, facing west; local x = world z
  const E = W.sub(10.65, 0, 0, -HP);
  const top = 0.85, base = 0.82, plinth = 0.1, up0 = 1.40, up1 = 2.80, upD = 0.35;
  const pull = (side, frame = 0.055) => ({ handle: 'black', handleSide: side, handleType: 'pull', frame });
  const fill = (kind, seed = 0) => (f, iw, ih, id) => CW.drawerFill(f, iw, ih, id, kind, seed);
  // ---- tall units (dark oak) 0.25..1.45, hollow with opening fronts
  const tall = (F, u0, u1, kind) => {
    const w = u1 - u0, c = (u0 + u1) / 2;
    const s = F.sub(c, 0, 0);
    s.box(w - 0.004, plinth, 0.019, 0, 0, -0.05, 'black');
    if (kind === 'oven') {
      CW.carcass(s.sub(0, 0, -0.01), w, up1, 0.57, 'k_tall', { bottom: false, shelves: [plinth, 0.85, 2.38] });
      // oven (turkey) and compact combi oven above (chicken): hollow, drop-down doors
      s.box(w - 0.036, 0.03, 0.54, 0, 1.46, -0.3, 'k_tall'); s.box(w - 0.036, 0.03, 0.54, 0, 1.93, -0.3, 'k_tall');
      CW.ovenUnit(s, w, 0.88, 0.58, (f, tw, hm, td) => CW.roastBird(f, tw, hm, true, td));
      CW.ovenUnit(s, w, 1.49, 0.44, (f, tw, hm, td) => CW.roastBird(f, tw, hm, false, td), { panel: 0.06 });
      CW.drawer(s.sub(0, plinth, 0), w, 0.746, 0.5, (L) => L.box(w - 0.004, 0.746, 0.019, 0, 0, 0.0095, 'k_tall'), fill('pots', 2), { boxH: 0.3 });
      CW.hinged(s.sub(0, 1.96, 0), w, 'L', (L) => L.box(w - 0.004, up1 - 1.96 - 0.004, 0.019, 0, 0, 0.0095, 'k_tall'));
      CW.kitchenRow(s, -w / 2 + 0.02, w / 2 - 0.02, 1.96, -0.3, 'packs', 3);
      CW.kitchenRow(s, -w / 2 + 0.02, w / 2 - 0.02, 2.398, -0.3, 'jars', 4);
    } else {
      const sh = [plinth, 0.5, 0.9, 1.3, 1.7, 2.1, 2.45];
      CW.carcass(s.sub(0, 0, -0.01), w, up1, 0.57, 'k_tall', { bottom: false, shelves: sh });
      CW.hinged(s.sub(0, plinth, 0), w, 'L', (L) => { L.box(w - 0.004, up1 - plinth - 0.004, 0.019, 0, 0, 0.0095, 'k_tall'); L.box(0.014, 0.7, 0.02, w / 2 - 0.05, 0.75, 0.03, 'brass'); });
      ['packs', 'jars', 'packs', 'jars', 'packs', 'jars'].forEach((k, i) => CW.kitchenRow(s, -w / 2 + 0.02, w / 2 - 0.02, sh[i] + 0.018, -0.3, k, 10 + i));
    }
  };
  tall(E, 0.25, 0.85, 'R');
  tall(E, 0.85, 1.45, 'oven');
  // ---- base run 1.45..4.07: hollow carcass with partitions, drawers and doors
  const bc = (1.45 + 4.07) / 2, bh = base - plinth;
  E.box(4.07 - 1.45, plinth, 0.55, bc, 0, -0.33, 'black');
  CW.carcass(E.sub(bc, plinth, -0.02), 4.07 - 1.45, bh, 0.56, 'k_base', { top: false, parts: [2.05 - bc, 2.75 - bc, 3.45 - bc], shelves: [[bh / 2, 2.75 - bc, 3.45 - bc]] });
  const hh = (bh - 0.01) / 3;
  ['containers', 'utensils', 'cutlery'].forEach((k, i) => CW.drawer(E.sub(1.75, plinth + i * hh, 0), 0.6, hh - 0.004, 0.5, (L) => P.shakerDoor(L, 0.6, hh - 0.004, 'k_base', pull('C')), fill(k, i)));
  CW.drawer(E.sub(2.4, plinth, 0), 0.7, bh * 0.5 - 0.004, 0.5, (L) => P.shakerDoor(L, 0.7, bh * 0.5 - 0.004, 'k_base', pull('C')), fill('pots', 5), { boxH: 0.28 });
  CW.drawer(E.sub(2.4, plinth + bh * 0.5, 0), 0.7, bh * 0.5 - 0.004, 0.5, (L) => P.shakerDoor(L, 0.7, bh * 0.5 - 0.004, 'k_base', pull('C')), fill('utensils', 7));
  for (const [c, side] of [[2.925, 'R'], [3.275, 'L']]) CW.hinged(E.sub(c, plinth, 0), 0.35, side === 'R' ? 'L' : 'R', (L) => P.shakerDoor(L, 0.35, bh - 0.004, 'k_base', pull(side)));
  CW.kitchenRow(E, 2.77, 3.43, plinth + 0.018, -0.3, 'plates', 21);
  CW.kitchenRow(E, 2.77, 3.43, plinth + bh / 2 + 0.018, -0.3, 'packs', 22);
  CW.drawer(E.sub(3.76, plinth, 0), 0.62, bh - 0.004, 0.5, (L) => P.shakerDoor(L, 0.62, bh - 0.004, 'k_base', pull('C')), fill('bins'), { boxH: 0.42, travel: 0.4 });
  // countertop east incl corner (to u=4.67)
  E.box(4.67 - 1.45, 0.03, 0.62, (1.45 + 4.67) / 2, base, -0.29, 'k_top');
  // splash
  E.box(4.67 - 1.45, up0 - top, 0.02, (1.45 + 4.67) / 2, top, -0.59, 'k_splash');
  // hob with cookware (pot, kettle, pan)
  E.box(0.6, 0.006, 0.52, 2.4, top, -0.3, 'appliance');
  for (const [dx, dz, r] of [[-0.15, -0.12, 0.09], [0.15, -0.12, 0.07], [-0.15, 0.12, 0.07], [0.15, 0.12, 0.09]]) E.cyl(r, r, 0.001, 2.4 + dx, top + 0.006, -0.3 + dz, 'steel', 32, true);
  CW.pot(E, 2.25, top + 0.007, -0.42, 0.1, 0.13);
  CW.kettle(E, 2.55, top + 0.007, -0.42);
  CW.pan(E, 2.25, top + 0.007, -0.18, 0.11, -0.7);
  // uppers 2.05..3.45 (white, two sections, shelves) with opening doors
  CW.carcass(E.sub(2.75, up0, -0.27), 1.4, up1 - up0, upD - 0.02, 'k_base', { parts: [0], shelves: [0.45, 0.9] });
  for (const [c, side] of [[2.225, 'R'], [2.575, 'L'], [2.925, 'R'], [3.275, 'L']]) CW.hinged(E.sub(c, up0, -0.6 + upD), 0.35, side === 'R' ? 'L' : 'R', (L) => P.shakerDoor(L, 0.35, up1 - up0 - 0.004, 'k_base', pull(side, 0.06)), { angle: 1.55 });
  const uz = -0.6 + upD / 2 - 0.02;
  CW.kitchenRow(E, 2.07, 2.73, up0 + 0.018, uz, 'plates', 31); CW.kitchenRow(E, 2.07, 2.73, up0 + 0.468, uz, 'plates', 32); CW.kitchenRow(E, 2.07, 2.73, up0 + 0.918, uz, 'jars', 33);
  CW.kitchenRow(E, 2.77, 3.43, up0 + 0.018, uz, 'glasses', 34); CW.kitchenRow(E, 2.77, 3.43, up0 + 0.468, uz, 'mugs', 35); CW.kitchenRow(E, 2.77, 3.43, up0 + 0.918, uz, 'packs', 36);
  // glass display units (black frame, porcelain) with opening glass doors
  const glassUnit = (F, u0, u1, back = 'k_tall') => {
    const w = u1 - u0, c = (u0 + u1) / 2, zf = -0.6 + upD;
    F.box(w, up1 - up0, 0.012, c, up0, -0.59, back);
    F.box(0.018, up1 - up0, upD, u0 + 0.009, up0, -0.6 + upD / 2, 'black'); F.box(0.018, up1 - up0, upD, u1 - 0.009, up0, -0.6 + upD / 2, 'black');
    F.box(w, 0.018, upD, c, up0, -0.6 + upD / 2, 'black'); F.box(w, 0.018, upD, c, up1 - 0.018, -0.6 + upD / 2, 'black');
    for (const y of [up0 + 0.45, up0 + 0.9]) { F.box(w - 0.04, 0.008, upD - 0.04, c, y, -0.6 + upD / 2 - 0.01, 'glass_display'); F.box(w - 0.04, 0.006, 0.012, c, y + 0.36, zf - 0.03, 'led'); }
    F.box(w - 0.04, 0.006, 0.012, c, up1 - 0.04, zf - 0.03, 'led');
    for (const [i, y] of [up0 + 0.02, up0 + 0.458, up0 + 0.908].entries()) P.porcelainSet(F.sub(c, 0, 0), w - 0.04, y, -0.45, i + u0 * 10);
    const dw = w / 2;
    CW.hinged(F.sub(u0 + dw / 2, up0, zf), dw, 'L', (L) => P.glassCabinetDoor(L, dw, up1 - up0), { angle: 1.45 });
    CW.hinged(F.sub(u1 - dw / 2, up0, zf), dw, 'R', (L) => P.glassCabinetDoor(L, dw, up1 - up0), { angle: 1.45 });
    P.light(F, c, up0 + 1.0, -0.4, 'led', 'living', 0.08);
  };
  glassUnit(E, 1.45, 2.05);
  glassUnit(E, 3.45, 4.07);
  // corner filler: closes the gap between the glass unit and the return-run uppers
  E.box(4.34 - 4.07, up1 - up0, 0.37, (4.07 + 4.34) / 2, up0, -0.415, 'k_base');
  E.box(0.003, up1 - up0 - 0.06, 0.004, 4.075, up0 + 0.03, -0.229, 'black'); // shadow gap next to glass frame
  E.box(4.07 - 1.45, 0.008, 0.02, (1.45 + 4.07) / 2, up0 - 0.012, -0.3, 'led'); // under-cabinet LED
  // ---- Return run: origin at (11.25, 4.07) facing north; local x = 11.25 - world x
  const Rr = W.sub(11.25, 0, 4.07, PI);
  // in this frame front is local +z (north) and depth -z toward wall (south)
  Rr.box(1.28 - 0.6, plinth, 0.55, (0.6 + 1.28) / 2, 0, -0.33, 'black');
  CW.carcass(Rr.sub(0.94, plinth, -0.02), 0.68, bh, 0.56, 'k_base', { top: false });
  CW.hinged(Rr.sub(0.785, plinth, 0), 0.35, 'L', (L) => P.shakerDoor(L, 0.35, bh - 0.004, 'k_base', pull('R')), { angle: 1.45 });
  CW.hinged(Rr.sub(1.12, plinth, 0), 0.32, 'R', (L) => P.shakerDoor(L, 0.32, bh - 0.004, 'k_base', pull('L')));
  // under the sink: siphon, bin, cleaning bottles
  Rr.cyl(0.02, 0.02, 0.32, 0.95, plinth + 0.4, -0.42, 'chrome', 12); Rr.cylZ(0.02, 0.2, 0.95, plinth + 0.4, -0.5, 'chrome', 12);
  Rr.rbox(0.24, 0.34, 0.3, 0.02, 0.76, plinth + 0.018, -0.3, 'bin1', 0, 2);
  CW.bottle(Rr, 1.08, plinth + 0.018, -0.2, 'mug_blue', 0.9); CW.bottle(Rr, 1.16, plinth + 0.018, -0.24, 'pack4', 0.8); CW.bottle(Rr, 1.12, plinth + 0.018, -0.36, 'carton', 1.0);
  Rr.box(1.28 - 0.6, 0.03, 0.62, (0.6 + 1.28) / 2, base, -0.29, 'k_top');
  Rr.box(1.28, up0 - top, 0.02, 0.64, top, -0.59, 'k_splash');
  // sink
  Rr.box(0.5, 0.004, 0.4, 0.95, top + 0.001, -0.3, 'steel'); Rr.box(0.46, 0.004, 0.36, 0.95, top + 0.002, -0.3, 'appliance');
  P.deckFaucet(Rr, 0.95, top, -0.55, PI, 'brass');
  // corner + sink uppers (white): blind corner up to 0.37, three opening doors
  CW.carcass(Rr.sub(0.64, up0, -0.27), 1.28, up1 - up0, upD - 0.02, 'k_base', { parts: [0.37 - 0.64], shelves: [0.45, 0.9] });
  for (const c of [0.52, 0.82, 1.12]) CW.hinged(Rr.sub(c, up0, -0.6 + upD), 0.3, 'R', (L) => P.shakerDoor(L, 0.3, up1 - up0 - 0.004, 'k_base', pull('L', 0.06)), { angle: 1.5 });
  CW.kitchenRow(Rr, 0.39, 1.26, up0 + 0.018, uz, 'mugs', 41); CW.kitchenRow(Rr, 0.39, 1.26, up0 + 0.468, uz, 'jars', 42); CW.kitchenRow(Rr, 0.39, 1.26, up0 + 0.918, uz, 'glasses', 43);
  Rr.box(1.28, 0.008, 0.02, 0.64, up0 - 0.012, -0.3, 'led');
  // fridge column (dark oak) 1.28..1.97 — runs right up to the wall (no gap): freezer below, fridge above,
  // both behind hinged oak fronts, lit white interiors with food
  const fc0 = 1.28, fc1 = 1.97, cw = fc1 - fc0, iw = cw - 0.06;
  const fc = Rr.sub((fc0 + fc1) / 2, 0, 0);
  fc.box(cw - 0.004, plinth, 0.019, 0, 0, -0.05, 'black');
  CW.carcass(fc.sub(0, 0, -0.01), cw, up1, 0.57, 'k_tall', { bottom: false, shelves: [plinth, 1.1] });
  const fy = 1.13, fh = up1 - 1.15;
  CW.carcass(fc.sub(0, fy, -0.03), iw, fh, 0.52, 'fridge_in', { shelves: [0.36, 0.7, 1.04, 1.36], shelfMat: 'glass_display' });
  fc.box(0.3, 0.008, 0.02, 0, fy + fh - 0.03, -0.12, 'led');
  // freezer compartment: frosty liner, three clear pull-out baskets with frozen food
  const zy = plinth + 0.02, zh = 1.1 - plinth - 0.03;
  CW.carcass(fc.sub(0, zy, -0.03), iw, zh, 0.52, 'freezer_in');
  fc.box(iw - 0.04, 0.012, 0.44, 0, zy + zh - 0.04, -0.3, 'frost_ice');
  fc.box(0.22, 0.008, 0.02, 0, zy + zh - 0.03, -0.1, 'led');
  for (let i = 0; i < 3; i++) {
    const by = zy + 0.03 + i * 0.3, bh2 = 0.26, bw2 = iw - 0.05, bd = 0.44;
    fc.box(bw2, bh2, 0.012, 0, by, -0.06, 'freezer_tray');                                      // front
    fc.box(bw2, 0.03, 0.014, 0, by + bh2 - 0.04, -0.045, 'gasket');                              // grip
    for (const sx of [-1, 1]) fc.box(0.008, bh2 * 0.8, bd, sx * (bw2 / 2 - 0.004), by, -0.06 - bd / 2, 'freezer_tray');
    fc.box(bw2, 0.008, bd, 0, by, -0.06 - bd / 2, 'freezer_tray'); fc.box(bw2, bh2 * 0.8, 0.008, 0, by, -0.06 - bd, 'freezer_tray');
    CW.drawerFill(fc.sub(0, by + 0.01, -0.06 - bd / 2), bw2 - 0.03, bh2 - 0.06, bd - 0.04, 'frozen', 3 + i);
  }
  CW.hinged(fc.sub(0, plinth, 0), cw - 0.004, 'R', (L) => { L.box(cw - 0.004, 1.12 - plinth - 0.006, 0.019, 0, 0, 0.0095, 'k_tall'); L.box(0.014, 0.5, 0.02, -cw / 2 + 0.05, 0.4, 0.03, 'brass'); }, {
    back: (L) => {
      L.box(iw - 0.02, 1.12 - plinth - 0.1, 0.012, 0, 0.045, -0.006, 'freezer_in');
      for (const sx of [-1, 1]) L.box(0.022, 1.12 - plinth - 0.08, 0.02, sx * (iw / 2 - 0.0), 0.035, -0.01, 'gasket');
      for (const y of [0.035, 1.12 - plinth - 0.067]) L.box(iw + 0.022, 0.022, 0.02, 0, y, -0.01, 'gasket');
      for (const y of [0.25, 0.6]) { L.box(iw - 0.08, 0.05, 0.01, 0, y, -0.08, 'freezer_tray'); L.box(iw - 0.08, 0.006, 0.07, 0, y, -0.047, 'freezer_in'); for (let k = 0; k < 4; k++) L.rbox(0.1, 0.055 + (k % 2) * 0.02, 0.05, 0.01, -iw / 2 + 0.11 + k * 0.13, y + 0.006, -0.048, ['frost1', 'pack4', 'frost2', 'carton'][k], 0, 2); }
    },
  });
  CW.hinged(fc.sub(0, 1.12, 0), cw - 0.004, 'R', (L) => { L.box(cw - 0.004, up1 - 1.12 - 0.004, 0.019, 0, 0, 0.0095, 'k_tall'); L.box(0.014, 0.7, 0.02, -cw / 2 + 0.05, 0.08, 0.03, 'brass'); }, {
    back: (L) => {
      L.box(iw - 0.02, up1 - 1.2, 0.012, 0, 0.04, -0.006, 'fridge_in');
      for (const [i, y] of [0.12, 0.5, 0.88, 1.24].entries()) {
        L.box(iw - 0.06, 0.07, 0.012, 0, y, -0.1, 'glass_cup'); L.box(iw - 0.06, 0.008, 0.09, 0, y, -0.057, 'fridge_in');
        if (i === 0) { CW.bottle(L, -0.16, y + 0.008, -0.056, 'bottle_green', 0.85); CW.bottle(L, -0.08, y + 0.008, -0.056, 'bottle_amber', 0.8); CW.carton(L, 0.04, y + 0.008, -0.056, 'carton', 0.2); CW.carton(L, 0.13, y + 0.008, -0.056, 'pack3', 0.2); }
        else if (i === 1) { for (let k = 0; k < 6; k++) CW.bottle(L, -0.2 + k * 0.075, y + 0.008, -0.056, ['food_red', 'bottle_oil', 'food_yellow', 'ceramic', 'food_green', 'pack2'][k], 0.5); }
        else if (i === 2) { for (let k = 0; k < 10; k++) L.sphere(0.02, -0.2 + k * 0.045, y + 0.03, -0.056, 'carton', 10, 1.3); }
        else { L.box(0.12, 0.05, 0.07, -0.12, y + 0.008, -0.056, 'food_yellow'); L.box(0.12, 0.05, 0.07, 0.06, y + 0.008, -0.056, 'carton'); }
      }
    },
  });
  // fridge contents
  const fz = -0.29, fl = (k) => fy + 0.018 + [0, 0.36, 0.7, 1.04, 1.36][k];
  fc.rbox(0.5, 0.17, 0.42, 0.01, 0, fl(0), fz, 'glass_cup', 0, 2);
  for (let k = 0; k < 8; k++) CW.fruit(fc, -0.18 + (k % 4) * 0.12, fl(0) + 0.01, fz - 0.1 + Math.floor(k / 4) * 0.18, 0.035 + (k % 3) * 0.006, ['food_red', 'food_green', 'food_orange', 'food_yellow'][k % 4]);
  CW.carton(fc, -0.19, fl(1), fz, 'carton', 0.22); CW.carton(fc, -0.1, fl(1), fz, 'carton', 0.22);
  fc.box(0.2, 0.06, 0.12, 0.1, fl(1), fz + 0.06, 'carton'); for (let k = 0; k < 6; k++) fc.sphere(0.022, 0.035 + (k % 3) * 0.06, fl(1) + 0.07, fz + 0.03 + Math.floor(k / 3) * 0.06, 'carton', 10, 1.3);
  fc.rbox(0.16, 0.08, 0.16, 0.02, 0.15, fl(1), fz - 0.12, 'mug_blue', 0, 2);
  CW.jar(fc, -0.17, fl(2), fz, 0.045, 0.14, 'food_red'); CW.jar(fc, -0.06, fl(2), fz + 0.03, 0.04, 0.12, 'food_yellow');
  fc.box(0.16, 0.08, 0.1, 0.12, fl(2), fz, 'food_yellow'); fc.rbox(0.18, 0.07, 0.14, 0.02, 0.1, fl(2), fz - 0.14, 'jar_glass', 0, 2); fc.box(0.16, 0.05, 0.12, 0.1, fl(2) + 0.004, fz - 0.14, 'food_green');
  for (let k = 0; k < 4; k++) CW.bottle(fc, -0.18 + k * 0.1, fl(3), fz + 0.05, ['bottle_green', 'bottle_amber', 'carton', 'pack4'][k], 0.85);
  fc.rbox(0.22, 0.1, 0.18, 0.02, 0, fl(4), fz, 'pack2', 0, 2);
  // decor on counter
  P.vaseGinger(E, 1.75, top, -0.45, 0.55);
  E.cyl(0.07, 0.07, 0.25, 3.1, top, -0.48, 'oak_light', 20); // utensil crock
  for (let k = 0; k < 4; k++) E.cyl(0.006, 0.01, 0.2, 3.1 + Math.cos(k * 1.6) * 0.03, top + 0.2, -0.48 + Math.sin(k * 1.6) * 0.03, k % 2 ? 'oak_dark' : 'black', 6);
  // colliders for counters
  P.COLLIDE.push([10.64, 0.25, 11.25, 4.07], [9.35, 4.06, 11.25, 4.67]);
}

// ------------------------------------------------------------ GIRLS
function girls(B, W) {
  // wallpaper panels on east wall (x=2.94) with mouldings
  const panels = [[0.35, 1.15], [1.25, 2.75], [2.85, 3.65]];
  for (const [z0, z1] of panels) {
    W.box(0.003, 2.6 - 0.32, z1 - z0, 2.9385, 0.32, (z0 + z1) / 2, 'wallpaper_girls');
    wallFrame(B, 'trim', 2.94, 0, 0, 1, -1, 0, z0 - 0.04, z1 + 0.04, 0.28, 2.64);
  }
  frieze(B, [[2.94, 3.93], [2.94, 0.17]], 2.62);
  // bed (headboard east), facing west
  const bd = W.sub(1.86, 0.012, 2.0, -HP);
  bedClassic(bd, 1.6, 2.0, 'bed_girls', 'scallop');
  // vanity with gilt mirror (north of bed)
  const v = W.sub(2.71, 0.012, 0.63, -HP);
  v.box(0.9, 0.04, 0.42, 0, 0.72, 0, 'wood_dark');
  CW.carcass(v.sub(0, 0.6, 0.18), 0.86, 0.12, 0.38, 'wood_dark', { top: false });
  CW.drawer(v.sub(0, 0.6, 0.18), 0.82, 0.115, 0.34, (L) => { L.box(0.82, 0.115, 0.02, 0, 0.002, 0.01, 'wood_dark'); L.box(0.2, 0.02, 0.01, 0, 0.06, 0.025, 'gilt'); }, (f, iw, ih, id) => CW.drawerFill(f, iw, ih, id, 'makeup', 1), { boxH: 0.07 });
  for (const sx of [-0.41, 0.41]) for (const sz of [-0.17, 0.17]) v.cyl(0.015, 0.012, 0.6, sx, 0, sz, 'wood_dark', 10);
  // gilt mirror on wall
  const mi = W.sub(2.935, 1.1, 0.63, -HP);
  mi.rbox(0.62, 0.9, 0.03, 0.08, 0, 0, 0.018, 'gilt', 0, 3); mi.rbox(0.52, 0.8, 0.01, 0.06, 0, 0.05, 0.036, 'mirror', 0, 3);
  mi.sphere(0.05, 0, 0.93, 0.02, 'gilt', 12);
  // stool
  W.cyl(0.2, 0.2, 0.08, 2.2, 0.38, 0.63, 'armchair_girls', 28); W.cyl(0.18, 0.18, 0.38, 2.2, 0.012, 0.63, 'linen_white', 28);
  // nightstand + lamp (south of bed)
  const ns = W.sub(2.71, 0.012, 3.2, -HP);
  const nf = ns.sub(0, 0.12, 0.2); // front plane of the cabinet body
  CW.carcass(nf, 0.56, 0.55, 0.4, 'wood_dark', { shelves: [0.385] });
  for (const sx of [-0.25, 0.25]) for (const sz of [-0.16, 0.16]) ns.cyl(0.014, 0.01, 0.12, sx, 0, sz, 'wood_dark', 8);
  CW.drawer(nf.sub(0, 0.403, 0), 0.524, 0.128, 0.34, (L) => { L.box(0.524, 0.126, 0.02, 0, 0.001, 0.01, 'wood_dark'); L.sphere(0.013, 0, 0.064, 0.028, 'gilt', 10); }, (f, iw, ih, id) => CW.drawerFill(f, iw, ih, id, 'makeup', 2), { boxH: 0.08 });
  CW.hinged(nf.sub(0, 0.004, 0), 0.524, 'R', (L) => { // hinged away from the bed
    L.box(0.524, 0.378, 0.02, 0, 0, 0.01, 'wood_dark');
    L.box(0.46, 0.012, 0.006, 0, 0.36, 0.022, 'wood_dark'); L.box(0.46, 0.012, 0.006, 0, 0.018, 0.022, 'wood_dark');
    L.sphere(0.012, 0, 0.215, 0.026, 'gilt', 10); L.torus(0.026, 0.0045, 0, 0.19, 0.03, 'gilt', 0);
  });
  P.books(nf, -0.08, 0.02, -0.2, 0.15); CW.storeBox(nf, 0.06, 0.02, -0.2, 0.18, 0.12, 0.26, 'box_linen');
  P.tableLamp(W, 2.72, 0.682, 3.2, 'girls', 'porcelain');
  P.COLLIDE.push([2.5, 2.92, 2.94, 3.48]);
  // armchair by the window
  const ac = W.sub(0.76, 0.012, 3.86, HP);
  armchairClassic(ac, 'armchair_girls');
  P.restPillow(ac, 0.42, 0.36, 0.14, 0.05, 0.54, -0.17, 'pillow_navy', 0.1, -0.25);
  // rug
  P.rug(W.sub(1.6, 0, 2.0), 2.4, 2.6, 'rug_girls');
  // wardrobe along south wall, 5 modules, arched panel doors, facing north
  const wd = W.sub(1.565, 0.012, 4.9, PI);
  CW.wardrobe(wd, 2.71, 2.79, 0.6, 5, 'wardrobe_white', 'arch', 'brass', { palette: ['clothes5', 'clothes6', 'clothes7', 'clothes1', 'pillow_navy'], sections: ['hang', 'shelves', 'hang'], seed: 3 });
  // chandelier
  P.rosette(W, 1.47, 2.2, 0.34); P.crystalChandelier(W, 1.47, 2.2, 'girls');
  radiator(W, 'W', 2.52, 4.77); radiator(W, 'N', 0.15, 1.45);
}

function bedClassic(F, w, l, mat, style) {
  // F: origin centre of bed footprint, +z = foot
  const hb = F.sub(0, 0, -l / 2 - 0.03);
  if (style === 'scallop') {
    const sh = new THREE.Shape();
    sh.moveTo(-w / 2 - 0.08, 0.3); sh.lineTo(-w / 2 - 0.08, 1.05);
    sh.bezierCurveTo(-w / 4, 1.12, -0.2, 1.05, 0, 1.3); sh.bezierCurveTo(0.2, 1.05, w / 4, 1.12, w / 2 + 0.08, 1.05);
    sh.lineTo(w / 2 + 0.08, 0.3); sh.lineTo(-w / 2 - 0.08, 0.3);
    hb.extrude(sh, 0.08, mat, mat4(0, 0, -0.04), 0.02);
    // wooden frame trim
    hb.tube([[-w / 2 - 0.1, 1.06, 0.05], [-w / 4, 1.14, 0.05], [0, 1.33, 0.05], [w / 4, 1.14, 0.05], [w / 2 + 0.1, 1.06, 0.05]], 0.012, 'wood_dark', 30, false, 6);
    for (const s of [-1, 1]) hb.box(0.06, 1.08, 0.08, s * (w / 2 + 0.1), 0, 0.0, 'wood_dark');
  }
  // base
  F.rbox(w + 0.08, 0.3, l, 0.03, 0, 0.06, 0, mat, 0, 3);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) F.cyl(0.02, 0.016, 0.07, sx * (w / 2 - 0.02), 0, sz * (l / 2 - 0.04), 'wood_dark', 8);
  // mattress + duvet
  F.rbox(w - 0.02, 0.22, l - 0.06, 0.06, 0, 0.36, 0.0, 'linen_white', 0, 4);
  F.rbox(w + 0.04, 0.09, l * 0.72, 0.045, 0, 0.55, l * 0.13, 'linen_white', 0, 4);
  F.rbox(w + 0.12, 0.35, 0.04, 0.02, 0, 0.27, l / 2 - 0.0, 'linen_white', 0, 2);
  for (const s of [-1, 1]) F.rbox(0.03, 0.3, l * 0.72, 0.015, s * (w / 2 + 0.05), 0.3, l * 0.13, 'linen_white', 0, 2);
  // pillows
  const mt = 0.58; // mattress top
  P.restPillow(F, 0.62, 0.45, 0.16, -0.36, mt, -l / 2 + 0.2, 'pillow_white', 0, -0.9);
  P.restPillow(F, 0.62, 0.45, 0.16, 0.36, mt, -l / 2 + 0.2, 'pillow_white', 0, -0.9);
  P.restPillow(F, 0.5, 0.4, 0.15, -0.25, mt, -l / 2 + 0.38, 'pillow_stripe', 0.05, -0.6);
  P.restPillow(F, 0.5, 0.4, 0.15, 0.25, mt, -l / 2 + 0.38, 'pillow_stripe', -0.05, -0.6);
  P.restPillow(F, 0.36, 0.3, 0.13, 0, mt, -l / 2 + 0.52, 'pillow_navy', 0, -0.45);
  P.collide(F, w + 0.1, l + 0.1, 0, -0.03);
}

function armchairClassic(F, mat) {
  F.rbox(0.82, 0.3, 0.78, 0.04, 0, 0.12, 0, mat, 0, 3);
  F.rbox(0.66, 0.14, 0.62, 0.06, 0, 0.4, 0.06, mat, 0, 4);
  const b = F.sub(0, 0.38, -0.32, 0, -0.1); b.rbox(0.82, 0.5, 0.16, 0.06, 0, 0, 0, mat, 0, 4);
  for (const s of [-1, 1]) F.rbox(0.12, 0.34, 0.78, 0.05, s * 0.36, 0.38, 0, mat, 0, 4);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) F.cyl(0.014, 0.018, 0.12, sx * 0.36, 0, sz * 0.33, 'wood_dark', 8);
  P.collide(F, 0.82, 0.8);
}

// ------------------------------------------------------------ BOY
function boy(B, W) {
  // arch niche frame on west wall (x=3.01) around desk: dark oak border with rounded top corners
  const z0 = 0.95, z1 = 2.75, y1 = 2.75, bw = 0.12, rr = 0.45;
  const outline = [];
  outline.push([z0, 0.1]); outline.push([z0, y1 - rr]);
  for (let k = 0; k <= 10; k++) { const a = PI - (k / 10) * HP; outline.push([z0 + rr + Math.cos(a) * rr, y1 - rr + Math.sin(a) * rr]); }
  for (let k = 0; k <= 10; k++) { const a = HP - (k / 10) * HP; outline.push([z1 - rr + Math.cos(a) * rr, y1 - rr + Math.sin(a) * rr]); }
  outline.push([z1, 0.1]);
  const sh = new THREE.Shape();
  sh.moveTo(outline[0][0] - bw, 0.1);
  for (const [u, v] of outline) sh.lineTo(u - bw * (u < (z0 + z1) / 2 ? 1 : -1) * (v < y1 - rr ? 1 : 0), v + (v >= y1 - rr ? bw * 0.0 : 0));
  // build as stick segments for clean result
  const F = W.sub(3.01, 0, 0, HP); // local x = world -z? R_y(+90°): local +X -> world -Z ; so use u = -z
  void F; void sh;
  for (let i = 0; i < outline.length - 1; i++) {
    const [u0, v0] = outline[i], [u1, v1] = outline[i + 1];
    const L = Math.hypot(u1 - u0, v1 - v0); if (L < 1e-4) continue;
    const ang = Math.atan2(v1 - v0, u1 - u0);
    const um = (u0 + u1) / 2, vm = (v0 + v1) / 2;
    // offset outward from niche centre
    const nx = Math.sin(ang), ny = -Math.cos(ang);
    const out = (nx * (um - (z0 + z1) / 2) + ny * (vm - 1.0)) > 0 ? 1 : -1;
    const cu = um + nx * out * bw / 2, cv = vm + ny * out * bw / 2;
    const g = planarUV(new THREE.BoxGeometry(L + bw * 0.6, bw, 0.03));
    B.add(g, 'oak_dark', mat4(3.025, cv, cu, -HP).multiply(new THREE.Matrix4().makeRotationZ(ang)));
  }
  // shelves + sconces inside niche
  W.box(0.22, 0.03, 1.2, 3.12, 1.55, 1.85, 'oak_dark'); W.box(0.22, 0.03, 1.2, 3.12, 1.88, 1.85, 'oak_dark');
  P.sconceGlobe(W, 3.01, 2.1, 1.2, HP, 'black', 'boy'); P.sconceGlobe(W, 3.01, 2.1, 2.5, HP, 'black', 'boy');
  P.vaseBranches(W, 3.1, 1.58, 2.25, 0.6); P.books(W, 3.12, 1.91, 1.5, 0.2);
  // desk
  const dk = W.sub(3.24, 0.012, 1.85, HP);
  dk.box(1.5, 0.035, 0.42, 0, 0.73, 0, 'oak_dark'); dk.box(1.44, 0.1, 0.38, 0, 0.63, -0.01, 'oak_dark');
  for (const sx of [-0.71, 0.71]) for (const sz of [-0.18, 0.18]) dk.box(0.035, 0.63, 0.035, sx, 0, sz, 'oak_dark');
  for (const x of [-0.35, 0.35]) dk.box(0.06, 0.01, 0.01, x, 0.67, 0.2, 'brass');
  // laptop
  dk.box(0.32, 0.012, 0.22, -0.2, 0.765, 0.03, 'steel');
  const lp = dk.sub(-0.2, 0.775, -0.08, 0, -0.25); lp.box(0.32, 0.21, 0.008, 0, 0, 0, 'steel'); lp.box(0.3, 0.19, 0.002, 0, 0.01, 0.005, 'laptop');
  P.officeChair(W.sub(3.72, 0.012, 1.8, -HP + 0.2));
  // daybed against east wall, head north
  const bd = W.sub(5.04, 0.012, 1.39);
  bd.rbox(1.2, 0.32, 2.1, 0.04, 0, 0.05, 0, 'bed_boy', 0, 3);
  bd.rbox(1.12, 0.2, 2.0, 0.06, -0.02, 0.37, 0.02, 'linen_white', 0, 4);
  bd.rbox(1.22, 0.65, 0.14, 0.06, 0, 0.3, -1.0, 'bed_boy', 0, 4); // head
  bd.rbox(0.14, 0.5, 2.1, 0.06, 0.55, 0.3, 0, 'bed_boy', 0, 4);  // side back along wall
  bd.rbox(1.08, 0.07, 1.2, 0.03, -0.03, 0.55, 0.35, 'throw_boy', 0, 4); // quilted throw
  for (let i = 0; i < 5; i++) bd.box(1.06, 0.004, 0.006, -0.03, 0.62, -0.2 + i * 0.22, 'throw_boy');
  P.restPillow(bd, 0.5, 0.4, 0.16, -0.18, 0.57, -0.84, 'throw_boy', 0, -0.4);
  P.restPillow(bd, 0.4, 0.34, 0.14, 0.18, 0.57, -0.8, 'leather', 0, -0.4);
  P.collide(bd, 1.25, 2.15);
  // wardrobe (dark oak) 4.18..5.65 at z 3.48..4.06 facing north
  const wdF = W.sub(4.915, 0.012, 3.48, PI);
  // in this frame local +x -> world -x ; open lit shelves on the west end (local +x side)
  // sheet 29 (elev. 13): two 500 columns, each split 700 / 1650 / 450, plus a 400 open lit shelf column (black frame)
  const sp = [0.7, 2.35], ht = 2.79;
  CW.carcass(wdF.sub(0, 0, -0.01), 1.47, ht, 0.56, 'oak_dark', { parts: [0.274], shelves: sp.map((y) => [y - 0.009, -0.717, 0.265]) });
  const lv = [[0, sp[0]], [sp[0], sp[1]], [sp[1], ht]];
  for (const [y0, y1] of lv) {
    const hd = y1 - y0 - 0.004, hy = y1 - y0 > 1 ? 'long' : 'pull';
    CW.hinged(wdF.sub(-0.485, y0 + 0.002, 0), 0.5, 'L', (L) => P.shakerDoor(L, 0.5, hd, 'oak_dark', { handle: y0 === sp[0] ? 'black' : null, handleSide: 'R', handleType: hy, frame: 0.07 }));
    CW.hinged(wdF.sub(0.015, y0 + 0.002, 0), 0.5, 'R', (L) => P.shakerDoor(L, 0.5, hd, 'oak_dark', { handle: y0 === sp[0] ? 'black' : null, handleSide: 'L', handleType: hy, frame: 0.07 }));
  }
  const bpal = ['clothes2', 'clothes4', 'clothes3', 'clothes1', 'throw_boy'];
  CW.fillSection(wdF, -0.715, 0.255, sp[0] + 0.009, sp[1] - 0.009, -0.29, 0.5, 'hang', bpal, 5);
  for (let i = 0; i < 3; i++) CW.folded(wdF, -0.55 + i * 0.32, 0.018, -0.29, 3 + (i % 2) * 2, bpal, 40 + i);
  for (let i = 0; i < 3; i++) CW.storeBox(wdF, -0.69 + i * 0.32, sp[1] + 0.009, -0.29, 0.28, 0.3, 0.42, i === 1 ? 'pack1' : 'box_linen');
  // open shelves between partition (0.283) and side (0.717): back panel, black frame, 5 shelves with LED
  const ox0 = 0.283, ox1 = 0.717, ow = ox1 - ox0, os = wdF.sub((ox0 + ox1) / 2, 0, 0);
  os.box(ow, ht - 0.036, 0.008, 0, 0.018, -0.558, 'w_boy');
  os.box(ow + 0.02, 0.02, 0.02, 0, 0.0, -0.01, 'black'); os.box(ow + 0.02, 0.02, 0.02, 0, ht - 0.02, -0.01, 'black');
  for (const sx of [-1, 1]) os.box(0.02, ht, 0.02, sx * (ow / 2 + 0.0), 0, -0.01, 'black');
  const shelvesY = [0.47, 0.94, 1.41, 1.88, 2.35];
  for (const y of shelvesY) { os.box(ow, 0.025, 0.54, 0, y, -0.29, 'oak_dark'); os.box(ow - 0.04, 0.006, 0.01, 0, y - 0.008, -0.06, 'led'); }
  P.books(os, -0.05, 0.495, -0.3, 0.1); P.books(os, 0.02, 1.435, -0.3, -0.2); P.vaseGinger(os, 0.05, 0.965, -0.3, 0.4);
  P.books(os, 0.0, 1.905, -0.3, 0.3); CW.storeBox(os, -0.15, 2.375, -0.3, 0.3, 0.2, 0.3, 'box_linen');
  // rug & chandelier
  P.rug(W.sub(4.2, 0, 1.75), 1.9, 2.4, 'rug_boy');
  P.linearChandelier(W, 4.3, 1.7, 'boy');
  radiator(W, 'N', 3.09, 5.39);
}

// ------------------------------------------------------------ BEDROOM
function bedroom(B, W) {
  // wall mouldings: grasscloth panels framed in white
  const panelsS = [[0.22, 0.72], [3.48, 3.94]];
  for (const [x0, x1] of panelsS) { wallFrame(B, 'trim', 0, 8.49, 1, 0, 0, -1, x0, x1, 0.25, 0.85); wallFrame(B, 'trim', 0, 8.49, 1, 0, 0, -1, x0, x1, 1.0, 2.45); }
  wallFrame(B, 'trim', 0, 8.49, 1, 0, 0, -1, 0.82, 3.38, 1.42, 2.45);
  for (const [z0, z1] of [[5.75, 6.26], [7.84, 8.35]]) { wallFrame(B, 'trim', 4.0, 0, 0, 1, -1, 0, z0, z1, 0.25, 0.85); wallFrame(B, 'trim', 4.0, 0, 0, 1, -1, 0, z0, z1, 1.0, 2.45); }
  for (const [x0, x1] of [[0.3, 0.85], [2.45, 2.95]]) { wallFrame(B, 'trim', 0, 5.6, 1, 0, 0, 1, x0, x1, 0.25, 0.85); wallFrame(B, 'trim', 0, 5.6, 1, 0, 0, 1, x0, x1, 1.0, 2.45); }
  wallFrame(B, 'trim', 0, 5.6, 1, 0, 0, 1, 0.95, 2.35, 1.0, 2.45);
  frieze(B, [[0.15, 8.49], [4.0, 8.49], [4.0, 7.73]], 2.58); frieze(B, [[4.0, 6.36], [4.0, 5.6], [0.15, 5.6]], 2.58); // broken over the arch casing
  // headboard panel 2.6 wide, channel tufted
  const hb = W.sub(2.1, 0.012, 8.47, PI);
  for (let i = 0; i < 9; i++) hb.rbox(0.285, 1.25, 0.09, 0.04, -1.3 + 0.145 + i * 0.289, 0.0, 0.045, 'headboard_bed', 0, 4);
  // bed (head south), facing north
  const bd = W.sub(2.1, 0.012, 7.36, PI);
  bedClassic(bd, 1.6, 2.0, 'linen_white', 'none');
  bd.rbox(1.7, 0.08, 0.5, 0.03, 0, 0.6, 0.55, 'cur_bed', 0, 3); // throw at foot
  // nightstands round white + sconces
  for (const x of [0.95, 3.15]) {
    W.cyl(0.225, 0.225, 0.52, x, 0.06, 8.07, 'lacquer_white', 40); W.cyl(0.235, 0.235, 0.025, x, 0.58, 8.07, 'lacquer_white', 40);
    W.cyl(0.18, 0.2, 0.06, x, 0.012, 8.07, 'lacquer_white', 32);
    W.sphere(0.012, x, 0.42, 8.07 - 0.226, 'brass', 8); W.sphere(0.012, x, 0.27, 8.07 - 0.226, 'brass', 8);
    W.box(0.3, 0.004, 0.004, x, 0.35, 8.07 - 0.222, 'brass');
    P.sconceGlobe(W, x, 1.55, 8.49, PI, 'brass', 'bed');
    P.COLLIDE.push([x - 0.23, 7.84, x + 0.23, 8.3]);
  }
  P.vaseBranches(W, 3.15, 0.605, 8.07, 0.6);
  // vanity at west wall
  const v = W.sub(0.42, 0.012, 6.33, HP);
  v.rbox(0.88, 0.05, 0.4, 0.15, 0, 0.72, 0, 'lacquer_white', 0, 4);
  for (const sx of [-0.38, 0.38]) for (const sz of [-0.14, 0.14]) v.cyl(0.014, 0.01, 0.72, sx, 0, sz, 'brass', 8);
  W.cyl(0.19, 0.19, 0.42, 0.85, 0.012, 6.33, 'armchair_girls', 28);
  // TV on north wall
  W.rbox(1.3, 0.75, 0.03, 0.004, 1.63, 1.1, 5.615, 'appliance', 0, 2); W.box(1.27, 0.72, 0.002, 1.63, 1.115, 5.631, 'tv');
  // rug, chandelier, drapery in arch
  P.rug(W.sub(2.1, 0, 7.15), 2.7, 2.5, 'rug_bed');
  P.rosette(W, 2.1, 7.05, 0.32); P.tieredChandelier(W, 2.1, 7.05, 'bed');
  // curtain on a rod above the wardrobe arch (bedroom side); click gathers it toward the south (bed) side
  CW.slidingCurtain({ x0: 3.975, z0: 8.02, x1: 3.975, z1: 6.36, nx: -1, nz: 0, y0: 0.012, y1: 2.7, mat: 'cur_bed', stack: 0.32 });
  radiator(W, 'W', 5.82, 8.08);
}

// ------------------------------------------------------------ WARDROBE ROOM
function wardrobeRoom(B, W) {
  // north unit: hanging + shelves, white with oak shelves
  const n = W.sub(4.78, 0.012, 5.6, 0);
  n.box(1.42, 0.03, 0.5, 0, 2.2, 0.25, 'lacquer_white'); n.box(1.42, 0.03, 0.5, 0, 2.5, 0.25, 'lacquer_white');
  for (const x of [-0.7, 0, 0.7]) n.box(0.025, 2.78, 0.5, x, 0, 0.25, 'lacquer_white');
  CW.hanging(n, -0.69, -0.01, 2.1, 0.25, ['clothes1', 'clothes2', 'clothes3', 'clothes4', 'clothes7'], 11, { long: 1.0, v: 0.4 });
  CW.hanging(n, 0.01, 0.69, 2.1, 0.25, ['clothes5', 'clothes6', 'clothes7', 'clothes1'], 12, { long: 1.05, v: 0.45 });
  for (let i = 0; i < 4; i++) CW.storeBox(n, -0.68 + i * 0.34, 2.23, 0.25, 0.3, 0.24, 0.42, i % 2 ? 'box_linen' : 'pack1');
  n.box(1.42, 0.5, 0.5, 0, 0.0, 0.25, 'lacquer_white');
  P.collide(n, 1.42, 0.5, 0, 0.25);
  // south unit: shelves & drawers
  const s = W.sub(4.6, 0.012, 7.99, PI);
  CW.carcass(s, 1.04, 2.78, 0.5, 'lacquer_white', { shelves: [0.93] });
  for (let i = 0; i < 4; i++) CW.drawer(s.sub(0, 0.05 + i * 0.22, 0), 1.0, 0.2, 0.44, (L) => P.shakerDoor(L, 1.0, 0.2, 'lacquer_white', { handle: 'brass', handleSide: 'C', handleType: 'pull', frame: 0.05 }), (f, iw, ih, id) => CW.drawerFill(f, iw, ih, id, ['clothes', 'towels', 'clothes', 'socks'][i], i));
  for (const y of [1.2, 1.6, 2.0, 2.4]) { s.box(1.0, 0.025, 0.46, 0, y, -0.25, 'oak_light'); s.box(0.98, 0.005, 0.01, 0, y - 0.01, -0.03, 'led'); }
  for (let i = 0; i < 3; i++) CW.folded(s, -0.33 + i * 0.33, 1.225, -0.25, 3 + i, ['clothes1', 'clothes3', 'clothes2', 'clothes7', 'clothes4'], 20 + i);
  for (let i = 0; i < 3; i++) CW.folded(s, -0.33 + i * 0.33, 1.625, -0.25, 2 + ((i + 1) % 3), ['clothes5', 'clothes6', 'clothes7', 'clothes1'], 30 + i);
  for (let i = 0; i < 4; i++) CW.shoes(s, -0.36 + i * 0.24, 2.025, -0.22, ['leather', 'black', 'shoe_light', 'black'][i]);
  for (let i = 0; i < 3; i++) CW.storeBox(s, -0.48 + i * 0.33, 2.425, -0.25, 0.3, 0.24, 0.4, 'box_linen');
  P.COLLIDE.push([4.07, 7.94, 5.13, 8.49]);
  // full-length mirror on east wall (x=5.13) + pouf
  const m = W.sub(5.13, 0.1, 7.2, -HP);
  m.rbox(0.7, 1.95, 0.03, 0.01, 0, 0, 0.015, 'brass', 0, 2); m.box(0.64, 1.89, 0.004, 0, 0.03, 0.032, 'mirror');
  W.rbox(0.42, 0.42, 0.7, 0.15, 4.6, 0.012, 7.2, 'cushion', 0, 4);
  P.spot(W, 4.6, 6.2); P.spot(W, 4.6, 7.6);
  P.light(W, 4.6, 2.6, 7.0, 'spot', 'wardrobe', 0.25);
}

// ------------------------------------------------------------ HALL
function hall(B, W) {
  // corridor west wall: dark oak cladding with grooves (x = 7.85 .. 7.87)
  W.box(0.02, 2.8, 1.79, 7.86, 0, 6.495, 'oak_dark');
  for (let z = 5.6 + 0.12; z < 7.38; z += 0.12) W.box(0.003, 2.8, 0.004, 7.8705, 0, z, 'oak_dark');
  // hidden door: oak strip above to cornice
  W.box(0.02, 2.8 - 2.43, 0.84, 9.2, 2.43, 6.31, 'oak_dark');
  // dark oak wardrobe in niche (x 7.18..7.85, z 7.39..8.49), facing east
  const nw = W.sub(7.85, 0.012, 7.94, HP);
  CW.carcass(nw, 1.06, 2.79, 0.62, 'oak_dark', { shelves: [2.19] });
  CW.hinged(nw.sub(-0.265, 0, 0), 0.53, 'L', (L) => P.shakerDoor(L, 0.53, 2.2, 'oak_dark', { handle: 'brass', handleSide: 'R', handleType: 'long', frame: 0.07 }));
  CW.hinged(nw.sub(0.265, 0, 0), 0.53, 'R', (L) => P.shakerDoor(L, 0.53, 2.2, 'oak_dark', { handle: 'brass', handleSide: 'L', handleType: 'long', frame: 0.07 }));
  CW.hinged(nw.sub(-0.265, 2.2, 0), 0.53, 'L', (L) => P.shakerDoor(L, 0.53, 0.59, 'oak_dark', { handle: null, frame: 0.06 }));
  CW.hinged(nw.sub(0.265, 2.2, 0), 0.53, 'R', (L) => P.shakerDoor(L, 0.53, 0.59, 'oak_dark', { handle: null, frame: 0.06 }));
  CW.fillSection(nw, -0.51, 0.51, 0.018, 2.19, -0.31, 0.56, 'coats', ['clothes3', 'clothes4', 'clothes2', 'leather', 'clothes1'], 9);
  CW.storeBox(nw, -0.48, 2.208, -0.31, 0.42, 0.3, 0.45, 'box_linen'); CW.storeBox(nw, 0.04, 2.208, -0.31, 0.42, 0.26, 0.45, 'pack1');
  P.COLLIDE.push([7.18, 7.39, 7.85, 8.49]);
  // arched mirror with LED on west wall of vestibule (x=7.85, z 8.49..9.42), pouf below
  const mz = 8.955;
  const sh = new THREE.Shape(); const mw = 0.7, mh = 2.0, r = mw / 2;
  sh.moveTo(-r, 0); sh.lineTo(-r, mh - r); sh.absarc(0, mh - r, r, PI, 0, true); sh.lineTo(r, 0); sh.lineTo(-r, 0);
  const mf = W.sub(7.85, 0.45, mz, HP);
  mf.extrude(sh, 0.01, 'mirror', mat4(0, 0, 0.012));
  const sh2 = new THREE.Shape(); const r2 = r + 0.02;
  sh2.moveTo(-r2, -0.02); sh2.lineTo(-r2, mh - r); sh2.absarc(0, mh - r, r2, PI, 0, true); sh2.lineTo(r2, -0.02); sh2.lineTo(-r2, -0.02);
  mf.extrude(sh2, 0.008, 'led', mat4(0, 0, 0.004));
  P.light(W, 7.95, 1.6, mz, 'led', 'hall', 0.12);
  const pf = W.sub(8.1, 0.012, mz, 0);
  pf.rbox(0.42, 0.42, 0.82, 0.18, 0, 0, 0, 'pouf', 0, 5);
  P.COLLIDE.push([7.88, 8.55, 8.32, 9.37]);
  // white wardrobe east (x 9.26..9.96, z 7.51..8.43) facing west, with upper
  const ew = W.sub(9.26, 0.012, 7.97, -HP);
  CW.wardrobe(ew, 0.92, 2.79, 0.7, 2, 'wardrobe_hall', 'shaker', 'brass', { upper: 0.55, handleType: 'long', sections: ['coats'], palette: ['clothes1', 'clothes3', 'clothes7', 'clothes2'], seed: 7 });
  // bench niche z 8.43..9.34: oak back, hooks, bench, upper cabinet
  W.box(0.02, 2.24, 0.91, 9.95, 0.0, 8.885, 'oak_dark');
  const bn = W.sub(9.75, 0.012, 8.885, -HP);
  bn.box(0.91, 0.06, 0.4, 0, 0.36, 0.0, 'wardrobe_hall'); bn.rbox(0.88, 0.07, 0.38, 0.03, 0, 0.42, 0.0, 'cushion', 0, 3);
  bn.box(0.91, 0.02, 0.4, 0, 0.1, 0.0, 'wardrobe_hall');
  for (const x of [-0.3, -0.1, 0.1, 0.3]) { bn.cylZ(0.008, 0.08, x, 1.75, -0.16, 'brass', 8); bn.sphere(0.012, x, 1.75, -0.12, 'brass', 8); }
  // coat & bag on hooks
  bn.rbox(0.3, 0.75, 0.14, 0.06, -0.3, 1.0, -0.1, 'clothes3', 0, 3);
  bn.rbox(0.32, 0.36, 0.1, 0.04, 0.1, 1.33, -0.12, 'linen_white', 0, 3);
  // shoes
  for (const [x, m] of [[-0.25, 'black'], [-0.13, 'black'], [0.15, 'leather'], [0.27, 'leather']]) bn.rbox(0.09, 0.08, 0.26, 0.03, x, 0.12, 0.0, m, 0, 3);
  // upper box over bench
  CW.carcass(bn.sub(0, 2.29, 0.2), 0.91, 0.5, 0.4, 'wardrobe_hall');
  CW.hinged(bn.sub(-0.228, 2.29, 0.2), 0.455, 'L', (L) => P.shakerDoor(L, 0.455, 0.5, 'wardrobe_hall', { handle: null, frame: 0.06 }));
  CW.hinged(bn.sub(0.228, 2.29, 0.2), 0.455, 'R', (L) => P.shakerDoor(L, 0.455, 0.5, 'wardrobe_hall', { handle: null, frame: 0.06 }));
  CW.storeBox(bn, -0.42, 2.308, 0.0, 0.34, 0.24, 0.32, 'box_linen'); CW.folded(bn, 0.2, 2.308, 0.0, 4, ['clothes3', 'clothes5', 'clothes2', 'clothes6'], 4, 0.32, 0.26);
  P.COLLIDE.push([9.55, 8.43, 9.96, 9.34]);
  // terracotta mouldings around entrance & on vestibule walls
  wallFrame(B, 'w_hall', 7.85, 0, 0, 1, 1, 0, 8.55, 9.36, 0.2, 0.4);
  // spots
  for (const z of [5.95, 6.75, 7.55, 8.35, 9.1]) P.spot(W, 8.53, z);
  P.light(W, 8.53, 2.7, 6.4, 'spot', 'hall', 0.35); P.light(W, 8.6, 2.7, 8.8, 'spot', 'hall', 0.35);
  // switch plates
  W.box(0.08, 0.08, 0.01, 9.15, 0.9, 9.415, 'socket');
}

// ------------------------------------------------------------ BATH
function bath(B, W) {
  // viola marble slab behind tub (south wall z=8.49)
  W.box(1.71, 2.95, 0.012, 6.255, 0, 8.484, 'slab_viola');
  // zellige in sink niche
  W.box(0.008, 1.95, 0.93, 7.776, 0.85, 6.065, 'zellige');
  W.box(0.67, 1.95, 0.008, 7.445, 0.85, 5.604, 'zellige');
  W.box(0.67, 1.95, 0.008, 7.445, 0.85, 6.526, 'zellige');
  // mural on west wall x=5.96 (z 5.6..6.6) framed
  W.plane(0.92, 2.55, 5.963, 0.2 + 1.275, 6.1, 'mural', HP);
  wallFrame(B, 'trim', 5.96, 0, 0, 1, 1, 0, 5.62, 6.58, 0.18, 2.77);
  // vanity in niche (against east wall x=7.78), facing west
  const v = W.sub(7.23, 0, 6.065, -HP);
  CW.carcass(v.sub(0, 0.47, -0.02), 0.93, 0.36, 0.5, 'vanity_bath');
  CW.drawer(v.sub(0, 0.47, -0.02), 0.9, 0.34, 0.42, (L) => P.shakerDoor(L, 0.9, 0.34, 'vanity_bath', { handle: 'brass', handleSide: 'C', handleType: 'pull', frame: 0.05 }), (f, iw, ih, id) => CW.drawerFill(f, iw, ih, id, 'toiletries', 4), { boxH: 0.2 });
  v.box(0.93, 0.18, 0.55, 0, 0.83, -0.275, 'marble_white');
  v.box(0.5, 0.004, 0.32, 0, 1.011, -0.24, 'ceramic');
  v.box(0.9, 0.006, 0.01, 0, 0.465, -0.04, 'led');
  P.wallFaucet(v, 0, 1.15, -0.55, 0, 'brass');
  // organic mirror (bronze frame)
  const msh = new THREE.Shape();
  msh.moveTo(0, 0); msh.bezierCurveTo(0.32, 0.0, 0.34, 0.3, 0.3, 0.55); msh.bezierCurveTo(0.27, 0.8, 0.2, 0.92, 0, 0.92); msh.bezierCurveTo(-0.22, 0.92, -0.3, 0.75, -0.3, 0.5); msh.bezierCurveTo(-0.32, 0.25, -0.3, 0.0, 0, 0);
  const mf = W.sub(7.775, 1.2, 6.065, -HP);
  mf.extrude(msh, 0.025, 'bronze', mat4(0, 0, 0));
  const msh2 = new THREE.Shape(); const pts = msh.getPoints(40).map((p) => new THREE.Vector2(p.x * 0.9, 0.046 + p.y * 0.9)); msh2.setFromPoints(pts);
  mf.extrude(msh2, 0.004, 'mirror', mat4(0, 0, 0.025));
  P.COLLIDE.push([7.2, 5.6, 7.78, 6.53]);
  // washer niche: tall white cabinet doors facing west at x=7.12
  const wn = W.sub(7.115, 0, 6.95, -HP);
  CW.hinged(wn.sub(-0.18, 0.05, 0), 0.36, 'L', (L) => P.shakerDoor(L, 0.36, 2.74, 'wardrobe_white', { handle: 'brass', handleSide: 'R', handleType: 'long', frame: 0.07 }));
  CW.hinged(wn.sub(0.18, 0.05, 0), 0.36, 'R', (L) => P.shakerDoor(L, 0.36, 2.74, 'wardrobe_white', { handle: 'brass', handleSide: 'L', handleType: 'long', frame: 0.07 }));
  // washer + dryer column, shelves with detergents and towels
  CW.washer(wn.sub(0, 0, -0.07)); CW.washer(wn.sub(0, 0.86, -0.07), 'dryer');
  for (const y of [1.98, 2.4]) wn.box(0.72, 0.02, 0.6, 0, y, -0.36, 'wardrobe_white');
  CW.folded(wn, -0.16, 2.0, -0.36, 4, ['linen_white', 'towel_sand', 'linen_white'], 2, 0.3, 0.3);
  CW.bottle(wn, 0.12, 2.0, -0.3, 'mug_blue', 1.0); CW.bottle(wn, 0.2, 2.0, -0.42, 'pack4', 0.9); CW.bottle(wn, 0.26, 2.0, -0.28, 'ceramic', 0.8);
  CW.storeBox(wn, -0.33, 2.42, -0.36, 0.3, 0.24, 0.42, 'box_linen'); CW.storeBox(wn, 0.03, 2.42, -0.36, 0.3, 0.24, 0.42, 'box_linen');
  P.COLLIDE.push([7.11, 6.58, 7.78, 7.32]);
  // bathtub against south wall & installation, with burgundy panelled front
  const tb = W.sub(6.24, 0, 8.085, PI);
  tb.box(1.68, 0.56, 0.73, 0, 0, 0, 'ceramic');
  tb.box(1.6, 0.02, 0.65, 0, 0.55, 0, 'ceramic');
  tb.rbox(1.5, 0.05, 0.55, 0.15, 0, 0.535, 0, 'water' in {} ? 'glass' : 'glass_display', 0, 4);
  tb.box(1.68, 0.5, 0.025, 0, 0.0, 0.37, 'vanity_bath');
  P.shakerDoor(tb.sub(0, 0.06, 0.38), 1.5, 0.38, 'vanity_bath', { handle: null, frame: 0.06 });
  tb.box(1.68, 0.06, 0.03, 0, 0.0, 0.37, 'black');
  P.COLLIDE.push([5.4, 7.72, 7.08, 8.49]);
  // tub mixer & hand shower on installation side, rain shower above tub
  P.wallFaucet(W, 5.4, 0.7, 8.1, HP, 'brass');
  P.thermostat(W, 5.4, 1.15, 8.0, HP, 'brass');
  P.rainShower(W, 5.4, 2.2, 8.08, HP, 'brass');
  // lit niche with shelves above tub at installation (z 7.75..7.95)
  W.box(0.02, 1.4, 0.24, 5.405, 0.9, 7.86, 'w_bath'); for (const y of [1.25, 1.6, 1.95]) W.box(0.12, 0.015, 0.24, 5.45, y, 7.86, 'marble_white');
  W.box(0.006, 1.38, 0.01, 5.41, 0.91, 7.745, 'led');
  // toilet on installation x=5.4 facing east, flush plate, cabinet above
  P.wallToilet(W.sub(5.4, 0, 7.15, HP));
  P.flushPlate(W, 5.4, 1.05, 7.15, HP, 'brass');
  const tc = W.sub(5.7, 1.55, 7.15, HP);
  CW.carcass(tc, 0.9, 1.25, 0.3, 'wardrobe_white', { shelves: [0.42, 0.84] });
  CW.hinged(W.sub(5.7, 1.55, 6.925, HP), 0.45, 'R', (L) => P.shakerDoor(L, 0.45, 1.25, 'wardrobe_white', { handle: 'brass', handleSide: 'L', handleType: 'pull', frame: 0.06 }));
  CW.hinged(W.sub(5.7, 1.55, 7.375, HP), 0.45, 'L', (L) => P.shakerDoor(L, 0.45, 1.25, 'wardrobe_white', { handle: 'brass', handleSide: 'R', handleType: 'pull', frame: 0.06 }));
  for (let i = 0; i < 6; i++) tc.cyl(0.055, 0.055, 0.1, -0.3 + (i % 3) * 0.12, 0.018 + Math.floor(i / 3) * 0.1, -0.15, 'carton', 18);
  for (let i = 0; i < 2; i++) tc.cylX(0.045, 0.13, 0.15 + i * 0.16, 0.063, -0.15, i ? 'towel_sand' : 'linen_white', 16);
  CW.drawerFill(tc.sub(0, 0.438, -0.15), 0.84, 0.38, 0.24, 'toiletries', 6);
  CW.drawerFill(tc.sub(0, 0.858, -0.15), 0.84, 0.36, 0.24, 'towels', 7);
  // bidet shower
  W.cylX(0.015, 0.06, 5.43, 0.75, 7.48, 'brass');
  // curtain at tub front, gathered near installation
  W.cylX(0.01, 1.7, 6.25, 2.88, 7.73, 'brass');
  P.curtain(B, 5.42, 7.73, 5.9, 7.73, 'curtain_bath', 2.88, 0.58, 0.04);
  // ceiling spots
  for (const [x, z] of [[6.4, 5.95], [6.4, 7.0], [6.4, 8.0], [5.75, 7.15]]) P.spot(W, x, z, 2.949);
  P.light(W, 6.4, 2.6, 6.9, 'spot', 'bath', 0.4);
  P.light(W, 7.5, 1.6, 6.0, 'led', 'bath', 0.12);
  // towel
  W.rbox(0.04, 0.6, 0.35, 0.015, 7.08, 1.2, 7.55, 'linen_white', 0, 2);
}

// ------------------------------------------------------------ WC + SHOWER
function wc(B, W) {
  // shower tray
  W.box(1.29, 0.03, 0.92, 9.945, 0, 5.2, 'travertine');
  W.box(0.6, 0.004, 0.05, 9.945, 0.031, 4.8, 'steel');
  // vertical lit niche on east installation (x=10.59) z 4.82..5.08
  W.box(0.012, 2.2, 0.28, 10.585, 0.25, 4.95, 'w_shower');
  for (const y of [0.9, 1.35, 1.8]) W.box(0.1, 0.015, 0.26, 10.54, y, 4.95, 'marble_gold');
  W.box(0.006, 2.18, 0.012, 10.578, 0.26, 4.82, 'led'); W.box(0.006, 2.18, 0.012, 10.578, 0.26, 5.08, 'led');
  P.light(W, 10.45, 1.4, 4.95, 'led', 'wc', 0.12);
  // bottles
  for (const [y, z] of [[0.915, 4.9], [1.365, 5.0], [1.815, 4.92]]) W.cyl(0.022, 0.022, 0.15, 10.55, y, z, ['black', 'leather', 'ceramic'][Math.round(y * 2) % 3], 12);
  P.rainShower(W, 9.945, 2.3, 4.74, 0, 'bronze');
  P.thermostat(W, 10.59, 1.15, 5.35, -HP, 'bronze');
  // vanity along east wall (x 10.71..11.25, z 5.97..7.24) walnut + marble integral sink
  const v = W.sub(10.71, 0, 6.605, -HP);
  CW.carcass(v.sub(0, 0.42, -0.02), 1.27, 0.4, 0.5, 'vanity_wc', { parts: [0] });
  for (const [x, k] of [[-0.32, 'towels'], [0.32, 'toiletries']]) CW.drawer(v.sub(x, 0.42, -0.02), 0.62, 0.38, 0.42, (L) => P.shakerDoor(L, 0.62, 0.38, 'vanity_wc', { handle: 'bronze', handleSide: 'C', handleType: 'pull', frame: 0.05 }), (f, iw, ih, id) => CW.drawerFill(f, iw, ih, id, k, 8), { boxH: 0.22 });
  v.box(1.27, 0.14, 0.54, 0, 0.82, -0.27, 'marble_white');
  v.box(0.55, 0.004, 0.32, 0, 0.961, -0.25, 'ceramic');
  v.box(1.25, 0.006, 0.01, 0, 0.415, -0.03, 'led');
  P.wallFaucet(v, 0, 1.1, -0.54, 0, 'bronze');
  // arched mirror bronze
  const ash = new THREE.Shape(); const aw = 0.62, ah = 1.0;
  ash.moveTo(-aw / 2, 0); ash.lineTo(-aw / 2, ah - 0.18); ash.bezierCurveTo(-aw / 2, ah - 0.05, -0.12, ah - 0.06, 0, ah); ash.bezierCurveTo(0.12, ah - 0.06, aw / 2, ah - 0.05, aw / 2, ah - 0.18); ash.lineTo(aw / 2, 0); ash.lineTo(-aw / 2, 0);
  const am = W.sub(11.245, 1.12, 6.605, -HP);
  am.extrude(ash, 0.02, 'bronze', mat4(0, 0, 0));
  const ash2 = new THREE.Shape(); ash2.setFromPoints(ash.getPoints(40).map((p) => new THREE.Vector2(p.x * 0.92, 0.03 + p.y * 0.93)));
  am.extrude(ash2, 0.004, 'mirror', mat4(0, 0, 0.02));
  P.COLLIDE.push([10.71, 5.97, 11.25, 7.24]);
  // walnut tall cabinet next to vanity? -> wall cabinet above toilet ledge (south wall)
  const wcab = W.sub(9.95, 1.62, 7.16, PI);
  CW.carcass(wcab, 1.2, 1.0, 0.28, 'vanity_wc', { shelves: [0.33, 0.66] });
  for (const x of [-0.4, 0, 0.4]) CW.hinged(wcab.sub(x, 0, 0.0), 0.4, x < 0 ? 'L' : 'R', (L) => P.shakerDoor(L, 0.4, 1.0, 'vanity_wc', { handle: 'bronze', handleSide: x < 0 ? 'R' : 'L', handleType: 'pull', frame: 0.05 }));
  CW.drawerFill(wcab.sub(0, 0.018, -0.14), 1.14, 0.3, 0.24, 'toiletries', 9);
  CW.drawerFill(wcab.sub(0, 0.348, -0.14), 1.14, 0.3, 0.24, 'towels', 10);
  CW.drawerFill(wcab.sub(0, 0.678, -0.14), 1.14, 0.3, 0.24, 'toiletries', 11);
  // toilet on ledge, facing north
  P.wallToilet(W.sub(9.98, 0, 7.24, PI));
  P.flushPlate(W, 9.98, 1.0, 7.24, PI, 'bronze');
  P.COLLIDE.push([9.7, 6.7, 10.26, 7.24]);
  // spots
  for (const [x, z] of [[9.95, 5.2], [9.9, 6.3], [10.6, 6.6]]) P.spot(W, x, z, 2.999);
  P.light(W, 9.95, 2.6, 6.4, 'spot', 'wc', 0.35);
  P.light(W, 9.95, 2.6, 5.2, 'spot', 'wc', 0.25);
  // towel ring
  W.torus(0.09, 0.006, 9.3, 1.3, 7.0, 'bronze', 0, Math.PI * 2, HP);
}

// ------------------------------------------------------------ helpers
function frieze(B, path, y) {
  if (!path.length) return;
  const geos = sweep(path, PROFILES.frieze, false, y);
  for (const g of geos) B.add(g, 'trim');
}

function radiator(W, side, a, b) {
  // low panel radiator under window, inside reveal line
  const L = (b - a) - 0.3; if (L < 0.4) return;
  const c = (a + b) / 2;
  if (side === 'N') { W.box(L, 0.3, 0.08, c, 0.06, 0.06, 'radiator'); for (let x = c - L / 2 + 0.03; x < c + L / 2; x += 0.05) W.box(0.012, 0.3, 0.01, x, 0.06, 0.103, 'radiator'); }
  else { W.box(0.08, 0.3, L, 0.06, 0.06, c, 'radiator'); for (let z = c - L / 2 + 0.03; z < c + L / 2; z += 0.05) W.box(0.01, 0.3, 0.012, 0.103, 0.06, z, 'radiator'); }
}

function curtains(B) {
  // living: panels flanking each north window, hanging in slot (z=0.08)
  const z = 0.085;
  const pairs = [[6.49, 8.09], [9.16, 10.65]];
  for (const [a, b] of pairs) {
    P.curtain(B, a - 0.45, z, a + 0.08, z, 'cur_living');
    P.curtain(B, b - 0.08, z, b + 0.4 > 10.65 ? 10.64 : b + 0.45, z, 'cur_living');
  }
  // boy
  P.curtain(B, 3.03, z, 3.38, z, 'cur_boy'); P.curtain(B, 5.3, z, 5.64, z, 'cur_boy');
  // girls (navy + sheers): north corner window, west windows (x=0.075 slot)
  P.curtain(B, 1.4, z, 1.95, z, 'cur_girls');
  P.curtain(B, 0.08, 0.17, 0.08, 0.6, 'cur_girls');
  P.curtain(B, 0.075, 1.38, 0.075, 1.85, 'cur_girls');
  P.curtain(B, 0.075, 2.1, 0.075, 2.6, 'cur_girls'); P.curtain(B, 0.075, 4.7, 0.075, 5.2, 'cur_girls');
  P.curtain(B, 0.12, 2.55, 0.12, 4.72, 'sheer', 3.08, 0.02, 0.03);
  P.curtain(B, 0.6, 0.125, 1.42, 0.125, 'sheer', 3.08, 0.02, 0.03);
  // bedroom (west)
  P.curtain(B, 0.075, 5.62, 0.075, 6.05, 'cur_bed'); P.curtain(B, 0.075, 7.9, 0.075, 8.47, 'cur_bed');
  P.curtain(B, 0.12, 6.0, 0.12, 7.95, 'sheer', 3.08, 0.02, 0.03);
}

// ------------------------------------------------------------ OUTSIDE
function outside(B, W) {
  // city panorama cylinder (BackSide basic material)
  const g = new THREE.CylinderGeometry(140, 140, 160, 64, 1, true);
  B.add(g, 'outside', mat4(5.6, -30, 4.5));
  void W;
}
