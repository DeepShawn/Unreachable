import * as THREE from '../vendor/three.module.min.js';
import { Sound } from './audio.js';
import { Input } from './input.js';
import { SKINS, buildCharacter, animateCharacter, buildPaws } from './skins.js';
import { Env, THEMES, Burst } from './env.js';
import { Level } from './world.js';
import { LEVELS, buildShowcase } from './levels.js';

const $ = (s) => document.querySelector(s);
const R = 0.32, H = 1.62, EYE = 1.5, STEP = 0.56, SPEED = 5.6, JUMP = 7.6, GRAV = 22;
const SAVE_KEY = 'unreachable-save-v1';
const FALL_LINES = ['掉下去啦～ 云朵并不软哦', '咻————— (°ロ°)', '脚下一空，人生一空'];
const DEATH_TITLES = ['啊呜！', '哎呀！', '噗叽！', '呜哇！', '欸？！', '嘎！'];

function loadSave() {
  const d = { unlocked: 0, skin: 'cat', deaths: 0, cleared: false, sets: {}, sfx: true, music: true, sens: 1, best: {} };
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (s && typeof s === 'object') Object.assign(d, s);
  } catch (_) { /* 无痕模式等情况下拿不到存储，直接用默认值 */ }
  return d;
}

function fmtTime(t) {
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function overlap(a0, a1, b0, b1) {
  return a0.x < b1.x && a1.x > b0.x && a0.y < b1.y && a1.y > b0.y && a0.z < b1.z && a1.z > b0.z;
}

class Game {
  constructor() {
    this.canvas = $('#c');
    const mobile = matchMedia('(pointer: coarse)').matches || /iPhone|iPad|Android/i.test(navigator.userAgent);
    this.quality = { mobile, shadow: mobile ? 1024 : 2048, dpr: Math.min(devicePixelRatio || 1, mobile ? 2 : 2) };

    const r = this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(this.quality.dpr);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.autoClear = false;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(72, 1, 0.05, 900);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);
    this.env = new Env(r, this.scene, this.quality);
    this.fx = new Burst(this.scene);

    // 爪爪单独一个场景，最后叠加渲染，避免穿墙
    this.pawScene = new THREE.Scene();
    this.pawHemi = new THREE.HemisphereLight('#ffffff', '#ffd0e0', 2.0);
    this.pawSun = new THREE.DirectionalLight('#ffffff', 1.6);
    this.pawSun.position.set(0.5, 1, 0.6);
    this.pawScene.add(this.pawHemi, this.pawSun);
    this.pawRoot = new THREE.Group();
    this.pawScene.add(this.pawRoot);

    this.sound = new Sound();
    this.save = loadSave();
    this.sound.sfxOn = this.save.sfx;
    this.sound.musicOn = this.save.music;

    this.input = new Input({ canvas: this.canvas, touchLayer: $('#touch'), joyBase: $('#joy'), joyKnob: $('#knob'), jumpBtn: $('#jump') });
    this.input.sens = this.save.sens;
    this.input.onKeyAction = (code) => this.onKey(code);
    this.input.onLockChange = (locked) => {
      $('#lockHint').hidden = locked || this.state !== 'play' || this.input.isTouch;
      if (!locked && this.state === 'play' && this._wasLocked) this.pause();
      this._wasLocked = locked;
    };

    this.player = {
      pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, pitch: 0, roll: 0,
      grounded: false, groundEnt: null, coyote: 0, carry: new THREE.Vector2(),
      bob: 0, land: 0, stepDist: 0, steps: 0,
    };
    this.pmin = new THREE.Vector3(); this.pmax = new THREE.Vector3();

    // 圆形影子（第一人称时帮助判断落点）
    const bc = document.createElement('canvas'); bc.width = bc.height = 64;
    const bx = bc.getContext('2d');
    const gr = bx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(60,20,70,0.5)'); gr.addColorStop(0.6, 'rgba(60,20,70,0.25)'); gr.addColorStop(1, 'rgba(60,20,70,0)');
    bx.fillStyle = gr; bx.fillRect(0, 0, 64, 64);
    this.blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bc), transparent: true, depthWrite: false }));
    this.blob.rotation.x = -Math.PI / 2;
    this.blob.renderOrder = 2;
    this.scene.add(this.blob);

    this.state = 'loading';
    this.camMode = 'menu';
    this.levelIdx = 0;
    this.level = null;
    this.levelTime = 0;
    this.runTime = 0;
    this.levelDeaths = 0;
    this.shakeAmt = 0;
    this.fallMsg = { msg: FALL_LINES[0], set: null };
    this.menuSkin = Math.max(0, SKINS.findIndex((s) => s.id === this.save.skin));
    this.setSkin(SKINS[this.menuSkin]);
    this.camFrom = new THREE.Vector3(); this.camTo = new THREE.Vector3(); this.camLook = new THREE.Vector3();
    this.clock = new THREE.Clock();
    this._v = new THREE.Vector3();
    this.t = 0;

    this.bindUI();
    addEventListener('resize', () => this.resize());
    this.resize();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  // —————————— 存档 ——————————
  persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.save)); } catch (_) { /* 忽略 */ }
  }
  isUnlocked(skin) {
    if (!skin.unlock) return true;
    if (skin.unlock.deaths) return this.save.deaths >= skin.unlock.deaths;
    if (skin.unlock.clear) return this.save.cleared;
    return true;
  }

  setSkin(skin) {
    if (this.char) { this.char.removeFromParent(); }
    this.char = buildCharacter(skin);
    this.scene.add(this.char);
    this.char.visible = false;
    this.pawRoot.clear();
    this.paws = buildPaws(skin);
    this.pawRoot.add(this.paws);
  }

  // —————————— 关卡 ——————————
  loadWorld(builder, theme) {
    if (this.level) this.level.dispose();
    this.env.setTheme(theme);
    this.pawHemi.color.set(theme.night ? '#c9c0ff' : '#ffffff');
    this.pawHemi.groundColor.set(theme.hemiG);
    const L = new Level(this, theme);
    this.level = L;
    this.scene.add(L.root);
    builder(L);
    return L;
  }

  startLevel(i, respawn = false) {
    this.levelIdx = i;
    const def = LEVELS[i];
    if (this.char.userData.skin.id !== this.save.skin) {
      const idx = Math.max(0, SKINS.findIndex((s) => s.id === this.save.skin));
      this.menuSkin = idx;
      this.setSkin(SKINS[idx]);
    }
    this.loadWorld((L) => def.build(L), THEMES[def.theme]);
    const p = this.player, L = this.level;
    p.pos.copy(L.spawnPos); p.vel.set(0, 0, 0); p.carry.set(0, 0);
    p.yaw = L.spawnYaw; p.pitch = -0.06; p.roll = 0;
    p.grounded = false; p.groundEnt = null; p.coyote = 0; p.land = 0;
    this.fallMsg = { msg: FALL_LINES[Math.floor(Math.random() * FALL_LINES.length)], set: null };
    this.setMirror(false);
    this.fakeDeathOn = false; this.fakeWinWait = false;
    this.input.reset();
    if (!respawn) { this.levelTime = 0; this.levelDeaths = 0; this.showLevelCard(i); }
    this.state = 'play';
    this.camMode = 'fp';
    this.camera.clearViewOffset();
    this.char.visible = false;
    this.showScreen(null);
    this.setHud(true);
    this.updateHud();
    if (!respawn) this.sound.playMusic(i + 1);
  }

  showMenu() {
    this.state = 'menu';
    this.camMode = 'menu';
    this.menuOffset();
    this.setHud(false);
    this.setMirror(false);
    this.input.exitLock();
    this.loadWorld((L) => buildShowcase(L), THEMES[5]);
    this.char.position.set(0, 0, 0);
    this.char.rotation.set(0, 0, 0);
    this.char.scale.setScalar(1);
    this.char.visible = true;
    this.showScreen('menu');
    this.refreshMenu();
    this.sound.playMusic(0);
  }

  // —————————— 规则接口（给关卡调用）——————————
  canInteract() { return this.state === 'play'; }
  setFallMsg(msg, set) { this.fallMsg = { msg, set }; }
  troll(set) {
    if (!set) return;
    this.save.sets[set] = (this.save.sets[set] || 0) + 1;
    this.persist();
  }
  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); }
  lookingAt(x, y, z, cosTh) {
    const c = this.camera.position;
    const d = this._v.set(x - c.x, y - c.y, z - c.z).normalize();
    const p = this.player;
    const fx = -Math.sin(p.yaw) * Math.cos(p.pitch), fy = Math.sin(p.pitch), fz = -Math.cos(p.yaw) * Math.cos(p.pitch);
    return d.x * fx + d.y * fy + d.z * fz > cosTh;
  }
  setMirror(on) {
    if (this.mirror === on) return;
    this.mirror = on;
    $('#view').classList.toggle('mirror', on);
    if (on) { this.toast('⇆ 镜子世界'); this.sound.whoosh(); }
  }

  kill(msg, set, type = 'pop') {
    if (this.state !== 'play') return;
    this.state = 'dead';
    this.registerDeath(set);
    this.beginDeathCam(type);
    this.showDeath(msg, false);
    this.respawnAt = this.t + 2.0;
    this.canSkipAt = this.t + 0.45;
  }

  registerDeath(set) {
    this.save.deaths++;
    this.levelDeaths++;
    if (set) this.save.sets[set] = (this.save.sets[set] || 0) + 1;
    this.persist();
    this.sound.death();
    this.flash('#ffffff');
    this.shake(0.45);
    this.updateHud(true);
    if (this.save.deaths === 30) setTimeout(() => this.toast('解锁新皮肤：幽灵啵啵 ✦', 3), 1400);
  }

  beginDeathCam(type) {
    const p = this.player;
    this.deathType = type;
    this.deathT = 0;
    this.deathVel = p.vel.clone();
    this.char.position.copy(p.pos);
    this.char.rotation.set(0, p.yaw + Math.PI, 0);
    this.char.scale.setScalar(1);
    this.char.visible = true;
    this.charBase = p.pos.clone();
    this.camMode = 'death';
    this.camFrom.copy(this.camera.position);
    const back = new THREE.Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw));
    this.camTo.copy(p.pos).addScaledVector(back, type === 'fall' ? 2.2 : 3.4).add(new THREE.Vector3(0, type === 'fall' ? 3.2 : 2.3, 0));
    this.camBlend = 0;
    this.fx.emit(this._v.copy(p.pos).setY(p.pos.y + 1), { count: 30, speed: 5, up: 2 });
  }

  fakeDeath() {
    if (this.state !== 'play') return;
    this.state = 'fakedead';
    this.registerDeath(null);
    this.fakeCounted = true;
    this.beginDeathCam('pop');
    this.showDeath('啊呜……这次真的没救了 (×_×)', true);
    setTimeout(() => {
      if (this.state !== 'fakedead') return;
      this.state = 'play';
      this.camMode = 'fp';
      this.char.visible = false;
      this.fakeDeathOn = true;
      $('#death').classList.add('passthrough');
      this.fakeHintTimer = setTimeout(() => { if (this.fakeDeathOn) $('#deathHint2').hidden = false; }, 3500);
    }, 1500);
  }

  fakeWin(onOpen) {
    if (this.state !== 'play') return;
    this.state = 'fakeclear';
    this.troll('通关画面是真的');
    this.beginWinCam();
    this.showClear(true);
    let opened = false;
    this.fakeOpen = () => {
      if (opened) return; opened = true;
      this.state = 'play';
      this.camMode = 'fp';
      this.menuOffset();
      $('#crosshair').hidden = false;
      $('#lockHint').hidden = this.input.isTouch || this.input.locked;
      this.char.visible = false;
      this.fakeWinWait = true;
      $('#clear').classList.add('passthrough');
      onOpen();
    };
    setTimeout(this.fakeOpen, 2300);
  }

  win() {
    if (this.state !== 'play') return;
    this.state = 'clear';
    if (this.fakeDeathOn) this.endFakeDeath(true);
    const i = this.levelIdx;
    this.save.unlocked = Math.max(this.save.unlocked, Math.min(LEVELS.length - 1, i + 1));
    const best = this.save.best[i];
    if (!best || this.levelTime < best) this.save.best[i] = this.levelTime;
    if (i === LEVELS.length - 1) this.save.cleared = true;
    this.persist();
    this.beginWinCam();
    if (i === LEVELS.length - 1) {
      setTimeout(() => this.showEnding(), 2300);
    } else {
      this.showClear(false);
    }
  }

  beginWinCam() {
    const p = this.player;
    this.sound.win();
    this.input.exitLock();
    this.char.position.copy(p.pos);
    this.char.rotation.set(0, p.yaw + Math.PI, 0);
    this.char.scale.setScalar(1);
    this.char.visible = true;
    this.camMode = 'win';
    this.camFrom.copy(this.camera.position);
    const fwd = new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    this.camTo.copy(p.pos).addScaledVector(fwd, 3.1).add(new THREE.Vector3(0, 1.45, 0));
    this.camBlend = 0;
    this.menuOffset();
    $('#crosshair').hidden = true;
    $('#lockHint').hidden = true;
    for (let k = 0; k < 3; k++) setTimeout(() => this.fx.emit(this._v.copy(p.pos).setY(p.pos.y + 2.2), { count: 50, speed: 7, up: 4, size: 0.45, life: 1.6 }), k * 280);
  }

  endFakeDeath(silent) {
    this.fakeDeathOn = false;
    clearTimeout(this.fakeHintTimer);
    $('#death').classList.remove('passthrough');
    this.showScreen(null);
    if (!silent) this.toast('你真的相信自己死了呀～');
  }

  pause() {
    if (this.state !== 'play') return;
    this.state = 'pause';
    this.input.exitLock();
    this.showScreen('pause');
  }
  resume() {
    if (this.state !== 'pause') return;
    this.state = 'play';
    this.showScreen(this.fakeDeathOn ? 'death' : this.fakeWinWait ? 'clear' : null);
    this.input.reset();
    if (!this.input.isTouch) { try { const p = this.canvas.requestPointerLock(); p && p.catch && p.catch(() => {}); } catch (_) { /* 无所谓 */ } }
  }

  onKey(code) {
    if (code === 'Escape' || code === 'KeyP') {
      if (this.state === 'play') this.pause();
      else if (this.state === 'pause' && code === 'KeyP') this.resume();
      return;
    }
    if (this.state === 'dead' && this.t > this.canSkipAt && (code === 'Space' || code === 'Enter' || code === 'KeyR')) { this.respawn(); return; }
    if (this.state === 'play' && code === 'KeyR') {
      if (this.fakeDeathOn) { this.endFakeDeath(); this.troll('死亡画面是真的'); }
      this.startLevel(this.levelIdx, true);
      return;
    }
    if (this.state === 'play' && this.fakeDeathOn && code === 'Enter') { this.endFakeDeath(); this.troll('死亡画面是真的'); this.startLevel(this.levelIdx, true); return; }
    if (this.state === 'clear' && (code === 'Enter' || code === 'Space') && !$('#clear').hidden) { $('#btnNext').click(); }
  }

  respawn() {
    if (this.state !== 'dead') return;
    this.startLevel(this.levelIdx, true);
  }

  // —————————— 主循环 ——————————
  frame() {
    const dt = Math.min(this.clock.getDelta(), 1 / 20);
    this.t += dt;
    const st = this.state;
    const L = this.level;

    if (L && st !== 'pause') {
      for (const e of L.ents) e.prev.copy(e.obj.position).add(e.off);
      L.update(dt);
      for (const e of L.ents) L.updateBox(e);
    }
    if (st === 'play' || st === 'fakedead' || st === 'fakeclear') {
      this.updatePlayer(dt, st !== 'play');
      if (this.state === 'play') this.checkWorld(dt);
      this.levelTime += dt;
      this.runTime += dt;
    }
    if (st === 'dead' && this.t > this.respawnAt) this.respawn();
    if (this.fakeWinWait && this.player.grounded && this.player.pos.y < -10) {
      this.fakeWinWait = false;
      const c = $('#clear');
      c.classList.add('crack');
      this.sound.crack();
      setTimeout(() => { c.classList.remove('crack', 'passthrough'); if (this.state === 'play') this.showScreen(null); this.toast('骗你哒～ (≧▽≦)', 2.6); this.sound.troll(); }, 650);
    }

    this.updateCamera(dt);
    this.updateChar(dt);
    this.env.update(dt, this.camMode === 'fp' ? this.player.pos : this.char.position, this.camera);
    this.fx.update(dt);
    this.updateHudTime();

    const r = this.renderer;
    r.clear();
    r.render(this.scene, this.camera);
    if (this.camMode === 'fp' && this.state !== 'pause') {
      r.clearDepth();
      r.render(this.pawScene, this.camera);
    }
  }

  _pbox() {
    const p = this.player.pos;
    this.pmin.set(p.x - R, p.y, p.z - R);
    this.pmax.set(p.x + R, p.y + H, p.z + R);
  }
  _anySolid() {
    for (const e of this.level.ents) if (e.enabled && e.solid && overlap(this.pmin, this.pmax, e.min, e.max)) return true;
    return false;
  }

  moveAxis(axis, d) {
    if (d === 0) return null;
    const P = this.player, p = P.pos;
    p[axis] += d;
    this._pbox();
    let hit = null;
    for (const e of this.level.ents) {
      if (!e.enabled || !e.solid) continue;
      if (!overlap(this.pmin, this.pmax, e.min, e.max)) continue;
      if (axis === 'y') {
        if (d < 0) { p.y = e.max.y; if (P.vel.y < 0) P.vel.y = 0; }
        else { p.y = e.min.y - H - 1e-4; if (P.vel.y > 0) P.vel.y = 0; }
        hit = e;
      } else {
        const rise = e.max.y - p.y;
        if (P.grounded && rise > 0 && rise <= STEP) {
          const oy = p.y;
          p.y = e.max.y + 1e-4;
          this._pbox();
          if (!this._anySolid()) continue;
          p.y = oy;
        }
        p[axis] = d > 0 ? e.min[axis] - R - 1e-4 : e.max[axis] + R + 1e-4;
        P.vel[axis] = 0;
        hit = e;
      }
      this._pbox();
    }
    return hit;
  }

  updatePlayer(dt, locked) {
    const P = this.player, inp = this.input;
    const look = inp.consumeLook();
    const mv = inp.getMove();
    if (!locked) {
      P.yaw -= look.x;
      P.pitch = THREE.MathUtils.clamp(P.pitch - look.y, -1.45, 1.45);
      P.yaw -= mv.turn * 2.4 * dt;
    }
    const ge = P.groundEnt && P.groundEnt.enabled ? P.groundEnt : null;
    const mx = locked ? 0 : mv.x, mz = locked ? 0 : mv.z;
    const sm = ge ? ge.speedMul : 1;
    const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
    const wx = (fx * mz + rx * mx) * SPEED * sm, wz = (fz * mz + rz * mx) * SPEED * sm;
    const k = 1 - Math.exp(-(P.grounded ? 18 : 6) * dt);
    P.vel.x += (wx - P.vel.x) * k;
    P.vel.z += (wz - P.vel.z) * k;

    P.coyote = P.grounded ? 0.1 : P.coyote - dt;
    // 跳跃缓冲：按下后 150ms 内（再加上这一帧本身的时长）落地也能跳，卡顿时不丢输入
    if (!locked && inp.jumpQueued && performance.now() - inp.jumpQueued < 150 + dt * 1000 && P.coyote > 0) {
      inp.jumpQueued = 0;
      const mul = ge ? ge.jumpMul : 1;
      P.vel.y = JUMP * mul;
      P.grounded = false; P.coyote = 0;
      if (mul > 1) { this.sound.boing(); ge.jiggle && ge.jiggle(); } else this.sound.jump();
    }

    // 站在移动平台上：跟着走
    if (ge) {
      const c = this._v.copy(ge.obj.position).add(ge.off).sub(ge.prev);
      if (c.lengthSq() < 4) P.pos.add(c);
      if (ge.conveyor) P.carry.set(ge.conveyor.x, ge.conveyor.z);
      else P.carry.set(0, 0);
    }

    // 被移动的方块“挤到”
    this._pbox();
    for (const e of this.level.ents) {
      if (!e.enabled || !e.solid || !overlap(this.pmin, this.pmax, e.min, e.max)) continue;
      if (e.crush && e.kill) { this.kill(e.kill.msg, e.kill.set, e.kill.type); return; }
      if (e.max.y - P.pos.y < 0.7) { P.pos.y = e.max.y; this._pbox(); }
    }

    const wasGrounded = P.grounded, prevGround = P.groundEnt;
    const fallSpeed = -P.vel.y;
    const n = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / n;
    let ground = null;
    for (let i = 0; i < n; i++) {
      P.vel.y = Math.max(-40, P.vel.y - GRAV * h);
      this.moveAxis('x', (P.vel.x + P.carry.x) * h);
      this.moveAxis('z', (P.vel.z + P.carry.y) * h);
      const dy = P.vel.y * h;
      const hit = this.moveAxis('y', dy);
      ground = hit && dy < 0 ? hit : null;
      if (hit && dy > 0) { this.sound.bonk && this.shake(0.15); }
    }
    P.grounded = !!ground;
    P.groundEnt = ground;
    if (P.grounded && (!wasGrounded || prevGround !== ground)) {
      if (!wasGrounded && fallSpeed > 4) { this.sound.land(); P.land = Math.min(0.18, fallSpeed * 0.012); }
      if (ground.onStep && this.state === 'play') ground.onStep(ground);
    }
    if (P.grounded && !ground.conveyor) P.carry.set(0, 0);

    // 脚步 & 晃动
    const sp = Math.hypot(P.vel.x, P.vel.z);
    if (P.grounded && sp > 1) {
      P.bob += sp * dt * 1.85;
      P.stepDist += sp * dt;
      if (P.stepDist > 1.7) { P.stepDist = 0; this.sound.step(P.steps++); }
    }
    P.land = Math.max(0, P.land - dt * 0.8);
  }

  checkWorld() {
    const P = this.player, L = this.level;
    this._pbox();
    const s = 0.06;
    const a0 = this._v.set(this.pmin.x + s, this.pmin.y + s, this.pmin.z + s);
    const a1 = new THREE.Vector3(this.pmax.x - s, this.pmax.y - s, this.pmax.z - s);
    for (const e of L.ents) {
      if (!e.enabled || e.solid || !e.kill) continue;
      if (overlap(a0, a1, e.min, e.max)) { this.kill(e.kill.msg, e.kill.set, e.kill.type); return; }
    }
    if (P.pos.y < L.killY) { this.kill(this.fallMsg.msg, this.fallMsg.set, 'fall'); return; }
    for (const z of L.zones) {
      if (!z.enabled) continue;
      const inside = overlap(this.pmin, this.pmax, z.min, z.max);
      if (inside && !z.inside) { z.inside = true; z.enter && z.enter(); if (z.once) z.enabled = false; if (this.state !== 'play') return; }
      else if (!inside && z.inside) { z.inside = false; z.exit && z.exit(); }
    }
    // 圆形影子
    let best = -Infinity;
    for (const e of L.ents) {
      if (!e.enabled || !e.solid) continue;
      if (P.pos.x > e.min.x && P.pos.x < e.max.x && P.pos.z > e.min.z && P.pos.z < e.max.z && e.max.y <= P.pos.y + 0.05 && e.max.y > best) best = e.max.y;
    }
    if (best > -Infinity) {
      const hgt = P.pos.y - best;
      this.blob.visible = true;
      this.blob.position.set(P.pos.x, best + 0.015, P.pos.z);
      const sc = Math.max(0.3, 0.9 - hgt * 0.08);
      this.blob.scale.set(sc, sc, 1);
      this.blob.material.opacity = Math.max(0.2, 1 - hgt * 0.12);
    } else this.blob.visible = false;
  }

  updateCamera(dt) {
    const cam = this.camera, P = this.player;
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 1.8);
    const sh = this.shakeAmt * this.shakeAmt;
    if (this.camMode === 'fp') {
      const bob = P.grounded ? Math.sin(P.bob) * 0.035 : 0;
      cam.position.set(P.pos.x, P.pos.y + EYE + bob - P.land, P.pos.z);
      cam.rotation.set(P.pitch + (Math.random() - 0.5) * sh * 0.1, P.yaw + (Math.random() - 0.5) * sh * 0.1, Math.cos(P.bob * 0.5) * 0.008);
      this.updatePaws(dt);
    } else if (this.camMode === 'menu') {
      this.blob.visible = false;
      const t = this.t;
      cam.position.set(Math.sin(t * 0.25) * 0.4, 1.4 + Math.sin(t * 0.4) * 0.06, 3.7);
      cam.lookAt(0, 0.82, 0);
    } else {
      this.blob.visible = false;
      this.camBlend = Math.min(1, this.camBlend + dt * 2.2);
      const k = 1 - Math.pow(1 - this.camBlend, 3);
      cam.position.lerpVectors(this.camFrom, this.camTo, k);
      cam.position.x += (Math.random() - 0.5) * sh * 0.3;
      cam.position.y += (Math.random() - 0.5) * sh * 0.3;
      const target = this._v.copy(this.char.position).add(new THREE.Vector3(0, 0.7, 0));
      if (this.camMode === 'death' && this.deathType === 'fall') target.y = Math.max(target.y, this.charBase.y - 6);
      this.camLook.lerp(target, this.camBlend < 0.05 ? 1 : Math.min(1, dt * 8));
      cam.lookAt(this.camLook);
    }
  }

  updatePaws(dt) {
    const P = this.player;
    this.pawRoot.position.copy(this.camera.position);
    this.pawRoot.quaternion.copy(this.camera.quaternion);
    const paws = this.paws.userData.paws;
    const sp = Math.min(1, Math.hypot(P.vel.x, P.vel.z) / SPEED);
    const air = P.grounded ? 0 : 1;
    paws.forEach((g, i) => {
      const s = i ? 1 : -1;
      const ph = P.bob + (i ? Math.PI : 0);
      g.position.set(s * 0.27 + Math.sin(this.t * 1.4) * 0.004, -0.27 + Math.abs(Math.sin(ph)) * 0.025 * sp + air * 0.06 + Math.sin(this.t * 2) * 0.005, -0.62 + Math.cos(ph) * 0.035 * sp);
      g.rotation.set(-0.25 - air * 0.4, -s * 0.18, s * 0.2 + air * s * 0.3);
    });
  }

  updateChar(dt) {
    const ch = this.char;
    if (!ch.visible) return;
    const t = this.t;
    if (this.camMode === 'menu') {
      ch.rotation.y = Math.sin(t * 0.6) * 0.45;
      animateCharacter(ch, t, 'idle');
    } else if (this.camMode === 'win') {
      animateCharacter(ch, t, 'dance');
    } else if (this.camMode === 'death') {
      this.deathT += dt;
      const d = this.deathT;
      animateCharacter(ch, t, 'dizzy');
      if (this.deathType === 'fall') {
        this.deathVel.y -= GRAV * dt;
        ch.position.addScaledVector(this.deathVel, dt);
        this.deathVel.x *= 0.98; this.deathVel.z *= 0.98;
        ch.rotation.x += dt * 4; ch.rotation.z += dt * 2.5;
      } else if (this.deathType === 'squash') {
        const k = Math.min(1, d / 0.12);
        ch.scale.set(1 + k * 0.6, 1 - k * 0.8, 1 + k * 0.6);
      } else {
        const y = Math.max(0, 7 * d - 14 * d * d);
        ch.position.y = this.charBase.y + y;
        ch.rotation.y += dt * 9 * Math.max(0, 1 - d);
        if (d > 0.45) ch.rotation.z = Math.min(Math.PI / 2, (d - 0.45) * 7);
        if (Math.random() < dt * 6) this.fx.emit(this._v.copy(ch.position).setY(ch.position.y + 1.3), { count: 1, colors: ['#ffe066', '#ffffff'], speed: 1, up: 0.5, gravity: 0, size: 0.35, life: 0.8 });
      }
    }
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    const asp = w / h;
    this.camera.aspect = asp;
    // 竖屏时把垂直视野放大，保证水平视野够用
    const hf = 82 * Math.PI / 180;
    const vf = 2 * Math.atan(Math.tan(hf / 2) / asp) * 180 / Math.PI;
    this.camera.fov = THREE.MathUtils.clamp(vf, 64, 100);
    this.camera.updateProjectionMatrix();
    this.menuOffset();
  }
  menuOffset() {
    const w = innerWidth, h = innerHeight;
    if (this.camMode === 'menu' || this.camMode === 'win') {
      if (w > h * 1.05) this.camera.setViewOffset(w, h, -w * 0.2, 0, w, h);
      else this.camera.setViewOffset(w, h, 0, h * 0.2, w, h);
    } else this.camera.clearViewOffset();
  }

  // —————————— UI ——————————
  bindUI() {
    const click = (sel, fn) => $(sel).addEventListener('click', (e) => { this.sound.unlock(); this.sound.click(); fn(e); });
    click('#btnTap', () => { this.showMenu(); });
    click('#btnPlay', () => { this.startLevel(this.save.unlocked); this.requestLock(); });
    click('#btnLevels', () => { this.renderLevels(); this.showScreen('levels'); });
    click('#btnSkins', () => { this.showScreen('skins'); this.renderSkin(); });
    click('#btnHelp', () => this.showScreen('help'));
    document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => { this.sound.click(); this.setSkinPreview(this.menuSkin, true); this.showScreen('menu'); this.refreshMenu(); }));
    click('#skinPrev', () => { this.menuSkin = (this.menuSkin + SKINS.length - 1) % SKINS.length; this.renderSkin(); });
    click('#skinNext', () => { this.menuSkin = (this.menuSkin + 1) % SKINS.length; this.renderSkin(); });
    click('#skinPick', () => {
      const s = SKINS[this.menuSkin];
      if (!this.isUnlocked(s)) return;
      this.save.skin = s.id; this.persist();
      this.fx.emit(new THREE.Vector3(0, 1.2, 0), { count: 40, speed: 4, up: 3 });
      this.sound.coin();
      this.renderSkin();
    });
    click('#btnResume', () => this.resume());
    click('#btnRestart', () => { this.startLevel(this.levelIdx); this.requestLock(); });
    click('#btnMenu', () => this.showMenu());
    click('#pauseBtn', () => this.pause());
    click('#btnRetry', () => {
      if (this.state === 'dead') this.respawn();
      else if (this.fakeDeathOn) { this.endFakeDeath(); this.troll('死亡画面是真的'); this.startLevel(this.levelIdx, true); }
    });
    click('#btnNext', () => {
      if (this.state === 'fakeclear') { this.fakeOpen && this.fakeOpen(); return; }
      if (this.state !== 'clear') return;
      this.startLevel(Math.min(LEVELS.length - 1, this.levelIdx + 1)); this.requestLock();
    });
    click('#btnClearMenu', () => { if (this.state === 'fakeclear') { this.fakeOpen && this.fakeOpen(); return; } this.showMenu(); });
    click('#btnEndMenu', () => this.showMenu());
    const again = $('#btnAgain');
    let dodges = 0;
    const dodge = () => {
      if (dodges >= 3) return;
      dodges++;
      again.style.transform = `translate(${(Math.random() - 0.5) * 220}px, ${(Math.random() - 0.5) * 80}px) rotate(${(Math.random() - 0.5) * 30}deg)`;
      this.sound.squeak();
      if (dodges === 3) setTimeout(() => { again.style.transform = ''; again.textContent = '好啦好啦，再玩一次'; }, 500);
    };
    again.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') dodge(); });
    again.addEventListener('click', (e) => {
      this.sound.unlock();
      if (dodges < 3) { e.preventDefault(); dodge(); return; }
      this.sound.click();
      dodges = 0; again.textContent = '再玩一次'; again.style.transform = '';
      this.startLevel(0); this.requestLock();
    });
    // 设置
    const sfx = $('#optSfx'), music = $('#optMusic'), sens = $('#optSens');
    sfx.checked = this.save.sfx; music.checked = this.save.music; sens.value = this.save.sens;
    sfx.addEventListener('change', () => { this.save.sfx = this.sound.sfxOn = sfx.checked; this.persist(); });
    music.addEventListener('change', () => { this.save.music = this.sound.musicOn = music.checked; this.persist(); });
    sens.addEventListener('input', () => { this.save.sens = this.input.sens = parseFloat(sens.value); this.persist(); });
    click('#btnReset', () => {
      const b = $('#btnReset');
      if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = '真的要清空吗？再点一次'; return; }
      b.dataset.armed = ''; b.textContent = '清空存档';
      const keep = { sfx: this.save.sfx, music: this.save.music, sens: this.save.sens };
      this.save = Object.assign(loadSaveDefaults(), keep); this.persist();
      this.menuSkin = 0; this.setSkinPreview(0, true);
      this.toast('存档已清空');
    });
    // 切到后台自动暂停；回来时恢复音频
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pause();
      else if (this.sound.ctx && this.sound.ctx.state === 'suspended') this.sound.ctx.resume();
    });
    // 触屏期间禁止 iOS 手势缩放
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('dblclick', (e) => e.preventDefault());
    // 死亡画面：轻触任意处重来
    $('#death').addEventListener('pointerdown', (e) => {
      if (this.state === 'dead' && this.t > this.canSkipAt && e.target.id !== 'btnRetry') this.respawn();
    });
    if (this.input.isTouch) document.body.classList.add('touch');
  }

  requestLock() {
    if (this.input.isTouch) return;
    try { const p = this.canvas.requestPointerLock(); p && p.catch && p.catch(() => {}); } catch (_) { /* 不支持就用拖拽 */ }
  }

  showScreen(id) {
    document.querySelectorAll('.screen').forEach((s) => { s.hidden = s.id !== id; });
  }

  setHud(on) {
    $('#hud').hidden = !on;
    $('#crosshair').hidden = !on;
    const touch = on && this.input.isTouch;
    $('#touch').hidden = !touch;
    $('#jump').hidden = !touch;
    this.input.enabled = on;
    $('#lockHint').hidden = !on || this.input.isTouch || this.input.locked;
  }

  updateHud(bump) {
    const def = LEVELS[this.levelIdx];
    $('#hudLevelNum').textContent = this.levelIdx + 1;
    $('#hudLevelName').textContent = def.name;
    $('#hudDeaths').textContent = this.save.deaths;
    if (bump) { const el = $('#hudDeathPill'); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  }
  updateHudTime() {
    if (this.state !== 'play' && this.state !== 'dead') return;
    const s = fmtTime(this.levelTime);
    if (s !== this._lastT) { this._lastT = s; $('#hudTime').textContent = s; }
  }

  toast(text, dur = 2) {
    const el = $('#toast');
    el.textContent = text;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => el.classList.remove('show'), dur * 1000);
  }
  flash(color) {
    const f = $('#flash');
    f.style.background = color;
    f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
  }
  showLevelCard(i) {
    const c = $('#levelCard');
    c.innerHTML = `<small>第 ${i + 1} 关</small><b>${LEVELS[i].name}</b><span>${LEVELS[i].tip}</span>`;
    c.classList.remove('show'); void c.offsetWidth; c.classList.add('show');
  }

  showDeath(msg, fake) {
    $('#deathTitle').textContent = DEATH_TITLES[Math.floor(Math.random() * DEATH_TITLES.length)];
    $('#deathMsg').textContent = msg;
    $('#deathCount').textContent = this.save.deaths;
    $('#deathLevelCount').textContent = this.levelDeaths;
    $('#deathHint2').hidden = true;
    $('#death').classList.remove('passthrough');
    this.showScreen('death');
  }

  showClear(fake) {
    const i = this.levelIdx;
    $('#clearTitle').textContent = `第 ${i + 1} 关 通过！`;
    $('#clearTime').textContent = fmtTime(this.levelTime);
    $('#clearDeaths').textContent = this.levelDeaths;
    const stars = this.levelDeaths === 0 ? 3 : this.levelDeaths < 5 ? 2 : 1;
    $('#clearStars').innerHTML = [0, 1, 2].map((k) => `<i class="${k < stars ? 'on' : ''}"></i>`).join('');
    $('#clearComment').textContent = this.levelDeaths === 0 ? '一次过？你是不是偷看了攻略！' : this.levelDeaths < 5 ? '还挺能干的嘛～' : '坚持就是胜利 (ง •̀_•́)ง';
    $('#clear').classList.remove('passthrough', 'crack');
    setTimeout(() => this.showScreen('clear'), fake ? 500 : 700);
  }

  showEnding() {
    this.state = 'ending';
    this.showScreen('ending');
    this.setHud(false);
    $('#endDeaths').textContent = this.save.deaths;
    $('#endTime').textContent = fmtTime(this.runTime);
    const d = this.save.deaths;
    $('#endRank').textContent = d <= 10 ? '人间清醒' : d <= 30 ? '半信半疑的冒险家' : d <= 60 ? '单纯的好孩子' : '相信一切的小天使';
    const sets = Object.entries(this.save.sets).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const max = Math.max(1, ...sets.map((s) => s[1]));
    $('#endSets').innerHTML = sets.length
      ? sets.map(([k, v]) => `<li><span>「${k}」</span><i style="--w:${Math.round((v / max) * 100)}%"></i><b>${v}</b></li>`).join('')
      : '<li class="empty">你一次都没被骗到？！不可能！</li>';
    $('#endFake').hidden = !this.fakeCounted;
    this.sound.playMusic(5);
  }

  refreshMenu() {
    $('#menuDeaths').textContent = this.save.deaths;
    $('#btnPlay').textContent = this.save.unlocked > 0 ? `继续 · 第 ${this.save.unlocked + 1} 关` : '开始游戏';
    this.setSkinPreview(SKINS.findIndex((s) => s.id === this.save.skin), true);
    this.menuOffset();
  }

  setSkinPreview(i, setIdx) {
    if (i < 0) i = 0;
    if (setIdx) this.menuSkin = i;
    const s = SKINS[i];
    if (!this.char || this.char.userData.skin !== s) {
      this.setSkin(s);
      if (this.camMode === 'menu') { this.char.visible = true; }
    }
  }

  renderSkin() {
    const s = SKINS[this.menuSkin];
    this.setSkinPreview(this.menuSkin);
    const ok = this.isUnlocked(s);
    $('#skinName').textContent = s.name;
    $('#skinDesc').textContent = ok ? s.desc : s.unlock.text;
    $('#skinLock').hidden = ok;
    const pick = $('#skinPick');
    const current = this.save.skin === s.id;
    pick.disabled = !ok || current;
    pick.textContent = !ok ? '未解锁' : current ? '使用中 ♡' : '就它了！';
    $('#skinDots').innerHTML = SKINS.map((_, k) => `<i class="${k === this.menuSkin ? 'on' : ''}"></i>`).join('');
    this.char.visible = true;
    this.fx.emit(new THREE.Vector3(0, 1, 0), { count: 12, speed: 2, up: 2, size: 0.3 });
  }

  renderLevels() {
    const box = $('#levelList');
    box.innerHTML = '';
    LEVELS.forEach((L, i) => {
      const open = i <= this.save.unlocked;
      const b = document.createElement('button');
      b.className = 'lv t' + i + (open ? '' : ' locked');
      b.disabled = !open;
      const best = this.save.best[i];
      b.innerHTML = `<em>${i + 1}</em><b>${L.name}</b><small>${open ? (best ? '最快 ' + fmtTime(best) : '未通关') : '未解锁'}</small>`;
      b.addEventListener('click', () => { this.sound.unlock(); this.sound.click(); this.startLevel(i); this.requestLock(); });
      box.appendChild(b);
    });
  }

  async boot() {
    // 等字体加载好再画路牌（最多等 2.5 秒）
    try {
      await Promise.race([
        Promise.all([document.fonts.load('600 40px "ZCOOL KuaiLe"', '欢迎光临终点'), document.fonts.load('600 40px "Fredoka"', 'GOAL')]),
        new Promise((r) => setTimeout(r, 2500)),
      ]);
    } catch (_) { /* 字体失败就用系统字体 */ }
    this.loadWorld((L) => buildShowcase(L), THEMES[5]);
    this.camMode = 'menu';
    this.char.visible = true;
    this.menuOffset();
    $('#loadingText').hidden = true;
    $('#btnTap').hidden = false;
  }
}

function loadSaveDefaults() {
  return { unlocked: 0, skin: 'cat', deaths: 0, cleared: false, sets: {}, sfx: true, music: true, sens: 1, best: {} };
}

let game;
try {
  game = new Game();
  window.__game = game;
  game.boot();
} catch (err) {
  console.error(err);
  const el = document.querySelector('#loadingText');
  if (el) el.textContent = '启动失败：你的浏览器可能不支持 WebGL (｡•́︿•̀｡)';
}
