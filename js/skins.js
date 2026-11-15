import * as THREE from '../vendor/three.module.min.js';

// 七款皮肤：五款开局可选，两款需要解锁
export const SKINS = [
  { id: 'cat', name: '团子猫', desc: '软乎乎的，摔下去也不疼（才怪）', body: '#fff3e4', belly: '#ffffff', paw: '#fff3e4', accent: '#ffb3c7', patch: '#ffb36b' },
  { id: 'chick', name: '布丁鸡', desc: '布丁做的小鸡，跳起来会晃', body: '#ffe27a', belly: '#fff3c0', paw: '#ffe27a', accent: '#ff9a3c' },
  { id: 'bunny', name: '草莓兔', desc: '耳朵太长，经常被陷阱夹住', body: '#ffd3e2', belly: '#fff2f6', paw: '#ffd3e2', accent: '#ff7fa8' },
  { id: 'panda', name: '竹笋熊猫', desc: '黑眼圈是熬夜通关熬出来的', body: '#fbfbff', belly: '#ffffff', paw: '#3a3446', accent: '#3a3446' },
  { id: 'frog', name: '呱呱蛙', desc: '跳得很高，但跳不出套路', body: '#9be38a', belly: '#e3f9c8', paw: '#9be38a', accent: '#ff8fa3' },
  { id: 'ghost', name: '幽灵啵啵', desc: '死太多次，干脆变成幽灵了', body: '#f1efff', belly: '#ffffff', paw: '#f1efff', accent: '#c7b8ff', unlock: { deaths: 30, text: '累计阵亡 30 次解锁' } },
  { id: 'gold', name: '金团子', desc: '够着终点的证明 ✦', body: '#ffd35a', belly: '#fff0b0', paw: '#ffd35a', accent: '#ff8a5c', patch: '#ffb23a', unlock: { clear: true, text: '通关全部 5 关解锁' } },
];

const mats = new Map();
function M(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!mats.has(key)) {
    mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.48, metalness: 0, ...o }));
  }
  return mats.get(key);
}
const sph = new THREE.SphereGeometry(1, 28, 20);
const sphLow = new THREE.SphereGeometry(1, 16, 12);

function ball(color, r, x, y, z, sx = 1, sy = 1, sz = 1, o) {
  const m = new THREE.Mesh(r > 0.08 ? sph : sphLow, typeof color === 'string' ? M(color, o) : color);
  m.scale.set(r * sx, r * sy, r * sz);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

function bodyMat(skin) {
  if (skin.id === 'ghost') return M(skin.body, { transparent: true, opacity: 0.86, emissive: '#6d5cc9', emissiveIntensity: 0.12 });
  if (skin.id === 'gold') return M(skin.body, { metalness: 0.55, roughness: 0.28, emissive: '#7a4a00', emissiveIntensity: 0.12 });
  return M(skin.body);
}

function face(head, skin, { eyeY = 0.03, eyeX = 0.145, eyeZ = 0.355, mouth = 'w' } = {}) {
  const eyeMat = M('#2a2233', { roughness: 0.12 });
  const hl = M('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.6 });
  const eyes = new THREE.Group();
  for (const s of [-1, 1]) {
    const e = ball(eyeMat, 0.062, s * eyeX, eyeY, eyeZ, 0.95, 1.15, 0.7);
    e.castShadow = false;
    const h = ball(hl, 0.021, s * eyeX + 0.022, eyeY + 0.03, eyeZ + 0.045);
    h.castShadow = false;
    const h2 = ball(hl, 0.011, s * eyeX - 0.02, eyeY - 0.025, eyeZ + 0.045);
    h2.castShadow = false;
    eyes.add(e, h, h2);
  }
  head.add(eyes);
  // 腮红
  for (const s of [-1, 1]) {
    const b = ball(M('#ff9bb8', { transparent: true, opacity: 0.75 }), 0.07, s * 0.245, -0.075, 0.3, 1.1, 0.6, 0.3);
    b.lookAt(b.position.clone().multiplyScalar(3));
    b.castShadow = false;
    head.add(b);
  }
  // 嘴巴
  const mouthMat = M('#5a3a4a', { roughness: 0.4 });
  if (mouth === 'w') {
    const g = new THREE.TorusGeometry(0.03, 0.009, 6, 14, Math.PI);
    for (const s of [-1, 1]) {
      const m = new THREE.Mesh(g, mouthMat);
      m.position.set(s * 0.03, -0.065, 0.39);
      m.rotation.z = Math.PI;
      head.add(m);
    }
  } else if (mouth === 'smile') {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.013, 6, 20, Math.PI * 0.8), mouthMat);
    m.position.set(0, -0.02, 0.37);
    m.rotation.z = Math.PI + Math.PI * 0.1;
    head.add(m);
  } else if (mouth === 'o') {
    head.add(ball(mouthMat, 0.035, 0, -0.08, 0.385, 1, 1.2, 0.4));
  }
  return eyes;
}

// 构建完整角色（模型正面朝 +Z，脚底在 y=0）
export function buildCharacter(skin) {
  const root = new THREE.Group();
  const rig = new THREE.Group(); // 整体弹跳 / 压扁
  root.add(rig);
  const parts = { rig };
  const bm = bodyMat(skin);
  const isGhost = skin.id === 'ghost';

  // 身体
  let body;
  if (isGhost) {
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI * 0.5;
      pts.push(new THREE.Vector2(Math.sin(a) * 0.38, 0.42 + Math.cos(a) * 0.38));
    }
    pts.reverse();
    pts.push(new THREE.Vector2(0.42, 0.1));
    const lathe = new THREE.LatheGeometry(pts, 32);
    // 波浪下摆
    const pos = lathe.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y < 0.15) {
        const a = Math.atan2(pos.getZ(i), pos.getX(i));
        pos.setY(i, y + Math.sin(a * 6) * 0.05);
      }
    }
    lathe.computeVertexNormals();
    body = new THREE.Mesh(lathe, new THREE.MeshStandardMaterial({ color: skin.body, roughness: 0.4, transparent: true, opacity: 0.86, side: THREE.DoubleSide, emissive: '#6d5cc9', emissiveIntensity: 0.12 }));
    body.castShadow = true;
    rig.add(body);
  } else {
    body = ball(bm, 0.36, 0, 0.42, 0, 1, 0.95, 0.92);
    rig.add(body);
    const belly = ball(skin.belly === skin.body ? bm : M(skin.belly), 0.24, 0, 0.46, 0.17, 0.95, 0.9, 0.55);
    rig.add(belly);
  }
  parts.body = body;

  // 头
  const head = new THREE.Group();
  head.position.set(0, 0.98, 0);
  rig.add(head);
  parts.head = head;
  const skull = ball(bm, 0.4, 0, 0, 0, 1.06, 0.95, 1);
  head.add(skull);
  let faceOpt = {};
  if (skin.id === 'frog') faceOpt = { mouth: 'smile', eyeY: 0.0, eyeX: 0.0001, eyeZ: -10 }; // 青蛙眼睛另做
  if (skin.id === 'ghost') faceOpt = { mouth: 'o' };
  if (skin.id !== 'frog') parts.eyes = face(head, skin, faceOpt);

  // 手 / 脚
  const armMat = M(skin.paw, skin.id === 'gold' ? { metalness: 0.55, roughness: 0.28 } : (isGhost ? { transparent: true, opacity: 0.86 } : {}));
  parts.arms = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.3, 0.6, 0.02);
    const arm = ball(armMat, 0.11, s * 0.08, -0.12, 0.03, 0.8, 1.25, 0.8);
    pivot.add(arm);
    pivot.rotation.z = s * 0.35;
    rig.add(pivot);
    parts.arms.push(pivot);
  }
  parts.feet = [];
  if (!isGhost) {
    for (const s of [-1, 1]) {
      const footColor = skin.id === 'chick' ? '#ff9a3c' : skin.id === 'panda' ? '#3a3446' : null;
      const f = ball(footColor ? M(footColor) : armMat, 0.12, s * 0.16, 0.06, 0.06, 1.1, 0.6, 1.35);
      rig.add(f);
      parts.feet.push(f);
    }
  }

  // —— 物种特征 ——
  const ears = [];
  if (skin.id === 'cat' || skin.id === 'gold') {
    const coneG = new THREE.ConeGeometry(0.13, 0.24, 20);
    const inG = new THREE.ConeGeometry(0.075, 0.15, 16);
    for (const s of [-1, 1]) {
      const ear = new THREE.Group();
      ear.position.set(s * 0.24, 0.3, 0);
      ear.rotation.z = -s * 0.32;
      const c = new THREE.Mesh(coneG, bm); c.castShadow = true;
      const ci = new THREE.Mesh(inG, M('#ffb3c7')); ci.position.set(0, -0.02, 0.06); ci.scale.z = 0.5;
      ear.add(c, ci);
      head.add(ear); ears.push(ear);
    }
    head.add(ball(M(skin.patch), 0.2, -0.12, 0.25, 0.08, 1.2, 0.55, 1.1)); // 花斑
    // 胡须
    const wg = new THREE.CylinderGeometry(0.004, 0.004, 0.18, 4);
    for (const s of [-1, 1]) for (const k of [0, 1]) {
      const w = new THREE.Mesh(wg, M('#c9a59a'));
      w.rotation.z = Math.PI / 2 + s * (k ? -0.15 : 0.12);
      w.position.set(s * 0.32, -0.04 - k * 0.04, 0.27);
      head.add(w);
    }
    // 尾巴
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.3, -0.3), new THREE.Vector3(0.1, 0.4, -0.55),
      new THREE.Vector3(0.05, 0.7, -0.62), new THREE.Vector3(-0.08, 0.85, -0.5),
    ]);
    const tail = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.055, 10), bm);
    tail.castShadow = true;
    rig.add(tail); parts.tail = tail;
    if (skin.id === 'gold') {
      const crown = new THREE.Group();
      const gm = M('#fff2a8', { metalness: 0.8, roughness: 0.2, emissive: '#ffb000', emissiveIntensity: 0.25 });
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.09, 24, 1, true), gm);
      crown.add(band);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const sp = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 8), gm);
        sp.position.set(Math.cos(a) * 0.16, 0.08, Math.sin(a) * 0.16);
        crown.add(sp);
        crown.add(ball(M('#ff6f9e', { roughness: 0.1 }), 0.022, Math.cos(a) * 0.162, 0.015, Math.sin(a) * 0.162));
      }
      crown.position.set(0.02, 0.4, -0.02);
      crown.rotation.z = -0.15;
      head.add(crown);
    }
  }
  if (skin.id === 'chick') {
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 12), M('#ff9a3c'));
    beak.rotation.x = Math.PI / 2; beak.position.set(0, -0.06, 0.42);
    head.add(beak);
    for (let i = -1; i <= 1; i++) {
      const t = ball(bm, 0.06, i * 0.05, 0.42, 0, 0.6, 1.5, 0.6);
      t.rotation.z = -i * 0.4;
      head.add(t); ears.push(t);
    }
    parts.arms.forEach((p, i) => { p.children[0].scale.set(0.05, 0.13, 0.12); });
  }
  if (skin.id === 'bunny') {
    const capG = new THREE.CapsuleGeometry(0.075, 0.32, 8, 16);
    for (const s of [-1, 1]) {
      const ear = new THREE.Group();
      ear.position.set(s * 0.15, 0.32, -0.02);
      ear.rotation.z = -s * 0.18;
      const c = new THREE.Mesh(capG, bm); c.position.y = 0.2; c.castShadow = true;
      const ci = new THREE.Mesh(capG, M('#ff9fbe')); ci.scale.set(0.55, 0.85, 0.4); ci.position.set(0, 0.2, 0.045);
      ear.add(c, ci);
      head.add(ear); ears.push(ear);
    }
    head.add(ball(M('#ff7fa8'), 0.03, 0, -0.03, 0.4, 1.2, 0.9, 0.7));
    rig.add(ball(M('#ffffff'), 0.11, 0, 0.3, -0.33));
    // 草莓发卡
    const berry = ball(M('#ff4f7a', { roughness: 0.3 }), 0.06, 0.25, 0.25, 0.18, 1, 1.15, 1);
    head.add(berry);
    head.add(ball(M('#6fd16f'), 0.035, 0.25, 0.31, 0.18, 1.3, 0.5, 1.3));
  }
  if (skin.id === 'panda') {
    for (const s of [-1, 1]) {
      const ear = ball(M('#3a3446'), 0.12, s * 0.27, 0.28, -0.02, 1, 1, 0.7);
      head.add(ear); ears.push(ear);
      const patch = ball(M('#3a3446'), 0.1, s * 0.15, 0.02, 0.33, 0.9, 1.15, 0.5);
      patch.rotation.z = s * 0.5;
      head.add(patch);
    }
    head.add(ball(M('#3a3446'), 0.04, 0, -0.04, 0.4, 1.2, 0.8, 0.6));
    // 把眼睛提到眼圈前面
    if (parts.eyes) parts.eyes.position.z += 0.025;
    parts.arms.forEach((p) => { p.children[0].material = M('#3a3446'); });
    // 小竹笋
    const sh = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 10), M('#8fd16a'));
    sh.position.set(0.12, -0.05, 0.05); sh.rotation.z = -0.5;
    parts.arms[1].add(sh);
  }
  if (skin.id === 'frog') {
    const eyeMat = M('#2a2233', { roughness: 0.12 });
    const eyesG = new THREE.Group();
    for (const s of [-1, 1]) {
      const bulb = ball(bm, 0.14, s * 0.18, 0.3, 0.12);
      head.add(bulb); ears.push(bulb);
      const w = ball(M('#ffffff'), 0.1, s * 0.18, 0.32, 0.22);
      const p = ball(eyeMat, 0.055, s * 0.18, 0.33, 0.3, 1, 1.1, 0.6);
      const h = ball(M('#ffffff', { emissive: '#fff', emissiveIntensity: 0.5 }), 0.018, s * 0.18 + 0.02, 0.36, 0.33);
      eyesG.add(w, p, h);
    }
    head.add(eyesG);
    parts.eyes = eyesG;
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.014, 6, 20, Math.PI * 0.8), M('#5a3a4a', { roughness: 0.4 }));
    smile.position.set(0, -0.04, 0.36); smile.rotation.z = Math.PI + Math.PI * 0.1;
    head.add(smile);
    for (const s of [-1, 1]) {
      const b = ball(M('#ff9bb8', { transparent: true, opacity: 0.75 }), 0.07, s * 0.26, -0.08, 0.29, 1.1, 0.6, 0.3);
      b.lookAt(b.position.clone().multiplyScalar(3));
      head.add(b);
    }
    // 小荷叶帽
    const leaf = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 20, 1, false, 0.3, Math.PI * 1.8), M('#4fbf6a'));
    leaf.position.set(-0.05, 0.4, -0.08); leaf.rotation.z = 0.25;
    head.add(leaf);
  }
  if (isGhost) {
    // 小小的光环
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 8, 28), M('#fff1a8', { emissive: '#ffd84a', emissiveIntensity: 0.9 }));
    halo.rotation.x = Math.PI / 2;
    halo.position.set(0, 0.52, 0);
    head.add(halo);
    parts.halo = halo;
  }
  parts.ears = ears;
  root.userData.parts = parts;
  root.userData.skin = skin;
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return root;
}

// 角色动画：idle / dance / walk / dizzy
export function animateCharacter(ch, t, mode = 'idle') {
  const p = ch.userData.parts;
  if (!p) return;
  const skin = ch.userData.skin;
  const ghost = skin.id === 'ghost';
  p.rig.position.y = ghost ? 0.12 + Math.sin(t * 2.2) * 0.06 : 0;
  p.rig.rotation.set(0, 0, 0);
  p.rig.scale.set(1, 1, 1);
  if (mode === 'idle') {
    const br = Math.sin(t * 2.4);
    p.rig.scale.set(1 + br * 0.015, 1 - br * 0.02, 1 + br * 0.015);
    p.head.rotation.z = Math.sin(t * 1.1) * 0.08;
    p.head.rotation.x = Math.sin(t * 0.7) * 0.05;
    p.arms.forEach((a, i) => { a.rotation.x = Math.sin(t * 2 + i) * 0.15; a.rotation.z = (i ? 1 : -1) * (0.35 + Math.sin(t * 2.4) * 0.05); });
  } else if (mode === 'dance') {
    const hop = Math.abs(Math.sin(t * 6));
    p.rig.position.y += hop * 0.35;
    p.rig.scale.set(1 + (1 - hop) * 0.08, 1 - (1 - hop) * 0.1, 1 + (1 - hop) * 0.08);
    p.rig.rotation.y = Math.sin(t * 3) * 0.5;
    p.head.rotation.z = Math.sin(t * 6) * 0.15;
    p.arms.forEach((a, i) => { a.rotation.z = (i ? 1 : -1) * (2.2 + Math.sin(t * 12 + i * 3) * 0.4); a.rotation.x = 0; });
  } else if (mode === 'dizzy') {
    p.rig.rotation.z = Math.sin(t * 7) * 0.2;
    p.head.rotation.z = Math.sin(t * 9) * 0.25;
    p.arms.forEach((a, i) => { a.rotation.z = (i ? 1 : -1) * (1.6 + Math.sin(t * 20 + i) * 0.6); });
  }
  // 耳朵抖动
  p.ears.forEach((e, i) => { e.rotation.x = Math.sin(t * 3 + i) * 0.08; });
  if (p.tail) p.tail.rotation.y = Math.sin(t * 2.5) * 0.3;
  if (p.halo) p.halo.position.y = 0.52 + Math.sin(t * 3) * 0.03;
  // 眨眼
  if (p.eyes) {
    const bl = (t % 3.3) < 0.12 ? 0.12 : 1;
    p.eyes.scale.y = bl;
  }
}

// 第一人称时看到的两只小爪爪
export function buildPaws(skin) {
  const root = new THREE.Group();
  const ghost = skin.id === 'ghost';
  const o = skin.id === 'gold' ? { metalness: 0.55, roughness: 0.28 } : ghost ? { transparent: true, opacity: 0.8 } : {};
  const pm = M(skin.paw, o);
  const sleeve = M(skin.id === 'panda' ? '#3a3446' : skin.body, o);
  const paws = [];
  for (const s of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(s * 0.27, -0.27, -0.62);
    g.rotation.set(-0.25, -s * 0.18, s * 0.2);
    g.scale.setScalar(0.85);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.16, 8, 20), sleeve);
    arm.rotation.x = Math.PI / 2;
    arm.position.z = 0.12;
    g.add(arm);
    if (skin.id === 'chick') {
      const wing = ball(pm, 0.1, 0, 0, -0.02, 0.45, 0.9, 1.5);
      g.add(wing);
    } else {
      const paw = ball(pm, 0.1, 0, 0, -0.02, 1.15, 0.85, 1.25);
      g.add(paw);
      // 小指头 / 肉垫
      const toe = skin.id === 'frog' ? M('#7ccf6a') : skin.id === 'panda' ? M('#4a4458') : M(skin.accent, o);
      for (let k = -1; k <= 1; k++) {
        const t = ball(toe, skin.id === 'frog' ? 0.035 : 0.028, k * 0.045, 0.055, -0.1 + Math.abs(k) * 0.015, 1, 0.7, 1);
        g.add(t);
      }
    }
    root.add(g);
    paws.push(g);
  }
  root.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.frustumCulled = false; } });
  root.userData.paws = paws;
  return root;
}
