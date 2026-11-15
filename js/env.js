import * as THREE from '../vendor/three.module.min.js';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';

// 五个关卡主题 + 菜单主题
export const THEMES = [
  { key: 'berry', name: '草莓牛奶', skyTop: '#ff9fc8', skyMid: '#ffd9e8', skyBot: '#fff1e6', fog: '#ffe3ee', tileA: '#fff8f1', tileB: '#ffc6dc', accent: '#ff5f9e', sea: '#ffc9df', sun: '#fff1c8', grass: '#ffb3d0', hemiG: '#ffd0c0' },
  { key: 'mint', name: '薄荷苏打', skyTop: '#6fd0e6', skyMid: '#c4f2ee', skyBot: '#f0fff8', fog: '#d4f5ef', tileA: '#f6fffc', tileB: '#a6ead7', accent: '#20b38d', sea: '#b5ece2', sun: '#fffbe0', grass: '#8fe0c4', hemiG: '#c8f0d8' },
  { key: 'lemon', name: '柠檬工厂', skyTop: '#ffc46b', skyMid: '#ffeaa8', skyBot: '#fffbe8', fog: '#fff0c6', tileA: '#fffdf3', tileB: '#ffe38a', accent: '#f08a1c', sea: '#ffe6a3', sun: '#fff6d0', grass: '#ffd36e', hemiG: '#ffe0b0' },
  { key: 'grape', name: '葡萄星夜', skyTop: '#1f1a52', skyMid: '#5b45a0', skyBot: '#c79be0', fog: '#6e55aa', tileA: '#efe7ff', tileB: '#b7a1f2', accent: '#ffd36e', sea: '#4a3a8c', sun: '#dfe4ff', grass: '#9c86e6', hemiG: '#6a4fa0', night: true },
  { key: 'rainbow', name: '彩虹尽头', skyTop: '#ff8fbd', skyMid: '#ffc39a', skyBot: '#fff0b8', fog: '#ffd6bf', tileA: '#fff9f3', tileB: '#ffd0e4', accent: '#ff5f8a', sea: '#ffcad6', sun: '#fff2c0', grass: '#ffb0c8', hemiG: '#ffd8b0', rainbow: true },
  { key: 'menu', name: '云朵广场', skyTop: '#a8b8ff', skyMid: '#ffd6ec', skyBot: '#fff4e8', fog: '#ffe2f0', tileA: '#fff8f1', tileB: '#ffd0e6', accent: '#ff6fa8', sea: '#f6d2f0', sun: '#fff1d0', grass: '#ffc0da', hemiG: '#ffd6d0', rainbow: true },
];

const C = (c) => new THREE.Color(c);

export function softDotTexture(kind = 'dot') {
  const s = 64, cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const x = cv.getContext('2d');
  if (kind === 'bubble') {
    const g = x.createRadialGradient(s / 2, s / 2, s * 0.28, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.05)');
    g.addColorStop(0.75, 'rgba(255,255,255,0.35)');
    g.addColorStop(0.92, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, s, s);
    x.fillStyle = 'rgba(255,255,255,0.95)';
    x.beginPath(); x.ellipse(s * 0.36, s * 0.34, s * 0.09, s * 0.05, -0.7, 0, Math.PI * 2); x.fill();
  } else if (kind === 'star') {
    x.translate(s / 2, s / 2);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.6)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 ? s * 0.13 : s * 0.48;
      const a = (i / 8) * Math.PI * 2;
      x.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    x.fill();
  } else {
    const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.8)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, s, s);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Env {
  constructor(renderer, scene, quality) {
    this.scene = scene;
    this.quality = quality;
    this.time = 0;

    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.45;

    // —— 天空 ——
    this.skyU = {
      top: { value: C('#fff') }, mid: { value: C('#fff') }, bot: { value: C('#fff') },
      sunCol: { value: C('#fff') }, sunDir: { value: new THREE.Vector3(0.4, 0.5, -0.75).normalize() },
      night: { value: 0 }, time: { value: 0 },
    };
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(400, 32, 20),
      new THREE.ShaderMaterial({
        uniforms: this.skyU, side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
        vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position = p.xyww; }`,
        fragmentShader: `
          uniform vec3 top, mid, bot, sunCol, sunDir; uniform float night, time; varying vec3 vDir;
          float hash(vec3 p){ p = fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
          void main(){
            vec3 d = normalize(vDir); float h = d.y;
            vec3 col = h > 0. ? mix(mid, top, pow(smoothstep(0., .7, h), .75)) : mix(mid, bot, smoothstep(0., -.3, h));
            float s = max(dot(d, normalize(sunDir)), 0.);
            float disc = night > .5 ? smoothstep(.9985,.9992,s) : pow(s, 900.)*1.6;
            col += sunCol * (disc + pow(s, 16.)*.22 + pow(s, 3.)*.07);
            if (night > .5) {
              vec3 q = d*160.; vec3 id = floor(q); float r = hash(id);
              if (r > .975) { vec3 f = fract(q)-.5; float st = smoothstep(.22, 0., length(f)) * (.55+.45*sin(time*2.3 + r*90.)); col += st*vec3(1.,.95,.86)*smoothstep(-.05,.25,h); }
            }
            gl_FragColor = vec4(col, 1.);
            #include <colorspace_fragment>
          }`,
      })
    );
    this.sky.renderOrder = -10;
    this.sky.frustumCulled = false;
    scene.add(this.sky);

    // —— 云海 ——
    this.seaU = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      time: { value: 0 }, seaCol: { value: C('#fff') }, hiCol: { value: C('#fff') },
    }]);
    const seaMat = new THREE.ShaderMaterial({
      uniforms: this.seaU, fog: true, transparent: false,
      vertexShader: `
        #include <fog_pars_vertex>
        varying vec2 vW;
        void main(){ vec4 wp = modelMatrix*vec4(position,1.); vW = wp.xz; vec4 mvPosition = viewMatrix*wp; gl_Position = projectionMatrix*mvPosition;
        #include <fog_vertex>
        }`,
      fragmentShader: `
        #include <fog_pars_fragment>
        uniform float time; uniform vec3 seaCol, hiCol; varying vec2 vW;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
        float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
        float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<5;i++){ s+=a*n(p); p*=2.03; a*=.5; } return s; }
        void main(){
          vec2 p = vW*.035 + vec2(time*.02, time*.012);
          float c = fbm(p + fbm(p*1.7 - time*.03));
          float puff = smoothstep(.35, .78, c);
          vec3 col = mix(seaCol, hiCol, puff);
          col += pow(puff, 3.)*.12;
          gl_FragColor = vec4(col, 1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
    });
    this.sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 900, 1, 1), seaMat);
    this.sea.rotation.x = -Math.PI / 2;
    this.sea.position.y = -34;
    scene.add(this.sea);

    // —— 灯光 ——
    this.hemi = new THREE.HemisphereLight('#ffffff', '#ffffff', 1.35);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#ffffff', 2.3);
    this.sun.castShadow = true;
    const ms = quality.shadow;
    this.sun.shadow.mapSize.set(ms, ms);
    const sc = this.sun.shadow.camera;
    sc.left = -24; sc.right = 24; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 90;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.sun.shadow.radius = 3;
    scene.add(this.sun, this.sun.target);
    this.sunOff = new THREE.Vector3(14, 26, 12);

    // —— 远景云朵 ——
    this.cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: '#ffffff', emissiveIntensity: 0.25 });
    this.clouds = new THREE.Group();
    const sg = new THREE.SphereGeometry(1, 18, 12);
    const rnd = mulberry(7);
    for (let i = 0; i < 26; i++) {
      const cl = new THREE.Group();
      const n = 4 + Math.floor(rnd() * 4);
      for (let k = 0; k < n; k++) {
        const m = new THREE.Mesh(sg, this.cloudMat);
        const r = 1.6 + rnd() * 2.2;
        m.scale.set(r * 1.25, r * 0.8, r);
        m.position.set((k - n / 2) * 2.1 + rnd(), rnd() * 0.9, rnd() * 1.6);
        cl.add(m);
      }
      // 只放在玩家活动高度之外（上方或下方），漂移时不会穿过镜头
      const low = i % 3 !== 0;
      cl.position.set((rnd() - 0.5) * 340, low ? -30 + rnd() * 9 : 17 + rnd() * 14, 40 - rnd() * 220);
      cl.scale.setScalar(0.8 + rnd() * 1.4);
      cl.userData.v = 0.4 + rnd() * 0.8;
      this.clouds.add(cl);
    }
    scene.add(this.clouds);

    // —— 浮空小岛装饰（随主题重建）——
    this.islands = new THREE.Group();
    scene.add(this.islands);

    // —— 彩虹 ——
    this.rainbow = new THREE.Group();
    const rc = ['#ff8fa3', '#ffbf7a', '#ffe680', '#9ee6a0', '#8fd3ff', '#c3a6ff'];
    rc.forEach((c, i) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(110 - i * 4.2, 2.1, 10, 80, Math.PI),
        new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.55, fog: false, depthWrite: false }));
      this.rainbow.add(m);
    });
    this.rainbow.position.set(30, -30, -230);
    scene.add(this.rainbow);

    // —— 漂浮泡泡 / 萤火虫 ——
    const N = quality.mobile ? 90 : 160;
    const bg = new THREE.BufferGeometry();
    const bp = new Float32Array(N * 3), bs = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      bp[i * 3] = (Math.random() - 0.5) * 50; bp[i * 3 + 1] = Math.random() * 18 - 4; bp[i * 3 + 2] = (Math.random() - 0.5) * 50;
      bs[i] = 0.4 + Math.random() * 0.9;
    }
    bg.setAttribute('position', new THREE.BufferAttribute(bp, 3));
    bg.setAttribute('aSize', new THREE.BufferAttribute(bs, 1));
    this.bubbleU = { map: { value: softDotTexture('bubble') }, color: { value: C('#ffffff') }, time: { value: 0 }, scale: { value: innerHeight * 0.5 } };
    this.bubbles = new THREE.Points(bg, new THREE.ShaderMaterial({
      uniforms: this.bubbleU, transparent: true, depthWrite: false,
      vertexShader: `attribute float aSize; uniform float scale, time; varying float vA;
        void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = aSize*scale*0.9/-mv.z; vA = .6+.4*sin(time*1.7+position.x); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform sampler2D map; uniform vec3 color; varying float vA;
        void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(color, t.a*vA*.85);
        #include <colorspace_fragment>
        }`,
    }));
    this.bubbles.frustumCulled = false;
    scene.add(this.bubbles);
    this.bubbleBase = new THREE.Vector3();
  }

  setTheme(th) {
    this.theme = th;
    const u = this.skyU;
    u.top.value.set(th.skyTop); u.mid.value.set(th.skyMid); u.bot.value.set(th.skyBot);
    u.sunCol.value.set(th.night ? '#e8ecff' : th.sun);
    u.night.value = th.night ? 1 : 0;
    u.sunDir.value.set(th.night ? -0.5 : 0.45, th.night ? 0.42 : 0.35, -0.8).normalize();
    this.scene.fog = new THREE.Fog(th.fog, 30, 150);
    this.seaU.seaCol.value.set(th.sea);
    this.seaU.hiCol.value.set(th.night ? '#8f7cd0' : '#ffffff');
    this.hemi.color.set(th.night ? '#b9b0ff' : th.skyMid);
    this.hemi.groundColor.set(th.hemiG);
    this.hemi.intensity = th.night ? 1.25 : 1.35;
    this.sun.color.set(th.night ? '#c8ccff' : th.sun);
    this.sun.intensity = th.night ? 1.5 : 2.3;
    this.sunOff.set(th.night ? -16 : 14, 26, 12);
    this.scene.environmentIntensity = th.night ? 0.3 : 0.45;
    this.cloudMat.color.set(th.night ? '#9c8ad8' : '#ffffff');
    this.cloudMat.emissive.set(th.night ? '#3a2d78' : th.skyMid);
    this.cloudMat.emissiveIntensity = th.night ? 0.4 : 0.35;
    this.bubbleU.color.value.set(th.night ? '#ffe9a0' : '#ffffff');
    this.rainbow.visible = !!th.rainbow;
    this._buildIslands(th);
  }

  _buildIslands(th) {
    this.islands.traverse((o) => { if (o.isMesh && o.userData.own) { o.geometry.dispose(); } });
    this.islands.clear();
    const rnd = mulberry(th.key.length * 31 + 5);
    const grass = new THREE.MeshStandardMaterial({ color: th.grass, roughness: 0.8 });
    const dirt = new THREE.MeshStandardMaterial({ color: th.night ? '#5c4a8f' : '#f3c9a8', roughness: 0.9 });
    const top = new THREE.CylinderGeometry(1, 0.92, 0.5, 24);
    const bottom = new THREE.ConeGeometry(0.92, 1.8, 24);
    for (let i = 0; i < 14; i++) {
      const side = i % 2 ? 1 : -1;
      const g = new THREE.Group();
      const s = 2.5 + rnd() * 4;
      const t = new THREE.Mesh(top, grass); t.scale.set(s, 1.2, s);
      const b = new THREE.Mesh(bottom, dirt); b.scale.set(s, s * 0.7, s); b.position.y = -0.25 - s * 0.63; b.rotation.x = Math.PI;
      g.add(t, b);
      const nd = 1 + Math.floor(rnd() * 3);
      for (let k = 0; k < nd; k++) {
        const deco = rnd() < 0.5 ? lollipop(th, rnd) : puffTree(th, rnd);
        deco.position.set((rnd() - 0.5) * s * 1.1, 0.25, (rnd() - 0.5) * s * 1.1);
        deco.scale.setScalar(0.8 + s * 0.25);
        g.add(deco);
      }
      g.position.set(side * (22 + rnd() * 34), -10 + rnd() * 16, 10 - rnd() * 130);
      g.userData.bob = rnd() * 6;
      this.islands.add(g);
    }
  }

  update(dt, focus, camera) {
    this.time += dt;
    const t = this.time;
    this.skyU.time.value = t;
    this.seaU.time.value = t;
    this.bubbleU.time.value = t;
    this.bubbleU.scale.value = innerHeight * 0.5;
    this.sky.position.copy(camera.position);
    this.sea.position.x = focus.x; this.sea.position.z = focus.z;
    this.sun.position.copy(focus).add(this.sunOff);
    this.sun.target.position.copy(focus);
    for (const cl of this.clouds.children) {
      cl.position.x += cl.userData.v * dt;
      if (cl.position.x > 170) cl.position.x = -170;
    }
    for (const g of this.islands.children) g.position.y += Math.sin(t * 0.5 + g.userData.bob) * 0.004;
    // 泡泡上浮并围绕玩家循环
    const pos = this.bubbles.geometry.attributes.position;
    const a = pos.array;
    for (let i = 0; i < a.length; i += 3) {
      a[i + 1] += dt * (0.35 + (i % 7) * 0.06);
      a[i] += Math.sin(t + i) * dt * 0.15;
      let dx = a[i] - focus.x, dz = a[i + 2] - focus.z;
      if (dx > 25) a[i] -= 50; if (dx < -25) a[i] += 50;
      if (dz > 25) a[i + 2] -= 50; if (dz < -25) a[i + 2] += 50;
      if (a[i + 1] > focus.y + 14) a[i + 1] = focus.y - 6;
      if (a[i + 1] < focus.y - 8) a[i + 1] = focus.y + 10;
    }
    pos.needsUpdate = true;
  }
}

export function mulberry(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const decoGeo = {
  stick: new THREE.CylinderGeometry(0.06, 0.06, 1.6, 8),
  candy: new THREE.CylinderGeometry(0.55, 0.55, 0.16, 28),
  swirl: new THREE.TorusGeometry(0.3, 0.06, 8, 28),
  ball: new THREE.SphereGeometry(1, 18, 14),
  trunk: new THREE.CylinderGeometry(0.1, 0.14, 1.2, 8),
};
Object.values(decoGeo).forEach((g) => { g.userData.cached = true; });
const decoMats = new Map();
function dm(c, o = {}) {
  const k = c + JSON.stringify(o);
  if (!decoMats.has(k)) { const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, ...o }); m.userData.cached = true; decoMats.set(k, m); }
  return decoMats.get(k);
}
const CANDY = ['#ff7fa8', '#7fd3ff', '#ffd34f', '#9de39a', '#c3a2ff', '#ffa86b'];

export function lollipop(th, rnd = Math.random) {
  const g = new THREE.Group();
  const st = new THREE.Mesh(decoGeo.stick, dm('#ffffff'));
  st.position.y = 0.8;
  const c = CANDY[Math.floor(rnd() * CANDY.length)];
  const cd = new THREE.Mesh(decoGeo.candy, dm(c, { roughness: 0.25 }));
  cd.rotation.x = Math.PI / 2; cd.position.y = 1.85;
  const sw = new THREE.Mesh(decoGeo.swirl, dm('#ffffff', { roughness: 0.25 }));
  sw.position.set(0, 1.85, 0.085);
  const sw2 = sw.clone(); sw2.position.z = -0.085;
  g.add(st, cd, sw, sw2);
  g.rotation.y = rnd() * Math.PI;
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function puffTree(th, rnd = Math.random) {
  const g = new THREE.Group();
  const tr = new THREE.Mesh(decoGeo.trunk, dm(th.night ? '#7b6aa8' : '#e9b98f'));
  tr.position.y = 0.6;
  g.add(tr);
  const c = th.night ? '#c9a8ff' : CANDY[Math.floor(rnd() * 3)];
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(decoGeo.ball, dm(c, { roughness: 0.7 }));
    const s = 0.55 - i * 0.1;
    b.scale.setScalar(s);
    b.position.set((rnd() - 0.5) * 0.4, 1.35 + i * 0.42, (rnd() - 0.5) * 0.4);
    g.add(b);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// —— 粒子爆发（星星 / 彩纸）——
export class Burst {
  constructor(scene, max = 600) {
    this.max = max;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    this.u = { map: { value: softDotTexture('star') }, scale: { value: innerHeight * 0.5 } };
    this.points = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: this.u, transparent: true, depthWrite: false, vertexColors: true,
      vertexShader: `attribute float aSize, aAlpha; uniform float scale; varying vec3 vC; varying float vA;
        void main(){ vC = color; vA = aAlpha; vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = aSize*scale/-mv.z; gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform sampler2D map; varying vec3 vC; varying float vA;
        void main(){ vec4 t = texture2D(map, gl_PointCoord); if (t.a*vA < .02) discard; gl_FragColor = vec4(vC, t.a*vA);
        #include <colorspace_fragment>
        }`,
    }));
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
    this.p = [];
    for (let i = 0; i < max; i++) this.p.push({ life: 0, max: 1, vx: 0, vy: 0, vz: 0, g: 0, s: 0 });
    this.cursor = 0;
    this._c = new THREE.Color();
  }
  emit(at, { count = 30, colors = CANDY, speed = 4, up = 2, gravity = 6, size = 0.5, life = 1.0, spread = 0.3 } = {}) {
    for (let k = 0; k < count; k++) {
      const i = this.cursor; this.cursor = (this.cursor + 1) % this.max;
      const p = this.p[i];
      const a = Math.random() * Math.PI * 2, e = Math.random() * 2 - 1;
      const sp = speed * (0.4 + Math.random() * 0.6);
      p.vx = Math.cos(a) * Math.sqrt(1 - e * e) * sp;
      p.vz = Math.sin(a) * Math.sqrt(1 - e * e) * sp;
      p.vy = Math.abs(e) * sp * 0.6 + up;
      p.g = gravity; p.max = life * (0.6 + Math.random() * 0.6); p.life = p.max;
      p.s = size * (0.6 + Math.random() * 0.8);
      this.pos[i * 3] = at.x + (Math.random() - 0.5) * spread;
      this.pos[i * 3 + 1] = at.y + (Math.random() - 0.5) * spread;
      this.pos[i * 3 + 2] = at.z + (Math.random() - 0.5) * spread;
      this._c.set(colors[Math.floor(Math.random() * colors.length)]);
      this.col[i * 3] = this._c.r; this.col[i * 3 + 1] = this._c.g; this.col[i * 3 + 2] = this._c.b;
    }
  }
  update(dt) {
    this.u.scale.value = innerHeight * 0.5;
    for (let i = 0; i < this.max; i++) {
      const p = this.p[i];
      if (p.life <= 0) { this.alpha[i] = 0; continue; }
      p.life -= dt;
      p.vy -= p.g * dt;
      p.vx *= 1 - dt * 1.2; p.vz *= 1 - dt * 1.2;
      this.pos[i * 3] += p.vx * dt; this.pos[i * 3 + 1] += p.vy * dt; this.pos[i * 3 + 2] += p.vz * dt;
      const k = Math.max(0, p.life / p.max);
      this.alpha[i] = Math.min(1, k * 2.5);
      this.size[i] = p.s * (0.4 + 0.6 * k);
    }
    const a = this.points.geometry.attributes;
    a.position.needsUpdate = true; a.color.needsUpdate = true; a.aSize.needsUpdate = true; a.aAlpha.needsUpdate = true;
  }
}
