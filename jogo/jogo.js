/* Leonardo Arena · portfólio jogável
   Bloco 1: mundo voxel, movimento, colisão e câmera.
   Bloco 2: criação de personagem.
   Bloco 3: luta (soco, chute, impacto, boneco de treino).
   Bloco 4: portfólio no mapa (dojos, Sobre mim, portal de contato).
   Bloco 5: missões, progresso e controles de toque.
   Bloco 6: desempenho adaptativo e plano B sem 3D. */
(() => {
  "use strict";

  const CLASSIC_URL = "https://leonardo-sferreira.github.io/portfolio/classico.html";

  /* Plano B: sem WebGL ou sem a biblioteca 3D, vai para a versão clássica. */
  function webglOK() {
    try {
      const c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) {
      return false;
    }
  }
  if (!window.THREE || !webglOK()) {
    window.location.replace(CLASSIC_URL);
    return;
  }

  /* O jogo roda na raiz do site (index.html) e também em /jogo/ durante testes. */
  const ASSET_BASE = /\/jogo\/?(index\.html)?$/.test(window.location.pathname) ? "../assets/" : "assets/";
  const isTouch = window.matchMedia("(pointer: coarse)").matches;

  const $ = (id) => document.getElementById(id);
  const V3 = THREE.Vector3;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const damp = (rate, dt) => 1 - Math.exp(-rate * dt);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };

  /* =========================================================
     CONFIGURAÇÃO
     ========================================================= */
  const WORLD = { R: 30, waterY: 0.55, seed: 7 };

  const COLORS = {
    sky: 0x8fd3f4,
    grass: ["#5cc46b", "#54b862", "#63cc72", "#4fae5c"],
    dirt: ["#8b5a2b", "#7d4f25", "#94622f"],
    sand: ["#e9d8a6", "#e2cf98", "#efdfb0"],
    stone: ["#d6d3d1", "#c8c4c1"],
    water: 0x2dd4bf,
    seabed: 0x1d6f74,
    trunk: ["#7a4b25", "#6d4220"],
    leaves: ["#2f9e55", "#38b262", "#27904a", "#43c06d"],
    rock: ["#9ca3af", "#8b939e", "#a8afb8"],
    flowers: ["#f87171", "#facc15", "#f472b6", "#ffffff", "#60a5fa"],
    cloud: 0xffffff,
  };

  /* Áreas do conteúdo. O treino já é usado no bloco 3; as outras entram no bloco 4. */
  const ZONES = [
    { id: "spawn", x: 0, z: 0, half: 3, accent: "#2dd4bf" },
    { id: "proj-01", x: 0, z: -17, half: 3, accent: "#ef4444" },
    { id: "proj-02", x: 17, z: 0, half: 3, accent: "#4f8ff0" },
    { id: "proj-03", x: 0, z: 17, half: 3, accent: "#22d3ee" },
    { id: "proj-04", x: -17, z: 0, half: 3, accent: "#f2c14e" },
    { id: "sobre", x: -9, z: 9, half: 2, accent: "#a78bfa" },
    { id: "treino", x: 9, z: -9, half: 2, accent: "#f97316" },
    { id: "contato", x: -10, z: -10, half: 2, accent: "#2dd4bf" },
  ];
  const zoneById = (id) => ZONES.find((z) => z.id === id);

  /* Opções da criação de personagem. */
  const OPTIONS = {
    skin: ["#f1c27d", "#d9a066", "#b07845", "#7a4a2a", "#4b2e1d"],
    hair: [["curto", "Curto"], ["moicano", "Moicano"], ["espetado", "Espetado"], ["careca", "Careca"]],
    hairColor: ["#1f1f1f", "#5b3a1e", "#c98d3a", "#e5e7eb", "#2dd4bf", "#ef4444"],
    outfit: [["kimono", "Kimono"], ["regata", "Regata"], ["jaqueta", "Jaqueta"]],
    outfitColor: ["#f5f5f5", "#1f2937", "#dc2626", "#2563eb", "#2dd4bf", "#f59e0b", "#7c3aed"],
    band: ["none", "#ef4444", "#f2c14e", "#2dd4bf", "#4f8ff0", "#111827"],
  };
  const DEFAULT_LOOK = {
    skin: "#d9a066", hair: "curto", hairColor: "#1f1f1f",
    outfit: "kimono", outfitColor: "#f5f5f5", band: "#ef4444", name: "",
  };

  /* Os números do portfólio viram "dano" no boneco de treino. */
  const DAMAGE = [
    "387 endpoints!", "486 testes!", "88 telas!", "103 tabelas!",
    "2 sistemas no ar!", "52 checks de CI!", "127 requisitos!", "40 entregas!",
  ];

  /* =========================================================
     RUÍDO DETERMINÍSTICO
     ========================================================= */
  function hash(x, z) {
    let h = Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + Math.imul(WORLD.seed, 982451653);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  function noise(x, z) {
    const xi = Math.floor(x), zi = Math.floor(z);
    const xf = x - xi, zf = z - zi;
    const s = (t) => t * t * (3 - 2 * t);
    const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
    const u = s(xf), v = s(zf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  let rngState = 12345;
  function rand() {
    rngState = (Math.imul(rngState, 1664525) + 1013904223) >>> 0;
    return rngState / 4294967296;
  }
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const pickAny = (arr) => arr[Math.floor(Math.random() * arr.length)];

  /* =========================================================
     RENDER, CENA, CÂMERA, LUZ
     ========================================================= */
  const canvas = $("game");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  let pixelRatio = Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  /* Cores escritas em sRGB (como no CSS) convertidas para o espaço linear do render. */
  const col = (c) => new THREE.Color(c).convertSRGBToLinear();

  const scene = new THREE.Scene();
  scene.background = col(COLORS.sky);
  scene.fog = new THREE.Fog(col(COLORS.sky), 55, 120);

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 300);
  const CAM_OFFSET = new V3(0, 11.5, 9);
  let camZoom = 1;
  const portrait = () => window.innerWidth / window.innerHeight < 0.8;
  const baseZoom = () => (portrait() ? 1.45 : 1);

  scene.add(new THREE.HemisphereLight(0xeaf7ff, 0x4a6b45, 0.7));
  const sun = new THREE.DirectionalLight(0xfff1d6, 0.8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048);
  const sc = sun.shadow.camera;
  sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22; sc.near = 1; sc.far = 80;
  sun.shadow.bias = -0.0006;
  scene.add(sun, sun.target);

  /* =========================================================
     TERRENO VOXEL
     ========================================================= */
  const R = WORLD.R;
  const heights = new Map();
  const surface = new Map();
  const key = (x, z) => x + "," + z;

  function islandRadius(x, z) {
    const a = Math.atan2(z, x);
    return R + (noise(Math.cos(a) * 2.2 + 20, Math.sin(a) * 2.2 + 20) - 0.5) * 9;
  }
  function zoneAt(x, z) {
    for (const zn of ZONES) {
      if (Math.abs(x - zn.x) <= zn.half && Math.abs(z - zn.z) <= zn.half) return zn;
    }
    return null;
  }

  for (let x = -R - 6; x <= R + 6; x++) {
    for (let z = -R - 6; z <= R + 6; z++) {
      const d = Math.hypot(x, z);
      const r = islandRadius(x, z);
      if (d > r) continue;
      const falloff = clamp((r - d) / 7, 0, 1);
      const n = noise(x / 7.5, z / 7.5) * 0.75 + noise(x / 3.1 + 50, z / 3.1 + 50) * 0.25;
      let h = 1 + Math.round(n * 3.4 * falloff);
      if (zoneAt(x, z)) h = 1;
      heights.set(key(x, z), h);
      surface.set(key(x, z), d > r - 2.6 ? "sand" : "grass");
    }
  }
  // vizinhos diferem no máximo 1 bloco: sempre dá para subir
  for (let pass = 0; pass < 6; pass++) {
    for (const [k, h] of heights) {
      const [x, z] = k.split(",").map(Number);
      let minN = Infinity;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        minN = Math.min(minN, heights.get(key(x + dx, z + dz)) ?? 0);
      }
      if (h > minN + 1) heights.set(k, Math.max(1, minN + 1));
    }
  }
  for (const zn of ZONES) {
    for (let x = zn.x - zn.half; x <= zn.x + zn.half; x++) {
      for (let z = zn.z - zn.half; z <= zn.z + zn.half; z++) {
        if (heights.has(key(x, z))) surface.set(key(x, z), zn);
      }
    }
  }
  const heightAt = (x, z) => heights.get(key(Math.round(x), Math.round(z))) ?? 0;

  const blocks = [];
  for (const [k, h] of heights) {
    const [x, z] = k.split(",").map(Number);
    const sideMin = Math.min(
      heights.get(key(x + 1, z)) ?? 0, heights.get(key(x - 1, z)) ?? 0,
      heights.get(key(x, z + 1)) ?? 0, heights.get(key(x, z - 1)) ?? 0
    );
    const surf = surface.get(k);
    for (let y = 0; y < h; y++) {
      const top = y === h - 1;
      if (!top && y >= sideMin) continue;
      let color;
      if (top) {
        if (typeof surf === "object") {
          const edge = Math.max(Math.abs(x - surf.x), Math.abs(z - surf.z)) === surf.half;
          color = edge ? surf.accent : COLORS.stone[(x + z) & 1];
        } else {
          color = pick(COLORS[surf]);
        }
      } else {
        color = surf === "sand" ? pick(COLORS.sand) : pick(COLORS.dirt);
      }
      blocks.push({ x, y, z, color });
    }
  }

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const voxelMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

  /* InstancedMesh de cubos. "origin" permite girar o conjunto em torno de um pivô. */
  function instanced(list, material = voxelMat, origin = null, parent = scene) {
    const mesh = new THREE.InstancedMesh(boxGeo, material, list.length);
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    const ox = origin ? origin.x : 0, oy = origin ? origin.y : 0, oz = origin ? origin.z : 0;
    list.forEach((b, i) => {
      const s = b.s || 1, sy = b.sy || s;
      m.makeScale(s, sy, s);
      m.setPosition(b.x - ox, b.y + sy / 2 - oy, b.z - oz);
      mesh.setMatrixAt(i, m);
      c.set(b.color).convertSRGBToLinear();
      c.offsetHSL(0, 0, (hash(Math.round(b.x * 3 + b.y), Math.round(b.z * 7 - b.y)) - 0.5) * 0.04);
      mesh.setColorAt(i, c);
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  instanced(blocks);

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshLambertMaterial({ color: col(COLORS.water), transparent: true, opacity: 0.8 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = WORLD.waterY;
  water.receiveShadow = true;
  scene.add(water);
  const seabed = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: col(COLORS.seabed) }));
  seabed.rotation.x = -Math.PI / 2;
  seabed.position.y = -1.2;
  scene.add(seabed);

  /* =========================================================
     DECORAÇÃO E COLISORES
     ========================================================= */
  const colliders = []; // círculos {x, z, r}
  const decoBlocks = [];
  const treeData = [];

  function freeSpot(x, z, minDist) {
    if (surface.get(key(x, z)) !== "grass") return false;
    for (const zn of ZONES) {
      if (Math.abs(x - zn.x) <= zn.half + 2 && Math.abs(z - zn.z) <= zn.half + 2) return false;
    }
    if (Math.hypot(x, z) < 6) return false;
    return !colliders.some((c) => Math.hypot(c.x - x, c.z - z) < minDist);
  }

  const cells = [...heights.keys()].map((k) => k.split(",").map(Number));
  for (let i = 0, trees = 0; i < 4000 && trees < 30; i++) {
    const [x, z] = pick(cells);
    if (!freeSpot(x, z, 3.2)) continue;
    const base = heights.get(key(x, z));
    const tall = 2 + Math.floor(rand() * 2);
    const tb = [];
    for (let y = 0; y < tall; y++) tb.push({ x, y: base + y, z, color: pick(COLORS.trunk) });
    const top = base + tall;
    const leaf = pick(COLORS.leaves);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        for (let dy = 0; dy < 2; dy++) {
          if (dy === 1 && Math.abs(dx) + Math.abs(dz) === 2) continue;
          if (rand() < 0.08) continue;
          tb.push({ x: x + dx, y: top + dy, z: z + dz, color: rand() < 0.75 ? leaf : pick(COLORS.leaves) });
        }
      }
    }
    tb.push({ x, y: top + 2, z, color: leaf });
    colliders.push({ x, z, r: 0.75 });
    treeData.push({ x, z, base, top, leaf, blocks: tb });
    trees++;
  }

  for (let i = 0, n = 0; i < 3000 && n < 16; i++) {
    const [x, z] = pick(cells);
    if (!freeSpot(x, z, 2.5)) continue;
    const base = heights.get(key(x, z));
    const big = rand() < 0.4;
    decoBlocks.push({ x, y: base, z, color: pick(COLORS.rock), s: big ? 1 : 0.8, sy: big ? 1 : 0.7 });
    if (big) decoBlocks.push({ x, y: base + 1, z, color: pick(COLORS.rock), s: 0.6, sy: 0.5 });
    colliders.push({ x, z, r: big ? 0.75 : 0.6 });
    n++;
  }

  for (let i = 0, n = 0; i < 3000 && n < 90; i++) {
    const [x, z] = pick(cells);
    if (surface.get(key(x, z)) !== "grass" || zoneAt(x, z)) continue;
    const base = heights.get(key(x, z));
    decoBlocks.push({ x: x + (rand() - 0.5) * 0.6, y: base, z: z + (rand() - 0.5) * 0.6, color: pick(COLORS.flowers), s: 0.18, sy: 0.22 });
    n++;
  }
  instanced(decoBlocks);

  /* Cada árvore num grupo próprio, com pivô na base: dá para balançar e ficar transparente. */
  const treeObjs = treeData.map((t) => {
    const group = new THREE.Group();
    group.position.set(t.x, t.base, t.z);
    scene.add(group);
    const material = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
    instanced(t.blocks, material, { x: t.x, y: t.base, z: t.z }, group);
    return { ...t, group, material, wobble: 0, wobbleV: 0, dirX: 0, dirZ: 0 };
  });

  const clouds = [];
  const cloudMat = new THREE.MeshLambertMaterial({ color: COLORS.cloud, transparent: true, opacity: 0.92 });
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group();
    const parts = 4 + Math.floor(rand() * 4);
    for (let p = 0; p < parts; p++) {
      const m = new THREE.Mesh(boxGeo, cloudMat);
      m.scale.set(2 + rand() * 3, 1 + rand() * 0.8, 2 + rand() * 2);
      m.position.set((rand() - 0.5) * 5, rand() * 0.8, (rand() - 0.5) * 3);
      m.castShadow = true;
      g.add(m);
    }
    g.position.set((rand() - 0.5) * 90, 16 + rand() * 6, (rand() - 0.5) * 90);
    g.userData.speed = 0.6 + rand() * 0.8;
    clouds.push(g);
    scene.add(g);
  }

  /* =========================================================
     PEÇAS VOXEL (personagem, boneco)
     ========================================================= */
  const matCache = new Map();
  function mat(color) {
    if (!matCache.has(color)) matCache.set(color, new THREE.MeshLambertMaterial({ color: col(color) }));
    return matCache.get(color);
  }
  function box(parent, w, h, d, color, x, y, z) {
    const m = new THREE.Mesh(boxGeo, mat(color));
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  function isDark(hex) {
    const c = new THREE.Color(hex);
    return c.r * 0.3 + c.g * 0.59 + c.b * 0.11 < 0.3;
  }

  function makeFighter(look) {
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);

    const sleeves = look.outfit === "regata" ? look.skin : look.outfitColor;
    const pants = look.outfit === "jaqueta" ? "#1f2937" : look.outfitColor;
    const shin = look.outfit === "regata" ? look.skin : pants;
    const belt = look.outfit === "kimono" ? (isDark(look.outfitColor) ? "#f2c14e" : "#111827") : "#374151";

    const legs = [-0.2, 0.2].map((x) => {
      const hip = new THREE.Group();
      hip.position.set(x, 0.82, 0);
      box(hip, 0.3, 0.42, 0.32, pants, 0, -0.21, 0);
      box(hip, 0.28, 0.3, 0.3, shin, 0, -0.56, 0);
      box(hip, 0.3, 0.12, 0.38, "#262626", 0, -0.76, 0.03);
      body.add(hip);
      return hip;
    });

    const torso = new THREE.Group();
    torso.position.y = 0.82;
    body.add(torso);
    box(torso, 0.78, 0.72, 0.44, look.outfitColor, 0, 0.36, 0);
    box(torso, 0.8, 0.1, 0.46, belt, 0, 0.05, 0);
    if (look.outfit === "kimono") box(torso, 0.22, 0.3, 0.02, look.skin, 0, 0.56, 0.225);
    if (look.outfit === "jaqueta") box(torso, 0.06, 0.62, 0.02, look.band === "none" ? "#9ca3af" : look.band, 0, 0.38, 0.225);

    const arms = [-1, 1].map((side) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.52, 0.66, 0);
      box(shoulder, 0.24, 0.4, 0.26, sleeves, 0, -0.18, 0);
      box(shoulder, 0.22, 0.26, 0.24, look.skin, 0, -0.49, 0);
      box(shoulder, 0.26, 0.22, 0.28, look.skin, 0, -0.7, 0.01);
      torso.add(shoulder);
      return shoulder;
    });

    const head = new THREE.Group();
    head.position.y = 0.76;
    torso.add(head);
    box(head, 0.56, 0.56, 0.54, look.skin, 0, 0.28, 0);
    box(head, 0.08, 0.1, 0.02, "#111111", -0.12, 0.3, 0.275);
    box(head, 0.08, 0.1, 0.02, "#111111", 0.12, 0.3, 0.275);
    box(head, 0.16, 0.04, 0.02, "#7c2d12", 0, 0.14, 0.275);

    const hc = look.hairColor;
    if (look.hair === "curto") {
      box(head, 0.6, 0.16, 0.58, hc, 0, 0.6, 0);
      box(head, 0.6, 0.3, 0.12, hc, 0, 0.42, -0.24);
      box(head, 0.06, 0.2, 0.5, hc, -0.29, 0.46, -0.02);
      box(head, 0.06, 0.2, 0.5, hc, 0.29, 0.46, -0.02);
    } else if (look.hair === "moicano") {
      box(head, 0.16, 0.26, 0.62, hc, 0, 0.68, -0.02);
    } else if (look.hair === "espetado") {
      box(head, 0.6, 0.12, 0.58, hc, 0, 0.6, 0);
      for (const [x, z] of [[-0.18, 0.12], [0.18, 0.12], [0, -0.05], [-0.2, -0.18], [0.2, -0.18]]) {
        box(head, 0.14, 0.22, 0.14, hc, x, 0.76, z);
      }
    }
    if (look.band !== "none") {
      box(head, 0.6, 0.09, 0.58, look.band, 0, 0.48, 0);
      box(head, 0.06, 0.3, 0.06, look.band, -0.08, 0.36, -0.32).rotation.x = 0.5;
      box(head, 0.06, 0.26, 0.06, look.band, 0.06, 0.38, -0.32).rotation.x = 0.7;
    }

    root.scale.setScalar(0.92);
    return { root, body, torso, head, legs, arms };
  }

  /* =========================================================
     JOGADOR
     ========================================================= */
  const RADIUS = 0.32;
  const SPEED = { walk: 4.6, run: 8.4 };
  const GRAVITY = 24;
  const JUMP = 8.4;
  const SPAWN = { x: 0, z: 0 };

  const savedLook = store.get("arenaLook");
  const player = {
    pos: new V3(SPAWN.x, heightAt(SPAWN.x, SPAWN.z), SPAWN.z),
    vel: new V3(),
    vy: 0,
    onGround: true,
    yaw: 0,
    renderY: heightAt(SPAWN.x, SPAWN.z),
    walkPhase: 0,
    look: { ...DEFAULT_LOOK, ...(savedLook || {}) },
    model: null,
    attack: null,     // { type, side, t, dur, hitAt, hit }
    nextSide: 1,
  };

  function setLook(look) {
    const keepPos = player.model ? player.model.root.position.clone() : null;
    if (player.model) scene.remove(player.model.root);
    player.look = { ...look };
    player.model = makeFighter(player.look);
    if (keepPos) player.model.root.position.copy(keepPos);
    player.model.root.rotation.y = player.yaw;
    scene.add(player.model.root);
  }
  setLook(player.look);

  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 20),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })
  );
  blob.rotation.x = -Math.PI / 2;
  scene.add(blob);

  const FOOT = [[0, 0], [RADIUS, 0], [-RADIUS, 0], [0, RADIUS], [0, -RADIUS]];
  function groundUnder(x, z) {
    let max = 0;
    for (const [dx, dz] of FOOT) max = Math.max(max, heightAt(x + dx, z + dz));
    return max;
  }
  function walkable(x, z, feetY, grounded) {
    for (const [dx, dz] of FOOT) {
      const h = heightAt(x + dx, z + dz);
      if (h === 0) return false;
      if (h > feetY + (grounded ? 1.01 : 0.35)) return false;
    }
    return true;
  }
  function pushOutOfColliders(p) {
    for (const c of colliders) {
      const dx = p.x - c.x, dz = p.z - c.z;
      const d = Math.hypot(dx, dz);
      const min = c.r + RADIUS;
      if (d < min && d > 0.0001) {
        p.x = c.x + (dx / d) * min;
        p.z = c.z + (dz / d) * min;
      }
    }
  }

  /* =========================================================
     BONECO DE TREINO (bloco 3)
     ========================================================= */
  const treino = zoneById("treino");
  const dummy = (() => {
    const base = heightAt(treino.x, treino.z);
    const group = new THREE.Group();
    group.position.set(treino.x, base, treino.z);
    scene.add(group);
    box(group, 1, 0.25, 1, "#6b7280", 0, 0.125, 0);
    const pivot = new THREE.Group(); // balança em torno da base
    pivot.position.y = 0.25;
    group.add(pivot);
    box(pivot, 0.22, 1.1, 0.22, "#7a4b25", 0, 0.55, 0);
    box(pivot, 0.72, 0.9, 0.5, "#d6b26e", 0, 1.4, 0);
    box(pivot, 0.76, 0.08, 0.54, "#a16207", 0, 1.1, 0);
    box(pivot, 1.4, 0.16, 0.16, "#7a4b25", 0, 1.65, 0);
    box(pivot, 0.5, 0.5, 0.5, "#e9d8a6", 0, 2.12, 0);
    box(pivot, 0.34, 0.34, 0.02, "#ffffff", 0, 2.12, 0.26);
    box(pivot, 0.22, 0.22, 0.03, "#ef4444", 0, 2.12, 0.265);
    box(pivot, 0.1, 0.1, 0.04, "#ffffff", 0, 2.12, 0.27);
    colliders.push({ x: treino.x, z: treino.z, r: 0.55 });
    return { group, pivot, x: treino.x, z: treino.z, tilt: 0, tiltV: 0, dirX: 0, dirZ: 1, dmg: 0 };
  })();

  /* Alvos que reagem a golpes. */
  const targets = [
    {
      kind: "dummy", x: dummy.x, z: dummy.z, r: 0.55,
      onHit(dirX, dirZ, attack, combo) {
        dummy.dirX = dirX; dummy.dirZ = dirZ;
        dummy.tiltV += attack.type === "kick" ? 7 : 4.5;
        const at = new V3(dummy.x, dummy.group.position.y + 2.2, dummy.z);
        burst(at, ["#d6b26e", "#e9d8a6", "#a16207"], attack.type === "kick" ? 16 : 10, 4.5);
        const text = DAMAGE[dummy.dmg++ % DAMAGE.length];
        floatText(text, at, attack.type === "kick" || combo >= 3 ? "big" : "");
        if (combo >= 3) floatText(`COMBO x${combo}`, at.clone().add(new V3(0, 0.9, 0)), "combo");
      },
    },
    ...treeObjs.map((t) => ({
      kind: "tree", x: t.x, z: t.z, r: 0.75,
      onHit(dirX, dirZ, attack) {
        t.dirX = dirX; t.dirZ = dirZ;
        t.wobbleV += attack.type === "kick" ? 1.6 : 1;
        burst(new V3(t.x, t.top + 0.5, t.z), [t.leaf, ...COLORS.leaves], 8, 3);
      },
    })),
  ];

  function updateSprings(dt) {
    dummy.tiltV += (-60 * dummy.tilt - 5 * dummy.tiltV) * dt;
    dummy.tilt += dummy.tiltV * dt;
    dummy.tilt = clamp(dummy.tilt, -0.7, 0.7);
    dummy.pivot.rotation.x = dummy.dirZ * dummy.tilt * 0.6;
    dummy.pivot.rotation.z = -dummy.dirX * dummy.tilt * 0.6;
    for (const t of treeObjs) {
      if (Math.abs(t.wobble) < 0.0005 && Math.abs(t.wobbleV) < 0.0005) continue;
      t.wobbleV += (-90 * t.wobble - 7 * t.wobbleV) * dt;
      t.wobble += t.wobbleV * dt;
      t.group.rotation.x = t.dirZ * t.wobble * 0.08;
      t.group.rotation.z = -t.dirX * t.wobble * 0.08;
    }
  }

  /* =========================================================
     PARTÍCULAS, TEXTOS FLUTUANTES, TREMOR, SOM
     ========================================================= */
  const particles = [];
  const POOL = 90;
  for (let i = 0; i < POOL; i++) {
    const m = new THREE.Mesh(boxGeo, mat("#ffffff"));
    m.visible = false;
    scene.add(m);
    particles.push({ m, vel: new V3(), life: 0 });
  }
  let pIdx = 0;
  function burst(at, colors, n, speed) {
    for (let i = 0; i < n; i++) {
      const p = particles[pIdx++ % POOL];
      p.m.material = mat(pickAny(colors));
      p.m.position.copy(at);
      const s = 0.09 + Math.random() * 0.12;
      p.m.scale.set(s, s, s);
      p.m.visible = true;
      p.vel.set((Math.random() - 0.5) * speed, Math.random() * speed * 0.9 + 1.5, (Math.random() - 0.5) * speed);
      p.life = 0.6 + Math.random() * 0.4;
    }
  }
  function updateParticles(dt) {
    for (const p of particles) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.vel.y -= 16 * dt;
      p.m.position.addScaledVector(p.vel, dt);
      p.m.rotation.x += dt * 8;
      p.m.rotation.y += dt * 6;
      const g = heightAt(p.m.position.x, p.m.position.z);
      if (p.m.position.y < g) { p.m.position.y = g; p.vel.multiplyScalar(0.4); p.vel.y = Math.abs(p.vel.y) * 0.3; }
      if (p.life <= 0) p.m.visible = false;
    }
  }

  const floatersEl = $("floaters");
  const floaters = [];
  const projV = new V3();
  function toScreen(v) {
    projV.copy(v).project(camera);
    return {
      x: (projV.x * 0.5 + 0.5) * window.innerWidth,
      y: (-projV.y * 0.5 + 0.5) * window.innerHeight,
      visible: projV.z < 1,
    };
  }
  function floatText(text, at, cls = "") {
    const el = document.createElement("div");
    el.className = "floater " + cls;
    el.textContent = text;
    floatersEl.appendChild(el);
    floaters.push({ el, pos: at.clone().add(new V3((Math.random() - 0.5) * 0.6, 0, 0)), life: 1.1, max: 1.1 });
  }
  function updateFloaters(dt) {
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i];
      f.life -= dt;
      f.pos.y += dt * 1.4;
      const s = toScreen(f.pos);
      const k = f.life / f.max;
      f.el.style.left = s.x + "px";
      f.el.style.top = s.y + "px";
      f.el.style.opacity = String(clamp(k * 2, 0, 1));
      f.el.style.transform = `translate(-50%, -50%) scale(${1 + (1 - k) * 0.25})`;
      if (f.life <= 0) { f.el.remove(); floaters.splice(i, 1); }
    }
  }

  /* Placa com o nome do lutador e rótulos fixos no mundo. */
  const labels = [];
  const tmp2 = new V3();
  function addLabel(text, getPos, cls = "label") {
    const el = document.createElement("div");
    el.className = "floater " + cls;
    el.textContent = text;
    floatersEl.appendChild(el);
    const l = { el, getPos, maxDist: 26, hidden: false };
    labels.push(l);
    return l;
  }
  const nameTag = addLabel("", () => tmp2.copy(player.model.root.position).add(new V3(0, 2.55, 0)), "label name");
  const treinoLabel = addLabel("TREINO · bata no boneco", () => new V3(dummy.x, dummy.group.position.y + 3.1, dummy.z));
  treinoLabel.minDist = 3.5; // some quando você está batendo, para não cobrir o dano
  function updateLabels() {
    for (const l of labels) {
      if (l.hidden || mode !== "play") { l.el.style.display = "none"; continue; }
      const p = l.getPos();
      const s = toScreen(p);
      const dist = Math.hypot(p.x - player.pos.x, p.z - player.pos.z);
      const far = dist > l.maxDist || dist < (l.minDist || 0);
      const underHud = s.y > window.innerHeight - 110 || s.y < 70;
      l.el.style.display = s.visible && !far && !underHud ? "" : "none";
      l.el.style.left = s.x + "px";
      l.el.style.top = s.y + "px";
    }
  }

  let shake = 0;
  let hitStop = 0;

  const audio = {
    ctx: null,
    muted: store.get("arenaMuted") === true,
    init() {
      if (this.ctx) return;
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    },
    noise(dur, freq, gain, type = "lowpass") {
      if (!this.ctx || this.muted) return;
      const c = this.ctx, t = c.currentTime;
      const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const src = c.createBufferSource();
      src.buffer = buf;
      const f = c.createBiquadFilter();
      f.type = type; f.frequency.value = freq;
      const g = c.createGain();
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(f).connect(g).connect(c.destination);
      src.start(t);
    },
    thump(freq, gain) {
      if (!this.ctx || this.muted) return;
      const c = this.ctx, t = c.currentTime;
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(freq, t);
      o.frequency.exponentialRampToValueAtTime(freq * 0.4, t + 0.15);
      const g = c.createGain();
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + 0.2);
    },
    swing() { this.noise(0.12, 2600, 0.05, "highpass"); },
    hit(strong) { this.noise(0.16, strong ? 900 : 1300, strong ? 0.35 : 0.25); this.thump(strong ? 110 : 150, strong ? 0.5 : 0.35); },
    jump() { this.thump(320, 0.08); },
  };

  /* =========================================================
     ENTRADA
     ========================================================= */
  const keys = new Set();
  const CODES = {
    up: ["KeyW", "ArrowUp"],
    down: ["KeyS", "ArrowDown"],
    left: ["KeyA", "ArrowLeft"],
    right: ["KeyD", "ArrowRight"],
    run: ["ShiftLeft", "ShiftRight"],
    jump: ["Space"],
    punch: ["KeyJ"],
    kick: ["KeyK"],
    edit: ["KeyC"],
    mute: ["KeyM"],
    interact: ["KeyE"],
  };
  const held = (action) => CODES[action].some((c) => keys.has(c));
  let jumpQueued = false;
  let attackQueued = null;
  let mode = "creator"; // "creator" | "play" | "panel"
  const joy = { x: 0, y: 0 };

  window.addEventListener("keydown", (e) => {
    if (e.target && e.target.tagName === "INPUT") return;
    if (mode === "panel") {
      if (e.code === "Escape") closePanel();
      return;
    }
    if (mode !== "play") return;
    const code = e.code;
    if (Object.values(CODES).flat().includes(code)) e.preventDefault();
    if (!e.repeat) {
      if (CODES.jump.includes(code)) jumpQueued = true;
      if (CODES.punch.includes(code)) attackQueued = "punch";
      if (CODES.kick.includes(code)) attackQueued = "kick";
      if (CODES.edit.includes(code)) openCreator();
      if (CODES.mute.includes(code)) toggleMute();
      if (CODES.interact.includes(code)) interact();
    }
    keys.add(code);
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));

  /* Mouse: clique esquerdo = soco, clique direito = chute (só dentro do jogo, não nos botões da tela). */
  canvas.addEventListener("mousedown", (e) => {
    if (mode !== "play") return;
    if (e.button === 0) attackQueued = "punch";
    else if (e.button === 2) attackQueued = "kick";
    else return;
    e.preventDefault();
  });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  window.addEventListener("blur", () => keys.clear());
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (mode === "play") camZoom = clamp(camZoom + Math.sign(e.deltaY) * 0.08, 0.65, 1.5);
  }, { passive: false });

  function toggleMute() {
    audio.muted = !audio.muted;
    store.set("arenaMuted", audio.muted);
    toast(audio.muted ? "Som desligado" : "Som ligado");
  }
  let toastTimer = null;
  function toast(text, ms = 2200) {
    const el = $("toast");
    el.textContent = text;
    el.classList.remove("hidden");
    el.style.animation = "none";
    void el.offsetWidth;
    el.style.animation = "";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add("hidden"), ms);
  }

  /* =========================================================
     GOLPES (bloco 3)
     ========================================================= */
  const ATTACKS = {
    punch: { dur: 0.3, hitAt: 0.11, reach: 1.05 },
    kick: { dur: 0.46, hitAt: 0.2, reach: 1.35 },
  };
  let combo = 0;
  let lastHitAt = -10;

  function canAttack(type) {
    if (!player.attack) return true;
    // dá para encadear socos rápidos depois do ponto de acerto
    return player.attack.type === "punch" && type === "punch" && player.attack.t > player.attack.hitAt + 0.04;
  }

  /* Golpe apertado cedo demais fica guardado um instante, como nos jogos de luta. */
  let buffered = null;
  function queueAttack(type, dt) {
    if (type) buffered = { type, ttl: 0.35 };
    if (!buffered) return;
    if (canAttack(buffered.type)) {
      startAttack(buffered.type);
      buffered = null;
    } else {
      buffered.ttl -= dt;
      if (buffered.ttl <= 0) buffered = null;
    }
  }

  function startAttack(type) {
    const a = ATTACKS[type];
    const side = type === "punch" ? (player.nextSide = -player.nextSide) : 1;
    // mira assistida: vira para o alvo mais próximo à frente; se estiver colado, vira até para trás
    const near = nearestTarget(2.4, -0.2) || nearestTarget(1.6, -1.01);
    if (near) player.yaw = Math.atan2(near.x - player.pos.x, near.z - player.pos.z);
    player.attack = { type, side, t: 0, dur: a.dur, hitAt: a.hitAt, reach: a.reach, hit: false };
    audio.swing();
  }

  function nearestTarget(range, minDot) {
    const fx = Math.sin(player.yaw), fz = Math.cos(player.yaw);
    let best = null, bestD = Infinity;
    for (const t of targets) {
      const dx = t.x - player.pos.x, dz = t.z - player.pos.z;
      const d = Math.hypot(dx, dz) - t.r;
      if (d > range) continue;
      const dot = (dx * fx + dz * fz) / (Math.hypot(dx, dz) || 1);
      if (dot < minDot) continue;
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  function resolveHit() {
    const a = player.attack;
    const t = nearestTarget(a.reach, 0.35);
    if (!t) return;
    const now = performance.now() / 1000;
    combo = now - lastHitAt < 0.9 ? combo + 1 : 1;
    lastHitAt = now;
    const dx = t.x - player.pos.x, dz = t.z - player.pos.z;
    const len = Math.hypot(dx, dz) || 1;
    t.onHit(dx / len, dz / len, a, combo);
    const strong = a.type === "kick" || combo >= 3;
    audio.hit(strong);
    if (!reduceMotion) shake = Math.max(shake, strong ? 0.32 : 0.18);
    hitStop = strong ? 0.08 : 0.05;
    hits.total++;
  }
  const hits = { total: 0 };

  /* =========================================================
     ATUALIZAÇÃO DO JOGADOR
     ========================================================= */
  const tmp = new V3();

  function updatePlayer(dt) {
    tmp.set(0, 0, 0);
    let joyRun = false;
    if (mode === "play") {
      if (held("up")) tmp.z -= 1;
      if (held("down")) tmp.z += 1;
      if (held("left")) tmp.x -= 1;
      if (held("right")) tmp.x += 1;
      const jm = Math.hypot(joy.x, joy.y);
      if (jm > 0.15) { tmp.x += joy.x; tmp.z += joy.y; joyRun = jm > 0.9; }
    }
    if (tmp.lengthSq() > 0) tmp.normalize();

    if (mode === "play") queueAttack(attackQueued, dt);
    attackQueued = null;

    const attacking = !!player.attack;
    const speed = (held("run") || joyRun ? SPEED.run : SPEED.walk) * (attacking && player.onGround ? 0.25 : 1);
    const accel = player.onGround ? 14 : 5;
    player.vel.x = lerp(player.vel.x, tmp.x * speed, damp(accel, dt));
    player.vel.z = lerp(player.vel.z, tmp.z * speed, damp(accel, dt));

    const p = player.pos;
    const nx = p.x + player.vel.x * dt;
    if (walkable(nx, p.z, p.y, player.onGround)) p.x = nx; else player.vel.x = 0;
    const nz = p.z + player.vel.z * dt;
    if (walkable(p.x, nz, p.y, player.onGround)) p.z = nz; else player.vel.z = 0;
    pushOutOfColliders(p);

    if (jumpQueued && player.onGround && mode === "play") {
      player.vy = JUMP;
      player.onGround = false;
      audio.jump();
    }
    jumpQueued = false;
    player.vy -= GRAVITY * dt;
    p.y += player.vy * dt;

    const ground = groundUnder(p.x, p.z);
    if (p.y <= ground) {
      p.y = ground;
      player.vy = 0;
      player.onGround = true;
    } else if (p.y > ground + 0.05) {
      player.onGround = false;
    }

    const horiz = Math.hypot(player.vel.x, player.vel.z);
    if (mode === "creator") {
      player.yaw += dt * 0.7;
    } else if (horiz > 0.3 && !attacking) {
      const target = Math.atan2(player.vel.x, player.vel.z);
      let diff = target - player.yaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      player.yaw += diff * damp(14, dt);
    }

    if (player.attack) {
      const a = player.attack;
      a.t += dt;
      if (!a.hit && a.t >= a.hitAt) { a.hit = true; resolveHit(); }
      if (a.t >= a.dur) player.attack = null;
    }

    animateFighter(dt, horiz);
  }

  function animateFighter(dt, horiz) {
    const f = player.model;
    const t = performance.now() / 1000;
    const moveAmt = clamp(horiz / SPEED.walk, 0, 1.6);
    player.walkPhase += dt * (4 + horiz * 1.6);
    const s = Math.sin(player.walkPhase);

    player.renderY = lerp(player.renderY, player.pos.y, damp(18, dt));
    f.root.position.set(player.pos.x, player.renderY, player.pos.z);
    f.root.rotation.y = player.yaw;

    const air = !player.onGround;
    const swing = air ? 0 : s * 0.75 * Math.min(moveAmt, 1.2);

    // pose base: guarda
    const guard = -1.25 + Math.sin(t * 3) * 0.05;
    let armL = guard - (air ? 0.6 : -swing * 0.35);
    let armR = guard - (air ? 0.6 : swing * 0.35);
    let armLz = 0.25, armRz = -0.25;
    let reachL = 0, reachR = 0;
    let legL = air ? -0.7 : swing;
    let legR = air ? 0.35 : -swing;
    let twist = Math.sin(t * 1.5) * 0.04;
    let lean = clamp(horiz / SPEED.run, 0, 1) * 0.22;
    let lunge = 0;

    const a = player.attack;
    if (a) {
      // curva do golpe: sai rápido, volta devagar
      const k = a.t < a.hitAt ? a.t / a.hitAt : 1 - (a.t - a.hitAt) / (a.dur - a.hitAt);
      const e = clamp(k, 0, 1);
      if (a.type === "punch") {
        const straight = lerp(guard, -1.62, e);
        if (a.side > 0) { armR = straight; armRz = lerp(-0.25, 0.05, e); reachR = 0.28 * e; }
        else { armL = straight; armLz = lerp(0.25, -0.05, e); reachL = 0.28 * e; }
        twist = a.side * 0.45 * e;
        lunge = 0.12 * e;
      } else {
        legR = lerp(legR, -1.55, e);
        legL = lerp(legL, 0.25, e);
        lean = -0.3 * e;
        armL = lerp(armL, -0.4, e); armLz = lerp(0.25, 0.9, e);
        twist = -0.35 * e;
      }
    }

    f.legs[0].rotation.x = legL;
    f.legs[1].rotation.x = legR;
    f.arms[0].rotation.x = armL;
    f.arms[1].rotation.x = armR;
    f.arms[0].rotation.z = armLz;
    f.arms[1].rotation.z = armRz;
    f.arms[0].position.z = reachL;
    f.arms[1].position.z = reachR;

    f.body.position.y = air ? 0 : Math.abs(s) * 0.06 * moveAmt + Math.sin(t * 3) * 0.015;
    f.body.position.z = lunge;
    f.torso.rotation.x = lean;
    f.torso.rotation.y = twist;

    const g = groundUnder(player.pos.x, player.pos.z);
    blob.position.set(player.pos.x, g + 0.02, player.pos.z);
    blob.scale.setScalar(clamp(1 - (player.pos.y - g) * 0.18, 0.5, 1));
  }

  /* =========================================================
     CÂMERA
     ========================================================= */
  const camTarget = new V3();
  const camLook = new V3();
  const CREATOR_CAM = {
    wide: { pos: new V3(-2.4, 3.4, 6.2), look: new V3(-1.9, 0.85, 0) },
    tall: { pos: new V3(0, 5.2, 8.4), look: new V3(0, -1.6, 0) },
  };

  function updateCamera(dt, snap = false) {
    const root = player.model.root.position;
    if (mode === "creator") {
      const c = portrait() ? CREATOR_CAM.tall : CREATOR_CAM.wide;
      camTarget.copy(c.pos).add(root);
      tmp.copy(c.look).add(root);
    } else {
      camTarget.copy(CAM_OFFSET).multiplyScalar(camZoom * baseZoom()).add(root);
      tmp.copy(root);
      tmp.y += 1.2;
    }
    if (snap) { camera.position.copy(camTarget); camLook.copy(tmp); }
    else {
      camera.position.lerp(camTarget, damp(mode === "creator" ? 5 : 3.5, dt));
      camLook.lerp(tmp, damp(6, dt));
    }
    if (shake > 0.001) {
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake;
      shake *= Math.exp(-dt * 14);
    }
    camera.lookAt(camLook);

    sun.position.set(player.pos.x + 14, player.pos.y + 26, player.pos.z + 10);
    sun.target.position.copy(player.pos);
  }

  /* Árvore entre a câmera e o lutador fica quase transparente. */
  function updateTreeFade(dt) {
    const px = player.pos.x, pz = player.pos.z;
    const vx = camera.position.x - px, vz = camera.position.z - pz;
    const len2 = vx * vx + vz * vz || 1;
    for (const t of treeObjs) {
      const u = clamp(((t.x - px) * vx + (t.z - pz) * vz) / len2, 0, 1);
      const dx = px + vx * u - t.x, dz = pz + vz * u - t.z;
      const blocking = mode === "play" && u > 0.02 && u < 0.85 && Math.hypot(dx, dz) < 2.1;
      t.material.opacity = lerp(t.material.opacity, blocking ? 0.22 : 1, damp(8, dt));
      t.material.depthWrite = t.material.opacity > 0.95;
    }
    for (const f of (typeof fadeables !== "undefined" ? fadeables : [])) {
      const u = clamp(((f.x - px) * vx + (f.z - pz) * vz) / len2, 0, 1);
      const dx = px + vx * u - f.x, dz = pz + vz * u - f.z;
      const blocking = mode === "play" && u > 0.02 && u < 0.85 && Math.hypot(dx, dz) < f.radius;
      f.opacity = lerp(f.opacity, blocking ? 0.25 : 1, damp(8, dt));
      for (const m of f.mats) { m.opacity = f.opacity; m.depthWrite = f.opacity > 0.95; }
    }
  }

  /* =========================================================
     CRIAÇÃO DE PERSONAGEM (bloco 2)
     ========================================================= */
  const creatorEl = $("creator");
  const nameInput = $("fighterName");

  function renderOptions() {
    for (const group of creatorEl.querySelectorAll("[data-opt]")) {
      const opt = group.dataset.opt;
      group.innerHTML = "";
      for (const item of OPTIONS[opt]) {
        const [value, text] = Array.isArray(item) ? item : [item, null];
        const b = document.createElement("button");
        b.type = "button";
        b.dataset.value = value;
        if (text) b.textContent = text;
        else if (value === "none") { b.className = "none"; b.title = "Sem faixa"; b.setAttribute("aria-label", "Sem faixa"); }
        else { b.style.background = value; b.setAttribute("aria-label", value); }
        b.addEventListener("click", () => {
          player.look[opt] = value;
          applyLook();
        });
        group.appendChild(b);
      }
    }
  }
  function syncActive() {
    for (const group of creatorEl.querySelectorAll("[data-opt]")) {
      for (const b of group.children) b.classList.toggle("active", player.look[group.dataset.opt] === b.dataset.value);
    }
  }
  function applyLook() {
    setLook(player.look);
    syncActive();
    store.set("arenaLook", player.look);
  }
  function fighterName() {
    return (player.look.name || "").trim() || "Visitante";
  }
  function updateName() {
    nameTag.el.textContent = fighterName();
    $("hudName").textContent = fighterName();
  }
  nameInput.addEventListener("input", () => {
    player.look.name = nameInput.value.slice(0, 14);
    store.set("arenaLook", player.look);
    updateName();
  });
  nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") startGame(); });

  $("randomBtn").addEventListener("click", () => {
    for (const opt of ["skin", "hair", "hairColor", "outfit", "outfitColor", "band"]) {
      const item = pickAny(OPTIONS[opt]);
      player.look[opt] = Array.isArray(item) ? item[0] : item;
    }
    applyLook();
  });
  $("startBtn").addEventListener("click", startGame);
  $("editBtn").addEventListener("click", openCreator);

  function openCreator() {
    mode = "creator";
    keys.clear();
    player.attack = null;
    creatorEl.classList.remove("hidden");
    $("hud").classList.add("hidden");
    $("touch").classList.add("hidden");
    nameInput.value = player.look.name || "";
  }
  function startGame() {
    audio.init();
    if (audio.ctx && audio.ctx.state === "suspended") audio.ctx.resume();
    mode = "play";
    player.yaw = 0;
    creatorEl.classList.add("hidden");
    $("hud").classList.remove("hidden");
    if (isTouch) $("touch").classList.remove("hidden");
    renderQuests();
    updateName();
    if (document.activeElement) document.activeElement.blur();
    if (!store.get("arenaHelloSeen")) {
      toast(isTouch ? "Vá até o TREINO e use os botões Soco e Chute no boneco!" : "Vá até o TREINO e use o clique (ou J e K) no boneco!", 3600);
      store.set("arenaHelloSeen", true);
    }
  }

  renderOptions();
  syncActive();
  updateName();

  /* =========================================================
     PORTFÓLIO NO MAPA (bloco 4)
     ========================================================= */
  const LINKS = {
    email: "mailto:leonardoferreira0409@gmail.com",
    linkedin: "https://www.linkedin.com/in/ferreirasantosleonardo",
    github: "https://github.com/leonardo-sferreira",
    cv: ASSET_BASE + "CV-Leonardo-dos-Santos.pdf",
    classic: CLASSIC_URL,
  };

  const PROJECTS = {
    "proj-01": {
      num: "01", title: "PS Fila Prioritária", short: "Fila Prioritária",
      kicker: "Engenharia de Software · Saúde", status: "Finalizado · Projeto acadêmico (Impacta)",
      role: "Product Owner: defini as regras de priorização clínica, prototipei as telas, modelei o banco e validei as entregas.",
      desc: [
        "Fila de pronto-socorro que chama primeiro <strong>quem está pior</strong>, não quem chegou antes.",
        "Classifica cada paciente em Vermelha, Amarela ou Azul por sintomas e sinais vitais, direciona a ficha à especialidade certa e mostra as chamadas num painel público sem nome nem CPF. O sistema ganhou o nome de Prioriza.",
      ],
      stats: ["33 telas", "71 endpoints", "23 tabelas", "486 testes"],
      tags: ["Reflex", "Xano", "pytest", "OpenSpec"],
      img: "ps-fila-painel.png",
      links: [["Documentação", "https://leonardo-sferreira.github.io/ps-fila-prioritaria/", true], ["Código", "https://github.com/leonardo-sferreira/ps-fila-prioritaria"]],
    },
    "proj-02": {
      num: "02", title: "ConectaRH", short: "ConectaRH",
      kicker: "Engenharia de Software · RH", status: "Finalizado e publicado · Projeto acadêmico",
      role: "Participei do desenho das regras de negócio e do modelo de dados, além de construir boa parte das telas em Streamlit e a integração com o backend em Xano.",
      desc: [
        "Plataforma de RH que tira <strong>ponto, férias, documentos e desligamento</strong> das planilhas e do e-mail.",
        "Quatro perfis de acesso, motor de regras trabalhistas por tipo de contrato, LGPD e auditoria de cada decisão: quem fez, o quê, quando e por quê.",
      ],
      stats: ["55 telas", "316 endpoints", "80 tabelas", "52 checks no CI"],
      tags: ["Streamlit", "Xano", "Supabase", "Brevo"],
      img: "conectarh-inicio.png",
      links: [["Documentação", "https://leonardo-sferreira.github.io/conectahr/", true], ["Código", "https://github.com/leonardo-sferreira/conectahr"]],
    },
    "proj-03": {
      num: "03", title: "Sabor Local", short: "Sabor Local",
      kicker: "UX/UI · Prototipação", status: "Protótipo · Projeto acadêmico",
      role: "Design de ponta a ponta no Figma: fluxos, telas e protótipo navegável.",
      desc: [
        "Delivery de comida mineira pensado nos <strong>dois lados da operação</strong>: o app do cliente e o painel do restaurante.",
        "Cardápio, carrinho, cupom, pagamento e pedido no mapa; no painel, pedidos, relatórios, chat, cupons e produtos.",
      ],
      stats: ["~75 telas no app", "22 telas no painel"],
      tags: ["Figma", "FlutterFlow", "UX/UI"],
      img: "sabor-local-home.png",
      links: [["Protótipo no Figma", "https://www.figma.com/design/iRn8igu0iCwyqYTathrz9P/Sabor-local?node-id=0-1", true], ["Telas", "https://github.com/leonardo-sferreira/SaborLocal-Figma"]],
    },
    "proj-04": {
      num: "04", title: "Bot de Finanças", short: "Bot de Finanças",
      kicker: "Automação · Uso pessoal", status: "Em uso pessoal · Repositório privado",
      role: "Projetei e implementei sozinho, do fluxo de conversa no Telegram até a integração com o Notion.",
      desc: [
        "Transforma uma mensagem curta, como <strong>“45,90 almoço”</strong>, num lançamento organizado no Notion.",
        "Lança recorrentes sozinho, avisa faturas e parcelas que vencem em 3 dias, manda resumo semanal e fecha o mês.",
      ],
      stats: [],
      tags: ["Python", "Telegram Bot API", "Notion API"],
      img: null,
      links: [],
    },
  };

  /* ---------- painel de conteúdo ---------- */
  const panelEl = $("panel");
  const panelBody = $("panelBody");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const linkHtml = ([text, href, main]) =>
    `<a href="${esc(href)}" target="_blank" rel="noopener"${main ? ' class="main"' : ""}>${esc(text)} →</a>`;

  function projectHtml(p) {
    return `
      ${p.img ? `<img class="panel-img" data-file="${esc(p.img)}" alt="Tela do projeto ${esc(p.title)}">` : ""}
      <div class="panel-content">
        <p class="panel-kicker">Projeto ${p.num} · ${esc(p.kicker)}</p>
        <h2 id="panelTitle">${esc(p.title)}</h2>
        <span class="panel-status">${esc(p.status)}</span>
        <div class="panel-role"><b>Meu papel</b><span>${esc(p.role)}</span></div>
        ${p.desc.map((d) => `<p>${d}</p>`).join("")}
        ${p.stats.length ? `<div class="panel-stats">${p.stats.map((s) => `<span>${esc(s)}</span>`).join("")}</div>` : ""}
        <div class="panel-tags">${p.tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div>
        <div class="panel-links">${p.links.length ? p.links.map(linkHtml).join("") : '<span class="panel-note">Código privado: posso mostrar numa conversa.</span>'}</div>
      </div>`;
  }
  const SOBRE_HTML = `
    <div class="panel-content">
      <p class="panel-kicker">Quem é o Leonardo</p>
      <h2 id="panelTitle">Sobre mim</h2>
      <p>Comecei em tecnologia pelo atendimento. Como analista na <strong>Loft</strong>, passo o dia perto de quem usa o sistema e vejo onde ele atrapalha. Foi assim que entrei em projetos internos técnicos e decidi migrar para desenvolvimento.</p>
      <p>Curso <strong>Sistemas de Informação na Impacta</strong> e gosto da parte que fica por trás da tela: <strong>regras de negócio, APIs e modelagem de dados</strong>. Especifico antes de codar, registro cada decisão e só considero pronto o que tem teste e documentação.</p>
      <p>Estou buscando <strong>estágio ou vaga júnior em back-end</strong>.</p>
      <div class="panel-stats"><span>Python</span><span>SQL</span><span>APIs REST</span><span>Xano</span><span>OpenSpec</span></div>
      <div class="panel-links">${linkHtml(["Baixar CV", LINKS.cv, true])}${linkHtml(["LinkedIn", LINKS.linkedin])}${linkHtml(["Versão clássica", LINKS.classic])}</div>
    </div>`;
  const CONTATO_HTML = `
    <div class="panel-content">
      <p class="panel-kicker">Portal de contato</p>
      <h2 id="panelTitle">Vamos conversar?</h2>
      <p>Estou buscando <strong>estágio ou vaga júnior em back-end</strong>. Se a sua equipe tem uma vaga, ou se quiser trocar uma ideia sobre algum projeto, me chama.</p>
      <div class="panel-links">
        ${linkHtml(["Enviar e-mail", LINKS.email, true])}${linkHtml(["LinkedIn", LINKS.linkedin])}${linkHtml(["GitHub", LINKS.github])}${linkHtml(["Baixar CV", LINKS.cv])}
      </div>
    </div>`;

  /* Imagens: no site ficam em ../assets; na prévia publicada, ao lado do jogo. */
  function loadPanelImages() {
    for (const img of panelBody.querySelectorAll("img[data-file]")) {
      const file = img.dataset.file;
      const other = ASSET_BASE === "assets/" ? "../assets/" : "assets/";
      img.onerror = () => { img.onerror = () => img.remove(); img.src = other + "projetos/" + file; };
      img.src = ASSET_BASE + "projetos/" + file;
    }
  }

  const visited = new Set(store.get("arenaVisited") || []);
  function markVisited(id) {
    if (visited.has(id)) return;
    visited.add(id);
    store.set("arenaVisited", [...visited]);
    window.dispatchEvent(new CustomEvent("arena:visited", { detail: id }));
  }

  let lastFocus = null;
  let panelOpenedAt = 0;
  function openPanel(id) {
    panelOpenedAt = performance.now();
    const html = PROJECTS[id] ? projectHtml(PROJECTS[id]) : id === "sobre" ? SOBRE_HTML : CONTATO_HTML;
    panelBody.innerHTML = html;
    loadPanelImages();
    mode = "panel";
    keys.clear();
    player.attack = null;
    buffered = null;
    panelEl.classList.remove("hidden");
    $("touch").classList.add("hidden");
    resetJoy();
    lastFocus = document.activeElement;
    requestAnimationFrame(() => $("panelClose").focus());
    markVisited(id);
  }
  function closePanel() {
    panelEl.classList.add("hidden");
    mode = "play";
    if (isTouch) $("touch").classList.remove("hidden");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    if (pendingCelebration) celebrate();
  }
  $("panelClose").addEventListener("click", closePanel);
  /* Clique fora fecha, mas não o "clique" que o próprio toque que abriu o painel gera logo em seguida. */
  panelEl.addEventListener("click", (e) => {
    if (e.target === panelEl && performance.now() - panelOpenedAt > 450) closePanel();
  });

  /* ---------- construções ---------- */
  const glowMats = [];
  function glowMat(color, intensity = 0.6) {
    const m = new THREE.MeshLambertMaterial({ color: col(color), emissive: col(color), emissiveIntensity: intensity });
    glowMats.push(m);
    return m;
  }

  /* Gira um ponto local (lx, lz) pelo ângulo do grupo e devolve a posição no mundo. */
  function worldOf(group, lx, lz) {
    const c = Math.cos(group.rotation.y), s = Math.sin(group.rotation.y);
    return { x: group.position.x + lx * c + lz * s, z: group.position.z - lx * s + lz * c };
  }

  const totems = [];
  const interactables = [];
  const fadeables = []; // portões que ficam transparentes quando tampam a visão

  for (const id of Object.keys(PROJECTS)) {
    const zn = zoneById(id);
    const p = PROJECTS[id];
    const base = heightAt(zn.x, zn.z);
    const toCenter = Math.atan2(-zn.x, -zn.z); // olha para o centro da ilha

    // portão do dojo, na borda voltada para o centro
    const gate = new THREE.Group();
    gate.position.set(zn.x, base, zn.z);
    gate.rotation.y = toCenter;
    scene.add(gate);
    for (const side of [-1, 1]) {
      box(gate, 0.4, 3.0, 0.4, "#7a1f1f", side * 1.7, 1.5, 2.6);
      box(gate, 0.55, 0.3, 0.55, "#3f3f46", side * 1.7, 0.15, 2.6);
      const w = worldOf(gate, side * 1.7, 2.6);
      colliders.push({ x: w.x, z: w.z, r: 0.35 });
    }
    box(gate, 4.6, 0.32, 0.5, zn.accent, 0, 3.05, 2.6);
    box(gate, 4.0, 0.2, 0.36, "#111827", 0, 2.6, 2.6);
    const gateMats = [];
    gate.traverse((o) => {
      if (!o.isMesh) return;
      o.material = o.material.clone();
      o.material.transparent = true;
      gateMats.push(o.material);
    });
    const gc = worldOf(gate, 0, 2.6);
    fadeables.push({ x: gc.x, z: gc.z, radius: 2.6, mats: gateMats, opacity: 1 });
    // lanternas nos cantos de trás
    for (const side of [-1, 1]) {
      box(gate, 0.3, 0.9, 0.3, "#57534e", side * 2.3, 0.45, -2.3);
      const lamp = new THREE.Mesh(boxGeo, glowMat("#fde68a", 0.8));
      lamp.scale.set(0.42, 0.42, 0.42);
      lamp.position.set(side * 2.3, 1.1, -2.3);
      gate.add(lamp);
    }

    // totem do projeto, no fundo do dojo
    const totem = new THREE.Group();
    const tPos = worldOf(gate, 0, -0.8);
    totem.position.set(tPos.x, base, tPos.z);
    totem.rotation.y = toCenter;
    scene.add(totem);
    box(totem, 1.3, 0.3, 1.3, "#57534e", 0, 0.15, 0);
    const column = new THREE.Group();
    column.position.y = 0.3;
    totem.add(column);
    box(column, 0.9, 0.7, 0.9, zn.accent, 0, 0.35, 0);
    box(column, 0.8, 0.7, 0.8, "#e7e5e4", 0, 1.05, 0);
    box(column, 0.9, 0.7, 0.9, zn.accent, 0, 1.75, 0);
    box(column, 0.5, 0.18, 0.02, "#111827", 0, 1.05, 0.41); // "placa"
    const gem = new THREE.Mesh(boxGeo, glowMat(zn.accent, 0.7));
    gem.scale.set(0.55, 0.55, 0.55);
    gem.position.y = 3.05;
    totem.add(gem);
    colliders.push({ x: tPos.x, z: tPos.z, r: 0.6 });

    const t = { id, x: tPos.x, z: tPos.z, group: totem, column, gem, hp: 3, flash: 0, accent: zn.accent };
    totems.push(t);
    targets.push({
      kind: "totem", x: t.x, z: t.z, r: 0.6,
      onHit(dirX, dirZ, attack) {
        const dmg = attack.type === "kick" ? 2 : 1;
        t.hp = Math.max(0, t.hp - dmg);
        t.flash = 1;
        const at = new V3(t.x, base + 2.6, t.z);
        burst(at, [t.accent, "#e7e5e4", "#57534e"], 10, 4);
        if (t.hp > 0) {
          floatText(`${3 - t.hp}/3`, at, "big");
        } else {
          floatText("ABERTO!", at, "combo");
          burst(at, [t.accent, "#fde68a", "#ffffff"], 26, 7);
          setTimeout(() => { if (mode === "play") openPanel(id); t.hp = 3; }, 380);
        }
      },
    });
    interactables.push({ id, x: t.x, z: t.z, range: 2.8, verb: `abrir ${p.short}` });
    addLabel(`${p.num} · ${p.title.toUpperCase()}`, () => new V3(t.x, base + 4.1, t.z));
  }

  // pedra "Sobre mim"
  const sobreZ = zoneById("sobre");
  const sobre = (() => {
    const base = heightAt(sobreZ.x, sobreZ.z);
    const g = new THREE.Group();
    g.position.set(sobreZ.x, base, sobreZ.z);
    g.rotation.y = Math.atan2(-sobreZ.x, -sobreZ.z);
    scene.add(g);
    box(g, 1.8, 0.3, 1.0, "#57534e", 0, 0.15, 0);
    box(g, 1.4, 2.4, 0.45, "#a8a29e", 0, 1.5, 0);
    box(g, 1.2, 0.12, 0.47, sobreZ.accent, 0, 2.3, 0);
    box(g, 1.0, 0.08, 0.47, "#78716c", 0, 1.8, 0);
    box(g, 1.0, 0.08, 0.47, "#78716c", 0, 1.5, 0);
    box(g, 0.8, 0.08, 0.47, "#78716c", 0, 1.2, 0);
    const gem = new THREE.Mesh(boxGeo, glowMat(sobreZ.accent, 0.7));
    gem.scale.set(0.4, 0.4, 0.4);
    gem.position.y = 3.2;
    g.add(gem);
    colliders.push({ x: sobreZ.x, z: sobreZ.z, r: 0.85 });
    return { x: sobreZ.x, z: sobreZ.z, group: g, gem, base };
  })();
  targets.push({
    kind: "sobre", x: sobre.x, z: sobre.z, r: 0.85,
    onHit() {
      burst(new V3(sobre.x, sobre.base + 2.4, sobre.z), ["#a8a29e", sobreZ.accent], 10, 3.5);
      setTimeout(() => { if (mode === "play") openPanel("sobre"); }, 250);
    },
  });
  interactables.push({ id: "sobre", x: sobre.x, z: sobre.z, range: 2.8, verb: "ler Sobre mim" });
  addLabel("SOBRE MIM", () => new V3(sobre.x, sobre.base + 3.9, sobre.z));

  // portal de contato: atravessar abre o painel
  const contatoZ = zoneById("contato");
  const portal = (() => {
    const base = heightAt(contatoZ.x, contatoZ.z);
    const g = new THREE.Group();
    g.position.set(contatoZ.x, base, contatoZ.z);
    g.rotation.y = Math.atan2(-contatoZ.x, -contatoZ.z);
    scene.add(g);
    for (const side of [-1, 1]) {
      box(g, 0.5, 3.4, 0.6, "#334155", side * 1.4, 1.7, 0);
      const w = worldOf(g, side * 1.4, 0);
      colliders.push({ x: w.x, z: w.z, r: 0.4 });
    }
    box(g, 3.3, 0.5, 0.6, "#334155", 0, 3.6, 0);
    box(g, 3.5, 0.14, 0.7, contatoZ.accent, 0, 3.92, 0);
    const field = new THREE.Mesh(
      new THREE.PlaneGeometry(2.3, 3.1),
      new THREE.MeshBasicMaterial({ color: col("#2dd4bf"), transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false })
    );
    field.position.y = 1.85;
    g.add(field);
    return { x: contatoZ.x, z: contatoZ.z, group: g, field, base, inside: false };
  })();
  interactables.push({ id: "contato", x: portal.x, z: portal.z, range: 2.8, verb: "abrir o contato" });
  addLabel("CONTATO · atravesse o portal", () => new V3(portal.x, portal.base + 4.6, portal.z));

  // placa de boas-vindas na praça
  addLabel("BEM-VINDO À ARENA · explore os dojos", () => new V3(0, heightAt(0, 0) + 3.6, -2.4)).maxDist = 14;

  function nearestInteractable() {
    let best = null, bestD = Infinity;
    for (const it of interactables) {
      const d = Math.hypot(it.x - player.pos.x, it.z - player.pos.z);
      if (d < it.range && d < bestD) { best = it; bestD = d; }
    }
    return best;
  }
  function interact() {
    const it = nearestInteractable();
    if (it) openPanel(it.id);
  }

  function updateWorldProps(dt) {
    const t = performance.now() / 1000;
    for (const tt of totems) {
      tt.gem.rotation.y += dt * 1.4;
      tt.gem.position.y = 3.05 + Math.sin(t * 2 + tt.x) * 0.12;
      tt.flash = Math.max(0, tt.flash - dt * 4);
      tt.column.position.x = Math.sin(t * 60) * 0.05 * tt.flash;
      tt.column.scale.setScalar(1 + tt.flash * 0.06);
    }
    sobre.gem.rotation.y += dt * 1.2;
    sobre.gem.position.y = 3.2 + Math.sin(t * 2) * 0.1;
    portal.field.material.opacity = 0.35 + Math.sin(t * 3) * 0.12;
    for (const m of glowMats) m.emissiveIntensity = 0.55 + Math.sin(t * 2.4) * 0.15;

    // atravessar o portal abre o contato (uma vez por passagem)
    if (mode === "play") {
      const d = Math.hypot(player.pos.x - portal.x, player.pos.z - portal.z);
      if (d < 0.75 && !portal.inside) {
        portal.inside = true;
        burst(new V3(portal.x, portal.base + 1.6, portal.z), ["#2dd4bf", "#a7f3d0", "#ffffff"], 18, 4);
        openPanel("contato");
      } else if (d > 1.6) {
        portal.inside = false;
      }
    }
  }

  /* =========================================================
     DICAS DE CONTEXTO
     ========================================================= */
  const promptEl = $("prompt");
  const touchLike = window.matchMedia("(pointer: coarse)").matches;
  function updatePrompt() {
    if (mode !== "play") { promptEl.classList.add("hidden"); return; }
    const it = nearestInteractable();
    const nearDummy = Math.hypot(player.pos.x - dummy.x, player.pos.z - dummy.z) < 3.2;
    let text = "";
    if (it && PROJECTS[it.id]) text = touchLike ? `Golpeie 3x ou toque E para ${it.verb}` : `Golpeie 3x ou aperte E para ${it.verb}`;
    else if (it) text = touchLike ? `Toque E para ${it.verb}` : `Aperte E para ${it.verb}`;
    else if (nearDummy) text = "Clique ou J: soco · Botão direito ou K: chute";
    promptEl.textContent = text;
    promptEl.classList.toggle("hidden", !text);
  }

  /* =========================================================
     LOOP
     ========================================================= */
  function updateClouds(dt) {
    for (const c of clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 60) c.position.x = -60;
    }
  }

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  /* =========================================================
     MISSÕES E PROGRESSO (bloco 5)
     ========================================================= */
  const QUESTS = [
    ["proj-01", "Abrir o PS Fila Prioritária"],
    ["proj-02", "Abrir o ConectaRH"],
    ["proj-03", "Abrir o Sabor Local"],
    ["proj-04", "Abrir o Bot de Finanças"],
    ["sobre", "Ler o Sobre mim"],
    ["contato", "Atravessar o portal de contato"],
  ];
  let pendingCelebration = false;
  function renderQuests() {
    const done = QUESTS.filter(([id]) => visited.has(id)).length;
    $("questList").innerHTML = QUESTS.map(([id, text]) => `<li class="${visited.has(id) ? "done" : ""}">${text}</li>`).join("");
    $("questCount").textContent = `${done}/${QUESTS.length}`;
    $("hudBar").style.width = `${(done / QUESTS.length) * 100}%`;
  }
  window.addEventListener("arena:visited", (e) => {
    renderQuests();
    const q = QUESTS.find(([id]) => id === e.detail);
    if (!q) return;
    if (QUESTS.every(([id]) => visited.has(id)) && !store.get("arenaDone")) pendingCelebration = true;
  });
  function celebrate() {
    pendingCelebration = false;
    store.set("arenaDone", true);
    const at = player.pos.clone().add(new V3(0, 2.2, 0));
    for (let i = 0; i < 3; i++) {
      setTimeout(() => burst(at, ["#2dd4bf", "#f2c14e", "#ef4444", "#4f8ff0", "#ffffff"], 30, 8), i * 220);
    }
    floatText("PORTFÓLIO ZERADO!", at, "combo");
    toast("🏆 Você zerou o portfólio! Obrigado por jogar. Bora conversar? O portal de contato está sempre aberto.", 6500);
  }
  renderQuests();

  /* =========================================================
     CONTROLES DE TOQUE (bloco 5)
     ========================================================= */
  const stick = $("stick");
  const knob = $("stickKnob");
  let stickId = null;
  const STICK_R = 50;
  function resetJoy() {
    joy.x = 0; joy.y = 0; stickId = null;
    knob.style.transform = "";
  }
  function moveStick(e) {
    const r = stick.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > STICK_R) { dx = dx / len * STICK_R; dy = dy / len * STICK_R; }
    joy.x = dx / STICK_R;
    joy.y = dy / STICK_R;
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }
  stick.addEventListener("pointerdown", (e) => {
    stickId = e.pointerId;
    stick.setPointerCapture(e.pointerId);
    moveStick(e);
    e.preventDefault();
  });
  stick.addEventListener("pointermove", (e) => { if (e.pointerId === stickId) moveStick(e); });
  stick.addEventListener("pointerup", resetJoy);
  stick.addEventListener("pointercancel", resetJoy);
  for (const btn of document.querySelectorAll("#touch [data-act]")) {
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      audio.init();
      if (mode !== "play") return;
      const act = btn.dataset.act;
      if (act === "punch" || act === "kick") attackQueued = act;
      else if (act === "jump") jumpQueued = true;
      else if (act === "interact") interact();
    });
  }
  if (isTouch) document.body.classList.add("touch");
  // no celular a lista de missões começa recolhida e abre com um toque
  $("quests").addEventListener("click", () => $("quests").classList.toggle("open"));

  /* =========================================================
     DESEMPENHO ADAPTATIVO (bloco 6)
     ========================================================= */
  const perf = { frames: 0, time: 0, stage: 0 };
  function checkPerformance(realDt) {
    if (mode !== "play" || perf.stage >= 2) return;
    perf.frames++;
    perf.time += realDt;
    if (perf.time < 2.5) return;
    const fps = perf.frames / perf.time;
    perf.frames = 0;
    perf.time = 0;
    if (fps >= 40) { perf.stage = 2; return; }
    if (perf.stage === 0 && pixelRatio > 1) {
      pixelRatio = 1;                    // primeiro: menos pixels
      renderer.setPixelRatio(1);
      perf.stage = 1;
    } else {
      renderer.shadowMap.enabled = false; // depois: sem sombras
      scene.traverse((o) => {
        if (!o.material) return;
        for (const m of [].concat(o.material)) m.needsUpdate = true;
      });
      perf.stage = 2;
    }
  }

  let last = performance.now();
  openCreator();
  updatePlayer(0);
  updateCamera(0, true);

  function frame(now) {
    const realDt = (now - last) / 1000;
    let dt = Math.min(realDt, 1 / 20);
    last = now;
    checkPerformance(realDt);
    if (hitStop > 0) { hitStop -= dt; dt *= 0.12; }
    updatePlayer(dt);
    updateSprings(dt);
    updateCamera(dt);
    updateClouds(dt);
    updateTreeFade(dt);
    updateParticles(dt);
    updateFloaters(dt);
    updateWorldProps(dt);
    updateLabels();
    updatePrompt();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame((now) => {
    last = now;
    renderer.render(scene, camera);
    $("loading").classList.add("hidden");
    requestAnimationFrame(frame);
  });

  // ganchos para testes automatizados e para os próximos blocos
  window.__arena = {
    player, heightAt, groundUnder, colliders, ZONES, targets, dummy, setLook, hits,
    totems, portal, sobre, visited, PROJECTS, openPanel, closePanel, joy, perf, QUESTS,
    get mode() { return mode; }, get combo() { return combo; }, startGame, openCreator,
  };
})();
