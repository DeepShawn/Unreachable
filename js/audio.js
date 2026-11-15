// 全部音效与音乐都用 WebAudio 实时合成，无需任何音频文件。
// iOS 要求在用户手势里创建 / 恢复 AudioContext，所以 unlock() 必须在点击时调用。

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

export class Sound {
  constructor() {
    this.ctx = null;
    this.sfxOn = true;
    this.musicOn = true;
    this._musicTimer = null;
    this._song = null;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      // 轻微压缩，避免叠加爆音
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      this.master.connect(comp).connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.55;
      this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.22;
      this.musicBus.connect(this.master);
      this._noiseBuf = this._makeNoise();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  _makeNoise() {
    const len = this.ctx.sampleRate * 1;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  get now() { return this.ctx ? this.ctx.currentTime : 0; }

  tone({ type = 'sine', f = 440, f2 = null, t = 0, dur = 0.15, vol = 0.3, attack = 0.004, bus = null, vib = 0, filter = 0 }) {
    if (!this.ctx) return;
    if (!bus && !this.sfxOn) return;
    const c = this.ctx, t0 = c.currentTime + t;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
    if (vib) {
      const lfo = c.createOscillator(), lg = c.createGain();
      lfo.frequency.value = 7; lg.gain.value = vib;
      lfo.connect(lg).connect(o.frequency);
      lfo.start(t0); lfo.stop(t0 + dur + 0.05);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = o.connect(g);
    if (filter) {
      const bq = c.createBiquadFilter();
      bq.type = 'lowpass'; bq.frequency.value = filter;
      node = g.connect(bq);
      bq.connect(bus || this.sfxBus);
    } else {
      g.connect(bus || this.sfxBus);
    }
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  noise({ t = 0, dur = 0.2, vol = 0.2, freq = 1200, q = 0.8, type = 'bandpass', bus = null, sweep = 0 }) {
    if (!this.ctx) return;
    if (!bus && !this.sfxOn) return;
    const c = this.ctx, t0 = c.currentTime + t;
    const s = c.createBufferSource();
    s.buffer = this._noiseBuf;
    const f = c.createBiquadFilter();
    f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f).connect(g).connect(bus || this.sfxBus);
    s.start(t0, Math.random() * 0.5);
    s.stop(t0 + dur + 0.05);
  }

  // —— 音效 ——
  jump() { this.tone({ type: 'sine', f: 320, f2: 760, dur: 0.16, vol: 0.28 }); this.tone({ type: 'triangle', f: 640, f2: 1300, dur: 0.1, vol: 0.06 }); }
  land() { this.tone({ type: 'sine', f: 150, f2: 70, dur: 0.09, vol: 0.22 }); this.noise({ dur: 0.05, vol: 0.05, freq: 600 }); }
  step(i) { this.tone({ type: 'sine', f: i % 2 ? 210 : 190, f2: 120, dur: 0.05, vol: 0.06 }); }
  click() { this.tone({ type: 'triangle', f: 880, f2: 1320, dur: 0.07, vol: 0.18 }); }
  hover() { this.tone({ type: 'sine', f: 1200, dur: 0.04, vol: 0.05 }); }
  coin() {
    this.tone({ type: 'square', f: NOTE(83), dur: 0.08, vol: 0.09, filter: 4000 });
    this.tone({ type: 'square', f: NOTE(88), t: 0.07, dur: 0.3, vol: 0.09, filter: 4000 });
    this.tone({ type: 'sine', f: NOTE(100), t: 0.07, dur: 0.3, vol: 0.05 });
  }
  boing() { this.tone({ type: 'sine', f: 180, f2: 900, dur: 0.35, vol: 0.3, vib: 40 }); }
  squish() { this.tone({ type: 'sine', f: 260, f2: 120, dur: 0.12, vol: 0.12, vib: 30 }); }
  pop() { this.tone({ type: 'sine', f: 700, f2: 180, dur: 0.12, vol: 0.3 }); this.noise({ dur: 0.08, vol: 0.12, freq: 2500 }); }
  spike() {
    this.tone({ type: 'square', f: 1400, f2: 900, dur: 0.06, vol: 0.08, filter: 5000 });
    this.noise({ dur: 0.12, vol: 0.18, freq: 5000, q: 2 });
  }
  rumble() { this.noise({ dur: 0.6, vol: 0.25, freq: 180, type: 'lowpass', sweep: 60 }); }
  crack() { this.noise({ dur: 0.25, vol: 0.3, freq: 3000, q: 1, sweep: 600 }); this.tone({ type: 'sawtooth', f: 220, f2: 60, dur: 0.25, vol: 0.08, filter: 1500 }); }
  whoosh() { this.noise({ dur: 0.45, vol: 0.18, freq: 400, q: 1.5, sweep: 2400 }); }
  bonk() {
    this.tone({ type: 'sine', f: 520, f2: 140, dur: 0.15, vol: 0.35 });
    this.tone({ type: 'sine', f: 1400, f2: 300, t: 0.12, dur: 0.6, vol: 0.12 }); // 下滑哨
  }
  squeak() { [0, 0.09, 0.18].forEach((t, i) => this.tone({ type: 'sine', f: 1300 + i * 200, f2: 1700 + i * 200, t, dur: 0.07, vol: 0.12 })); }
  ding() { this.tone({ type: 'sine', f: NOTE(84), dur: 0.6, vol: 0.18 }); this.tone({ type: 'sine', f: NOTE(91), t: 0.12, dur: 0.8, vol: 0.14 }); }
  troll() {
    // “嘿嘿～” 两声上扬再下落的小笑声
    [0, 0.16, 0.32].forEach((t, i) => {
      this.tone({ type: 'square', f: 760 - i * 40, f2: 980 - i * 60, t, dur: 0.07, vol: 0.06, filter: 2500 });
      this.tone({ type: 'square', f: 980 - i * 60, f2: 620 - i * 40, t: t + 0.07, dur: 0.08, vol: 0.06, filter: 2500 });
    });
  }
  death() {
    this.pop();
    // 悲伤长号 wah wah wah wahhh
    const seq = [[67, 0.18], [66, 0.18], [65, 0.18], [64, 0.7]];
    let t = 0.12;
    for (const [n, d] of seq) {
      this.tone({ type: 'sawtooth', f: NOTE(n - 12), t, dur: d + 0.08, vol: 0.1, filter: 1100, vib: n === 64 ? 6 : 0, attack: 0.03 });
      this.tone({ type: 'triangle', f: NOTE(n), t, dur: d + 0.08, vol: 0.05, attack: 0.03 });
      t += d;
    }
  }
  win() {
    const seq = [72, 76, 79, 84, 88];
    seq.forEach((n, i) => {
      this.tone({ type: 'triangle', f: NOTE(n), t: i * 0.09, dur: 0.4, vol: 0.16 });
      this.tone({ type: 'sine', f: NOTE(n + 12), t: i * 0.09, dur: 0.3, vol: 0.05 });
    });
    this.tone({ type: 'triangle', f: NOTE(84), t: 0.5, dur: 1.0, vol: 0.12 });
    this.tone({ type: 'triangle', f: NOTE(88), t: 0.5, dur: 1.0, vol: 0.1 });
    this.tone({ type: 'triangle', f: NOTE(91), t: 0.5, dur: 1.0, vol: 0.1 });
  }
  muyu(i) {
    // “一 二 三 木 头 人” 的童谣音
    const melody = [76, 76, 79, 76, 74, 72];
    this.tone({ type: 'triangle', f: NOTE(melody[i % 6]), dur: 0.3, vol: 0.16 });
    this.tone({ type: 'sine', f: NOTE(melody[i % 6] + 12), dur: 0.2, vol: 0.04 });
  }
  alarm() { this.tone({ type: 'square', f: 880, dur: 0.1, vol: 0.06, filter: 3000 }); this.tone({ type: 'square', f: 660, t: 0.12, dur: 0.12, vol: 0.06, filter: 3000 }); }

  // —— 背景音乐：小小的八音盒循环 ——
  playMusic(key = 0) {
    this.stopMusic();
    if (!this.ctx) return;
    const songs = [
      { root: 60, bpm: 104 }, { root: 62, bpm: 112 }, { root: 65, bpm: 118 },
      { root: 57, bpm: 96 }, { root: 64, bpm: 124 }, { root: 67, bpm: 128 },
    ];
    const s = songs[key % songs.length];
    const penta = [0, 2, 4, 7, 9, 12, 14, 16];
    // 一段 4 小节旋律（音阶序号，-1 = 休止）
    const mel = [
      0, 2, 4, -1, 5, 4, 2, -1, 3, 4, 2, 0, 1, -1, 2, -1,
      0, 2, 4, 5, 7, 5, 4, -1, 3, 2, 1, 2, 0, -1, -1, -1,
    ];
    const prog = [0, -3, -7, -5]; // I vi IV V
    const step = 60 / s.bpm / 2; // 八分音符
    let i = 0;
    let next = this.ctx.currentTime + 0.1;
    this._song = { s, mel, prog, penta, step };
    const tick = () => {
      if (!this.ctx) return;
      while (next < this.ctx.currentTime + 0.25) {
        if (this.musicOn) {
          const bar = Math.floor(i / 8) % 4;
          const deg = mel[i % mel.length];
          const t = next - this.ctx.currentTime;
          if (deg >= 0) {
            const n = s.root + 12 + penta[deg];
            this.tone({ type: 'triangle', f: NOTE(n), t, dur: step * 1.6, vol: 0.32, bus: this.musicBus });
            this.tone({ type: 'sine', f: NOTE(n + 12), t, dur: step * 1.0, vol: 0.07, bus: this.musicBus });
          }
          if (i % 4 === 0) {
            const b = s.root - 12 + prog[bar];
            this.tone({ type: 'sine', f: NOTE(b), t, dur: step * 3, vol: 0.4, bus: this.musicBus });
          } else if (i % 4 === 2) {
            const b = s.root - 12 + prog[bar] + 7;
            this.tone({ type: 'sine', f: NOTE(b), t, dur: step * 1.5, vol: 0.18, bus: this.musicBus });
          }
          if (i % 2 === 1) this.noise({ t, dur: 0.04, vol: 0.05, freq: 8000, q: 1, type: 'highpass', bus: this.musicBus });
        }
        next += step;
        i++;
      }
    };
    this._musicTimer = setInterval(tick, 40);
    tick();
  }
  stopMusic() {
    if (this._musicTimer) clearInterval(this._musicTimer);
    this._musicTimer = null;
  }
}
