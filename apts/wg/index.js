// West Garden, кв. 103 (43 м²) — adapter for the two-flat shell. Local metres: x east, z south; origin inner NW corner.
import * as M from './materials.js';
import * as PL from './plan.js';
import { buildRooms } from './rooms.js';
import * as CW from './casework.js';
import { COLLIDE, LIGHTS } from './pieces.js';
import { WALLS, WINDOWS } from './plan-data.js';

export default {
  id: 'wg', name: 'West Garden', short: '43 м²', title: 'Квартира 103 · 43 м²', area: 43.33,
  offset: [11.995, 1.675], // party wall against the 94 m² flat's east facade; entrances share the hall's north wall
  M, PL, CW, buildRooms, COLLIDE, LIGHTS, WALLS, wallHit: PL.wallHit,
  finishKey: 'wg103-finish-v1',
  rects: WINDOWS.map((w) => ({ side: 'N', a: w.a / 1000, b: w.b / 1000, sill: w.sill, k: 1 })), rectInset: -0.05,
  ledRooms: ['living', 'bath'],
  emissives: [['lampshade', 0.6], ['bulb', 2.2], ['globe', 1.4], ['ceramic_lamp', 1.0]],
  mirrors: [['mirror_bed', 5.1, 1.5, 3.0], ['mirror_hall', 3.6, 1.5, 7.07], ['mirror_bath', 4.89, 1.55, 5.4]],
  capSkip: ['podium'],
  bounds: [-0.05, -0.05, 6.2, 8.05], // walkable door/arch thickness inside the outline (local m)
  HOME: [-0.45, -0.44, 6.61, 8.05],
  mapFill: { floor_wood: 'rgba(147,173,141,.24)', floor_bath: 'rgba(245,243,238,.22)' },
  VIEWS: {
    living: { p: [2.6, 4.6], look: [0.6, 1.2, 1.2] },
    kitchen: { p: [1.2, 5.1], look: [1.2, 1.25, 7.3] },
    hall: { p: [3.65, 4.75], look: [3.65, 1.4, 7.6] },
    entry: { p: [3.65, 7.3], look: [3.65, 1.45, 4.4] },
    bed: { p: [3.75, 3.7], look: [6.1, 1.15, 2.2] },
    bath: { p: [4.9, 6.35], look: [4.95, 1.2, 5.0] },
  },
  viewFor: { bed: 'bed', bath: 'bath', hall: 'hall', living: 'living' },
  ROOM_INFO: [
    { view: 'living', box: [0, 0, 3.045, 7.37], label: [1.6, 3.2], m2: 21.03, name: 'Кухня-гостиная', desc: 'ТВ-стена из шпона ореха с подсвеченной нишей, панели с рейкой и перфорированная перегородка, диван-конструктор из букле, круглый стол и стулья Fless.', opens: 'Открываются: кухонные шкафы и ящики, духовка с курицей, холодильник, шкафы ТВ-стены.' },
    { view: 'kitchen', box: [0, 5.29, 2.35, 7.37], label: [1.2, 6.45], m2: 0, name: 'Кухня', desc: 'П-образная кухня в нише: тёмный орех и рейка, зелёный мраморный фартук, песочная столешница, мойка Omoikiri.', opens: 'Открываются: все фасады и ящики, духовка, холодильник.' },
    { view: 'bed', box: [3.2, 0, 6.165, 4.885], label: [4.1, 3.75], m2: 13.82, name: 'Спальня', desc: 'Парящая кровать Boca Airblade, стена из шпона с рейкой и зеркальными вставками, рабочий стол у окна, стеллаж с оливковым задником.', opens: 'Открываются: шкаф, тумбы, стеллаж, ящики стола.' },
    { view: 'bath', box: [4.395, 5.01, 6.125, 7.608], label: [5.3, 5.55], m2: 3.96, name: 'Санузел', desc: 'Травертин Pearl Vein, пол и раковина Brown Velvet, рифлёное стекло душа, чёрная сантехника Ritmonio.', opens: 'Открываются: зеркальный шкаф, ящики тумбы, колонна стиральной и сушильной машин, шкаф над инсталляцией, дверь душа.' },
    { view: 'hall', box: [2.51, 4.42, 4.255, 7.64], label: [3.6, 6.4], m2: 4.52, name: 'Прихожая', desc: 'Декоративная штукатурка, скрытые двери в цвет стен, витрина в чёрной раме, рифлёная панель, консоль с зеркалом.', opens: 'Открываются: входная дверь, шкаф с одеждой, витрина, ящик консоли.' },
  ],
};
