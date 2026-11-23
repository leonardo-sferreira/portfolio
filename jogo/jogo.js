/* Leonardo Arena · portfólio jogável
   Bloco 1: mundo voxel, lutador, movimento, colisão e câmera. */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const V3 = THREE.Vector3;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const damp = (rate, dt) => 1 - Math.exp(-rate * dt);

  /* =========================================================
     CONFIGURAÇÃO
     ========================================================= */
  const WORLD = {
    R: 30,            // raio médio da ilha, em blocos
    waterY: 0.55,     // altura da superfície da água
    seed: 7,
  };

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

  /* Áreas reservadas para o conteúdo (blocos 3 e 4). Ficam planas e de pedra. */
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

  /* =========================================================
     RENDER, CENA, CÂMERA, LUZ
     ========================================================= */
  const canvas = $("game");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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
  const CAM_OFFSET = new V3(0, 13, 10);
  let camZoom = 1;
  const baseZoom = () => (window.innerWidth / window.innerHeight < 0.8 ? 1.45 : 1);

  scene.add(new THREE.HemisphereLight(0xeaf7ff, 0x4a6b45, 0.7));
  const sun = new THREE.DirectionalLight(0xfff1d6, 0.8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22; sc.near = 1; sc.far = 80;
  sun.shadow.bias = -0.0006;
  scene.add(sun, sun.target);

  /* =========================================================
     TERRENO VOXEL
     ========================================================= */
  const R = WORLD.R;
  const heights = new Map();   // "x,z" -> altura (0 = água)
  const surface = new Map();   // "x,z" -> "grass" | "sand" | "stone" | zona
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

  // 1) altura bruta
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
  // 2) suaviza para que vizinhos difiram no máximo 1 bloco (sempre dá para subir)
  for (let pass = 0; pass < 6; pass++) {
    for (const [k, h] of heights) {
      const [x, z] = k.split(",").map(Number);
      let minN = Infinity;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const hn = heights.get(key(x + dx, z + dz)) ?? 0;
        minN = Math.min(minN, hn);
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

  // 3) monta só os blocos visíveis (topo ou lateral exposta)
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
          const zn = surf;
          const edge = Math.max(Math.abs(x - zn.x), Math.abs(z - zn.z)) === zn.half;
          color = edge ? zn.accent : COLORS.stone[(x + z) & 1];
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

  function instanced(list, size = 1, material = voxelMat) {
    const mesh = new THREE.InstancedMesh(boxGeo, material, list.length);
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    list.forEach((b, i) => {
      const s = b.s || size;
      m.makeScale(s, b.sy || s, s);
      m.setPosition(b.x, b.y + (b.sy || s) / 2, b.z);
      mesh.setMatrixAt(i, m);
      c.set(b.color).convertSRGBToLinear();
      c.offsetHSL(0, 0, (hash(b.x * 3 + b.y, b.z * 7 - b.y) - 0.5) * 0.04);
      mesh.setColorAt(i, c);
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }
  instanced(blocks);

  // água e fundo do mar
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

  function freeSpot(x, z, minDist) {
    if (surface.get(key(x, z)) !== "grass") return false;
    for (const zn of ZONES) {
      if (Math.abs(x - zn.x) <= zn.half + 2 && Math.abs(z - zn.z) <= zn.half + 2) return false;
    }
    if (Math.hypot(x, z) < 6) return false;
    return !colliders.some((c) => Math.hypot(c.x - x, c.z - z) < minDist);
  }

  // árvores (cada uma com material próprio, para ficar transparente quando tampa o lutador)
  const treeData = [];
  const cells = [...heights.keys()].map((k) => k.split(",").map(Number));
  let trees = 0;
  for (let i = 0; i < 4000 && trees < 30; i++) {
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
    treeData.push({ x, z, blocks: tb });
    trees++;
  }

  // pedras
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

  // flores (sem colisão)
  for (let i = 0, n = 0; i < 3000 && n < 90; i++) {
    const [x, z] = pick(cells);
    if (surface.get(key(x, z)) !== "grass" || zoneAt(x, z)) continue;
    const base = heights.get(key(x, z));
    decoBlocks.push({ x: x + (rand() - 0.5) * 0.6, y: base, z: z + (rand() - 0.5) * 0.6, color: pick(COLORS.flowers), s: 0.18, sy: 0.22 });
    n++;
  }
  instanced(decoBlocks);
  const treeMeshes = treeData.map((t) => {
    const material = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
    const mesh = instanced(t.blocks, 1, material);
    return { x: t.x, z: t.z, mesh, material };
  });

  /* Árvore entre a câmera e o lutador fica quase transparente. */
  function updateTreeFade(dt) {
    const px = player.pos.x, pz = player.pos.z;
    const cx = camera.position.x, cz = camera.position.z;
    const vx = cx - px, vz = cz - pz;
    const len2 = vx * vx + vz * vz || 1;
    for (const t of treeMeshes) {
      const u = clamp(((t.x - px) * vx + (t.z - pz) * vz) / len2, 0, 1);
      const dx = px + vx * u - t.x, dz = pz + vz * u - t.z;
      const blocking = u > 0.02 && u < 0.85 && Math.hypot(dx, dz) < 2.1;
      const target = blocking ? 0.22 : 1;
      t.material.opacity = lerp(t.material.opacity, target, damp(8, dt));
      t.material.depthWrite = t.material.opacity > 0.95;
      t.mesh.castShadow = true;
    }
  }

  // nuvens
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
     LUTADOR VOXEL
     ========================================================= */
  const DEFAULT_LOOK = {
    skin: "#d9a066",
    hair: "curto",
    hairColor: "#1f1f1f",
    outfit: "kimono",
    outfitColor: "#f5f5f5",
    band: "#ef4444",
  };

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

  function makeFighter(look = DEFAULT_LOOK) {
    const root = new THREE.Group();
    const body = new THREE.Group(); // tudo que balança junto
    root.add(body);

    const sleeves = look.outfit === "regata" ? look.skin : look.outfitColor;
    const pants = look.outfit === "jaqueta" ? "#1f2937" : look.outfitColor;
    const shin = look.outfit === "regata" ? look.skin : pants;

    // pernas (pivô no quadril)
    const legs = [-0.2, 0.2].map((x) => {
      const hip = new THREE.Group();
      hip.position.set(x, 0.82, 0);
      box(hip, 0.3, 0.42, 0.32, pants, 0, -0.21, 0);
      box(hip, 0.28, 0.3, 0.3, shin, 0, -0.56, 0);
      box(hip, 0.3, 0.12, 0.38, "#262626", 0, -0.76, 0.03);
      body.add(hip);
      return hip;
    });

    // tronco
    const torso = new THREE.Group();
    torso.position.y = 0.82;
    body.add(torso);
    box(torso, 0.78, 0.72, 0.44, look.outfitColor, 0, 0.36, 0);
    box(torso, 0.8, 0.1, 0.46, look.outfit === "kimono" ? "#111827" : "#374151", 0, 0.05, 0);
    if (look.outfit === "kimono") box(torso, 0.22, 0.3, 0.02, look.skin, 0, 0.56, 0.225);
    if (look.outfit === "jaqueta") box(torso, 0.06, 0.62, 0.02, look.band === "none" ? "#9ca3af" : look.band, 0, 0.38, 0.225);

    // braços (pivô no ombro), já em postura de guarda
    const arms = [-1, 1].map((side) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.52, 0.66, 0);
      box(shoulder, 0.24, 0.4, 0.26, sleeves, 0, -0.18, 0);
      box(shoulder, 0.22, 0.26, 0.24, look.skin, 0, -0.49, 0);
      box(shoulder, 0.26, 0.22, 0.28, look.skin, 0, -0.7, 0.01); // punho
      torso.add(shoulder);
      return shoulder;
    });

    // cabeça
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

  const player = {
    pos: new V3(0, heightAt(0, 3), 3),
    vel: new V3(),
    vy: 0,
    onGround: true,
    yaw: 0,
    renderY: heightAt(0, 3),
    walkPhase: 0,
    look: { ...DEFAULT_LOOK },
    model: null,
  };

  function setLook(look) {
    if (player.model) scene.remove(player.model.root);
    player.look = { ...look };
    player.model = makeFighter(player.look);
    scene.add(player.model.root);
  }
  setLook(DEFAULT_LOOK);

  // sombra redonda sob o personagem (lê melhor que a sombra do sol durante o pulo)
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 20),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })
  );
  blob.rotation.x = -Math.PI / 2;
  scene.add(blob);

  /* Altura do chão sob o pé, olhando a área ocupada pelo personagem. */
  const FOOT = [[0, 0], [RADIUS, 0], [-RADIUS, 0], [0, RADIUS], [0, -RADIUS]];
  function groundUnder(x, z) {
    let max = 0;
    for (const [dx, dz] of FOOT) max = Math.max(max, heightAt(x + dx, z + dz));
    return max;
  }
  function walkable(x, z, feetY, grounded) {
    for (const [dx, dz] of FOOT) {
      const h = heightAt(x + dx, z + dz);
      if (h === 0) return false;                        // água
      if (h > feetY + (grounded ? 1.01 : 0.35)) return false; // parede alta demais
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
     ENTRADA (teclado)
     ========================================================= */
  const keys = new Set();
  const CODES = {
    up: ["KeyW", "ArrowUp"],
    down: ["KeyS", "ArrowDown"],
    left: ["KeyA", "ArrowLeft"],
    right: ["KeyD", "ArrowRight"],
    run: ["ShiftLeft", "ShiftRight"],
    jump: ["Space"],
  };
  const held = (action) => CODES[action].some((c) => keys.has(c));
  let jumpQueued = false;

  window.addEventListener("keydown", (e) => {
    if (e.target && e.target.tagName === "INPUT") return;
    if (CODES.jump.includes(e.code) && !e.repeat) jumpQueued = true;
    if (Object.values(CODES).flat().includes(e.code)) e.preventDefault();
    keys.add(e.code);
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));
  window.addEventListener("blur", () => keys.clear());
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    camZoom = clamp(camZoom + Math.sign(e.deltaY) * 0.08, 0.65, 1.5);
  }, { passive: false });

  /* =========================================================
     ATUALIZAÇÃO DO JOGADOR
     ========================================================= */
  const tmp = new V3();

  function updatePlayer(dt) {
    // direção relativa à câmera fixa: W afasta, S aproxima
    tmp.set(0, 0, 0);
    if (held("up")) tmp.z -= 1;
    if (held("down")) tmp.z += 1;
    if (held("left")) tmp.x -= 1;
    if (held("right")) tmp.x += 1;
    const moving = tmp.lengthSq() > 0;
    if (moving) tmp.normalize();

    const speed = held("run") ? SPEED.run : SPEED.walk;
    const accel = player.onGround ? 14 : 5;
    player.vel.x = lerp(player.vel.x, tmp.x * speed, damp(accel, dt));
    player.vel.z = lerp(player.vel.z, tmp.z * speed, damp(accel, dt));

    // movimento horizontal, eixo por eixo, para deslizar nas paredes
    const p = player.pos;
    const nx = p.x + player.vel.x * dt;
    if (walkable(nx, p.z, p.y, player.onGround)) p.x = nx; else player.vel.x = 0;
    const nz = p.z + player.vel.z * dt;
    if (walkable(p.x, nz, p.y, player.onGround)) p.z = nz; else player.vel.z = 0;
    pushOutOfColliders(p);

    // pulo e gravidade
    if (jumpQueued && player.onGround) {
      player.vy = JUMP;
      player.onGround = false;
    }
    jumpQueued = false;
    player.vy -= GRAVITY * dt;
    p.y += player.vy * dt;

    const ground = groundUnder(p.x, p.z);
    if (p.y <= ground) {
      p.y = ground;          // inclui subir um degrau andando
      player.vy = 0;
      player.onGround = true;
    } else if (p.y > ground + 0.05) {
      player.onGround = false;
    }

    // vira para onde anda
    const horiz = Math.hypot(player.vel.x, player.vel.z);
    if (horiz > 0.3) {
      const target = Math.atan2(player.vel.x, player.vel.z);
      let diff = target - player.yaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      player.yaw += diff * damp(14, dt);
    }

    animateFighter(dt, horiz, speed);
  }

  /* Animação procedural: guarda, caminhada, corrida e pulo. */
  function animateFighter(dt, horiz, speed) {
    const f = player.model;
    const t = performance.now() / 1000;
    const moveAmt = clamp(horiz / SPEED.walk, 0, 1.6);
    player.walkPhase += dt * (4 + horiz * 1.6);
    const s = Math.sin(player.walkPhase);

    // suaviza o degrau visualmente
    player.renderY = lerp(player.renderY, player.pos.y, damp(18, dt));
    f.root.position.set(player.pos.x, player.renderY, player.pos.z);
    f.root.rotation.y = player.yaw;

    const air = !player.onGround;
    const swing = air ? 0 : s * 0.75 * Math.min(moveAmt, 1.2);

    f.legs[0].rotation.x = air ? -0.7 : swing;
    f.legs[1].rotation.x = air ? 0.35 : -swing;

    // guarda: punhos à frente do rosto, balançando levemente
    const guard = -1.25 + Math.sin(t * 3) * 0.05;
    f.arms[0].rotation.x = guard - (air ? 0.6 : -swing * 0.35);
    f.arms[1].rotation.x = guard - (air ? 0.6 : swing * 0.35);
    f.arms[0].rotation.z = 0.25;
    f.arms[1].rotation.z = -0.25;

    // respiração e inclinação ao correr
    f.body.position.y = air ? 0 : Math.abs(s) * 0.06 * moveAmt + Math.sin(t * 3) * 0.015;
    f.torso.rotation.x = clamp(horiz / SPEED.run, 0, 1) * 0.22;
    f.torso.rotation.y = Math.sin(t * 1.5) * 0.04;

    blob.position.set(player.pos.x, groundUnder(player.pos.x, player.pos.z) + 0.02, player.pos.z);
    const lift = player.pos.y - groundUnder(player.pos.x, player.pos.z);
    blob.scale.setScalar(clamp(1 - lift * 0.18, 0.5, 1));
  }

  /* =========================================================
     CÂMERA
     ========================================================= */
  const camTarget = new V3();
  const camLook = new V3();
  function updateCamera(dt, snap = false) {
    camTarget.copy(CAM_OFFSET).multiplyScalar(camZoom * baseZoom()).add(player.model.root.position);
    if (snap) camera.position.copy(camTarget);
    else camera.position.lerp(camTarget, damp(3.5, dt));
    tmp.copy(player.model.root.position);
    tmp.y += 1.2;
    if (snap) camLook.copy(tmp);
    else camLook.lerp(tmp, damp(6, dt));
    camera.lookAt(camLook);

    // o sol acompanha o jogador para a sombra ter boa resolução
    sun.position.set(player.pos.x + 14, player.pos.y + 26, player.pos.z + 10);
    sun.target.position.copy(player.pos);
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

  // Bloco 1: entra direto no mundo. A criação de personagem chega no bloco 2.
  $("hud").classList.remove("hidden");
  for (const id of ["quests"]) $(id).classList.add("hidden");
  document.querySelector(".hud-player").classList.add("hidden");
  for (const el of document.querySelectorAll('.hud-help span')) {
    if (/soco|chute|abrir/.test(el.textContent)) el.classList.add("hidden");
  }

  let last = performance.now();
  updatePlayer(0);
  updateCamera(0, true);

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    updatePlayer(dt);
    updateCamera(dt);
    updateClouds(dt);
    updateTreeFade(dt);
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
  window.__arena = { player, heightAt, groundUnder, colliders, ZONES, setLook, makeFighter, scene, camera };
})();
