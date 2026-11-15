import * as THREE from '../vendor/three.module.min.js';
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js';
import { softDotTexture, lollipop, puffTree } from './env.js';

export const FONT = '"Fredoka", "ZCOOL KuaiLe", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
export const INK = '#5a3a5e';

// —— 缓动 ——
export const EASE = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  inCubic: (t) => t * t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  inBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return c3 * t * t * t - c1 * t * t; },
  outElastic: (t) => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1,
};

// —— 几何体 / 材质缓存 ——
const geoCache = new Map();
export function rbox(w, h, d, r = 0.12, shade = true) {
  const key = [w, h, d, r, shade].join('|');
  if (geoCache.has(key)) return geoCache.get(key);
  const g = new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
  if (shade) {
    // 顶面亮、底面暗的顶点色，让方块有糖果般的体积感
    const p = g.attributes.position;
    const col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const y = (p.getY(i) + h / 2) / h; // 0..1
      const k = 0.72 + 0.28 * Math.pow(y, 0.7);
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  g.userData.cached = true;
  geoCache.set(key, g);
  return g;
}
const matCache = new Map();
export function mat(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0, vertexColors: true, ...o });
  m.userData.cached = true;
  matCache.set(key, m);
  return m;
}

// —— 画布文字贴图 ——
const texCache = new Map();
function wrapLines(ctx, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const ch of para) {
      if (ctx.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; } else line += ch;
    }
    out.push(line);
  }
  return out;
}
export function signTexture(text, { accent = '#ff6fa8', w = 512, h = 256, bg = '#fffaf3', ink = INK, danger = false } = {}) {
  const key = [text, accent, w, h, bg, ink, danger].join('|');
  if (texCache.has(key)) return texCache.get(key);
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const x = cv.getContext('2d');
  x.fillStyle = bg;
  x.fillRect(0, 0, w, h);
  if (danger) {
    // 警示条纹
    x.save();
    x.beginPath(); x.rect(0, 0, w, h); x.clip();
    x.fillStyle = '#ffd34f';
    for (let i = -h; i < w; i += 46) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 22, 0); x.lineTo(i + 22 + h, h); x.lineTo(i + h, h); x.fill(); }
    x.restore();
    x.fillStyle = bg;
    roundRect(x, 18, 18, w - 36, h - 36, 22); x.fill();
  }
  x.strokeStyle = accent;
  x.lineWidth = 6;
  x.setLineDash([14, 10]);
  roundRect(x, 14, 14, w - 28, h - 28, 26); x.stroke();
  x.setLineDash([]);
  x.fillStyle = ink;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  let size = 84;
  let lines;
  for (; size > 20; size -= 4) {
    x.font = `600 ${size}px ${FONT}`;
    lines = wrapLines(x, text, w - 70);
    if (lines.length * size * 1.2 < h - 60) break;
  }
  const lh = size * 1.18;
  lines.forEach((l, i) => x.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * lh + size * 0.04));
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  texCache.set(key, t);
  return t;
}
function roundRect(x, a, b, w, h, r) {
  x.beginPath();
  x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r);
  x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath();
}

export function labelSprite(text, { color = '#ff5f9e', size = 1 } = {}) {
  const key = 'label|' + text + color;
  let t = texCache.get(key);
  if (!t) {
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 160;
    const x = cv.getContext('2d');
    x.font = `700 92px ${FONT}`;
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineJoin = 'round';
    x.lineWidth = 22; x.strokeStyle = '#ffffff';
    x.strokeText(text, 256, 84);
    x.fillStyle = color;
    x.fillText(text, 256, 84);
    t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    texCache.set(key, t);
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
  s.scale.set(2.4 * size, 0.75 * size, 1);
  return s;
}

function coinTexture() {
  if (texCache.has('coin')) return texCache.get('coin');
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const x = cv.getContext('2d');
  const g = x.createRadialGradient(100, 90, 10, 128, 128, 128);
  g.addColorStop(0, '#fff6c2'); g.addColorStop(0.6, '#ffd34f'); g.addColorStop(1, '#f0a020');
  x.fillStyle = g; x.beginPath(); x.arc(128, 128, 128, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#fff3b0'; x.lineWidth = 10; x.beginPath(); x.arc(128, 128, 104, 0, Math.PI * 2); x.stroke();
  x.fillStyle = '#ffffff';
  x.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 30 : 70, a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    x.lineTo(128 + Math.cos(a) * r, 132 + Math.sin(a) * r);
  }
  x.closePath(); x.fill();
  x.strokeStyle = '#f39a1f'; x.lineWidth = 6; x.stroke();
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set('coin', t);
  return t;
}

const crackCache = new Map();
function crackedMat(color) {
  if (crackCache.has(color)) return crackCache.get(color);
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const x = cv.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 128);
  x.strokeStyle = 'rgba(60,30,80,0.75)'; x.lineWidth = 3; x.lineJoin = 'round';
  const crack = (pts) => { x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.stroke(); };
  crack([[10, 30], [40, 48], [58, 40], [70, 66], [100, 72], [120, 100]]);
  crack([[58, 40], [64, 12]]); crack([[70, 66], [52, 96], [60, 122]]); crack([[100, 72], [118, 50]]);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshStandardMaterial({ color, map: t, roughness: 0.6, vertexColors: true });
  m.userData.cached = true;
  crackCache.set(color, m);
  return m;
}

function crateTexture(card) {
  const key = 'crate' + card;
  if (texCache.has(key)) return texCache.get(key);
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const x = cv.getContext('2d');
  if (card) {
    x.fillStyle = '#d9b48a'; x.fillRect(0, 0, 256, 256);
    x.fillStyle = '#c99f72'; for (let i = 0; i < 256; i += 9) x.fillRect(0, i, 256, 2);
    x.fillStyle = '#f2e3c4'; x.fillRect(0, 108, 256, 40);
    x.save(); x.translate(128, 200); x.rotate(-0.08);
    x.fillStyle = '#e0414f'; x.font = `700 34px ${FONT}`; x.textAlign = 'center'; x.fillText('易碎 FRAGILE', 0, 0);
    x.restore();
    x.font = `600 40px ${FONT}`; x.fillStyle = '#7a5a3a'; x.textAlign = 'center'; x.fillText('↑↑', 128, 70);
  } else {
    x.fillStyle = '#f2c48d'; x.fillRect(0, 0, 256, 256);
    x.fillStyle = '#e8b276'; for (let i = 0; i < 256; i += 64) x.fillRect(0, i + 30, 256, 4);
    x.strokeStyle = '#c98a4f'; x.lineWidth = 22; x.strokeRect(11, 11, 234, 234);
    x.beginPath(); x.moveTo(22, 22); x.lineTo(234, 234); x.stroke();
    x.fillStyle = '#ff7fa8'; x.beginPath();
    x.arc(110, 110, 22, 0, Math.PI * 2); x.arc(146, 110, 22, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.moveTo(90, 120); x.lineTo(128, 160); x.lineTo(166, 120); x.fill();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
}

function chevronTexture(dir) {
  const key = 'chev' + dir;
  if (texCache.has(key)) return texCache.get(key);
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 128;
  const x = cv.getContext('2d');
  x.fillStyle = '#6b5f86'; x.fillRect(0, 0, 128, 128);
  x.fillStyle = '#5c5176'; for (let i = 0; i < 128; i += 16) x.fillRect(0, i, 128, 3);
  x.strokeStyle = '#ffd34f'; x.lineWidth = 16; x.lineCap = 'round'; x.lineJoin = 'round';
  x.beginPath();
  if (dir > 0) { x.moveTo(30, 88); x.lineTo(64, 46); x.lineTo(98, 88); }
  else { x.moveTo(30, 40); x.lineTo(64, 82); x.lineTo(98, 40); }
  x.stroke();
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  texCache.set(key, t);
  return t;
}

const shared = {
  cone: (() => { const g = new THREE.ConeGeometry(0.17, 0.72, 10); g.translate(0, 0.36, 0); return g; })(),
  post: new THREE.CylinderGeometry(0.07, 0.08, 1.4, 10),
  sphere: new THREE.SphereGeometry(1, 20, 14),
  coin: new THREE.CylinderGeometry(0.38, 0.38, 0.09, 36),
};
const spikeMat = new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.55, roughness: 0.22 });
const sparkTex = softDotTexture('star');

// 传送门旋涡着色器
function portalMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, power: { value: 1 } },
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `
      uniform float time, power; varying vec2 vP;
      void main(){
        vec2 p = (vP - vec2(0., 1.25)) / vec2(1.0, 1.3);
        float r = length(p); float a = atan(p.y, p.x);
        float sw = sin(a*3. + r*9. - time*3.2);
        vec3 c1 = vec3(1., .62, .86), c2 = vec3(.62, .84, 1.), c3 = vec3(1., .95, .62), c4 = vec3(.78,.66,1.);
        vec3 col = mix(mix(c1, c2, .5+.5*sw), mix(c3, c4, .5+.5*sin(a*2.-time)), .35);
        col = mix(col, vec3(1.), smoothstep(.55, 0., r)*.65);
        float alpha = mix(.25, .93, power);
        col = mix(vec3(.85,.8,.95), col, power);
        gl_FragColor = vec4(col, alpha);
        #include <colorspace_fragment>
      }`,
  });
}
function archShape(w = 1.0, h = 1.25) {
  const s = new THREE.Shape();
  s.moveTo(-w, 0); s.lineTo(-w, h);
  s.absarc(0, h, w, Math.PI, 0, true);
  s.lineTo(w, 0); s.lineTo(-w, 0);
  return s;
}

// =================== 关卡构建器 ===================
export class Level {
  constructor(game, theme) {
    this.g = game;
    this.theme = theme;
    this.root = new THREE.Group();
    this.ents = [];
    this.zones = [];
    this.updaters = [];
    this.timers = [];
    this.tweens = [];
    this.time = 0;
    this.killY = -8;
    this.spawnPos = new THREE.Vector3();
    this.spawnYaw = 0;
    this.goals = [];
    this._v = new THREE.Vector3();
    this.attempt = game.levelDeaths || 0; // 本关第几次尝试（死过几次）
    this.memory = game.memory || new Set(); // 本关里玩家已经见识过的陷阱
  }

  get p() { return this.g.player; }
  get sfx() { return this.g.sound; }
  spawn(x, y, z, yaw = 0) { this.spawnPos.set(x, y, z); this.spawnYaw = yaw; }
  add(o) { this.root.add(o); return o; }
  kill(msg, set, type) { this.g.kill(msg, set, type); }
  toast(t, d) { this.g.toast(t, d); }
  fallMsg(msg, set) { this.g.setFallMsg(msg, set); }
  troll(set) { this.g.troll(set); }

  // —— 实体 ——
  ent(obj, hx, hy, hz, o = {}) {
    const e = {
      obj, half: new THREE.Vector3(hx, hy, hz), off: o.off || new THREE.Vector3(),
      solid: o.solid !== false, kill: o.kill || null, enabled: true,
      prev: new THREE.Vector3(), min: new THREE.Vector3(), max: new THREE.Vector3(),
      onStep: o.onStep || null, onStand: o.onStand || null,
      conveyor: o.conveyor || null, jumpMul: o.jumpMul || 1, speedMul: o.speedMul || 1, crush: !!o.crush, pushable: !!o.pushable,
    };
    if (obj && !obj.parent) this.root.add(obj);
    this.ents.push(e);
    this.updateBox(e);
    e.prev.copy(obj.position).add(e.off);
    return e;
  }
  updateBox(e) {
    const c = e.obj.position;
    e.min.set(c.x + e.off.x - e.half.x, c.y + e.off.y - e.half.y, c.z + e.off.z - e.half.z);
    e.max.set(c.x + e.off.x + e.half.x, c.y + e.off.y + e.half.y, c.z + e.off.z + e.half.z);
  }

  box(x, y, z, w, h, d, o = {}) {
    const m = new THREE.Mesh(rbox(w, h, d, o.r ?? 0.12, o.shade !== false), o.mat || mat(o.color || this.theme.tileA, o.matOpts));
    m.position.set(x, y, z);
    m.castShadow = o.shadow !== false; m.receiveShadow = true;
    if (o.visible === false) m.visible = false;
    return this.ent(m, w / 2, h / 2, d / 2, o);
  }

  tile(x, z, o = {}) {
    const y = o.y ?? 0, w = o.w ?? 2, d = o.d ?? 2, h = o.h ?? 0.6;
    const m = new THREE.Mesh(rbox(w - 0.07, h, d - 0.07, 0.14), o.mat || mat(o.color || this.theme.tileA));
    m.position.set(x, y - h / 2, z);
    m.castShadow = true; m.receiveShadow = true;
    return this.ent(m, w / 2, h / 2, d / 2, o);
  }

  // rows[r][c]，r 越大越靠前（-Z）
  grid(x0, z0, cols, rows, o = {}) {
    const out = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        const x = x0 + (c - (cols - 1) / 2) * 2, z = z0 - r * 2;
        if (o.skip && o.skip(r, c, x, z)) { row.push(null); continue; }
        const color = o.color || (((r + c + (o.parity || 0)) % 2) ? this.theme.tileB : this.theme.tileA);
        row.push(this.tile(x, z, { ...o, color }));
      }
      out.push(row);
    }
    return out;
  }

  // 让某个实体掉下去
  drop(e, { delay = 0, wobble = 0.12, dist = 40, dur = 1.5, sound = true, rotate = true, back = 0 } = {}) {
    if (!e || e.dropping) return;
    e.dropping = true;
    const o = e.obj, bx = o.position.x, by = o.position.y;
    if (wobble > 0) {
      const start = this.time;
      this.every(() => {
        const k = this.time - start;
        if (k > wobble + delay) { o.position.x = bx; return false; }
        o.position.x = bx + Math.sin(k * 80) * 0.05;
      });
    }
    this.after(wobble + delay, () => {
      if (sound) this.sfx.rumble();
      this.tween(o.position, { y: o.position.y - dist }, dur, 'inQuad', {
        done: () => {
          e.enabled = false; o.visible = false;
          if (!back) return;
          // 过一会儿再长回来（不然回程就没路了）
          this.after(back, () => {
            o.position.set(bx, by - 8, o.position.z); o.rotation.set(0, 0, 0); o.visible = true;
            this.tween(o.position, { y: by }, 0.7, 'outBack', { done: () => { e.enabled = true; e.dropping = false; } });
          });
        },
      });
      if (rotate) this.tween(o.rotation, { x: (Math.random() - 0.5) * 0.8, z: (Math.random() - 0.5) * 0.8 }, dur, 'inQuad');
    });
  }

  // 站在上面超过 t 秒就会塌（走过去没事，停下来就完蛋）
  fragile(e, t, o = {}) {
    let s = 0;
    if (o.cracked) e.obj.material = crackedMat(o.color || this.theme.tileB);
    this.every((dt) => {
      if (e.dropping || !e.enabled) return false;
      if (this.p.groundEnt === e && this.g.canInteract()) {
        s += dt;
        if (s > t) {
          this.mark(o.id);
          o.msg && this.fallMsg(o.msg, o.set);
          this.sfx.crack();
          this.drop(e, { wobble: 0.15, dur: 1.2, back: o.back || 0 });
          return false;
        }
      } else s = Math.max(0, s - dt * 2);
    });
    return e;
  }

  // —— 尖刺 ——
  spikes(x, z, w, d, o = {}) {
    const y = o.y ?? 0;
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const nx = Math.max(1, Math.round(w / 0.5)), nz = Math.max(1, Math.round(d / 0.5));
    const im = new THREE.InstancedMesh(shared.cone, spikeMat, nx * nz);
    const m4 = new THREE.Matrix4(), col = new THREE.Color();
    let i = 0;
    for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) {
      m4.makeTranslation((a + 0.5) * w / nx - w / 2, 0, (b + 0.5) * d / nz - d / 2);
      im.setMatrixAt(i, m4);
      im.setColorAt(i, col.set((a + b) % 2 ? '#ffffff' : (o.tint || '#ff9fc4')));
      i++;
    }
    im.castShadow = true;
    im.frustumCulled = false;
    g.add(im);
    this.root.add(g);
    const hidden = o.hidden !== false;
    g.scale.y = hidden ? 0.001 : 1;
    if (hidden) g.visible = false;
    const e = this.ent(g, w / 2 - 0.14, 0.32, d / 2 - 0.14, {
      solid: false, off: new THREE.Vector3(0, 0.32, 0),
      kill: { msg: o.msg || '被尖刺扎了一下……好痛 (｡•́︿•̀｡)', set: o.set, type: 'spike' },
    });
    e.enabled = !hidden;
    const api = {
      e, group: g, isUp: !hidden,
      up: () => {
        if (api.isUp) return;
        api.isUp = true; e.enabled = true; g.visible = true;
        this.sfx.spike();
        this.tween(g.scale, { y: 1 }, 0.12, 'outBack');
      },
      down: () => {
        if (!api.isUp) return;
        api.isUp = false; e.enabled = false;
        this.tween(g.scale, { y: 0.001 }, 0.2, 'inQuad', { done: () => { g.visible = false; } });
      },
    };
    if (o.trap) {
      this.zone(x, y + 1, z, w - 0.2, 2.2, d - 0.2, { once: true, enter: () => { api.up(); o.onTrigger && o.onTrigger(); } });
    }
    return api;
  }

  // —— 木牌 ——
  sign(x, z, text, o = {}) {
    const g = new THREE.Group();
    const w = o.w ?? 2.3, h = o.h ?? 1.15;
    const y = o.y ?? 0;
    g.position.set(x, y, z);
    g.rotation.y = o.rot ?? 0;
    if (!o.wall) {
      const post = new THREE.Mesh(shared.post, mat('#f2d2b6', { vertexColors: false }));
      post.position.y = 0.7; post.castShadow = true;
      g.add(post);
    }
    const board = new THREE.Mesh(rbox(w, h, 0.12, 0.08), mat(o.color || '#ffe9f1'));
    board.position.y = o.wall ? 0 : 1.35 + h / 2 - 0.4;
    board.castShadow = true;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.1, h - 0.1),
      new THREE.MeshStandardMaterial({ map: signTexture(text, { accent: o.accent || this.theme.accent, w: 512, h: Math.round(512 * (h - 0.1) / (w - 0.1)), danger: o.danger }), roughness: 0.7 }));
    face.position.set(0, board.position.y, 0.065);
    face.userData.own = true;
    g.add(board, face);
    if (o.tilt) g.rotation.z = o.tilt;
    this.root.add(g);
    return g;
  }

  // —— 金币 ——
  coin(x, y, z, fn) {
    const m = new THREE.Mesh(shared.coin, [
      new THREE.MeshStandardMaterial({ color: '#ffc93c', metalness: 0.6, roughness: 0.25, emissive: '#a86a00', emissiveIntensity: 0.2 }),
      new THREE.MeshStandardMaterial({ map: coinTexture(), metalness: 0.3, roughness: 0.3, emissive: '#ffb000', emissiveIntensity: 0.25 }),
      new THREE.MeshStandardMaterial({ map: coinTexture(), metalness: 0.3, roughness: 0.3, emissive: '#ffb000', emissiveIntensity: 0.25 }),
    ]);
    m.rotation.x = Math.PI / 2;
    const holder = new THREE.Group();
    holder.position.set(x, y, z);
    holder.add(m);
    m.castShadow = true;
    this.root.add(holder);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, color: '#fff2a0', transparent: true, depthWrite: false, opacity: 0.8 }));
    glow.scale.setScalar(1.6);
    holder.add(glow);
    const c = { holder, taken: false };
    this.every((dt, t) => {
      if (c.taken) return false;
      holder.rotation.y += dt * 3;
      m.position.y = Math.sin(t * 3) * 0.1;
      const p = this.p.pos;
      const dx = p.x - x, dy = p.y + 0.8 - y, dz = p.z - z;
      if (dx * dx + dy * dy + dz * dz < 0.85 * 0.85 && this.g.canInteract()) {
        c.taken = true;
        holder.visible = false;
        this.sfx.coin();
        this.g.fx.emit(holder.position, { count: 26, colors: ['#ffd34f', '#fff3a0', '#ffffff'], speed: 4, up: 1.5 });
        fn && fn();
        return false;
      }
    });
    return c;
  }

  // —— 终点传送门 ——
  goal(x, y, z, o = {}) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = o.rot ?? 0;
    const gold = new THREE.MeshStandardMaterial({ color: '#ffd36e', metalness: 0.65, roughness: 0.25, emissive: '#ff9a3c', emissiveIntensity: 0.12 });
    const stripe = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3 });
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 1.25, 16), gold);
      post.position.set(s * 1.1, 0.625, 0); post.castShadow = true;
      g.add(post);
      const knob = new THREE.Mesh(shared.sphere, stripe);
      knob.scale.setScalar(0.2); knob.position.set(s * 1.1, 0.05, 0);
      g.add(knob);
    }
    const arc = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.15, 12, 40, Math.PI), gold);
    arc.position.y = 1.25; arc.castShadow = true;
    g.add(arc);
    const pm = portalMaterial();
    const disc = new THREE.Mesh(new THREE.ShapeGeometry(archShape(0.96, 1.25), 24), pm);
    disc.userData.own = true;
    g.add(disc);
    // 顶部星星
    const star = new THREE.Mesh(starGeo(), new THREE.MeshStandardMaterial({ color: '#fff0a0', emissive: '#ffcf4a', emissiveIntensity: 0.6, roughness: 0.3 }));
    star.position.y = 2.65;
    g.add(star);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, color: '#fff5c8', transparent: true, depthWrite: false, opacity: 0.9 }));
    halo.scale.setScalar(2.2); halo.position.y = 2.65;
    g.add(halo);
    const label = labelSprite(o.label || 'GOAL', { color: o.labelColor || this.theme.accent });
    label.position.y = 3.35;
    g.add(label);
    this.root.add(g);

    const api = {
      obj: g, label, active: o.active !== false, touched: false, pm, disc,
      onTouch: o.onTouch || (() => this.g.win()),
      setActive: (v) => { api.active = v; },
      setLabel: (t, c) => {
        const s = labelSprite(t, { color: c || this.theme.accent });
        s.position.copy(api.label.position);
        g.remove(api.label); g.add(s); api.label = s;
      },
    };
    pm.uniforms.power.value = api.active ? 1 : 0;
    const inv = new THREE.Matrix4();
    this.every((dt, t) => {
      if (!g.parent) return false;
      pm.uniforms.time.value = t;
      pm.uniforms.power.value += ((api.active ? 1 : 0) - pm.uniforms.power.value) * Math.min(1, dt * 3);
      star.rotation.y += dt * 1.5;
      star.position.y = 2.65 + Math.sin(t * 2) * 0.06;
      halo.material.opacity = api.active ? 0.6 + Math.sin(t * 3) * 0.25 : 0.15;
      if (api.active && Math.random() < dt * 8) {
        const wp = g.localToWorld(this._v.set((Math.random() - 0.5) * 1.6, 0.2 + Math.random() * 2, 0));
        this.g.fx.emit(wp, { count: 1, colors: ['#ffffff', '#ffe6f2', '#fff3b0'], speed: 0.3, up: 0.8, gravity: -0.5, size: 0.3, life: 1.2, spread: 0 });
      }
      if (!api.active || api.touched || !this.g.canInteract()) return;
      g.updateMatrixWorld();
      inv.copy(g.matrixWorld).invert();
      const lp = this._v.copy(this.p.pos).applyMatrix4(inv);
      if (Math.abs(lp.x) < 1.25 && Math.abs(lp.z) < 0.55 && lp.y > -0.6 && lp.y < 2.4) {
        api.touched = true;
        api.onTouch(api);
      }
    });
    this.goals.push(api);
    return api;
  }

  // —— 大红按钮 ——
  button(x, z, fn, o = {}) {
    const y = o.y ?? 0;
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.22, 32), mat('#f4f0ff', { vertexColors: false, metalness: 0.2, roughness: 0.4 }));
    base.position.y = 0.11; base.castShadow = true; base.receiveShadow = true;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: o.color || '#ff3d6e', roughness: 0.18, emissive: o.color || '#ff1f50', emissiveIntensity: 0.25 }));
    dome.position.y = 0.2; dome.castShadow = true;
    dome.scale.y = 0.7;
    g.add(base, dome);
    this.root.add(g);
    const api = { pressed: false, g, dome };
    this.every((dt, t) => {
      if (api.pressed) return false;
      dome.material.emissiveIntensity = 0.25 + Math.sin(t * 5) * 0.15;
      const p = this.p.pos;
      if (Math.hypot(p.x - x, p.z - z) < 0.85 && p.y < y + 0.6 && p.y > y - 0.2 && this.g.canInteract()) {
        api.pressed = true;
        this.sfx.click();
        this.tween(dome.scale, { y: 0.18 }, 0.12, 'outQuad');
        dome.material.emissiveIntensity = 0.05;
        fn && fn();
        return false;
      }
    });
    return api;
  }

  // —— 触发区域 ——
  zone(x, y, z, w, h, d, o = {}) {
    const zn = {
      min: new THREE.Vector3(x - w / 2, y - h / 2, z - d / 2),
      max: new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2),
      enter: o.enter, exit: o.exit, stay: o.stay, once: !!o.once, inside: false, enabled: true,
    };
    this.zones.push(zn);
    return zn;
  }

  // —— 传送带 ——
  conveyor(x, z, w, d, o = {}) {
    const y = o.y ?? 0;
    const tex = chevronTexture(o.arrow ?? 1).clone();
    tex.needsUpdate = true;
    tex.repeat.set(Math.max(1, Math.round(w / 1.5)), Math.round(d / 1.5));
    const g = new THREE.Group();
    g.position.set(x, y - 0.3, z);
    const body = new THREE.Mesh(rbox(w, 0.6, d, 0.12), mat('#8b7fa8'));
    body.castShadow = true; body.receiveShadow = true;
    const top = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.3, d - 0.1), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 }));
    top.rotation.x = -Math.PI / 2; top.position.y = 0.305;
    top.receiveShadow = true;
    top.userData.own = true;
    // 两侧黄色护边
    for (const s of [-1, 1]) {
      const rail = new THREE.Mesh(rbox(0.16, 0.16, d, 0.06), mat('#ffd34f'));
      rail.position.set(s * (w / 2 - 0.08), 0.33, 0);
      g.add(rail);
    }
    // 两端滚轮
    for (const s of [-1, 1]) {
      const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, w + 0.1, 20), mat('#c9c1dd', { vertexColors: false, metalness: 0.4, roughness: 0.3 }));
      roll.rotation.z = Math.PI / 2; roll.position.set(0, -0.02, s * d / 2);
      g.add(roll);
    }
    g.add(body, top);
    const e = this.ent(g, w / 2, 0.3, d / 2, { conveyor: { x: o.push[0], z: o.push[1] } });
    const vis = o.visual ?? 1.4;
    this.every((dt) => { tex.offset.y -= vis * dt * (o.arrow ?? 1) * tex.repeat.y / d; });
    return e;
  }

  // —— 果冻（超级弹跳）——
  jelly(x, z, o = {}) {
    const m = new THREE.Mesh(rbox(1.94, 0.6, 1.94, 0.24), new THREE.MeshStandardMaterial({
      color: o.color || '#ff8fc0', roughness: 0.12, metalness: 0, transparent: true, opacity: 0.88,
      emissive: o.color || '#ff6fae', emissiveIntensity: 0.18, vertexColors: true,
    }));
    m.position.set(x, -0.3, z);
    m.castShadow = true; m.receiveShadow = true;
    const e = this.ent(m, 1, 0.3, 1, {
      jumpMul: o.mul || 2.2,
      onStep: () => { this.sfx.squish(); jig = 1; },
    });
    let jig = 0;
    const ph = Math.random() * 6;
    this.every((dt, t) => {
      jig = Math.max(0, jig - dt * 2);
      const w = Math.sin(t * 3 + ph) * 0.025 + Math.sin(t * 22) * 0.12 * jig;
      m.scale.set(1 + w, 1 - w * 1.4, 1 + w);
    });
    e.jiggle = () => { jig = 1; };
    return e;
  }

  // —— 闪光提示（可能是真的，也可能是骗你的）——
  sparkles(x, y, z, w, d, n = 40) {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(n * 3), ph = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      p[i * 3] = x + (Math.random() - 0.5) * w; p[i * 3 + 1] = y + Math.random() * 0.5; p[i * 3 + 2] = z + (Math.random() - 0.5) * d;
      ph[i] = Math.random() * 10;
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
    const u = { time: { value: 0 }, map: { value: sparkTex }, scale: { value: innerHeight * 0.5 } };
    const pts = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: u, transparent: true, depthWrite: false,
      vertexShader: `attribute float aPh; uniform float time, scale; varying float vA;
        void main(){ vA = pow(max(0., sin(time*2.2 + aPh*3.)), 6.); vec4 mv = modelViewMatrix*vec4(position + vec3(0., sin(time+aPh)*.08, 0.),1.); gl_PointSize = .45*scale/-mv.z; gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform sampler2D map; varying float vA; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(1., .97, .85, t.a*vA);
        #include <colorspace_fragment>
        }`,
    }));
    pts.userData.own = true;
    pts.frustumCulled = false;
    this.root.add(pts);
    this.every((dt, t) => { u.time.value = t; u.scale.value = innerHeight * 0.5; });
    return pts;
  }

  // —— 装饰 ——
  deco(kind, x, y, z, s = 1) {
    const o = kind === 'tree' ? puffTree(this.theme) : lollipop(this.theme);
    o.position.set(x, y, z);
    o.scale.setScalar(s);
    this.root.add(o);
    return o;
  }
  // 路旁的小浮岛 + 装饰
  islet(x, y, z, s = 1.6, n = 2) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(s, s * 0.92, 0.5, 24), mat(this.theme.grass, { vertexColors: false, roughness: 0.8 }));
    top.receiveShadow = true; top.castShadow = true;
    const bot = new THREE.Mesh(new THREE.ConeGeometry(s * 0.92, s * 1.4, 24), mat(this.theme.night ? '#5c4a8f' : '#f3c9a8', { vertexColors: false, roughness: 0.9 }));
    bot.rotation.x = Math.PI; bot.position.y = -0.25 - s * 0.7;
    g.add(top, bot);
    for (let i = 0; i < n; i++) {
      const d = i % 2 ? puffTree(this.theme) : lollipop(this.theme);
      const a = (i / n) * Math.PI * 2 + x;
      d.position.set(Math.cos(a) * s * 0.45, 0.25, Math.sin(a) * s * 0.45);
      d.scale.setScalar(0.7 + s * 0.15);
      g.add(d);
    }
    this.root.add(g);
    const ph = Math.random() * 6;
    this.every((dt, t) => { g.position.y = y + Math.sin(t * 0.8 + ph) * 0.15; });
    return g;
  }

  // —— 关卡记忆（Level Devil 式：你学会了躲，它就学会了在你躲的地方等你）——
  seen(id) { return this.memory.has(id); }
  mark(id) { if (id) this.memory.add(id); }

  // 尝试把实体沿某轴挪动（推箱子 / 箱子下落），被别的实心物体挡住就放弃
  tryMoveEnt(e, axis, d) {
    const old = e.obj.position[axis];
    e.obj.position[axis] += d;
    this.updateBox(e);
    const t = 1e-3;
    for (const o of this.ents) {
      if (o === e || !o.enabled || !o.solid) continue;
      if (e.min.x < o.max.x - t && e.max.x > o.min.x + t && e.min.y < o.max.y - t && e.max.y > o.min.y + t && e.min.z < o.max.z - t && e.max.z > o.min.z + t) {
        e.obj.position[axis] = old; this.updateBox(e); return false;
      }
    }
    return true;
  }

  // —— 可以推的木箱（掉下去会自己回到原位）；cardboard = 一踩就扁的纸箱 ——
  crate(x, z, o = {}) {
    const s = o.size ?? 1.3, y = o.y ?? 0;
    const m = new THREE.Mesh(rbox(s, s, s, 0.08), new THREE.MeshStandardMaterial({ map: crateTexture(!!o.cardboard), roughness: 0.75, vertexColors: true }));
    m.position.set(x, y + s / 2, z);
    m.castShadow = true; m.receiveShadow = true;
    m.userData.ownMat = true;
    const e = this.ent(m, s / 2, s / 2, s / 2, { pushable: !o.cardboard });
    e.home = m.position.clone(); e.vy = 0; e.isCrate = true;
    if (o.cardboard) {
      e.onStep = () => {
        if (e.squashed) return;
        e.squashed = true;
        this.sfx.squish(); this.sfx.crack();
        this.mark(o.id);
        o.onSquash && o.onSquash();
        this.tween(m.scale, { y: 0.12, x: 1.25, z: 1.25 }, 0.18, 'outQuad', { done: () => { e.enabled = false; } });
        this.tween(m.position, { y: y + s * 0.06 }, 0.18, 'outQuad');
      };
      return e;
    }
    this.every((dt) => {
      if (!e.enabled) return;
      e.vy = Math.max(-30, e.vy - 22 * dt);
      if (!this.tryMoveEnt(e, 'y', e.vy * dt)) e.vy = 0;
      if (m.position.y < this.killY - 3) {
        m.position.copy(e.home); e.vy = 0; this.updateBox(e);
        this.g.fx.emit(e.home, { count: 20, speed: 3, colors: ['#ffffff', '#ffe3a8'] });
        this.sfx.pop();
        this.toast(o.backMsg || '箱子自己爬回来了');
      }
    });
    return e;
  }

  // —— 压力板：玩家或箱子压着就算按下 ——
  plate(x, z, o = {}) {
    const y = o.y ?? 0;
    const base = new THREE.Mesh(rbox(1.8, 0.12, 1.8, 0.05), mat('#8b7fa8'));
    base.position.set(x, y + 0.02, z);
    const top = new THREE.Mesh(rbox(1.5, 0.14, 1.5, 0.06), mat(o.color || '#ffd34f', { emissive: '#ff9a00', emissiveIntensity: 0.2 }));
    top.position.set(x, y + 0.1, z);
    base.receiveShadow = top.receiveShadow = true;
    this.root.add(base, top);
    const api = { down: false };
    const zmin = new THREE.Vector3(x - 0.85, y - 0.1, z - 0.85), zmax = new THREE.Vector3(x + 0.85, y + 0.6, z + 0.85);
    const hit = (a, b) => a.x < zmax.x && b.x > zmin.x && a.y < zmax.y && b.y > zmin.y && a.z < zmax.z && b.z > zmin.z;
    this.every(() => {
      const p = this.p.pos;
      let on = hit({ x: p.x - 0.3, y: p.y, z: p.z - 0.3 }, { x: p.x + 0.3, y: p.y + 0.5, z: p.z + 0.3 }) && this.g.canInteract();
      if (!on) for (const e of this.ents) if (e.isCrate && e.enabled && hit(e.min, e.max)) { on = true; break; }
      if (on !== api.down) {
        api.down = on;
        top.position.y = y + (on ? 0.03 : 0.1);
        this.sfx.click();
        on ? o.on && o.on() : o.off && o.off();
      }
    });
    return api;
  }

  // —— 隐藏砖块：你往上跳时才突然出现，把你顶回坑里 ——
  bonkBlock(x, y, z, o = {}) {
    const m = new THREE.Mesh(rbox(1.4, 1.0, 1.4, 0.14), mat('#ffd34f', { emissive: '#ffb000', emissiveIntensity: 0.25 }));
    m.position.set(x, y + 0.5, z);
    m.visible = false; m.castShadow = true;
    const e = this.ent(m, 0.7, 0.5, 0.7);
    e.enabled = false;
    this.every(() => {
      const P = this.p, p = P.pos;
      if (!this.g.canInteract()) return;
      if (!P.grounded && P.vel.y > 0 && Math.abs(p.x - x) < 0.95 && Math.abs(p.z - z) < 0.95 && p.y + 1.62 < y - 0.02 && p.y + 1.62 > y - 1.4) {
        e.enabled = true; m.visible = true;
        m.scale.setScalar(0.3);
        this.tween(m.scale, { x: 1, y: 1, z: 1 }, 0.15, 'outBack');
        this.sfx.bonk();
        this.mark(o.id);
        o.msg && this.fallMsg(o.msg, o.set);
        return false;
      }
    });
    return e;
  }

  // —— 天降方块：被踩中会把你压扁。auto: 按节奏一直砸（地上的影子会提前变深） ——
  crusher(x, z, w, d, o = {}) {
    const y0 = o.y ?? 0, h = o.h ?? 1.8, up = y0 + (o.top ?? 5.5) + h / 2, downY = y0 + h / 2;
    const m = new THREE.Mesh(rbox(w, h, d, 0.16), mat(o.color || '#b9a3f0'));
    m.position.set(x, up, z);
    m.castShadow = true;
    const e = this.ent(m, w / 2 - 0.02, h / 2, d / 2 - 0.02, { crush: true, kill: { msg: o.msg || '被压成了一张饼 (＞﹏＜)', set: o.set, type: 'squash' } });
    // 地面影子：快砸下来时变深，给你一点反应时间
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: '#3a1d48', transparent: true, opacity: 0, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.set(x, y0 + 0.02, z);
    this.root.add(sh);
    const api = { e, busy: false };
    api.drop = (cb) => {
      if (api.busy) return;
      api.busy = true;
      this.mark(o.id);
      this.tween(sh.material, { opacity: 0.45 }, o.warn ?? 0.35, 'linear');
      this.tween(m.position, { y: downY }, 0.13, 'inQuad', {
        delay: o.warn ?? 0.35,
        done: () => {
          this.sfx.bonk(); this.g.shake(0.35);
          if (o.stay) { api.busy = false; cb && cb(); return; }
          this.tween(m.position, { y: up }, 0.9, 'inOutSine', { delay: o.hold ?? 0.5, done: () => { api.busy = false; cb && cb(); } });
          this.tween(sh.material, { opacity: 0 }, 0.6, 'linear', { delay: o.hold ?? 0.5 });
        },
      });
    };
    if (o.zone) this.zone(o.zone[0], y0 + 1, o.zone[1], o.zone[2], 3, o.zone[3], { once: !o.repeat, enter: () => api.drop() });
    if (o.auto) {
      const loop = () => this.after(o.auto, () => api.drop(loop));
      this.after(o.phase ?? 0, () => api.drop(loop));
    }
    return api;
  }

  // —— 拳击手套：从箱子里弹出来把你打飞 ——
  glove(x, y, z, dir, o = {}) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = Math.atan2(dir[0], dir[1]);
    const box = new THREE.Mesh(rbox(1.0, 1.0, 0.8, 0.12), mat(o.color || '#ffd34f'));
    box.castShadow = true;
    const spring = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1, 10), mat('#c9c1dd', { vertexColors: false, metalness: 0.5, roughness: 0.3 }));
    spring.rotation.x = Math.PI / 2;
    const fist = new THREE.Group();
    const ball = new THREE.Mesh(shared.sphere, new THREE.MeshStandardMaterial({ color: '#ff4d6d', roughness: 0.3 }));
    ball.scale.set(0.45, 0.4, 0.42);
    const thumb = new THREE.Mesh(shared.sphere, ball.material);
    thumb.scale.setScalar(0.17); thumb.position.set(0.32, 0.12, -0.05);
    fist.add(ball, thumb);
    fist.position.z = 0.3;
    g.add(box, spring, fist);
    const bang = labelSprite('!', { color: '#ff3d6e', size: 0.7 });
    bang.position.y = 1.1; bang.visible = false;
    g.add(bang);
    this.root.add(g);
    const reach = o.reach ?? 3.2, power = o.power ?? 13;
    const api = { fired: false };
    let ext = 0;
    const setExt = (v) => { ext = v; fist.position.z = 0.3 + v; spring.scale.y = Math.max(0.01, v); spring.position.z = 0.3 + v / 2; };
    setExt(0.001);
    api.fire = () => {
      if (api.fired) return;
      api.fired = true;
      this.mark(o.id);
      bang.visible = true;
      this.sfx.alarm();
      const s = { v: 0.001 };
      let hitDone = false;
      this.tween(s, { v: reach }, 0.12, 'outQuad', {
        delay: o.delay ?? 0.3,
        update: () => {
          setExt(s.v);
          if (hitDone || !this.g.canInteract()) return;
          // 拳头扫过的区域
          const p = this.p.pos;
          const rx = p.x - x, rz = p.z - z;
          const along = rx * dir[0] + rz * dir[1], side = Math.abs(rx * dir[1] - rz * dir[0]);
          if (along > 0 && along < s.v + 0.9 && side < 1.0 && p.y < y + 0.35 && p.y + 1.62 > y - 0.5) {
            hitDone = true;
            this.sfx.bonk(); this.g.shake(0.5);
            this.g.impulse(dir[0] * power, 5.5, dir[1] * power);
            o.msg && this.fallMsg(o.msg, o.set);
          }
        },
        done: () => {
          this.sfx.boing();
          bang.visible = false;
          this.after(0.6, () => this.tween(s, { v: 0.001 }, 0.4, 'inOutSine', { update: () => setExt(s.v), done: () => { if (o.rearm) api.fired = false; } }));
        },
      });
    };
    if (o.zone) this.zone(o.zone[0], y, o.zone[1], o.zone[2], 3, o.zone[3], { repeat: true, enter: () => api.fire() });
    return api;
  }

  // —— 时间工具 ——
  after(t, fn) { this.timers.push({ t: this.time + t, fn }); }
  every(fn) { this.updaters.push(fn); }
  tween(target, to, dur, ease = 'outCubic', o = {}) {
    const tw = { target, to, from: null, dur: Math.max(0.0001, dur), t: -(o.delay || 0), ease: EASE[ease] || EASE.linear, done: o.done, onUpdate: o.update };
    this.tweens.push(tw);
    return tw;
  }

  update(dt) {
    this.time += dt;
    for (let i = this.timers.length - 1; i >= 0; i--) {
      if (this.time >= this.timers[i].t) { const tm = this.timers[i]; this.timers.splice(i, 1); tm.fn(); }
    }
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      tw.t += dt;
      if (tw.t < 0) continue;
      if (!tw.from) { tw.from = {}; for (const k in tw.to) tw.from[k] = tw.target[k]; }
      const k = Math.min(1, tw.t / tw.dur), e = tw.ease(k);
      for (const key in tw.to) tw.target[key] = tw.from[key] + (tw.to[key] - tw.from[key]) * e;
      tw.onUpdate && tw.onUpdate(e);
      if (k >= 1) { this.tweens.splice(this.tweens.indexOf(tw), 1); tw.done && tw.done(); }
    }
    for (let i = this.updaters.length - 1; i >= 0; i--) {
      if (this.updaters[i](dt, this.time) === false) this.updaters.splice(i, 1);
    }
  }

  dispose() {
    const keep = new Set(Object.values(shared));
    this.root.traverse((o) => {
      if (!o.isMesh && !o.isPoints && !o.isSprite) return;
      const g = o.geometry;
      if (g && !g.userData.cached && !keep.has(g) && !o.userData.sharedGeo) g.dispose();
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of ms) if (m && !m.userData.cached && m !== spikeMat) m.dispose();
    });
    this.root.removeFromParent();
  }
}

let _star = null;
function starGeo() {
  if (_star) return _star;
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.16 : 0.36, a = Math.PI / 2 + (i / 10) * Math.PI * 2;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  s.closePath();
  _star = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 3 });
  _star.center();
  _star.userData.cached = true;
  return _star;
}
