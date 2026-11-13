// Guided tour: the camera walks from the lift hall through every room of both flats, pauses in each one with
// a card (name, area, what is special), and ends each flat by pulling back to the roof-off overview.
// The route is found on a grid of the walkable floor (A*), so it always goes through the doorways.
const $ = (s) => document.querySelector(s);
const fmt = (v) => v.toFixed(1).replace('.', ',');
const CELL = 0.1, SPEED = 1.15, HOLD = 4.6, MINC = 0.13; // MINC: the camera is a point, it may pass where a person squeezes through
const ORDER = { wg: ['hall', 'living', 'kitchen', 'bed', 'bath'], k94: ['hall', 'living', 'wc', 'boy', 'girls', 'bed', 'wardrobe', 'bath'] };

export function createTour({ player, world, apts, doors, ui, audio, camera }) {
  const card = $('#tourCard'), fade = $('#fade');
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const byId = Object.fromEntries(apts.map((a) => [a.id, a]));

  // ---- walkable grid with clearance (built once, on the first tour)
  let G = null;
  function grid() {
    if (G) return G;
    const x0 = -1, z0 = -1, nx = Math.ceil(21.5 / CELL), nz = Math.ceil(14.5 / CELL);
    const cl = new Float32Array(nx * nz); // clearance to the nearest wall / furniture, 0 = not walkable
    const segs = world.segs, boxes = world.boxes;
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const x = x0 + (i + 0.5) * CELL, z = z0 + (j + 0.5) * CELL;
      if (!world.roomAt(x, z) && !world.inOpening(x, z)) continue;
      let d = 0.8;
      for (const s of segs) {
        const dx = s[2] - s[0], dz = s[3] - s[1], L2 = dx * dx + dz * dz || 1;
        let t = ((x - s[0]) * dx + (z - s[1]) * dz) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const q = Math.hypot(x - s[0] - dx * t, z - s[1] - dz * t); if (q < d) { d = q; if (d < MINC) break; }
      }
      if (d >= MINC) for (const b of boxes) {
        const q = Math.hypot(x - Math.max(b[0], Math.min(x, b[2])), z - Math.max(b[1], Math.min(z, b[3]))); if (q < d) { d = q; if (d < MINC) break; }
      }
      cl[j * nx + i] = d >= MINC ? d : 0;
    }
    return (G = { x0, z0, nx, nz, cl });
  }
  const cellOf = (x, z) => { const g = grid(); return [Math.floor((x - g.x0) / CELL), Math.floor((z - g.z0) / CELL)]; };
  const clAt = (x, z) => { const g = grid(), [i, j] = cellOf(x, z); return i < 0 || j < 0 || i >= g.nx || j >= g.nz ? 0 : g.cl[j * g.nx + i]; };
  function nearestFree(x, z) {
    const g = grid(), [ci, cj] = cellOf(x, z); let best = null, bd = 1e9;
    for (let r = 0; r < 20 && !best; r++) for (let j = cj - r; j <= cj + r; j++) for (let i = ci - r; i <= ci + r; i++) {
      if (i < 0 || j < 0 || i >= g.nx || j >= g.nz || !g.cl[j * g.nx + i]) continue;
      const d = Math.hypot(i - ci, j - cj); if (d < bd) { bd = d; best = [i, j]; }
    }
    return best;
  }
  const visible = (ax, az, bx, bz) => { // straight walk without leaving comfortable floor
    const L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 0.06);
    for (let k = 0; k <= n; k++) { const t = k / n; if (clAt(ax + (bx - ax) * t, az + (bz - az) * t) < 0.3) return false; }
    return true;
  };
  function route(ax, az, bx, bz) {
    const g = grid(), A = nearestFree(ax, az), B = nearestFree(bx, bz); if (!A || !B) return null;
    const N = g.nx * g.nz, cost = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), done = new Uint8Array(N);
    const heap = []; // binary heap of [f, index]
    const push = (f, i) => { heap.push([f, i]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let p = 0; for (;;) { let c = p * 2 + 1; if (c >= heap.length) break; if (c + 1 < heap.length && heap[c + 1][0] < heap[c][0]) c++; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; p = c; } } return top; };
    const s = A[1] * g.nx + A[0], e = B[1] * g.nx + B[0];
    cost[s] = 0; push(0, s);
    while (heap.length) {
      const [, cur] = pop(); if (done[cur]) continue; done[cur] = 1; if (cur === e) break;
      const ci = cur % g.nx, cj = (cur / g.nx) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue; const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= g.nx || j >= g.nz) continue;
        const n = j * g.nx + i, c = g.cl[n]; if (!c || done[n]) continue;
        if (di && dj && (!g.cl[cj * g.nx + i] || !g.cl[j * g.nx + ci])) continue; // no cutting corners
        const w = (di && dj ? 1.414 : 1) * (1 + (c < 0.5 ? (0.5 - c) * 14 : 0) + (c < 0.22 ? 6 : 0)); // stay away from walls where there is room
        if (cost[cur] + w < cost[n]) { cost[n] = cost[cur] + w; from[n] = cur; push(cost[n] + Math.hypot(i - B[0], j - B[1]), n); }
      }
    }
    if (!done[e]) return null;
    let pts = []; for (let c = e; c !== -1; c = from[c]) pts.push([g.x0 + (c % g.nx + 0.5) * CELL, g.z0 + (((c / g.nx) | 0) + 0.5) * CELL]);
    pts.reverse();
    // string pulling, then round the corners
    const pulled = [pts[0]]; let k = 0;
    while (k < pts.length - 1) { let m = pts.length - 1; while (m > k + 1 && !visible(pts[k][0], pts[k][1], pts[m][0], pts[m][1])) m--; pulled.push(pts[m]); k = m; }
    let line = [];
    for (let i = 0; i < pulled.length - 1; i++) { const [px, pz] = pulled[i], [qx, qz] = pulled[i + 1], n = Math.max(1, Math.ceil(Math.hypot(qx - px, qz - pz) / 0.5)); for (let t = 0; t < n; t++) line.push([px + (qx - px) * t / n, pz + (qz - pz) * t / n]); }
    line.push(pulled[pulled.length - 1]);
    for (let it = 0; it < 3; it++) {
      const out = [line[0]];
      for (let i = 0; i < line.length - 1; i++) { const [px, pz] = line[i], [qx, qz] = line[i + 1]; out.push([px * 0.75 + qx * 0.25, pz * 0.75 + qz * 0.25], [px * 0.25 + qx * 0.75, pz * 0.25 + qz * 0.75]); }
      out.push(line[line.length - 1]); line = out;
    }
    const len = [0]; for (let i = 1; i < line.length; i++) len.push(len[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
    return { line, len, total: len[len.length - 1] };
  }
  const along = (r, d) => {
    d = Math.max(0, Math.min(r.total, d)); let lo = 0, hi = r.len.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (r.len[m] <= d) lo = m; else hi = m; }
    const f = (d - r.len[lo]) / Math.max(1e-6, r.len[hi] - r.len[lo]);
    return [r.line[lo][0] + (r.line[hi][0] - r.line[lo][0]) * f, r.line[lo][1] + (r.line[hi][1] - r.line[lo][1]) * f];
  };

  // ---- the script
  const steps = [];
  steps.push({ type: 'jump', view: 'lobby:hall' }, { type: 'hold', title: 'Лифтовой холл', kicker: 'West Garden · этаж', m2: '', text: 'Общий холл этажа. Отсюда двери ведут в обе квартиры: 43 м² и 94 м².' });
  for (const id of ['wg', 'k94']) {
    const a = byId[id]; if (!a) continue;
    if (id === 'k94') steps.push({ type: 'jump', view: 'k94:entry' });
    for (const v of ORDER[id]) {
      const info = a.ROOM_INFO.find((r) => r.view === v); if (!info || !a.VIEWS[v]) continue;
      steps.push({ type: 'walk', view: id + ':' + v }, { type: 'hold', title: info.name, kicker: a.title, m2: info.m2 ? fmt(info.m2) + ' м²' : '', text: info.desc });
    }
    steps.push({ type: 'reveal', apt: a, title: a.name, kicker: 'Вид сверху', m2: fmt(a.area) + ' м²', text: 'Вся квартира без крыши: планировка и расстановка мебели целиком.' });
  }
  const HOLDS = steps.filter((s) => s.type !== 'walk' && s.type !== 'jump').length;

  let on = false, idx = -1, st = null, holdNo = 0, fadeT = null;
  const lookOf = (key) => { const v = world.views[key]; const dx = v.look[0] - v.p[0], dz = v.look[2] - v.p[1]; return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(v.look[1] - player.eye, Math.hypot(dx, dz)) }; };
  const turn = (cur, target, k) => { let d = target - cur; d = Math.atan2(Math.sin(d), Math.cos(d)); return cur + d * k; };
  function showCard(s) {
    card.querySelector('.kicker').textContent = s.kicker;
    card.querySelector('h2').textContent = s.title;
    card.querySelector('.m2').textContent = s.m2; card.querySelector('.m2').style.display = s.m2 ? '' : 'none';
    card.querySelector('p').textContent = s.text;
    card.querySelector('.count').textContent = `${holdNo} / ${HOLDS}`;
    card.querySelector('.bar i').style.width = (holdNo / HOLDS * 100).toFixed(1) + '%';
    card.classList.add('show');
  }
  const hideCard = () => card.classList.remove('show');
  function cut(fn) { // short dip to the brand green around a jump
    clearTimeout(fadeT); fade.classList.add('on');
    fadeT = setTimeout(() => { if (!on) { fade.classList.remove('on'); return; } fn(); fadeT = setTimeout(() => fade.classList.remove('on'), 120); }, reduce() ? 10 : 380);
  }
  function next() {
    idx++; const s = steps[idx];
    if (!s) { stop(true); return; }
    if (s.type === 'jump') { st = { type: 'wait' }; cut(() => { player.teleport(s.view); next(); }); return; }
    if (s.type === 'walk') {
      hideCard();
      const v = world.views[s.view], r = reduce() ? null : route(player.pos.x, player.pos.z, v.p[0], v.p[1]);
      if (!r || r.total < 0.05) { st = { type: 'wait' }; cut(() => { player.teleport(s.view); next(); }); return; }
      if (player.mode !== 'walk') player.setMode('walk');
      st = { type: 'walk', r, d: 0, look: lookOf(s.view), end: v.p }; return;
    }
    if (s.type === 'hold') { holdNo++; const key = steps[idx - 1].view; st = { type: 'hold', t: 0, look: lookOf(key), s }; showCard(s); return; }
    if (s.type === 'reveal') {
      hideCard(); st = { type: 'wait' };
      cut(() => {
        const a = s.apt, p = player.pos.clone();
        ui.enterOverview(a, 'iso');
        // start close above the room we were in, then pull back to the whole flat
        const from = { target: p.setY(0), polar: 0.5, az: 0.5, h: 5.2, fov: 45 };
        player.tween = null; player.applyShot(from); player.orbit.target.copy(from.target);
        player.flyTo(a.homeW, 'iso', reduce() ? 0.01 : 3.4);
        holdNo++; showCard(s); st = { type: 'hold', t: -3.2, s, orbit: true };
      });
    }
  }
  function start() {
    if (on) return; on = true; idx = -1; holdNo = 0;
    document.body.classList.add('touring');
    if (document.pointerLockElement) document.exitPointerLock();
    for (const d of doors) if (d.interactive) d.target = 1; // every door on the way stands open
    audio.start();
    grid();
    next(); api.onChange && api.onChange(true);
  }
  function stop(finished) {
    if (!on) return; on = false; st = null;
    clearTimeout(fadeT); fade.classList.remove('on');
    hideCard(); document.body.classList.remove('touring');
    api.onChange && api.onChange(false, !!finished);
  }
  function update(dt) {
    if (!on || !st) return;
    if (st.type === 'walk') {
      const r = st.r, edge = Math.min(st.d, r.total - st.d);
      st.d += SPEED * Math.min(1, 0.22 + edge / 0.7) * dt;
      const [x, z] = along(r, st.d), [ax, az] = along(r, st.d + 1.3);
      player.pos.set(x, 0, z); player.vel.set(0, 0);
      const left = r.total - st.d;
      let yawT = Math.hypot(ax - x, az - z) > 0.05 ? Math.atan2(-(ax - x), -(az - z)) : st.look.yaw, pitchT = -0.04;
      if (left < 1.3) { const f = 1 - left / 1.3; yawT = turn(yawT, st.look.yaw, f); pitchT += (st.look.pitch - pitchT) * f; }
      const k = 1 - Math.exp(-dt * 3.2);
      player.yaw = turn(player.yaw, yawT, k); player.pitch += (pitchT - player.pitch) * k;
      if (st.d >= r.total) next();
    } else if (st.type === 'hold') {
      st.t += dt;
      if (!st.orbit) {
        const k = 1 - Math.exp(-dt * 2.2);
        player.vel.set(0, 0);
        player.yaw = turn(player.yaw, st.look.yaw + Math.sin(Math.max(0, st.t) * 0.55) * 0.2, k); player.pitch += (st.look.pitch - player.pitch) * k;
      }
      if (st.t >= HOLD) next();
    }
    if (st && st.type !== 'wait' && player.mode === 'walk') { camera.position.set(player.pos.x, player.eye, player.pos.z); camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ'); }
  }
  // taking the controls ends the tour
  addEventListener('keydown', (e) => { if (on && /^(Key[WASD]|Arrow|Escape)/.test(e.code)) stop(); });
  card.querySelector('[data-a=next]').onclick = () => { if (on && st && st.type !== 'wait') { if (st.type === 'walk') { player.pos.set(st.end[0], 0, st.end[1]); player.yaw = st.look.yaw; player.pitch = st.look.pitch; } next(); } };
  card.querySelector('[data-a=stop]').onclick = () => stop();

  const api = { start, stop, update, get on() { return on; }, onChange: null, steps, route };
  return api;
}
