import * as THREE from '../vendor/three.module.min.js';
import { mat, rbox, labelSprite } from './world.js';
import { THEMES } from './env.js';

// 设计思路（参考 Level Devil / 猫里奥 / Human: Fall Flat）：
// · 真话和谎话混着来：薄荷绿描边的牌子不一定是真的，粉色的也不一定是假的——只能靠试
// · 陷阱会“学习”：你死过一次学会了躲，下一次它就在你躲的地方等你（L.seen / L.mark）
// · 最显眼的路通常是坑，看起来安全的地方（空地、落脚点、出口）最危险
// · 物理小谜题：推箱子压开关、拳套击飞、爆炸金币

function cuteCloud(L) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, emissive: '#ffe6f2', emissiveIntensity: 0.35 });
  const s = new THREE.SphereGeometry(1, 20, 14);
  [[0, 0, 0, 1.1], [-1, -0.15, 0.1, 0.8], [1, -0.1, 0, 0.85], [-0.4, 0.45, 0, 0.75], [0.5, 0.4, 0.1, 0.7]].forEach(([x, y, z, r]) => {
    const b = new THREE.Mesh(s, m); b.position.set(x, y, z); b.scale.set(r, r * 0.85, r); b.castShadow = true; g.add(b);
  });
  const ink = new THREE.MeshStandardMaterial({ color: '#4a3550', roughness: 0.3 });
  // 生气的眉毛 + 眼睛（朝下看）
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(s, ink); e.scale.set(0.09, 0.12, 0.05); e.position.set(sx * 0.32, -0.35, 0.95); g.add(e);
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.05), ink);
    br.position.set(sx * 0.32, -0.15, 0.97); br.rotation.z = sx * 0.4; g.add(br);
  }
  g.rotation.x = 0.9; // 脸朝下
  L.add(g);
  return g;
}

function doll(L) {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: '#ffe6d6', roughness: 0.5 });
  const hair = new THREE.MeshStandardMaterial({ color: '#4b356b', roughness: 0.55 });
  const dress = new THREE.MeshStandardMaterial({ color: '#ff8fb8', roughness: 0.5 });
  const s = new THREE.SphereGeometry(1, 32, 20);
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.6, 28), dress);
  body.position.y = 0.8; g.add(body);
  const head = new THREE.Group(); head.position.y = 2.25; g.add(head);
  const sk = new THREE.Mesh(s, skin); sk.scale.setScalar(1.05); head.add(sk);
  // 头发：后脑大半个球 + 两个发髻
  const back = new THREE.Mesh(new THREE.SphereGeometry(1.1, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.62), hair);
  back.rotation.x = -0.5; back.position.z = -0.08; head.add(back);
  for (const sx of [-1, 1]) {
    const bun = new THREE.Mesh(s, hair); bun.scale.setScalar(0.38); bun.position.set(sx * 0.75, 0.75, -0.2); head.add(bun);
    const bow = new THREE.Mesh(s, dress); bow.scale.set(0.2, 0.13, 0.1); bow.position.set(sx * 0.62, 0.95, 0.05); head.add(bow);
  }
  const eyeM = new THREE.MeshStandardMaterial({ color: '#2a2233', roughness: 0.1, emissive: '#000', emissiveIntensity: 0 });
  const eyes = [];
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(s, eyeM); e.scale.set(0.13, 0.17, 0.08); e.position.set(sx * 0.33, 0.05, 0.97); head.add(e); eyes.push(e);
    const h = new THREE.Mesh(s, new THREE.MeshBasicMaterial({ color: '#fff' })); h.scale.setScalar(0.045); h.position.set(sx * 0.33 + 0.04, 0.12, 1.04); head.add(h);
    const b = new THREE.Mesh(s, new THREE.MeshStandardMaterial({ color: '#ff9bb8', transparent: true, opacity: 0.7 }));
    b.scale.set(0.16, 0.08, 0.04); b.position.set(sx * 0.55, -0.18, 0.86); b.lookAt(b.position.clone().multiplyScalar(2)); head.add(b);
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 8, 20, Math.PI), new THREE.MeshStandardMaterial({ color: '#7a3a50' }));
  mouth.position.set(0, -0.25, 0.98); mouth.rotation.z = Math.PI; head.add(mouth);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  L.add(g);
  return { g, head, eyeM };
}

function trafficLamp(L) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.6, 10), mat('#ece6ff', { vertexColors: false, metalness: 0.3 }));
  pole.position.y = 0.8; g.add(pole);
  const box = new THREE.Mesh(rbox(0.8, 1.5, 0.5, 0.18), mat('#3d3460'));
  box.position.y = 2.3; g.add(box);
  const red = new THREE.MeshStandardMaterial({ color: '#ff4d6d', emissive: '#ff2244', emissiveIntensity: 1.2 });
  const green = new THREE.MeshStandardMaterial({ color: '#4dffa0', emissive: '#22ff88', emissiveIntensity: 0.1 });
  const s = new THREE.SphereGeometry(0.24, 20, 14);
  const r = new THREE.Mesh(s, red); r.position.set(0, 2.62, 0.2); r.scale.z = 0.5;
  const gr = new THREE.Mesh(s, green); gr.position.set(0, 1.98, 0.2); gr.scale.z = 0.5;
  g.add(r, gr);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  L.add(g);
  return {
    g, set(state) {
      red.emissiveIntensity = state === 'red' ? 1.3 : 0.05; red.color.set(state === 'red' ? '#ff4d6d' : '#6b3a48');
      green.emissiveIntensity = state === 'green' ? 1.3 : 0.05; green.color.set(state === 'green' ? '#4dffa0' : '#2f5a48');
    },
  };
}

function mushroom(L, x, y, z, s = 1) {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.5, 12), new THREE.MeshStandardMaterial({ color: '#fff4e0' }));
  stem.position.y = 0.25;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: '#c6a8ff', emissive: '#a07aff', emissiveIntensity: 0.9 }));
  cap.position.y = 0.45;
  g.add(stem, cap);
  g.position.set(x, y, z); g.scale.setScalar(s);
  L.add(g);
  return g;
}

// 小工具：说真话的牌子用薄荷绿描边，说谎的用粉色——但颜色本身不是提示，两种都会出现在真话和谎话上
const TRUE_INK = '#20b38d';

// 金币爆炸：把玩家往侧面炸飞
function explode(L, at, set) {
  const p = L.p.pos;
  const side = p.x >= at.x ? 1 : -1;
  L.g.fx.emit(at, { count: 60, speed: 8, up: 3, colors: ['#ffd34f', '#ff7a3d', '#ffffff'] });
  L.sfx.pop(); L.sfx.bonk(); L.g.shake(0.8); L.g.flash('#fff1c4');
  L.fallMsg('金币炸了！(°ロ°)', set);
  L.g.impulse(side * 10, 6.5, 2.5);
}

export const LEVELS = [
  // ———————————————————— 第 1 关：欢迎光临 ————————————————————
  {
    name: '欢迎光临', tip: '第一关嘛，很简单的啦～', theme: 0,
    build(L) {
      const T = L.theme;
      L.spawn(0, 0, 0, 0);
      const rows = L.grid(0, 4, 3, 30, { skip: (r, c) => r === 11 && c === 1 }); // z = 4 - 2r，z=-18 中间有个坑
      const R = (z) => rows[(4 - z) / 2].filter(Boolean);
      L.sign(-2.3, -4.2, '欢迎光临！\n直走就是终点哦', { rot: 0.5 });

      // ① 塌掉的一排。死过一次之后：这排不塌了，塌的是你“跳过去”要落脚的那排
      if (!L.seen('l1row')) {
        R(-6).forEach((e) => {
          e.onStep = () => {
            L.mark('l1row');
            L.fallMsg('地板说它累了，想先下班 (－ω－) zzZ', '地面一定可靠');
            R(-6).forEach((t) => L.drop(t, { wobble: 0.04, dist: 40, dur: 1.3 }));
          };
        });
      } else {
        L.every(() => {
          const P = L.p;
          if (!L.g.canInteract()) return;
          if (!P.grounded && P.vel.y > 0.5 && P.pos.z < -4.4 && P.pos.z > -9) {
            L.mark('l1jump');
            L.fallMsg('学会跳了？这次……不用跳哦 (￣▽￣)', '学会的招数一直管用');
            L.sfx.troll();
            R(-8).forEach((t) => L.drop(t, { wobble: 0.02, dist: 40, dur: 1.1 }));
            return false;
          }
        });
      }

      // ② 两枚金币：一枚咬人，一枚是真的
      const sp = L.spikes(0, -12, 6, 6, { msg: '贪心的小家伙～ 金币也会咬人的', set: '金币是奖励' });
      L.coin(0, 1.0, -12, () => { L.mark('l1coin'); sp.up(); L.sfx.troll(); });
      L.coin(-2, 1.0, -15.6, () => L.toast('★ 这一枚……是真的金币！'));

      // ③ 小坑 + 你跳的时候才出现的砖块
      let bonked = false;
      L.zone(0, -4, -18, 2, 10, 2, { enter: () => { if (!bonked) L.fallMsg('就是一个普通的坑而已 (・∀・)', null); } });
      L.bonkBlock(0, 2.3, -17.3, { id: 'l1bonk', msg: '头顶有砖？！这里可不是水管工的世界', set: '头顶是空的' });
      L.every(() => { if (L.seen('l1bonk')) { bonked = true; return false; } });

      // ④ 说谎的牌子
      L.sign(-2.3, -20.6, '走中间最安全 ✓', { rot: 0.35 });
      L.spikes(1, -23, 4, 4, { trap: true, msg: '牌子说的话，你也信呀？', set: '路牌说真话' });

      // ⑤ 说真话的牌子：地板真的会塌，别停
      L.sign(2.3, -26.4, '前方地板会塌！\n别停，一直跑！', { rot: -0.45, accent: TRUE_INK });
      const chase = [-28, -30, -32, -34].map(R);
      L.zone(0, 1, -27.6, 6, 3, 0.8, {
        once: true,
        enter: () => {
          L.mark('l1chase'); L.sfx.rumble();
          chase.forEach((row, i) => row.forEach((t) => L.after(0.5 + i * 0.35, () => {
            if (L.p.groundEnt === t) L.fallMsg('这次……牌子说的是真话哦！', '路牌都在骗人');
            L.drop(t, { wobble: 0.12, dist: 30, dur: 1.0, back: 4 });
          })));
        },
      });

      // ⑥ 刚跑出塌陷区，迎面一记拳套
      L.box(-4.3, -2.6, -37, 1.1, 5, 1.1, { color: T.tileB });
      L.glove(-4.3, 0.6, -37, [1, 0], { reach: 7.6, power: 14, delay: 0.3, zone: [0, -35.2, 6, 0.8], id: 'l1glove', msg: '拳套：欢迎光临～ (ง •̀_•́)ง', set: '跑过去就没事' });

      // ⑦ 会逃跑的终点 → 真正的终点在起点
      const start = L.goal(0, 0, 3.2, { active: false, label: 'START', labelColor: '#a48fb8', onTouch: () => L.g.win() });
      const goal = L.goal(0, 0, -46, { onTouch: () => {} });
      let stage = 0;
      L.every(() => {
        const p = L.p.pos;
        if (!L.g.canInteract()) return;
        if (stage === 0 && p.z < -40.5 && p.y > -1) {
          stage = 1;
          L.sfx.squeak(); L.sfx.troll();
          L.toast('嘿嘿，抓不到我～');
          L.troll('终点就在前方');
          L.tween(goal.obj.position, { z: -52.4 }, 0.5, 'outBack');
          L.fallMsg('追得太远啦！终点可不在那边哦', '终点就在前方');
        } else if (stage === 1 && p.z < -47.5) {
          stage = 2;
          L.sfx.squeak(); L.sfx.whoosh();
          L.toast('拜拜～ (￣▽￣)ノ');
          L.tween(goal.obj.position, { z: -63 }, 1.2, 'linear');
          L.tween(goal.obj.position, { y: -40 }, 1.8, 'inBack');
          L.after(1.5, () => {
            start.setActive(true); start.setLabel('GOAL ♡');
            L.sign(2.3, 1.0, '这次是真的终点 ♡', { rot: -0.6, accent: TRUE_INK });
            L.toast('……要不要，回头看看？', 3.2);
            L.sfx.ding();
          });
        }
      });

      L.islet(-9, -2, -6, 2.2, 3); L.islet(10, -4, -16, 2.8, 3);
      L.islet(-11, 1, -30, 2, 2); L.islet(9, 2, -44, 1.8, 2);
      L.deco('lolli', 2.6, 0, 3.4, 0.9); L.deco('tree', -2.6, 0, 3.6, 0.9);
    },
  },

  // ———————————————————— 第 2 关：薄荷桥 ————————————————————
  {
    name: '薄荷桥', tip: '路牌都是好心人立的（大概）', theme: 1,
    build(L) {
      const T = L.theme;
      L.spawn(0, 0, 0, 0);
      L.grid(0, 2, 3, 3);

      // ① 隐形桥 + 不许跳的云
      L.box(0, -0.3, -7, 2, 0.6, 8, { visible: false });
      L.sparkles(0, 0.12, -7, 1.7, 8, 36);
      L.sign(2.55, -2.7, '用力跳过去！', { rot: -0.5 });
      L.zone(0, -4, -7, 14, 10, 8, { enter: () => L.fallMsg('掉下去了……也许，有什么东西你没看见？✧', '看不见就是不存在') });
      let cloud = null;
      L.every(() => {
        const p = L.p;
        if (cloud || !L.g.canInteract()) return;
        if (p.pos.z < -3.1 && p.pos.z > -10.9 && !p.grounded && p.vel.y > 1.5) {
          cloud = cuteCloud(L);
          cloud.position.set(p.pos.x, p.pos.y + 7, p.pos.z - 0.6);
          L.sfx.whoosh();
          L.every(() => { if (!cloud) return false; cloud.position.x = p.pos.x; cloud.position.z = p.pos.z - 0.6; });
          L.tween(cloud.position, { y: p.pos.y + 2.4 }, 0.24, 'inQuad', {
            done: () => { L.sfx.bonk(); L.g.shake(0.5); L.kill('云朵：此处禁止跳跃！', '看到坑就要跳', 'squash'); },
          });
        }
      });

      // ② 平台 A：桥正对着的那块地板是投影
      L.grid(0, -12, 3, 3, { skip: (r, c) => r === 0 && c === 1 });
      L.tile(0, -12, { color: T.tileB, solid: false });
      L.zone(0, -3, -12, 1.6, 5, 1.6, { enter: () => { L.mark('l2ghost'); L.fallMsg('这块地板只是全息投影 ✧', '看得见就踩得到'); } });

      // ③ 红绿柱子：大部分绿色会塌……但最后一对反过来
      L.sign(-2.35, -13.6, '只能踩 绿色 哦！\n红色 超危险 ✗', { rot: 0.4 });
      L.zone(0, -4, -24.5, 14, 10, 15, { enter: () => L.fallMsg('跳歪啦～ 再来一次', null) });
      const G = '#6ee0a0', Rd = '#ff7088';
      // [左, 右]：true = 站得住
      const plan = [[false, true], [true, false], [false, true], [false, true]];
      [-19.5, -23, -26.5, -30].forEach((z, k) => {
        [-1, 1].forEach((s, i) => {
          const green = k < 3 ? (k % 2 === 0 ? s < 0 : s > 0) : s > 0;
          const safe = plan[k][i];
          const e = L.box(s * 1.15, -4, z, 1.8, 8, 1.8, { color: green ? G : Rd, r: 0.2 });
          if (!safe) {
            e.onStep = () => {
              green ? L.fallMsg('绿色……也可以是陷阱的颜色哦', '绿色=安全') : L.fallMsg('红色也不一定安全哦～ 看清楚再跳', '红色才是安全的');
              L.drop(e, { wobble: 0.1, dist: 40, dur: 1.2 });
            };
          }
        });
      });

      // ④ 平台 B：两个按钮
      L.grid(0, -33, 3, 4);
      L.sign(1.9, -34.6, '千万别按！！', { danger: true, rot: -0.35, accent: '#ff3d6e' });
      L.sign(-2.4, -39.3, '按这个升起桥 ✓', { rot: 0.4, accent: TRUE_INK });
      L.sign(2.3, -39.3, '中间那块桥板\n有点调皮哦', { rot: -0.4, accent: TRUE_INK });
      let plankTrick = false;
      L.zone(0, -4, -43.5, 4, 10, 7, { enter: () => { if (!plankTrick) L.fallMsg('跳不过去的啦～ 要不……按按看？', null); } });
      L.button(-2, -38.4, () => {
        L.sfx.troll();
        L.fallMsg('按钮：我只是负责开地板的', '好看的按钮是好按钮');
        L.ents.filter((e) => Math.abs(e.obj.position.x + 2) < 0.1 && Math.abs(e.obj.position.z + 39) < 0.2).forEach((e) => { e.enabled = false; L.drop(e, { wobble: 0, dur: 0.9 }); });
      }, { color: '#3fd69a' });
      const bridge = [-41, -43, -45].map((z) => {
        const e = L.tile(0, z, { y: -14, color: T.tileB });
        e.obj.visible = false; e.enabled = false;
        return e;
      });
      L.button(0, -35.6, () => {
        L.toast('……咦？');
        L.sfx.whoosh();
        bridge.forEach((e, i) => {
          e.obj.visible = true; e.enabled = true;
          L.tween(e.obj.position, { y: -0.3 }, 0.7, 'outBack', { delay: i * 0.15 });
        });
      });
      // ⑤ 调皮的桥板：第一次它自己溜走；学会跳以后，溜走的是你要落脚的那块
      if (!L.seen('l2slide')) {
        bridge[0].onStep = () => {
          if (bridge[1].slid) return;
          bridge[1].slid = true; plankTrick = true;
          L.mark('l2slide');
          L.sfx.squeak();
          L.fallMsg('桥板溜走了～ 跳过去嘛', '桥是连着的');
          L.tween(bridge[1].obj.position, { x: 2.8 }, 0.35, 'outBack');
        };
      } else {
        L.every(() => {
          const P = L.p;
          if (!L.g.canInteract() || !bridge[0].enabled) return;
          if (!P.grounded && P.vel.y > 0.5 && P.pos.z < -40 && P.pos.z > -44.5) {
            L.mark('l2slide2'); plankTrick = true;
            L.sfx.squeak();
            L.fallMsg('这次它没溜……溜的是下一块 (￣▽￣)', '学会的招数一直管用');
            L.tween(bridge[2].obj.position, { x: -2.8 }, 0.25, 'outQuad');
            return false;
          }
        });
      }

      // ⑥「安全通道」
      const side = [];
      for (let z = -34; z >= -44; z -= 2) side.push(L.tile(-4, z, { color: z % 4 ? '#e8fff6' : '#bff0e0' }));
      L.sign(-3.4, -33.2, '安全通道 ✓\n走这边～', { rot: 0.8 });
      L.zone(-4, 1, -41, 2.2, 3, 5, {
        once: true,
        enter: () => {
          L.fallMsg('「安全通道」（仅供参考）', '安全通道是安全的');
          L.sfx.crack(); L.sfx.troll();
          side.forEach((e, i) => L.after(i * 0.03, () => {
            e.enabled = false;
            L.tween(e.obj.rotation, { z: 1.9 }, 0.5, 'outQuad');
            L.tween(e.obj.position, { y: -40 }, 1.6, 'inQuad', { done: () => { e.obj.visible = false; } });
          }));
        },
      });

      // ⑦ 平台 C：岩浆大多是果冻……但有一块是真的
      L.grid(0, -47, 5, 6, { skip: (r, c) => r >= 1 && r <= 3 && c >= 1 && c <= 3 });
      const jellyLava = new THREE.MeshStandardMaterial({ color: '#ff8a3d', emissive: '#ff4a00', emissiveIntensity: 0.7, roughness: 0.25, vertexColors: true });
      const realLava = new THREE.MeshStandardMaterial({ color: '#ff5a1f', emissive: '#ff2a00', emissiveIntensity: 1.1, roughness: 0.15, vertexColors: true });
      for (let r = 1; r <= 3; r++) for (let c = -1; c <= 1; c++) {
        const real = r === 1 && c === 0;
        L.tile(c * 2, -47 - r * 2, { y: -0.12, mat: real ? realLava : jellyLava, speedMul: 0.85, onStep: () => L.sfx.squish() });
      }
      L.box(0, 0.1, -49, 1.7, 0.3, 1.7, { solid: false, visible: false, kill: { msg: '这块……是真的岩浆 (°ロ°)', set: '岩浆都是果冻', type: 'pop' } });
      const bub = new THREE.SphereGeometry(1, 12, 8);
      const bubM = new THREE.MeshStandardMaterial({ color: '#ffb36b', emissive: '#ff6a1a', emissiveIntensity: 0.8 });
      const bubs = [];
      for (let i = 0; i < 12; i++) { const b = new THREE.Mesh(bub, bubM); L.add(b); bubs.push({ m: b, t: Math.random() * 2, hot: i < 6 }); }
      L.every((dt, t) => {
        jellyLava.emissiveIntensity = 0.6 + Math.sin(t * 2.5) * 0.15;
        realLava.emissiveIntensity = 1.0 + Math.sin(t * 7) * 0.25;
        for (const b of bubs) {
          b.t -= dt;
          if (b.t < 0) {
            b.t = (b.hot ? 0.5 : 1) + Math.random() * 1.2;
            // 真岩浆那块冒泡特别多
            if (b.hot) b.m.position.set((Math.random() - 0.5) * 1.6, -0.1, -49 + (Math.random() - 0.5) * 1.6);
            else b.m.position.set((Math.random() - 0.5) * 5.6, -0.1, -51 + (Math.random() - 0.5) * 5.6);
          }
          const k = 1 - b.t / 2;
          b.m.scale.setScalar(Math.max(0.01, Math.sin(Math.min(1, k * 1.5) * Math.PI) * 0.18));
          b.m.position.y = -0.1 + k * 0.15;
        }
      });
      L.sign(-2.2, -46.4, '岩浆 超烫！\n请从两边绕行', { danger: true, rot: 0.2, accent: '#ff6a1a' });
      for (const sx of [-4, 4]) L.spikes(sx, -51, 2, 6, { trap: true, msg: '其实那是橙子果冻，一点都不烫 (๑´ڡ`๑)', set: '岩浆会烫' });

      // ⑧ 说真话的牌子：头顶真的会砸
      L.sign(4.3, -54, '小心头顶！', { rot: -0.6, accent: TRUE_INK });
      L.crusher(0, -55, 10, 2, { auto: 0.8, phase: 0.6, warn: 0.45, hold: 0.45, id: 'l2crush', msg: '牌子都提醒你了嘛 (・ε・)', set: '路牌都在骗人' });
      L.goal(0, 0, -57);

      L.islet(-10, -3, -8, 2.4, 3); L.islet(9, 0, -22, 2.2, 2);
      L.islet(-10, 2, -40, 2, 2); L.islet(11, -2, -54, 2.6, 3);
    },
  },

  // ———————————————————— 第 3 关：柠檬工厂 ————————————————————
  {
    name: '柠檬工厂', tip: '这里的一切都很「正常」', theme: 2,
    build(L) {
      const T = L.theme;
      L.spawn(0, 0, 0, 0);
      L.grid(0, 2, 3, 3);
      L.sign(-2.3, -4.0, '传送带会送你前进哦', { rot: 0.5 });

      // ① 箭头向前、实际往回推的传送带 ② 箭头向后、实际高速往前的传送带
      L.zone(0, -4, -3.8, 14, 10, 1.6, { enter: () => L.fallMsg('传送带：我只是「看起来」在往前走', '箭头指示方向') });
      L.conveyor(0, -10.5, 6, 12, { push: [0, 3.0], arrow: 1, visual: 1.8 });
      L.conveyor(0, -22.5, 6, 12, { push: [0, -8.5], arrow: -1, visual: 1.8 });
      L.zone(0, -4, -16, 14, 10, 24, { enter: () => L.fallMsg('从传送带上滑下去啦～', null) });

      L.grid(0, -29.5, 3, 8);
      L.spikes(0, -30.5, 6, 4, { hidden: false, msg: '箭头……只是装饰品而已啦', set: '箭头指示方向' });

      // ③ 压力板 + 闸门：要把木箱推上去压住（纸箱是骗人的）
      L.box(0, -0.3, -45.25, 6, 0.6, 1.5, { color: L.theme.tileB, r: 0.1 }); // 门洞下面的地板
      L.box(-2, 1.7, -45.25, 2, 3.4, 1.5, { color: '#fff1c4', r: 0.1 });
      L.box(2, 1.7, -45.25, 2, 3.4, 1.5, { color: '#fff1c4', r: 0.1 });
      L.box(0, 3.75, -45.25, 6, 0.7, 1.5, { color: '#ffd36e', r: 0.1 });
      const gate = L.box(0, 1.7, -45.25, 1.96, 3.4, 1.3, { color: '#ff9fc4', r: 0.08, crush: true, kill: { msg: '闸门：夹到你了吧 (￣▽￣)', set: '门开着就能过', type: 'squash' } });
      L.sign(-2, -44.43, '压力板要一直压着\n门才会开', { wall: true, y: 1.6, w: 1.85, h: 1.0, accent: TRUE_INK });
      let gen = 0, open = false;
      const setGate = (want) => {
        const my = ++gen;
        if (want) {
          if (open) return;
          open = true;
          L.tween(gate.obj.position, { y: 5.4 }, 0.45, 'outQuad');
        } else {
          L.after(0.35, () => {
            if (my !== gen || !open) return;
            open = false;
            L.tween(gate.obj.position, { y: 1.7 }, 0.16, 'inQuad', { done: () => L.sfx.bonk() });
          });
        }
      };
      L.plate(2, -41, { on: () => setGate(true), off: () => setGate(false) });
      L.crate(2, -35.6, { backMsg: '木箱自己爬回来了 (・∀・)' });
      L.crate(-2, -41.4, { cardboard: true, id: 'l3card', onSquash: () => L.toast('……纸箱子扁了') });
      L.sign(-2.5, -38.2, '用这个箱子\n压住开关 ✓', { rot: 0.45 });

      // ④ 镜子世界 + 一条假的「直达通道」
      L.grid(0, -47, 3, 2);
      L.sign(-2.4, -46.6, '前方：镜子世界', { rot: 0.4 });
      L.box(-3.7, -0.3, -61.5, 1.4, 0.6, 23, { solid: false, color: '#fff6d8', r: 0.1 });
      L.sign(-3.7, -49.6, '直达通道 →', { rot: 0.2 });
      L.zone(-3.7, -4, -61.5, 1.6, 6, 23, { enter: () => L.fallMsg('直达……地底 (・∀・)', '捷径更快') });
      const path = [
        [0, -52.75, 1.4, 5.5], [2, -56.2, 5.4, 1.4], [4, -59.7, 1.4, 5.6],
        [1, -63.2, 7.4, 1.4], [-2, -66.7, 1.4, 5.6], [-1, -70.2, 3.4, 1.4], [0, -72.2, 1.4, 2.6],
      ];
      path.forEach(([x, z, w, d], i) => L.box(x, -0.3, z, w, 0.6, d, { color: i % 2 ? T.tileB : '#fff6d8', r: 0.1 }));
      L.zone(0, 0, -61.75, 22, 30, 23.4, {
        enter: () => { L.g.setMirror(true); L.fallMsg('镜子里的左边，是现实的右边哦', '左就是左'); },
        exit: () => L.g.setMirror(false),
      });
      for (const sx of [-1, 1]) {
        const m = new THREE.Mesh(rbox(0.3, 6, 8, 0.15), new THREE.MeshStandardMaterial({ color: '#e8f4ff', metalness: 1, roughness: 0.05, envMapIntensity: 1.6 }));
        m.position.set(sx * 9.5, 2, -61); m.rotation.y = sx * 0.3;
        const fr = new THREE.Mesh(rbox(0.5, 6.6, 8.6, 0.25), mat('#ffd36e'));
        fr.position.copy(m.position); fr.position.x += sx * 0.12; fr.rotation.y = m.rotation.y;
        L.add(m); L.add(fr);
      }

      // ⑤ 果冻 + 高墙 + 「捷径」 + 翻墙后的落点陷阱
      L.grid(0, -74.5, 3, 2);
      [-2, 0, 2].forEach((x) => L.jelly(x, -78.5));
      L.box(0, 1.7, -81, 6, 3.4, 3, { color: '#fff1c4', r: 0.2 });
      L.sign(0, -79.43, '太高啦，翻不过去～\n走右边的「捷径」吧 →', { wall: true, y: 1.75, w: 3.4, h: 1.35 });
      L.sign(-2.4, -75.3, '翻过墙之后\n记得往左边落 ←', { rot: 0.45, accent: TRUE_INK });
      L.tile(4, -76.5, { color: T.tileB });
      const sc1 = L.tile(6, -76.5, { color: T.tileA });
      const sc2 = L.tile(8, -76.5, { color: T.tileB });
      L.goal(8.4, 0, -76.5, { rot: Math.PI / 2, active: false, label: '捷径', labelColor: '#f08a1c', onTouch: () => {} });
      sc1.onStep = () => {
        L.fallMsg('捷径，通常都很贵', '捷径更快');
        L.sfx.troll();
        L.drop(sc1, { wobble: 0.02, dur: 1.2 }); L.drop(sc2, { wobble: 0.02, dur: 1.2 });
      };
      L.spikes(1, -84.5, 4, 4, { trap: true, msg: '都说了往左边落嘛 (｀・ω・´)', set: '路牌都在骗人' });

      // ⑥ 害羞的终点：盯着它就跑；倒着走时，记得背后还有尖刺
      L.grid(0, -83.5, 3, 13);
      for (const sx of [-1, 1]) L.box(sx * 3.3, 0.8, -95.5, 0.6, 1.6, 26, { color: T.tileB, r: 0.2 });
      L.box(0, 1, -108.9, 7.2, 2, 0.8, { color: T.tileB, r: 0.2 });
      L.sign(-2.4, -87.4, '终点君很害羞 (/ω＼)\n倒着走要看路哦', { rot: 0.35, accent: TRUE_INK });
      L.spikes(0, -95, 2, 2, { hidden: false, msg: '倒着走也要回头看路呀', set: '背后没有危险' });
      L.spikes(2, -100.5, 2, 2, { hidden: false, msg: '倒着走也要回头看路呀', set: '背后没有危险' });
      const goal = L.goal(0, 0, -101);
      const zMin = -107.2, zMax = -86.5;
      let cool = 0, told = false, blush = 0;
      L.every((dt) => {
        if (!L.g.canInteract()) return;
        const gp = goal.obj.position, p = L.p.pos;
        const dz = gp.z - p.z, dist = Math.hypot(gp.x - p.x, dz);
        const looking = L.g.lookingAt(gp.x, 1.3, gp.z, 0.8);
        cool -= dt;
        blush = Math.max(0, blush - dt);
        if (looking && dist < 11) {
          if (!told) { told = true; L.toast('(/ω＼) 不、不要盯着人家看啦！'); L.troll('盯着目标走'); }
          if (blush <= 0) { L.sfx.squeak(); blush = 1.2; }
          const dir = Math.sign(dz) || -1;
          const nz = THREE.MathUtils.clamp(gp.z + dir * 9 * dt, zMin, zMax);
          const stuck = Math.abs(nz - gp.z) < 1e-5;
          gp.z = nz;
          if (stuck && dist < 3.6 && cool <= 0) {
            cool = 1.2;
            L.g.fx.emit(gp.clone().setY(1.2), { count: 24, colors: ['#ffffff', '#ffe38a', '#ffb3c7'], speed: 3 });
            gp.z = THREE.MathUtils.clamp(p.z - dir * 10, zMin, zMax);
            gp.x = 0;
            L.sfx.whoosh();
            L.toast('嘿！(｀・ω・´)');
          }
        } else if (!looking && dist > 1.0) {
          gp.z += Math.sign(p.z - gp.z) * 1.4 * dt;
          gp.x += THREE.MathUtils.clamp(p.x - gp.x, -1, 1) * 1.2 * dt;
          gp.x = THREE.MathUtils.clamp(gp.x, -1.8, 1.8);
          gp.z = THREE.MathUtils.clamp(gp.z, zMin, zMax);
        }
      });

      L.islet(-10, -2, -12, 2.4, 3); L.islet(10, 1, -30, 2, 2);
      L.islet(-12, 0, -76, 2.6, 3); L.islet(11, -3, -94, 2.2, 2);
    },
  },

  // ———————————————————— 第 4 关：葡萄星夜 ————————————————————
  {
    name: '葡萄星夜', tip: '要遵守交通规则哦', theme: 3,
    build(L) {
      const T = L.theme;
      L.killY = -24;
      L.spawn(0, 0, 0.5, 0);
      L.grid(0, 2, 3, 2);
      const field = L.grid(0, -2, 5, 22);
      L.sign(-2.4, -3.6, '红灯停 · 绿灯行', { rot: 0.5 });
      L.sign(2.4, -3.6, '有裂缝的地砖\n站不住哦', { rot: -0.5, accent: TRUE_INK });

      // ① 裂开的地砖：走过去没事，停在上面就塌
      [[3, 1], [3, 3], [5, 2], [7, 0], [8, 2], [9, 4], [10, 1], [12, 2], [13, 3], [15, 1], [16, 4], [17, 2], [18, 0], [19, 3]].forEach(([r, c]) => {
        L.fragile(field[r][c], 0.65, { cracked: true, color: T.tileB, id: 'l4crack', msg: '裂开的地砖站不住——这次牌子没骗你', set: '路牌都在骗人' });
      });

      // ② 城墙：假墙 + 咬人的门
      const wallC = '#d9c8ff';
      L.box(-4, 2.1, -44, 2, 4.2, 2, { solid: false, color: wallC, r: 0.06 });
      L.sign(-4, -42.93, '禁止穿墙！', { wall: true, y: 1.6, w: 1.7, h: 1.0, danger: true, accent: '#ff3d6e' });
      L.box(-2, 2.1, -44, 2, 4.2, 2, { color: wallC, r: 0.06 });
      L.box(3, 2.1, -44, 4, 4.2, 2, { color: wallC, r: 0.06 });
      const lintel = L.box(0, 3.4, -44, 2, 1.6, 2, { color: '#c4adff', r: 0.06, crush: true, kill: { msg: '门：今天不营业，而且咬人', set: '门就是用来走的', type: 'squash' } });
      L.zone(0, 1, -44, 1.7, 2, 1.8, {
        once: true,
        enter: () => L.tween(lintel.obj.position, { y: 0.8 }, 0.09, 'inQuad', { done: () => { L.sfx.bonk(); L.g.shake(0.7); } }),
      });
      for (const x of [-4.5, -3.1, 0, 1.2, 4.6]) L.box(x, 4.5, -44, 0.8, 0.6, 2, { color: '#e9ddff', r: 0.1, solid: false });

      // ③ 木头人 + 说谎的红绿灯
      const D = doll(L);
      D.g.position.set(3, 4.2, -44.2);
      D.g.scale.setScalar(0.9);
      D.head.rotation.y = Math.PI;
      const lamp = trafficLamp(L);
      lamp.g.position.set(-1.8, 4.2, -43.6);
      lamp.set('red');
      let phase = 'away', timer = 2.6, noteT = 0, noteI = 0, awayDur = 2.6;
      const watchPos = new THREE.Vector3();
      L.every((dt) => {
        const p = L.p;
        timer -= dt;
        const inField = p.pos.z < -1 && p.pos.z > -43.2 && p.pos.y > -2;
        if (phase === 'away') {
          noteT -= dt;
          if (noteT <= 0 && noteI < 6) { if (inField || p.pos.z < 3) L.sfx.muyu(noteI); noteI++; noteT = awayDur / 6.4; }
          if (timer <= 0) { phase = 'turn'; timer = 0.45; L.tween(D.head.rotation, { y: 0 }, 0.4, 'outBack'); }
        } else if (phase === 'turn') {
          if (timer <= 0) {
            phase = 'watch'; timer = 1.7 + Math.random() * 0.9;
            watchPos.copy(p.pos); lamp.set('green');
            D.eyeM.emissive.set('#ff3d6e'); D.eyeM.emissiveIntensity = 0.8;
            if (inField) L.sfx.alarm();
          }
        } else if (phase === 'watch') {
          if (inField && L.g.canInteract()) {
            const moved = Math.hypot(p.pos.x - watchPos.x, p.pos.z - watchPos.z) > 0.3 || Math.abs(p.pos.y - watchPos.y) > 0.3;
            if (moved) L.kill('绿灯……可是它在看着你呀 (¬‿¬)', '红绿灯会说真话', 'zap');
          } else watchPos.copy(p.pos);
          if (timer <= 0) { phase = 'back'; timer = 0.35; L.tween(D.head.rotation, { y: Math.PI }, 0.35, 'inOutSine'); lamp.set('red'); D.eyeM.emissiveIntensity = 0; }
        } else if (phase === 'back') {
          if (timer <= 0) { phase = 'away'; awayDur = 2.2 + Math.random() * 1.6; timer = awayDur; noteI = 0; noteT = 0; }
        }
      });

      // ④ 楼梯会躺平；「故障」的电梯其实能用（只是有点吓人）
      L.grid(0, -46, 5, 4);
      const steps = [];
      for (let i = 0; i < 12; i++) {
        const top = 0.5 * (i + 1);
        steps.push(L.box(1, (top - 4) / 2, -53.5 - i, 3, top + 4, 1, { color: i % 2 ? T.tileB : T.tileA, r: 0.06 }));
      }
      const stairSp = L.spikes(1, -59, 3, 12, { msg: '楼梯：我选择躺平 (－_－) zzZ', set: '楼梯通往高处' });
      L.zone(1, 5.5, -62, 3, 5, 6, {
        once: true,
        enter: () => {
          L.sfx.crack(); L.sfx.troll();
          L.fallMsg('楼梯：我选择躺平 (－_－) zzZ', '楼梯通往高处');
          steps.forEach((e, i) => L.tween(e.obj.position, { y: e.obj.position.y - 0.5 * (i + 1) }, 0.3, 'inQuad', { delay: (11 - i) * 0.015 }));
          L.after(0.45, () => stairSp.up());
        },
      });
      const anchor = new THREE.Vector3(-3, 0, -54.5);
      const cab = new THREE.Group(); L.add(cab);
      const parts = [];
      const part = (lx, ly, lz, w, h, d, o) => { const e = L.box(0, 0, 0, w, h, d, o); parts.push({ e, l: new THREE.Vector3(lx, ly, lz) }); return e; };
      const floor = part(0, -0.3, 0, 2.4, 0.6, 2.4, { color: '#fff6d6', r: 0.1 });
      part(-1.15, 0.45, 0, 0.1, 0.9, 2.4, { color: '#c6f0ff', matOpts: { transparent: true, opacity: 0.55 } });
      part(1.15, 0.45, 0, 0.1, 0.9, 2.4, { color: '#c6f0ff', matOpts: { transparent: true, opacity: 0.55 } });
      const front = part(0, 0.45, -1.15, 2.4, 0.9, 0.1, { color: '#c6f0ff', matOpts: { transparent: true, opacity: 0.55 } });
      const postM = mat('#ffd36e', { vertexColors: false, metalness: 0.5, roughness: 0.3 });
      for (const [px, pz] of [[-1.15, -1.15], [1.15, -1.15], [-1.15, 1.15], [1.15, 1.15]]) {
        const pm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8), postM);
        pm.position.set(px, 1.3, pz); cab.add(pm);
      }
      const roof = new THREE.Mesh(rbox(2.7, 0.25, 2.7, 0.1), mat('#ff9fc4')); roof.position.y = 2.7; cab.add(roof);
      const sg = L.sign(0, 0, '故障 · 暂停使用', { wall: true, w: 2.0, h: 0.6, danger: true, accent: '#ff3d6e' });
      cab.add(sg); sg.position.set(0, 2.2, 1.2);
      const syncCab = () => { cab.position.copy(anchor); for (const pt of parts) pt.e.obj.position.copy(anchor).add(pt.l); };
      syncCab();
      let riding = false;
      floor.onStep = () => {
        if (riding) return;
        riding = true;
        L.after(0.7, () => {
          L.sfx.ding();
          L.fallMsg('电梯：说了故障，还非要上来', null);
          L.tween(anchor, { y: 3 }, 1.3, 'inOutSine', {
            done: () => {
              // 咯噔一下：吓你的
              L.sfx.crack(); L.g.shake(0.6); L.toast('咯噔……', 1.4);
              L.tween(anchor, { y: 2.5 }, 0.12, 'inQuad', {
                done: () => L.after(0.9, () => L.tween(anchor, { y: 6 }, 1.5, 'inOutSine', {
                  done: () => L.tween(anchor, { z: -63.8 }, 2.0, 'inOutSine', {
                    done: () => { L.sfx.ding(); front.enabled = false; parts.find((pt) => pt.e === front).l.y = -1.2; },
                  }),
                })),
              });
            },
          });
        });
      };
      L.every(syncCab);

      // ⑤ 塔顶：流星雨（说真话的牌子）+ 假终点
      const top = L.grid(0, -66, 3, 4, { y: 6 });
      for (const [px, pz] of [[-3.2, -65.2], [3.2, -65.2], [-3.2, -72.8], [3.2, -72.8]]) {
        L.box(px, -3, pz, 0.6, 18, 0.6, { color: '#e9ddff', r: 0.15, solid: false });
      }
      L.sign(-2.3, -66.4, '流星雨注意！\n看地上的红圈', { y: 6, rot: 0.45, accent: TRUE_INK });
      const ringG = new THREE.RingGeometry(0.55, 0.85, 32);
      const starG = new THREE.IcosahedronGeometry(0.45, 0);
      let rainOn = true, rainT = 0.4;
      L.every((dt) => {
        if (!rainOn) return false;
        const p = L.p.pos;
        if (!(p.y > 5.5 && p.z < -64.8) || !L.g.canInteract()) return;
        rainT -= dt;
        if (rainT > 0) return;
        rainT = 0.6;
        const aim = Math.random() < 0.55;
        const tx = THREE.MathUtils.clamp(aim ? p.x + (Math.random() - 0.5) * 1.2 : (Math.random() - 0.5) * 5.4, -2.7, 2.7);
        const tz = THREE.MathUtils.clamp(aim ? p.z + (Math.random() - 0.5) * 1.2 : -65.5 - Math.random() * 7, -72.7, -65.3);
        const ring = new THREE.Mesh(ringG, new THREE.MeshBasicMaterial({ color: '#ff3d6e', transparent: true, opacity: 0.85, depthWrite: false }));
        ring.rotation.x = -Math.PI / 2; ring.position.set(tx, 6.03, tz); ring.scale.setScalar(0.4);
        L.add(ring);
        L.tween(ring.scale, { x: 1, y: 1, z: 1 }, 1.0, 'linear');
        const star = new THREE.Mesh(starG, new THREE.MeshStandardMaterial({ color: '#fff0a0', emissive: '#ffcf4a', emissiveIntensity: 1.2 }));
        star.position.set(tx + 3, 18, tz - 2);
        L.add(star);
        L.tween(star.position, { x: tx, y: 6.4, z: tz }, 0.3, 'inQuad', {
          delay: 0.75,
          done: () => {
            star.removeFromParent(); ring.removeFromParent();
            L.g.fx.emit(star.position, { count: 18, colors: ['#fff0a0', '#ffffff', '#ffb3d0'], speed: 4 });
            L.sfx.pop();
            const q = L.p.pos;
            if (Math.hypot(q.x - tx, q.z - tz) < 0.95 && Math.abs(q.y - 6) < 1.2) L.kill('被流星砸中了 ☆彡 牌子说的是真的', '路牌都在骗人', 'squash');
          },
        });
      });
      L.goal(0, 6, -71, {
        onTouch: () => L.g.fakeWin(() => {
          rainOn = false;
          L.sfx.crack();
          top.flat().forEach((e, i) => { e.enabled = false; L.tween(e.obj.position, { y: -30 }, 1.6, 'inQuad', { delay: i * 0.02, done: () => { e.obj.visible = false; } }); });
        }),
      });

      // ⑥ 地下小屋：两扇门，只有一扇是真的（你选对过一次以后，它们会换过来）
      L.grid(0, -64, 5, 6, { y: -12 });
      const rw = '#7d66c9';
      L.box(-5.3, -9, -69, 0.6, 6, 12.6, { color: rw, r: 0.1 });
      L.box(5.3, -9, -69, 0.6, 6, 12.6, { color: rw, r: 0.1 });
      L.box(0, -9, -75.3, 11.2, 6, 0.6, { color: rw, r: 0.1 });
      L.box(0, -9, -62.7, 11.2, 6, 0.6, { color: rw, r: 0.1 });
      L.sign(0, -74.93, '两扇门里\n只有一扇是真的', { wall: true, y: -9.3, w: 1.9, h: 1.0, accent: TRUE_INK });
      [[-4, -64], [4, -64.5], [-4.2, -70], [4.3, -68]].forEach(([x, z], i) => mushroom(L, x, -12, z, 1 + (i % 2) * 0.5));
      const swap = L.seen('l4zhen') && !L.seen('l4jia');
      const door = (x, label, real, id, msg, set) => {
        const sp = L.spikes(x, -72.6, 2.4, 1.4, { y: -12, msg, set });
        L.goal(x, -12, -73.6, {
          label,
          onTouch: real ? undefined : () => { L.mark(id); sp.up(); L.kill(msg, set, 'pop'); },
        });
      };
      door(-2.5, '真·终点', swap, 'l4zhen', '写着「真」的，往往才是假的 (¬‿¬)', '真的就是真的');
      door(2.5, '假·终点', !swap, 'l4jia', '上次「假」的是真的，这次「假」的就是假的 (¬‿¬)', '学会的招数一直管用');

      L.islet(-10, -2, -10, 2.2, 3); L.islet(11, 1, -26, 2.6, 3); L.islet(-12, 3, -50, 2, 2);
    },
  },

  // ———————————————————— 第 5 关：彩虹尽头 ————————————————————
  {
    name: '彩虹尽头', tip: '最后一关，这次真的没有陷阱了', theme: 4,
    build(L) {
      L.spawn(0, 0, 0, 0);
      L.grid(0, 2, 3, 3);
      L.sign(-2.3, -3.9, '最后一关 ♡\n这次真的没有陷阱了', { rot: 0.5 });

      // ① 糖果锤走廊：中间空地站不住；第三把锤子是假的（牌子说的是真话）
      const path = L.grid(0, -4, 1, 14);
      L.zone(0, -4, -17, 14, 10, 28, { enter: () => L.fallMsg('掉下去啦～', null) });
      [path[6][0], path[7][0]].forEach((e) => L.fragile(e, 0.5, { id: 'l5wait', msg: '站着不动，也会出事哦', set: '停下来更安全' }));
      L.box(-2.25, -0.3, -11.2, 1.3, 0.6, 1.3, { color: L.theme.tileB });
      L.sign(-2.25, -11.2, '第三把锤子是假的\n直接走过去～', { rot: 0.6, accent: TRUE_INK });
      const hammers = [];
      const stripeM = mat('#ffffff', { vertexColors: false, roughness: 0.25 });
      [-8, -14, -20, -26].forEach((z, i) => {
        const pivot = new THREE.Group();
        pivot.position.set(0, 7.4, z);
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 6, 10), stripeM);
        arm.position.y = -3; pivot.add(arm);
        const head = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.9, 28), mat(['#ff7fa8', '#7fd3ff', '#ffd34f', '#b49cff'][i], { vertexColors: false, roughness: 0.25 }));
        head.rotation.z = Math.PI / 2; head.position.y = -6; head.castShadow = true;
        pivot.add(head);
        for (const sx of [-0.55, 0, 0.55]) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.08, 8, 28), stripeM);
          ring.rotation.y = Math.PI / 2; ring.position.set(sx, -6, 0); pivot.add(ring);
        }
        pivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), stripeM));
        L.add(pivot);
        hammers.push({ pivot, z, ph: i * 1.15, last: 0, fake: i === 2 });
      });
      const A = 1.2, W = (Math.PI * 2) / 2.6;
      const hp = new THREE.Vector3(), ax = new THREE.Vector3(), pc = new THREE.Vector3(), tmp = new THREE.Vector3();
      L.every((dt, t) => {
        for (const h of hammers) {
          const th = A * Math.sin(W * t + h.ph);
          h.pivot.rotation.z = th;
          hp.set(Math.sin(th) * 6, 7.4 - Math.cos(th) * 6, h.z);
          ax.set(Math.cos(th), Math.sin(th), 0);
          const p = L.p.pos;
          if (Math.sign(th) !== Math.sign(h.last) && Math.abs(p.z - h.z) < 7) L.sfx.whoosh();
          h.last = th;
          if (h.fake || !L.g.canInteract()) continue;
          pc.set(p.x, p.y + 0.8, p.z);
          tmp.copy(pc).sub(hp);
          const along = THREE.MathUtils.clamp(tmp.dot(ax), -0.95, 0.95);
          tmp.copy(hp).addScaledVector(ax, along);
          if (tmp.distanceTo(pc) < 0.75 + 0.42) { L.g.shake(0.6); L.kill('咚！糖果锤也是锤子 (＞﹏＜)', null, 'squash'); }
        }
      });

      // ② 会消失的彩虹桥：爆炸金币、骗人的闪光、半空冒出的尖刺、这次是真的金币
      const rc = ['#ff8fa3', '#ffbf7a', '#ffe680', '#9ee6a0', '#8fd3ff', '#c3a6ff'];
      const segs = [];
      const seg = (z, i, hidden) => {
        const e = L.box(0, -0.3, z, 3, 0.6, 2, { color: rc[i % 6], r: 0.14, matOpts: { roughness: 0.2 } });
        if (hidden) { e.enabled = false; e.obj.visible = false; e.obj.position.y = -10; }
        segs.push(e);
        return e;
      };
      let k = 0;
      for (let z = -32; z >= -46; z -= 2) seg(z, k++);
      for (let z = -51; z >= -63; z -= 2) seg(z, k++);
      const ext = [-65, -67, -69].map((z) => seg(z, k++, true));
      L.coin(0, 1.0, -37, () => { L.mark('l5boom'); explode(L, new THREE.Vector3(0, 1, -37), '金币是奖励'); });
      L.sparkles(0, 0.1, -48.5, 2.6, 3, 26);
      L.zone(0, -4, -48.5, 14, 10, 3, { enter: () => L.fallMsg('这次的闪光……只是闪光而已 ✧', '闪光=隐形的路') });
      const scare = L.spikes(0, -51, 3, 2, { msg: '尖刺来不及缩回去了 (°ロ°)', set: null });
      let scared = false;
      L.every(() => {
        const P = L.p;
        if (scared || !L.g.canInteract()) return;
        if (!P.grounded && P.pos.z < -47 && P.pos.z > -50 && P.pos.y > -0.5) {
          scared = true;
          scare.up(); L.sfx.troll();
          L.after(0.42, () => scare.down());
          return false;
        }
      });
      let coinGot = false;
      L.zone(0, -4, -67, 14, 10, 6, { enter: () => { if (!coinGot) L.fallMsg('这次的金币……是真的哦 ★', '金币一定是陷阱'); } });
      L.coin(0, 1.0, -58, () => {
        coinGot = true;
        L.toast('★ 彩虹延长了！');
        ext.forEach((e, i) => {
          e.enabled = true; e.obj.visible = true;
          L.tween(e.obj.position, { y: -0.3 }, 0.5, 'outBack', { delay: i * 0.12 });
        });
      });
      let chase = -1;
      segs[0].onStep = () => { if (chase < 0) chase = L.time + 0.8; };
      L.every(() => {
        if (chase < 0 || L.time < chase) return;
        const frontZ = -31 - (L.time - chase) * 4.2;
        for (const e of segs) {
          if (e.dropping || !e.enabled) continue;
          if (frontZ < e.obj.position.z + 1) {
            if (L.p.groundEnt === e) L.fallMsg('彩虹是会消失的嘛～ 别停下来', null);
            L.drop(e, { wobble: 0.22, dist: 40, dur: 1.4, sound: false });
          }
        }
      });

      // ③ 终点小岛 + 假的死亡画面
      L.grid(0, -71, 5, 5);
      L.sign(2.6, -77.2, '真·终点 ♡', { rot: -0.35, accent: TRUE_INK });
      L.zone(0, 1, -75.3, 10, 4, 1.6, { once: true, enter: () => L.g.fakeDeath() });
      L.goal(0, 0, -79);
      L.deco('lolli', -3.6, 0, -79.5, 1.2); L.deco('tree', 3.8, 0, -79.8, 1.2); L.deco('tree', -3.8, 0, -72, 0.9);

      L.islet(-9, -2, -10, 2.2, 3); L.islet(10, 0, -24, 2.4, 3); L.islet(-11, 1, -45, 2.6, 2);
      L.islet(10, -3, -60, 2, 2);
    },
  },
];

// 主菜单的展示台
export function buildShowcase(L) {
  const T = L.theme;
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.05, 0.5, 48), mat(T.tileA, { vertexColors: false, roughness: 0.6 }));
  top.position.y = -0.25; top.receiveShadow = true; top.castShadow = true;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.12, 12, 64), mat('#ffb3d0', { vertexColors: false, roughness: 0.3 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = -0.02;
  const bottom = new THREE.Mesh(new THREE.ConeGeometry(2.05, 2.6, 48), mat('#f6c6dc', { vertexColors: false, roughness: 0.8 }));
  bottom.rotation.x = Math.PI; bottom.position.y = -1.8;
  g.add(top, ring, bottom);
  L.add(g);
  L.deco('lolli', -1.5, 0, -0.9, 0.9);
  L.deco('tree', 1.55, 0, -0.8, 0.85);
  L.islet(-6, -1.5, -6, 1.6, 2); L.islet(6.5, 0.8, -8, 2, 3); L.islet(-3, 2.5, -14, 1.4, 1);
  const lbl = labelSprite('♡', { color: '#ff6fa8', size: 0.5 });
  lbl.position.set(0, 2.2, 0); lbl.visible = false;
  L.add(lbl);
}

export { THEMES };
