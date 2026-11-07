// Квартира 94 м² — adapter for the two-flat shell. Local metres: x east, z south; origin inner NW corner.
import * as M from './materials.js';
import * as PL from './plan.js';
import { buildRooms } from './rooms.js';
import * as CW from './casework.js';
import { COLLIDE, LIGHTS } from './pieces.js';
import { WALLS } from './plan-data.js';

export default {
  id: 'k94', name: 'Квартира 94', short: '94 м²', title: 'Квартира 104 · 94 м²', area: 92.44,
  offset: [0, 0],
  M, PL, CW, buildRooms, COLLIDE, LIGHTS, WALLS, wallHit: null,
  finishKey: 'kv94-finish-v1',
  rects: [ // few RectAreaLights (they are costly): one per room facade
    { side: 'N', a: 6.49, b: 10.76, sill: PL.SILL, k: 0.85 }, { side: 'N', a: 3.09, b: 5.39, sill: PL.SILL, k: 1.15 },
    { side: 'W', a: 0.0, b: 4.77, sill: PL.SILL, k: 0.85 }, { side: 'W', a: 5.82, b: 8.08, sill: PL.SILL, k: 1.15 },
  ], rectInset: 0.02,
  ledRooms: ['living'],
  emissives: [['lampshade', 0.6], ['bulb', 2.2], ['globe', 1.4], ['crystal', 0.5], ['glass_pink', 0.5]],
  mirrors: [],
  capSkip: [],
  bounds: [-0.05, -0.05, 11.3, 9.72],
  HOME: [-0.3, -0.3, 11.55, 9.72],
  mapFill: { floor_wood: 'rgba(147,173,141,.24)', floor_hall: 'rgba(195,211,190,.3)', floor_bath: 'rgba(245,243,238,.22)', floor_wc: 'rgba(245,243,238,.22)' },
  VIEWS: {
    living: { p: [8.75, 4.35], look: [6.4, 1.25, 1.0] },
    kitchen: { p: [8.1, 3.1], look: [11.0, 1.35, 2.0] },
    hall: { p: [8.5, 5.75], look: [8.5, 1.35, 9.3] },
    entry: { p: [8.8, 9.0], look: [8.6, 1.4, 6.0] },
    girls: { p: [0.6, 4.45], look: [2.6, 1.4, 1.6] },
    boy: { p: [5.0, 3.1], look: [3.1, 1.3, 1.1] },
    bed: { p: [3.62, 5.85], look: [1.5, 1.15, 8.3] },
    wardrobe: { p: [4.45, 6.35], look: [4.8, 1.3, 8.3] },
    bath: { p: [6.45, 5.8], look: [6.2, 1.25, 8.4] },
    wc: { p: [9.65, 6.95], look: [10.0, 1.4, 4.9] },
  },
  viewFor: { girls: 'girls', boy: 'boy', bed: 'bed', wardrobe: 'wardrobe', bath: 'bath', wc: 'wc', shower: 'wc', hall: 'hall', vest: 'hall', living: 'living' },
  ROOM_INFO: [
    { view: 'living', box: [3.0, 0, 11.25, 5.53], label: [8.55, 2.75], m2: 33.23, name: 'Кухня-гостиная', desc: 'Стены под рогожку, карниз с сухариками, люстры с льняными абажурами, синие кресла, кофейный стол из брекчии.', opens: 'Открываются: кухонные шкафы и ящики, духовки с запечённой птицей, холодильник, витрины.' },
    { view: 'girls', box: [0, 0, 2.94, 5.53], label: [1.45, 3.95], m2: 16.26, name: 'Комната девочек', desc: 'Голубые обои-шинуазри в рамках молдингов, хрустальная люстра, туалетный столик с зеркалом.', opens: 'Открываются: шкаф с арками, ящик столика.' },
    { view: 'boy', box: [3.01, 0, 5.65, 4.06], label: [4.1, 1.25], m2: 10.03, name: 'Комната мальчика', desc: 'Арочная ниша из тёмного дуба вокруг стола, кушетка, подсвеченные полки.', opens: 'Открывается: шкаф с одеждой.' },
    { view: 'bed', box: [0, 5.6, 4.0, 8.49], label: [1.55, 5.95], m2: 11.56, name: 'Спальня', desc: 'Оливковое изголовье со стёжкой, розовая ярусная люстра, рогожка в молдингах.', opens: '' },
    { view: 'wardrobe', box: [4.07, 5.6, 5.5, 8.49], label: [4.6, 6.9], m2: 3.41, name: 'Гардеробная', desc: 'Открытое хранение, полки с подсветкой, ростовое зеркало.', opens: 'Открываются: ящики с одеждой.' },
    { view: 'bath', box: [5.4, 5.6, 7.78, 8.49], label: [6.45, 6.35], m2: 5.91, name: 'Ванная', desc: 'Слэб «виола», бордовая панель ванны, фреска, зеллидж в нише.', opens: 'Открываются: ниша со стиралкой, шкафчик над унитазом, ящик тумбы.' },
    { view: 'wc', box: [9.28, 4.74, 11.25, 7.44], label: [10.25, 5.25], m2: 4.63, name: 'Санузел с душем', desc: 'Оникс, бронзовые арочные двери душа, тумба из ореха.', opens: 'Открываются: навесной шкаф, ящики тумбы.' },
    { view: 'hall', box: [7.18, 5.6, 9.96, 9.42], label: [8.6, 8.3], m2: 7.41, name: 'Прихожая', desc: 'Терракотовые стены, плитка-чешуя, арочное зеркало с подсветкой.', opens: 'Открываются: входная дверь, шкафы с верхней одеждой, антресоль.' },
  ],
};
