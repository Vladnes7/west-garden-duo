import * as THREE from 'three';
import * as T from './textures.js';
import { frame } from './util.js';

export const MAT = {};          // key -> material
export const TEX = {};          // key -> texture
let maxAniso = 8;

function tex(c, tileMeters = 1, srgb = true) {
  // phones: textures are generated at full size, then stored downscaled (4× less memory per halving)
  const k = globalThis.__wgTexScale || 1;
  if (k < 1 && c.width > 256) {
    const d = document.createElement('canvas');
    d.width = Math.max(128, Math.round(c.width * k)); d.height = Math.max(64, Math.round(c.height * k));
    d.getContext('2d').drawImage(c, 0, 0, d.width, d.height); c = d;
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / tileMeters, 1 / tileMeters);
  t.anisotropy = maxAniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

const std = (o) => new THREE.MeshStandardMaterial(o);
const phys = (o) => new THREE.MeshPhysicalMaterial(o);

export async function buildMaterials(renderer, progress) {
  maxAniso = Math.min(globalThis.__wgTexScale < 1 ? 4 : 8, renderer.capabilities.getMaxAnisotropy());
  const step = async (label) => { progress && progress(label); await frame(); };

  await step('Паркет ёлочкой');
  const hb = T.herringbone(2048, 6);
  TEX.wood = tex(hb.map, hb.tile); TEX.woodBump = tex(hb.bump, hb.tile, false); TEX.woodRough = tex(hb.rough, hb.tile, false);

  await step('Обои и ткани');
  const gc = T.grasscloth(1024);
  TEX.grass = tex(gc.map, gc.tile); TEX.grassBump = tex(gc.bump, gc.tile, false);
  const fab = { weave: T.fabric('weave'), boucle: T.fabric('boucle'), tweed: T.fabric('tweed'), linen: T.fabric('linen'), velvet: T.fabric('velvet') };
  for (const k in fab) { TEX['f_' + k] = tex(fab[k], k === 'tweed' ? 0.12 : 0.25); TEX['fb_' + k] = tex(fab[k], k === 'tweed' ? 0.12 : 0.25, false); }
  TEX.veneer = tex(T.veneer(1024), 1.2);

  await step('Мрамор и камень');
  const mc = {};
  for (const k of ['calacatta', 'viola', 'gold', 'nero', 'emperador', 'stone', 'graystone']) mc[k] = T.marble(k, 1024);
  mc.onyx = T.onyx(1024); mc.breccia = T.breccia(1024); mc.travertine = T.travertine(1024);
  for (const k in mc) TEX['m_' + k] = tex(mc[k], k === 'breccia' ? 0.9 : 1.4);
  // large-format slab textures (bigger repeat)
  TEX.slab_viola = tex(mc.viola, 2.4);

  await step('Плитка');
  const sc = T.scallopTile(1024, mc.calacatta, mc.emperador);
  TEX.scallop = tex(sc.map, 1.2);
  const ck = T.checkerDiag(1024, mc.stone, mc.graystone);
  TEX.checker = tex(ck.map, ck.tile);
  const big = T.tileGrid(mc.stone, 2, 4, { w: 1024, h: 1024, grout: 'rgba(170,160,150,0.6)', gw: 2 });
  TEX.bigtile = tex(big.map, 2.4); TEX.bigtileBump = tex(big.bump, 2.4, false);
  const zel = T.tileGrid(T.marble('stone', 256), 8, 2, { w: 1024, h: 1024, grout: 'rgba(200,195,188,0.9)', gw: 3, glaze: true, vary: 0.12, seed: 9 });
  TEX.zellige = tex(zel.map, 0.6); TEX.zelligeBump = tex(zel.bump, 0.6, false);
  const onyxTile = T.tileGrid(mc.onyx, 1, 2, { w: 1024, h: 1024, grout: 'rgba(210,190,150,0.6)', gw: 2 });
  TEX.onyxTile = tex(onyxTile.map, 2.4);

  await step('Обои шинуазри и фреска');
  TEX.chino_blue = tex(T.chinoiserie(1024), 0.9);
  TEX.chino_rose = tex(T.chinoiserie(1024, ['#7a3b4b', '#b0606f', '#d99aa5', '#efc9cf'], '#f5efe9', 92), 0.9);
  TEX.chino_green = tex(T.chinoiserie(1024, ['#2f4a3a', '#4f7660', '#8fb09a', '#c6d8c9'], '#f1eee4', 94), 0.9);
  const mu = T.mural(1024, 2048); TEX.mural = tex(mu, 1); TEX.mural.wrapS = TEX.mural.wrapT = THREE.ClampToEdgeWrapping; TEX.mural.repeat.set(1, 1);
  TEX.porcelain = tex(T.porcelain(512), 0.25);

  await step('Ковры и декор');
  TEX.rug_living = tex(T.rug('living'), 1); TEX.rug_maze = tex(T.rug('maze'), 1); TEX.rug_blue = tex(T.rug('blue'), 1); TEX.rug_checker = tex(T.rug('checker'), 1);
  for (const k of ['rug_living', 'rug_maze', 'rug_blue', 'rug_checker']) { TEX[k].repeat.set(1, 1); TEX[k].wrapS = TEX[k].wrapT = THREE.ClampToEdgeWrapping; }
  TEX.stripes = tex(T.stripes(512, '#151515', '#f3f0e9', 18), 0.4);
  TEX.navyStripes = tex(T.stripes(512, '#1c2440', '#f3f0e9', 10), 0.3);
  TEX.sketch1 = tex(T.sketch(1), 1); TEX.sketch2 = tex(T.sketch(2), 1);
  for (const k of ['sketch1', 'sketch2']) { TEX[k].repeat.set(1, 1); }
  TEX.screen = tex(T.screenTex(), 1); TEX.screen.repeat.set(1, 1);
  TEX.laptop = tex(T.laptopScreen(), 1); TEX.laptop.repeat.set(1, 1);
  TEX.city = tex(T.cityPanorama(4096, 1024), 1); TEX.city.repeat.set(1, 1); TEX.city.wrapT = THREE.ClampToEdgeWrapping;

  await step('Материалы');
  const wood = (color, rough = 0.55) => std({ color, map: TEX.veneer, roughness: rough, metalness: 0 });
  const fabricM = (kind, color, rough = 0.95, sheen) => {
    const m = phys({ color, map: TEX['f_' + kind], bumpMap: TEX['fb_' + kind], bumpScale: kind === 'boucle' ? 1.6 : 0.8, roughness: rough, metalness: 0 });
    if (sheen) { m.sheen = 1; m.sheenRoughness = 0.35; m.sheenColor = new THREE.Color(sheen); }
    return m;
  };
  const marbleM = (k, rough = 0.18) => std({ map: TEX['m_' + k], roughness: rough, metalness: 0 });

  Object.assign(MAT, {
    // floors
    floor_wood: std({ map: TEX.wood, bumpMap: TEX.woodBump, bumpScale: 1.2, roughnessMap: TEX.woodRough, roughness: 0.9, color: '#b49b84' }),
    floor_hall: std({ map: TEX.scallop, roughness: 0.22 }),
    floor_bath: std({ map: TEX.checker, roughness: 0.28 }),
    floor_wc: std({ map: TEX.scallop, roughness: 0.22 }),
    // walls
    w_living: std({ color: '#ddd4c8', map: TEX.grass, bumpMap: TEX.grassBump, bumpScale: 0.6, roughness: 0.92 }),
    w_boy: std({ color: '#d8cfc2', map: TEX.grass, bumpMap: TEX.grassBump, bumpScale: 0.6, roughness: 0.92 }),
    w_bed: std({ color: '#ded5c7', map: TEX.grass, bumpMap: TEX.grassBump, bumpScale: 0.6, roughness: 0.92 }),
    w_girls: std({ color: '#ece7de', roughness: 0.9 }),
    w_wardrobe: std({ color: '#e7e1d7', roughness: 0.9 }),
    w_hall: std({ color: '#9e4b35', roughness: 0.82 }),
    w_bath: std({ map: TEX.bigtile, bumpMap: TEX.bigtileBump, bumpScale: 0.3, roughness: 0.3 }),
    w_wc: std({ map: TEX.bigtile, bumpMap: TEX.bigtileBump, bumpScale: 0.3, roughness: 0.3, color: '#fbf3e6' }),
    w_shower: std({ map: TEX.onyxTile, roughness: 0.15 }),
    plaster: std({ color: '#ece8e1', roughness: 0.92 }),
    ceiling: std({ color: '#f1efea', roughness: 0.95 }),
    cut: std({ color: '#2a2826', roughness: 1 }),
    sill: marbleM('stone', 0.35),
    trim: std({ color: '#efebe4', roughness: 0.55 }),
    rosette: std({ color: '#efebe4', roughness: 0.55, side: THREE.DoubleSide }),
    // doors & metals
    door: std({ color: '#eeeae3', roughness: 0.45 }),
    door_entry: std({ color: '#9a4733', roughness: 0.5 }),
    brass: std({ color: '#c8a064', metalness: 1, roughness: 0.28 }),
    bronze: std({ color: '#7a5a43', metalness: 0.9, roughness: 0.38 }),
    black: std({ color: '#1b1b1c', metalness: 0.6, roughness: 0.45 }),
    chrome: std({ color: '#d6d8da', metalness: 1, roughness: 0.12 }),
    steel: std({ color: '#9ea2a6', metalness: 1, roughness: 0.3 }),
    // glass
    glass: std({ color: '#c7d4dc', roughness: 0.02, metalness: 0, transparent: true, opacity: 0.1, depthWrite: false }),
    glass_display: std({ color: '#d8dedf', roughness: 0.05, transparent: true, opacity: 0.16, depthWrite: false }),
    glass_fluted: std({ color: '#efe7da', roughness: 0.35, transparent: true, opacity: 0.55, bumpMap: TEX.navyStripes, bumpScale: 2, depthWrite: false }),
    glass_pink: std({ color: '#e7a6a8', roughness: 0.1, transparent: true, opacity: 0.55, emissive: '#5a2a2a', emissiveIntensity: 0.0 }),
    crystal: std({ color: '#ffffff', roughness: 0.02, metalness: 0.2, transparent: true, opacity: 0.45, emissive: '#fff3dd', emissiveIntensity: 0 }),
    mirror: std({ color: '#cfd5d8', metalness: 1, roughness: 0.02 }),
    win_frame: std({ color: '#232323', roughness: 0.5, metalness: 0.3 }),
    blind: std({ color: '#3a2b22', roughness: 0.6 }),
    outside: new THREE.MeshBasicMaterial({ map: TEX.city, side: THREE.BackSide, fog: false }),
    // textiles
    cur_living: fabricM('velvet', '#7a634f', 0.9, '#bfa58a'),
    cur_girls: fabricM('velvet', '#1e2a45', 0.9, '#4a5a85'),
    cur_boy: fabricM('linen', '#b5a895', 0.95),
    cur_bed: fabricM('linen', '#9d8b77', 0.95),
    sheer: std({ color: '#f6f3ee', roughness: 1, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
    sofa: fabricM('boucle', '#ece6da', 1),
    armchair: fabricM('tweed', '#5d84ab', 0.95),
    pillow_floral: std({ map: TEX.porcelain, roughness: 0.9 }),
    pillow_stripe: std({ map: TEX.navyStripes, roughness: 0.9 }),
    pillow_white: fabricM('linen', '#f1ede5', 0.95),
    pillow_navy: fabricM('velvet', '#1d2540', 0.8, '#4c5a88'),
    chair_boucle: fabricM('boucle', '#f0ebe2', 1),
    lampshade: std({ color: '#efe3cc', roughness: 0.9, emissive: '#ffcc88', emissiveIntensity: 0, side: THREE.DoubleSide }),
    linen_white: fabricM('linen', '#f4f1eb', 1),
    bed_girls: fabricM('linen', '#f1ede6', 0.95),
    armchair_girls: fabricM('velvet', '#cbbca7', 0.85, '#efe4d2'),
    bed_boy: fabricM('velvet', '#b8a78f', 0.85, '#e0d2bd'),
    throw_boy: fabricM('velvet', '#6e7350', 0.8, '#a4aa7c'),
    headboard_bed: fabricM('velvet', '#5c6140', 0.8, '#949a6a'),
    leather: std({ color: '#7a4f35', roughness: 0.55 }),
    cushion: fabricM('linen', '#d9d3c8', 0.95),
    pouf: std({ map: TEX.stripes, roughness: 0.9 }),
    curtain_bath: fabricM('velvet', '#4c4a33', 0.85, '#7d7a55'),
    // rugs
    rug_edge: std({ color: '#ddd3bf', roughness: 1 }),
    rug_living: std({ map: TEX.rug_living, roughness: 1 }),
    rug_boy: std({ map: TEX.rug_maze, roughness: 1 }),
    rug_girls: std({ map: TEX.rug_blue, roughness: 1 }),
    rug_bed: std({ map: TEX.rug_checker, roughness: 1 }),
    // woods & lacquers
    wood_dark: wood('#6b5644', 0.5),
    oak_dark: wood('#6e5a48', 0.55),
    walnut: wood('#7b5a40', 0.45),
    oak_light: wood('#c4ab8e', 0.55),
    k_base: std({ color: '#ece8df', roughness: 0.42 }),
    k_tall: wood('#6a5645', 0.55),
    k_top: marbleM('calacatta', 0.15),
    k_splash: marbleM('calacatta', 0.12),
    wardrobe_white: std({ color: '#efebe4', roughness: 0.45 }),
    wardrobe_hall: std({ color: '#ece6dd', roughness: 0.45 }),
    lacquer_white: std({ color: '#f1ede6', roughness: 0.3 }),
    vanity_bath: std({ color: '#5a2024', roughness: 0.35 }),
    vanity_wc: wood('#7c5b41', 0.45),
    gilt: std({ color: '#c79a4a', metalness: 1, roughness: 0.32 }),
    // stone pieces
    coffee: marbleM('breccia', 0.2),
    slab_viola: std({ map: TEX.slab_viola, roughness: 0.15 }),
    travertine: marbleM('travertine', 0.55),
    marble_white: marbleM('calacatta', 0.15),
    marble_gold: marbleM('gold', 0.15),
    zellige: std({ map: TEX.zellige, bumpMap: TEX.zelligeBump, bumpScale: 1.2, roughness: 0.12 }),
    mural: std({ map: TEX.mural, roughness: 0.9 }),
    wallpaper_girls: std({ map: TEX.chino_blue, roughness: 0.85 }),
    // ceramics & misc
    ceramic: std({ color: '#f7f6f3', roughness: 0.12 }),
    porcelain: std({ map: TEX.porcelain, roughness: 0.15 }),
    appliance: std({ color: '#121314', roughness: 0.15, metalness: 0.4 }),
    tv: std({ map: TEX.screen, roughness: 0.1, metalness: 0.2 }),
    laptop: std({ map: TEX.laptop, roughness: 0.2, emissive: '#ffffff', emissiveMap: TEX.laptop, emissiveIntensity: 0.25 }),
    led: new THREE.MeshBasicMaterial({ color: '#ffd9a8' }),
    spot: new THREE.MeshBasicMaterial({ color: '#fff6e8' }),
    bulb: std({ color: '#fff3dc', emissive: '#ffd59a', emissiveIntensity: 0.0 }),
    globe: std({ color: '#f6efe2', roughness: 0.35, transparent: true, opacity: 0.92, emissive: '#ffd6a0', emissiveIntensity: 0.0 }),
    art1: std({ map: TEX.sketch1, roughness: 0.9 }),
    art2: std({ map: TEX.sketch2, roughness: 0.9 }),
    plant: std({ color: '#5b6b45', roughness: 0.8, side: THREE.DoubleSide }),
    branch: std({ color: '#5a4434', roughness: 0.9 }),
    blossom: std({ color: '#f1e6e2', roughness: 0.9 }),
    book1: std({ color: '#cdbfa8', roughness: 0.8 }), book2: std({ color: '#5a6a72', roughness: 0.8 }), book3: std({ color: '#8b4a3a', roughness: 0.8 }),
    clothes1: fabricM('weave', '#d9d2c5', 1), clothes2: fabricM('weave', '#5f6b78', 1), clothes3: fabricM('weave', '#8e7660', 1), clothes4: fabricM('weave', '#2e3440', 1),
    clothes5: fabricM('weave', '#e3bcc0', 1), clothes6: fabricM('weave', '#a9c1d8', 1), clothes7: fabricM('weave', '#f2eee6', 1),
    // cabinet contents
    drawer_box: std({ color: '#e6ded2', roughness: 0.6 }),
    fridge_in: std({ color: '#f4f5f4', roughness: 0.35, emissive: '#ffffff', emissiveIntensity: 0.12 }),
    box_linen: fabricM('linen', '#cdc2b0', 0.95),
    shoe_light: std({ color: '#d8c8b0', roughness: 0.6 }),
    carton: std({ color: '#f2efe8', roughness: 0.7 }),
    pack1: std({ color: '#3b5470', roughness: 0.6 }), pack2: std({ color: '#b4523a', roughness: 0.6 }),
    pack3: std({ color: '#d8b46a', roughness: 0.6 }), pack4: std({ color: '#4f7a65', roughness: 0.6 }),
    food_rice: std({ color: '#ece4d2', roughness: 0.9 }), food_brown: std({ color: '#7b5233', roughness: 0.85 }),
    food_yellow: std({ color: '#e2bf4f', roughness: 0.6 }), food_orange: std({ color: '#d9752c', roughness: 0.55 }),
    food_green: std({ color: '#6d8f3e', roughness: 0.55 }), food_red: std({ color: '#b2342a', roughness: 0.45 }),
    jar_glass: std({ color: '#e6eef0', roughness: 0.05, transparent: true, opacity: 0.22, depthWrite: false }),
    glass_cup: std({ color: '#e3ecee', roughness: 0.04, transparent: true, opacity: 0.3, depthWrite: false }),
    mug_blue: std({ color: '#5d7d9e', roughness: 0.25 }), mug_sand: std({ color: '#d9c7ab', roughness: 0.3 }),
    bottle_green: std({ color: '#2f4a32', roughness: 0.1, metalness: 0.1 }), bottle_amber: std({ color: '#7a4a1e', roughness: 0.1, metalness: 0.1 }),
    bottle_oil: std({ color: '#c9a53f', roughness: 0.1, transparent: true, opacity: 0.85 }),
    bin1: std({ color: '#d5d3cf', roughness: 0.5 }), bin2: std({ color: '#8d9a8a', roughness: 0.5 }),
    towel_sand: fabricM('weave', '#cdb79a', 1),
    frost1: std({ color: '#c8dbe6', roughness: 0.4 }), frost2: std({ color: '#e6d9c4', roughness: 0.5 }),
    // oven & freezer
    oven_in: std({ color: '#26272a', roughness: 0.35, metalness: 0.2 }),
    oven_glass: std({ color: '#1a1714', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.42, depthWrite: false }),
    oven_lamp: new THREE.MeshBasicMaterial({ color: '#ffcf8a' }),
    roast: std({ color: '#9c5a22', roughness: 0.32 }), roast_dark: std({ color: '#6b3814', roughness: 0.38 }),
    tray: std({ color: '#3a3b3e', roughness: 0.25, metalness: 0.6 }),
    freezer_in: std({ color: '#eef4f8', roughness: 0.3, emissive: '#e8f2ff', emissiveIntensity: 0.14 }),
    freezer_tray: std({ color: '#e9f1f6', roughness: 0.15, transparent: true, opacity: 0.55, depthWrite: false }),
    frost_ice: std({ color: '#dfeef7', roughness: 0.6 }),
    gasket: std({ color: '#b8bcbf', roughness: 0.7 }),
    arch_oak: wood('#7a6552', 0.55),
    radiator: std({ color: '#efede9', roughness: 0.45, metalness: 0.2 }),
    socket: std({ color: '#f4f2ee', roughness: 0.4 }),
  });
  for (const k in MAT) { const m = MAT[k]; m.name = k; m.userData.map0 = m.map; m.userData.r0 = m.roughness; m.userData.m0 = m.metalness; }
}

// ---------------- Configurator catalog ----------------
const C = (name, color, extra = {}) => ({ name, color, ...extra });
const tx = (key) => () => TEX[key];

export const ROOMS_UI = [
  { id: 'living', name: 'Кухня-гостиная' },
  { id: 'hall', name: 'Прихожая' },
  { id: 'girls', name: 'Комната девочек' },
  { id: 'boy', name: 'Комната мальчика' },
  { id: 'bed', name: 'Спальня' },
  { id: 'bath', name: 'Ванная' },
  { id: 'wc', name: 'Санузел' },
  { id: 'wardrobe', name: 'Гардеробная' },
];

export const CONTROLS = [
  // global
  { id: 'floor', room: '*', label: 'Паркет (ёлочка)', mats: ['floor_wood'], options: [C('Дуб дымчатый (проект)', '#b49b84'), C('Дуб натуральный', '#d2b48f'), C('Дуб светлый', '#e6d6c0'), C('Дуб тёмный', '#7f6553'), C('Орех', '#8f6a4f')] },
  { id: 'doors', room: '*', label: 'Межкомнатные двери и молдинги', mats: ['door', 'trim', 'rosette'], options: [C('Белый тёплый (проект)', '#eeeae3'), C('Слоновая кость', '#e7dfcf'), C('Серо-бежевый', '#cfc6b8'), C('Графит', '#4a4a48')] },
  { id: 'metal', room: '*', label: 'Фурнитура и металл', mats: ['brass', 'gilt'], options: [C('Латунь (проект)', '#c8a064'), C('Бронза', '#8a6447'), C('Чёрный матовый', '#2a2a2a', { metalness: 0.4, roughness: 0.6 }), C('Хром', '#d9dcdf', { roughness: 0.12 })] },
  // living
  { id: 'w_living', room: 'living', label: 'Стены (обои грасклот)', mats: ['w_living'], options: [C('Тёплый лён (проект)', '#ddd4c8'), C('Песок', '#d6c6ad'), C('Серо-бежевый', '#c9c2b7'), C('Шалфей', '#c4c8b4'), C('Пудра', '#e2cfc6'), C('Светло-серый', '#d9d9d6')] },
  { id: 'k_base', room: 'living', label: 'Фасады кухни', mats: ['k_base'], options: [C('Белый (проект)', '#ece8df'), C('Кашемир', '#d9d0c2'), C('Шалфей', '#a9b19a'), C('Тёмно-синий', '#2c3a52'), C('Графит', '#3f4042')] },
  { id: 'k_tall', room: 'living', label: 'Высокие шкафы и пеналы', mats: ['k_tall'], options: [C('Дуб тёмный (проект)', '#6a5645'), C('Дуб светлый', '#c4ab8e'), C('Орех', '#80593b'), C('Графит', '#3a3a3a')] },
  { id: 'k_top', room: 'living', label: 'Столешница и фартук', mats: ['k_top', 'k_splash'], options: [C('Калакатта (проект)', '#ffffff', { map: tx('m_calacatta') }), C('Калакатта голд', '#ffffff', { map: tx('m_gold') }), C('Неро Маркина', '#ffffff', { map: tx('m_nero') }), C('Травертин', '#ffffff', { map: tx('m_travertine'), roughness: 0.5 })] },
  { id: 'sofa', room: 'living', label: 'Диван (букле)', mats: ['sofa'], options: [C('Молочный (проект)', '#ece6da'), C('Песочный', '#cdbb9f'), C('Серый', '#a7a39c'), C('Оливковый', '#7e7d5c'), C('Терракота', '#a8634a')] },
  { id: 'armchair', room: 'living', label: 'Кресла', mats: ['armchair'], options: [C('Голубой твид (проект)', '#5d84ab'), C('Изумруд', '#3f6b5a'), C('Терракота', '#a35e45'), C('Горчица', '#b8923f'), C('Молочный', '#e3dccf')] },
  { id: 'cur_living', room: 'living', label: 'Шторы', mats: ['cur_living'], options: [C('Табак (проект)', '#7a634f'), C('Беж', '#c2b29b'), C('Графит', '#4c4c4e'), C('Тёмно-синий', '#263252'), C('Олива', '#646446')] },
  { id: 'coffee', room: 'living', label: 'Журнальный стол', mats: ['coffee'], options: [C('Брекчия розовая (проект)', '#ffffff', { map: tx('m_breccia') }), C('Калакатта виола', '#ffffff', { map: tx('m_viola') }), C('Неро Маркина', '#ffffff', { map: tx('m_nero') }), C('Травертин', '#ffffff', { map: tx('m_travertine') })] },
  // hall
  { id: 'w_hall', room: 'hall', label: 'Стены прихожей', mats: ['w_hall', 'door_entry'], options: [C('Терракота (проект)', '#9e4b35'), C('Бордо', '#6e2a2c'), C('Оливковый', '#6b6a45'), C('Тёмно-синий', '#2a3550'), C('Грейж', '#bfb3a2')] },
  { id: 'floor_hall', room: 'hall', label: 'Плитка пола (прихожая, санузел)', mats: ['floor_hall', 'floor_wc'], options: [C('Скалоп мрамор (проект)', '#ffffff', { map: tx('scallop') }), C('Шахматка', '#ffffff', { map: tx('checker') }), C('Травертин', '#ffffff', { map: tx('m_travertine') })] },
  { id: 'wardrobe_hall', room: 'hall', label: 'Шкаф и скамья', mats: ['wardrobe_hall'], options: [C('Белый (проект)', '#ece6dd'), C('Кашемир', '#d4c8b6'), C('Терракота', '#9e4b35'), C('Графит', '#444')] },
  // girls
  { id: 'wallpaper_girls', room: 'girls', label: 'Обои за кроватью', mats: ['wallpaper_girls'], options: [C('Синяя шинуазри (проект)', '#ffffff', { map: tx('chino_blue') }), C('Розовая шинуазри', '#ffffff', { map: tx('chino_rose') }), C('Зелёная шинуазри', '#ffffff', { map: tx('chino_green') })] },
  { id: 'w_girls', room: 'girls', label: 'Стены', mats: ['w_girls'], options: [C('Молочный (проект)', '#ece7de'), C('Пудровый', '#ead8d2'), C('Небесный', '#d9e1ea'), C('Мятный', '#dbe5dc')] },
  { id: 'cur_girls', room: 'girls', label: 'Шторы', mats: ['cur_girls'], options: [C('Тёмно-синий (проект)', '#1e2a45'), C('Пыльная роза', '#b98a8a'), C('Шалфей', '#8f9c86'), C('Беж', '#c9b9a2')] },
  { id: 'armchair_girls', room: 'girls', label: 'Кресло и пуф', mats: ['armchair_girls'], options: [C('Беж (проект)', '#cbbca7'), C('Голубой', '#9fb3cc'), C('Розовый', '#d7aeb0')] },
  // boy
  { id: 'w_boy', room: 'boy', label: 'Стены', mats: ['w_boy'], options: [C('Лён (проект)', '#d8cfc2'), C('Серо-голубой', '#c3cbd0'), C('Шалфей', '#c2c6b0'), C('Графит светлый', '#b3b0aa')] },
  { id: 'oak_dark', room: 'boy', label: 'Дерево (ниша, шкаф, стол)', mats: ['oak_dark'], options: [C('Дуб тёмный (проект)', '#6e5a48'), C('Дуб светлый', '#c4ab8e'), C('Орех', '#80593b'), C('Тёмно-синий', '#2f3b52', { map: null })] },
  { id: 'throw_boy', room: 'boy', label: 'Покрывало', mats: ['throw_boy'], options: [C('Олива (проект)', '#6e7350'), C('Синий', '#33466b'), C('Терракота', '#9c5a40'), C('Серый', '#8a8a88')] },
  { id: 'bed_boy', room: 'boy', label: 'Кровать (велюр)', mats: ['bed_boy'], options: [C('Беж (проект)', '#b8a78f'), C('Серый', '#9a9894'), C('Синий', '#4a5c7c')] },
  // bedroom
  { id: 'headboard_bed', room: 'bed', label: 'Изголовье кровати', mats: ['headboard_bed'], options: [C('Олива (проект)', '#5c6140'), C('Терракота', '#a35b42'), C('Тёмно-синий', '#25304a'), C('Беж', '#c8b79f'), C('Пудра', '#c99d98')] },
  { id: 'w_bed', room: 'bed', label: 'Стены', mats: ['w_bed'], options: [C('Тёплый лён (проект)', '#ded5c7'), C('Пудра', '#e3cfc7'), C('Шалфей', '#c7cbb7'), C('Серо-бежевый', '#cbc4b9')] },
  { id: 'cur_bed', room: 'bed', label: 'Шторы', mats: ['cur_bed'], options: [C('Мокко (проект)', '#9d8b77'), C('Олива', '#6b6b4a'), C('Пудра', '#c9a49e'), C('Графит', '#4a4a4a')] },
  // bath
  { id: 'vanity_bath', room: 'bath', label: 'Тумба и экран ванны', mats: ['vanity_bath'], options: [C('Бордо (проект)', '#5a2024'), C('Тёмно-синий', '#24304a'), C('Олива', '#55573b'), C('Орех', '#7b5a40', { map: tx('veneer') })] },
  { id: 'slab_viola', room: 'bath', label: 'Мраморная стена', mats: ['slab_viola'], options: [C('Калакатта виола (проект)', '#ffffff', { map: tx('slab_viola') }), C('Калакатта', '#ffffff', { map: tx('m_calacatta') }), C('Оникс', '#ffffff', { map: tx('m_onyx') })] },
  { id: 'floor_bath', room: 'bath', label: 'Пол ванной', mats: ['floor_bath'], options: [C('Шахматка (проект)', '#ffffff', { map: tx('checker') }), C('Скалоп', '#ffffff', { map: tx('scallop') }), C('Травертин', '#ffffff', { map: tx('m_travertine') })] },
  // wc
  { id: 'w_shower', room: 'wc', label: 'Душевая', mats: ['w_shower'], options: [C('Оникс (проект)', '#ffffff', { map: tx('onyxTile') }), C('Калакатта', '#ffffff', { map: tx('m_calacatta') }), C('Травертин', '#ffffff', { map: tx('m_travertine') }), C('Зеллиж', '#ffffff', { map: tx('zellige') })] },
  { id: 'vanity_wc', room: 'wc', label: 'Тумба и шкафы', mats: ['vanity_wc'], options: [C('Орех (проект)', '#7c5b41'), C('Дуб светлый', '#c4ab8e'), C('Белый', '#efebe4'), C('Графит', '#3d3d3d')] },
  { id: 'bronze', room: 'wc', label: 'Рамы душевых дверей', mats: ['bronze'], options: [C('Бронза (проект)', '#7a5a43'), C('Чёрный', '#1d1d1d'), C('Латунь', '#c8a064')] },
  // wardrobe room
  { id: 'w_wardrobe', room: 'wardrobe', label: 'Стены', mats: ['w_wardrobe'], options: [C('Молочный (проект)', '#e7e1d7'), C('Грейж', '#cfc5b6'), C('Шалфей', '#c4c8b4')] },
];

export function applyOption(ctrl, idx) {
  const o = ctrl.options[idx];
  for (const k of ctrl.mats) {
    const m = MAT[k]; if (!m) continue;
    if (o.color) m.color.set(o.color);
    const t = 'map' in o ? (typeof o.map === 'function' ? o.map() : o.map) : m.userData.map0;
    if (m.map !== (t || null)) { m.map = t || null; m.needsUpdate = true; }
    m.roughness = o.roughness !== undefined ? o.roughness : m.userData.r0;
    if (m.metalness !== undefined) m.metalness = o.metalness !== undefined ? o.metalness : m.userData.m0;
  }
}
