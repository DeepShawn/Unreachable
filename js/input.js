// 键盘 + 鼠标（指针锁定或拖拽）+ 触屏（左侧动态摇杆，右侧拖动视角，跳跃按钮）

export class Input {
  constructor({ canvas, touchLayer, joyBase, joyKnob, jumpBtn }) {
    this.canvas = canvas;
    this.keys = new Set();
    this.look = { x: 0, y: 0 };
    this.joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
    this.lookTouch = null;
    this.jumpQueued = 0; // 时间戳
    this.jumpHeld = false;
    this.enabled = false;
    this.sens = 1;
    this.locked = false;
    this.dragging = false;
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.onKeyAction = null; // (code) => void，供暂停 / 重来等使用
    this.onLockChange = null;
    this.joyBase = joyBase; this.joyKnob = joyKnob;

    addEventListener('keydown', (e) => {
      if (e.repeat) { if (this._isGameKey(e.code)) e.preventDefault(); return; }
      this.keys.add(e.code);
      if (e.code === 'Space') { this.jumpQueued = performance.now(); this.jumpHeld = true; }
      if (this._isGameKey(e.code) && this.enabled) e.preventDefault();
      this.onKeyAction && this.onKeyAction(e.code, e);
    });
    addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      if (e.code === 'Space') this.jumpHeld = false;
    });
    addEventListener('blur', () => { this.keys.clear(); this.jumpHeld = false; });

    // —— 鼠标 ——
    const onDown = (e) => {
      if (!this.enabled || this.isTouchEvent || e.button !== 0) return;
      if (!this.locked && canvas.requestPointerLock) {
        try {
          const p = canvas.requestPointerLock();
          if (p && p.catch) p.catch(() => {});
        } catch (_) { /* 某些内嵌环境不允许，退回拖拽视角 */ }
      }
      this.dragging = true;
    };
    canvas.addEventListener('mousedown', onDown);
    touchLayer.addEventListener('mousedown', onDown);
    addEventListener('mouseup', () => { this.dragging = false; });
    addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      if (this.locked || this.dragging) {
        const k = this.locked ? 0.0022 : 0.004;
        this.look.x += e.movementX * k * this.sens;
        this.look.y += e.movementY * k * this.sens;
      }
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      this.onLockChange && this.onLockChange(this.locked);
    });

    // —— 触屏 ——
    const tl = touchLayer;
    tl.addEventListener('touchstart', (e) => {
      this.isTouchEvent = true;
      e.preventDefault();
      for (const t of e.changedTouches) {
        const leftSide = t.clientX < innerWidth * 0.42;
        if (leftSide && this.joy.id === null) {
          this.joy.id = t.identifier;
          this.joy.ox = t.clientX; this.joy.oy = t.clientY;
          this.joy.x = 0; this.joy.y = 0;
          this._showJoy(t.clientX, t.clientY);
        } else if (this.lookTouch === null) {
          this.lookTouch = { id: t.identifier, x: t.clientX, y: t.clientY };
        }
      }
    }, { passive: false });
    tl.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === this.joy.id) {
          const R = 56;
          let dx = t.clientX - this.joy.ox, dy = t.clientY - this.joy.oy;
          const d = Math.hypot(dx, dy);
          if (d > R) { dx = dx / d * R; dy = dy / d * R; }
          this.joy.x = dx / R; this.joy.y = dy / R;
          this.joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
        } else if (this.lookTouch && t.identifier === this.lookTouch.id) {
          const k = 0.0058 * this.sens;
          this.look.x += (t.clientX - this.lookTouch.x) * k;
          this.look.y += (t.clientY - this.lookTouch.y) * k;
          this.lookTouch.x = t.clientX; this.lookTouch.y = t.clientY;
        }
      }
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.joy.id) {
          this.joy.id = null; this.joy.x = 0; this.joy.y = 0;
          this._hideJoy();
        } else if (this.lookTouch && t.identifier === this.lookTouch.id) {
          this.lookTouch = null;
        }
      }
    };
    tl.addEventListener('touchend', end);
    tl.addEventListener('touchcancel', end);

    const jumpDown = (e) => {
      e.preventDefault(); e.stopPropagation();
      this.isTouchEvent = true;
      this.jumpQueued = performance.now(); this.jumpHeld = true;
      jumpBtn.classList.add('down');
    };
    const jumpUp = (e) => { e.preventDefault(); this.jumpHeld = false; jumpBtn.classList.remove('down'); };
    jumpBtn.addEventListener('touchstart', jumpDown, { passive: false });
    jumpBtn.addEventListener('touchend', jumpUp, { passive: false });
    jumpBtn.addEventListener('touchcancel', jumpUp, { passive: false });
    jumpBtn.addEventListener('mousedown', (e) => { if (!this.isTouchEvent) jumpDown(e); });
    jumpBtn.addEventListener('mouseup', jumpUp);
  }

  _isGameKey(c) {
    return ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(c);
  }
  _showJoy(x, y) {
    this.joyBase.style.left = x + 'px';
    this.joyBase.style.top = y + 'px';
    this.joyBase.classList.add('on');
    this.joyKnob.style.transform = 'translate(0,0)';
  }
  _hideJoy() { this.joyBase.classList.remove('on'); }

  reset() {
    this.look.x = this.look.y = 0;
    this.joy.x = this.joy.y = 0; this.joy.id = null;
    this.lookTouch = null;
    this.jumpQueued = 0; this.jumpHeld = false;
    this._hideJoy();
  }

  // 返回 {x: 右为正, z: 前为正, turn: 键盘转向}
  getMove() {
    const k = this.keys;
    let x = 0, z = 0, turn = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) z += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) z -= 1;
    if (k.has('KeyA')) x -= 1;
    if (k.has('KeyD')) x += 1;
    if (k.has('ArrowLeft') || k.has('KeyQ')) turn -= 1;
    if (k.has('ArrowRight') || k.has('KeyE')) turn += 1;
    if (this.joy.id !== null) {
      x += this.joy.x;
      z -= this.joy.y;
    }
    const l = Math.hypot(x, z);
    if (l > 1) { x /= l; z /= l; }
    return { x, z, turn };
  }

  consumeLook() {
    const l = { x: this.look.x, y: this.look.y };
    this.look.x = this.look.y = 0;
    return l;
  }

  exitLock() {
    if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
  }
}
