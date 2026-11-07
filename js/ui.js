// Interface for the two-flat floor: finishes per flat, walk / overview, per-flat overview with room buttons and labels,
// a minimap of the whole floor, start screen, fullscreen, touch layout.
import * as THREE from 'three';
import { HALL, LOBBY_ROOM } from './lobby.js';

const $ = (s) => document.querySelector(s);
const load = (k) => { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } };
const fmt = (v) => v.toFixed(1).replace('.', ',');

export function initUI({ player, lighting, camera, apts, world, onModeChange, onOverviewApt, onCut, cutH, FULL }) {
  const byId = Object.fromEntries(apts.map((a) => [a.id, a]));
  // restore saved finishes of both flats
  for (const a of apts) {
    a.state = load(a.finishKey);
    for (const c of a.M.CONTROLS) if (a.state[c.id] !== undefined && c.options[a.state[c.id]]) a.M.applyOption(c, a.state[c.id]);
  }
  const whereAmI = () => { const h = world.roomAt(player.pos.x, player.pos.z); return h ? h.apt : null; };

  // ---- finish panel: flat tabs → room tabs → swatches
  let pApt = byId.wg, panelRoom = 'living';
  const aptTabs = $('#aptTabs'), roomsEl = $('#rooms'), ctrlsEl = $('#ctrls');
  for (const a of apts.slice().reverse()) {
    const b = document.createElement('button'); b.textContent = a.id === 'wg' ? 'West Garden · 43 м²' : 'Кв. 104 · 94 м²'; b.dataset.a = a.id;
    b.onclick = () => { pApt = a; panelRoom = a.M.ROOMS_UI[0].id; renderPanel(); };
    aptTabs.appendChild(b);
  }
  const thumb = (o) => {
    if (!o.map) return `background:${o.color}`;
    try {
      const t = typeof o.map === 'function' ? o.map() : o.map;
      const img = t && t.image;
      if (img && img.toDataURL) { if (!img._thumb) { const c = document.createElement('canvas'); c.width = c.height = 64; c.getContext('2d').drawImage(img, 0, 0, img.width / 3, img.height / 3, 0, 0, 64, 64); img._thumb = c.toDataURL('image/jpeg', 0.8); } return `background-image:url(${img._thumb})`; }
    } catch (e) { /* ignore */ }
    return `background:${o.color}`;
  };
  function renderPanel() {
    const a = pApt, { CONTROLS, ROOMS_UI, applyOption } = a.M;
    if (!ROOMS_UI.find((r) => r.id === panelRoom)) panelRoom = ROOMS_UI[0].id;
    for (const b of aptTabs.children) b.classList.toggle('on', b.dataset.a === a.id);
    roomsEl.innerHTML = '';
    for (const r of ROOMS_UI) {
      const b = document.createElement('button'); b.textContent = r.name; b.classList.toggle('on', r.id === panelRoom);
      b.onclick = () => { panelRoom = r.id; renderPanel(); };
      roomsEl.appendChild(b);
    }
    ctrlsEl.innerHTML = '';
    const addSec = (t) => { const d = document.createElement('div'); d.className = 'sec'; d.textContent = t; ctrlsEl.appendChild(d); };
    const addCtrl = (c) => {
      const wrap = document.createElement('div'); wrap.className = 'ctrl';
      const cur = a.state[c.id] ?? 0;
      wrap.innerHTML = `<div class="lbl">${c.label}</div><div class="val">${c.options[cur].name}</div>`;
      const sw = document.createElement('div'); sw.className = 'sw';
      c.options.forEach((o, i) => {
        const b = document.createElement('button');
        b.setAttribute('style', thumb(o)); b.title = o.name; b.setAttribute('aria-label', o.name);
        if (i === cur) b.classList.add('on');
        b.onclick = () => { a.state[c.id] = i; store(a.finishKey, a.state); applyOption(c, i); wrap.querySelector('.val').textContent = o.name; for (const x of sw.children) x.classList.remove('on'); b.classList.add('on'); window.__bakeMirrors && window.__bakeMirrors(); };
        sw.appendChild(b);
      });
      wrap.appendChild(sw); ctrlsEl.appendChild(wrap);
    };
    addSec(ROOMS_UI.find((r) => r.id === panelRoom).name);
    CONTROLS.filter((c) => c.room === panelRoom).forEach(addCtrl);
    addSec('Для всей квартиры');
    CONTROLS.filter((c) => c.room === '*').forEach(addCtrl);
  }
  renderPanel();

  const panel = $('#panel');
  const openPanel = (v) => { panel.classList.toggle('open', v); if (v && document.pointerLockElement) document.exitPointerLock(); };
  $('#openPanel').onclick = () => {
    const a = player.mode === 'orbit' ? ovApt : whereAmI();
    if (a) { pApt = a; if (curUIRoom && curUIRoom.apt === a) panelRoom = curUIRoom.id; }
    renderPanel(); openPanel(!panel.classList.contains('open'));
  };
  $('#closePanel').onclick = () => openPanel(false);
  $('#resetBtn').onclick = () => { for (const c of pApt.M.CONTROLS) pApt.M.applyOption(c, 0); pApt.state = {}; store(pApt.finishKey, {}); renderPanel(); toast('Отделка как в проекте'); window.__bakeMirrors && window.__bakeMirrors(); };

  // ---- walk / overview, time of day
  const modeSeg = $('#modeSeg'), timeSeg = $('#timeSeg');
  for (const b of modeSeg.children) b.onclick = () => { if (b.dataset.m === 'orbit') enterOverview(whereAmI() || ovApt, 'iso'); else player.setMode('walk'); };
  player.onMode = (m) => {
    for (const b of modeSeg.children) b.classList.toggle('on', b.dataset.m === m);
    document.body.classList.toggle('walk', m === 'walk');
    onModeChange(m);
    if (m === 'orbit') { focus = null; syncOverview(); }
  };
  document.body.classList.add('walk');
  for (const b of timeSeg.children) b.onclick = () => { for (const x of timeSeg.children) x.classList.toggle('on', x === b); lighting.setMode(b.dataset.t); };

  // ---- start overlay
  const start = $('#start');
  const touch = matchMedia('(pointer: coarse)').matches;
  if (touch) { $('#keysDesk').classList.add('hidden'); $('#keysTouch').classList.remove('hidden'); }
  $('#helpBtn').onclick = () => { start.classList.remove('hidden'); if (document.pointerLockElement) document.exitPointerLock(); };
  const go = (view) => { start.classList.add('hidden'); player.teleport(view); if (!touch) player.lock(); else if (canFS && !isFS()) toggleFS(); lookHint.style.opacity = '1'; };
  $('#enterBtn').onclick = () => go('lobby:hall');
  for (const b of document.querySelectorAll('[data-go]')) b.onclick = () => go(b.dataset.go);
  $('#overviewBtn').onclick = () => { start.classList.add('hidden'); enterOverview(byId.wg, 'iso'); };
  $('#gl').addEventListener('click', () => { if (player.mode === 'walk' && !player.locked && !touch && start.classList.contains('hidden') && !panel.classList.contains('open')) player.lock(); });

  const qSeg = $('#qSeg');
  const q0 = window.__wgQuality0 || 'high';
  for (const b of qSeg.children) { b.classList.toggle('on', b.dataset.q === q0); b.onclick = () => { for (const x of qSeg.children) x.classList.toggle('on', x === b); window.__setQuality && window.__setQuality(b.dataset.q); }; }
  const cross = $('#cross');
  player.onLock = (l) => { cross.style.display = l ? 'block' : 'none'; };
  player.onHot = (h) => { cross.classList.toggle('hot', h); $('#gl').style.cursor = h && !player.locked ? 'pointer' : ''; };

  // touch / small-screen layout, persistent joystick
  const body = document.body;
  const setLayout = () => { body.classList.toggle('touch', touch); body.classList.toggle('small', innerWidth < 720 || innerHeight < 460); };
  setLayout(); addEventListener('resize', setLayout);
  const joy = $('#joy'), knob = joy.firstElementChild;
  player.joyBase = () => { const r = joy.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  player.onJoy = (j) => { joy.classList.toggle('active', !!j.active); knob.style.transform = j.active ? `translate(${(j.kx || 0) * 40}px, ${(j.ky || 0) * 40}px)` : ''; if (j.active) hideLookHint(); };
  const lookHint = $('#lookHint'); let hintT;
  const hideLookHint = () => { clearTimeout(hintT); hintT = setTimeout(() => { lookHint.style.opacity = '0'; }, 2500); };

  // fullscreen (laptop: button or F; Android: button; iPhone: home-screen hint)
  const fsEl = document.documentElement;
  const canFS = !!(fsEl.requestFullscreen || fsEl.webkitRequestFullscreen);
  const isFS = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  const standalone = matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone;
  const toggleFS = () => {
    if (!canFS) { toast(standalone ? 'Уже во весь экран' : 'На iPhone: «Поделиться» → «На экран Домой», затем откройте с иконки'); return; }
    try {
      if (isFS()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else { const p = (fsEl.requestFullscreen || fsEl.webkitRequestFullscreen).call(fsEl, { navigationUI: 'hide' }); if (p && p.catch) p.catch(() => toast('Браузер не разрешил полный экран')); }
    } catch (e) { toast('Браузер не разрешил полный экран'); }
  };
  $('#fsBtn').onclick = (e) => { e.stopPropagation(); toggleFS(); };
  addEventListener('keydown', (e) => { if (e.code === 'KeyF' && !(e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) toggleFS(); });

  // ---- minimap of the whole floor (both flats + the hall)
  const mc = $('#mapc'), ctx = mc.getContext('2d');
  const X0 = -600, Y0 = -600, SX = 19800, SY = 13200;
  const sc = Math.min(mc.width / SX, mc.height / SY);
  const ox = (mc.width - SX * sc) / 2, oy = (mc.height - SY * sc) / 2;
  const toC = (x, y) => [ox + (x - X0) * sc, oy + (y - Y0) * sc];
  const base = document.createElement('canvas'); base.width = mc.width; base.height = mc.height;
  {
    const b = base.getContext('2d');
    const poly = (pts, dx, dy) => { b.beginPath(); pts.forEach(([x, y], i) => { const [cx, cy] = toC(x + dx, y + dy); i ? b.lineTo(cx, cy) : b.moveTo(cx, cy); }); b.closePath(); };
    poly(LOBBY_ROOM.poly, 0, 0); b.fillStyle = 'rgba(200,160,100,.22)'; b.fill();
    for (const a of apts) {
      const dx = a.offset[0] * 1000, dy = a.offset[1] * 1000;
      for (const r of a.PL.ROOMS) { poly(r.poly, dx, dy); b.fillStyle = a.mapFill[r.floor] || 'rgba(147,173,141,.24)'; b.fill(); }
      b.fillStyle = '#f5f3ee';
      for (const p of a.WALLS) { poly(p, dx, dy); b.fill(); }
    }
  }
  mc.addEventListener('click', (e) => {
    const rect = mc.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width * mc.width, py = (e.clientY - rect.top) / rect.height * mc.height;
    const x = ((px - ox) / sc + X0) / 1000, z = ((py - oy) / sc + Y0) / 1000;
    const h = world.roomAt(x, z); if (!h) return;
    if (!player.teleportTo(x, z)) {
      if (h.apt) player.teleport(h.apt.id + ':' + (h.apt.viewFor[h.room.id] || 'living'));
      else player.teleport('lobby:hall');
    }
    toast(h.apt ? `${h.apt.name} · ${h.room.name}` : h.room.name);
  });

  // ---- overview: one flat at a time; room buttons fly to a plan view of the room, «Войти» walks into it
  const roomBar = $('#roomBar'), tip = $('#roomTip'), labelsEl = $('#labels'), goBtn = $('#roomGo');
  const aptSeg = $('#aptSeg'), viewSeg = $('#viewSeg'), cutIn = $('#cutH'), cutVal = $('#cutVal'), lblBtn = $('#lblBtn');
  let ovApt = byId.wg, focus = null, labels = [], barBtns = [];
  for (const a of apts.slice().reverse()) {
    const b = document.createElement('button'); b.dataset.a = a.id; b.innerHTML = `${a.short}<small>${a.id === 'wg' ? 'West Garden' : 'кв. 104'}</small>`; b.setAttribute('aria-label', `${a.name}, ${a.short}`);
    b.onclick = () => enterOverview(a, player.view || 'iso');
    aptSeg.appendChild(b);
  }
  const hideTip = () => tip.classList.remove('show');
  const box = (a, r) => { const [x0, z0, x1, z1] = r.box; return [x0 + a.offset[0], z0 + a.offset[1], x1 + a.offset[0], z1 + a.offset[1]]; };
  function buildOverview(a) {
    roomBar.innerHTML = ''; labelsEl.innerHTML = ''; barBtns = [];
    const total = a.ROOM_INFO.reduce((s, r) => s + r.m2, 0);
    const mk = (r) => {
      const b = document.createElement('button');
      const m2txt = r ? (r.m2 ? fmt(r.m2) + ' м²' : 'в кухне-гостиной') : fmt(a.area || total) + ' м²';
      b.innerHTML = `<span>${r ? r.name : 'Вся квартира'}</span><small>${m2txt}</small>`;
      b.setAttribute('aria-label', r ? `${r.name}, ${m2txt}. Вид сверху. ${r.desc}` : `Вся квартира, ${m2txt}`);
      if (r) {
        const show = () => {
          tip.innerHTML = `<b>${r.name}</b><span class="m2">${m2txt}</span><p>${r.desc}</p><p class="opens">${r.opens}</p><i>Нажмите — вид сверху на комнату</i>`;
          const br = b.getBoundingClientRect(), tw = Math.min(280, innerWidth - 24);
          tip.style.width = tw + 'px';
          tip.style.left = Math.max(12, Math.min(innerWidth - tw - 12, br.left + br.width / 2 - tw / 2)) + 'px';
          tip.style.bottom = (innerHeight - br.top + 10) + 'px';
          tip.classList.add('show');
        };
        b.addEventListener('mouseenter', show); b.addEventListener('focus', show);
        b.addEventListener('mouseleave', hideTip); b.addEventListener('blur', hideTip);
      }
      b.onclick = () => { hideTip(); focusRoom(r, r ? 'top' : player.view); };
      b._r = r; barBtns.push(b); roomBar.appendChild(b);
    };
    mk(null); for (const r of a.ROOM_INFO) mk(r);
    labels = a.ROOM_INFO.map((r) => {
      const el = document.createElement('button'); el.className = 'rlabel';
      el.innerHTML = `<b>${r.name}</b>${r.m2 ? `<small>${fmt(r.m2)} м²</small>` : ''}`;
      el.setAttribute('aria-label', `${r.name}: вид сверху`);
      el.onclick = () => focusRoom(r, 'top');
      labelsEl.appendChild(el);
      return { r, el, p: new THREE.Vector3(r.label[0] + a.offset[0], 0.05, r.label[1] + a.offset[1]) };
    });
  }
  function syncOverview() {
    for (const b of barBtns) b.classList.toggle('on', b._r === focus);
    for (const b of viewSeg.children) b.classList.toggle('on', b.dataset.v === player.view);
    for (const b of aptSeg.children) b.classList.toggle('on', b.dataset.a === ovApt.id);
    goBtn.classList.toggle('hidden', !focus);
    if (focus) goBtn.innerHTML = `Войти: ${focus.name} <span aria-hidden="true">→</span>`;
    for (const l of labels) l.el.classList.toggle('cur', l.r === focus);
  }
  function enterOverview(a, view) {
    const changed = a !== ovApt || !barBtns.length;
    ovApt = a; player.home = a.homeW;
    if (changed) buildOverview(a);
    onOverviewApt(a);
    if (player.mode !== 'orbit') { player.setMode('orbit'); if (view === 'top') player.flyTo(a.homeW, 'top'); }
    else player.flyTo(a.homeW, view);
    focus = null; syncOverview();
  }
  function focusRoom(r, view) {
    player.flyTo(r ? box(ovApt, r) : ovApt.homeW, view); // may switch to overview first (which resets the focus)
    focus = r;
    syncOverview();
  }
  for (const b of viewSeg.children) b.onclick = () => focusRoom(focus, b.dataset.v);
  goBtn.onclick = () => { if (focus) { player.teleport(ovApt.id + ':' + focus.view); toast(focus.name); } };
  let cut = cutH;
  const showCut = () => { cutVal.textContent = cut >= FULL - 0.01 ? 'полные' : cut.toFixed(2).replace(/0$/, '').replace('.', ',') + ' м'; };
  cutIn.value = String(cut); showCut();
  cutIn.addEventListener('input', () => { cut = +cutIn.value; showCut(); onCut(cut); });
  let lblOn = true;
  lblBtn.onclick = () => { lblOn = !lblOn; lblBtn.setAttribute('aria-pressed', String(lblOn)); labelsEl.classList.toggle('hidden', !lblOn); };
  const v3 = new THREE.Vector3();
  function placeLabels() {
    for (const l of labels) {
      v3.copy(l.p).project(camera);
      const x = (v3.x * 0.5 + 0.5) * innerWidth, y = (-v3.y * 0.5 + 0.5) * innerHeight;
      const off = v3.z > 1 || x < -40 || x > innerWidth + 40 || y < -20 || y > innerHeight + 20;
      l.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
      l.el.style.visibility = off ? 'hidden' : '';
    }
  }
  player.view = 'iso';

  // ---- per-frame: labels, minimap, where-am-I
  let curUIRoom = null, last = '';
  function update() {
    if (player.mode === 'orbit' && lblOn) placeLabels();
    ctx.clearRect(0, 0, mc.width, mc.height);
    ctx.drawImage(base, 0, 0);
    let label;
    if (player.mode === 'walk') {
      const p = player.pos;
      const [cx, cy] = toC(p.x * 1000, p.z * 1000);
      const ang = Math.atan2(-Math.cos(player.yaw), -Math.sin(player.yaw));
      ctx.fillStyle = 'rgba(195,211,190,.3)';
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 26, ang - 0.55, ang + 0.55); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#93ad8d'; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      const h = world.roomAt(p.x, p.z);
      if (h) { label = h.apt ? `${h.apt.short} · ${h.room.name}` : h.room.name; curUIRoom = h.apt ? { apt: h.apt, id: h.apt.PL.UI_ROOM[h.room.id] } : null; }
    } else label = `Обзор · ${ovApt.name}`;
    if (label && label !== last) { last = label; $('#roomName').textContent = label; $('#mapRoom').textContent = label; }
  }
  return { update, toast, showStart: () => start.classList.remove('hidden') };
}

let tt;
export function toast(msg) {
  const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 1600);
}
void HALL;
