import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/components/home/ascii-renderer.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
const { createAsciiRenderer } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

function environment() {
  const saved = Object.fromEntries(['window', 'document', 'requestAnimationFrame', 'cancelAnimationFrame', 'ResizeObserver', 'IntersectionObserver'].map(key => [key, globalThis[key]]));
  const callbacks = new Map();
  const canvases = [];
  let nextId = 0;
  let time = 0;
  let samples = 0;
  let resizeObserver;
  let intersectionObserver;
  const media = Object.assign(new EventTarget(), { matches: false });
  class Context {
    colors = new Set();
    textCalls = 0;
    blits = 0;
    glyphBlits = 0;
    maxArea = 0;
    shifts = [];
    setTransform() {}
    clearRect() {}
    fillText() { this.textCalls++; this.colors.add(this.fillStyle); }
    strokeText() {}
    drawImage(...args) {
      this.blits++;
      if (args.length === 9) {
        const area = args[7] * args[8];
        this.maxArea = Math.max(this.maxArea, area);
        if (args[7] < 8 && args[8] < 12) {
          this.glyphBlits++;
          this.shifts.push({ x: args[5] - args[1], y: args[6] - args[2] });
        }
      }
    }
    getImageData(_x, _y, width, height) {
      samples++;
      const data = new Uint8ClampedArray(width * height * 4);
      for (let i = 0; i < data.length; i += 4) data.set([65, 130, 200, 255], i);
      return { data };
    }
  }
  class Canvas {
    width = 300;
    height = 150;
    context = new Context();
    getContext() { return this.context; }
  }
  const frame = Object.assign(new EventTarget(), {
    clientWidth: 1280,
    clientHeight: 640,
    dataset: {},
    getBoundingClientRect() { return { left: 0, top: 0 }; },
  });
  const canvas = new Canvas();
  const image = Object.assign(new EventTarget(), { complete: true, naturalWidth: 480, naturalHeight: 360, src: '/preview.webp', currentSrc: '/preview.webp' });
  globalThis.window = Object.assign(new EventTarget(), { devicePixelRatio: 1, matchMedia: () => media, location: { search: '' }, setTimeout, clearTimeout });
  globalThis.document = Object.assign(new EventTarget(), { hidden: false, createElement() { const result = new Canvas(); canvases.push(result); return result; } });
  globalThis.requestAnimationFrame = callback => { callbacks.set(++nextId, callback); return nextId; };
  globalThis.cancelAnimationFrame = id => callbacks.delete(id);
  globalThis.ResizeObserver = class {
    disconnected = false;
    constructor(callback) { this.callback = callback; resizeObserver = this; }
    observe() {}
    disconnect() { this.disconnected = true; }
  };
  globalThis.IntersectionObserver = class {
    disconnected = false;
    constructor(callback) { this.callback = callback; intersectionObserver = this; }
    observe() { this.callback([{ isIntersecting: true }]); }
    disconnect() { this.disconnected = true; }
  };
  const renderer = createAsciiRenderer(frame, canvas, image);
  const history = [];
  function flush(limit = 1) {
    let frames = 0;
    while (callbacks.size && frames < limit) {
      const pending = [...callbacks.values()];
      callbacks.clear();
      canvas.context.glyphBlits = 0;
      canvas.context.shifts.length = 0;
      time += 1000 / 60;
      pending.forEach(callback => callback(time));
      history.push({
        glyphs: canvas.context.glyphBlits,
        maxShift: Math.max(0, ...canvas.context.shifts.map(shift => Math.hypot(shift.x, shift.y))),
      });
      frames++;
    }
    return frames;
  }
  return {
    renderer, frame, canvas, media, canvases, history,
    get samples() { return samples; },
    get pendingFrames() { return callbacks.size; },
    flush,
    move(x = 640, y = 320) { frame.dispatchEvent(Object.assign(new Event('pointermove'), { clientX: x, clientY: y, pointerType: 'mouse' })); },
    leave() { frame.dispatchEvent(new Event('pointerleave')); },
    visible(value) { intersectionObserver.callback([{ isIntersecting: value }]); },
    resize(width, height) { frame.clientWidth = width; frame.clientHeight = height; resizeObserver.callback([]); },
    dispose() {
      renderer.destroy();
      assert.equal(callbacks.size, 0, 'unmount cancels queued animation');
      assert.ok(resizeObserver.disconnected && intersectionObserver.disconnected);
      Object.assign(globalThis, saved);
    },
  };
}

test('artwork is cached across photo toggles and theme switches, keeping original light colors', () => {
  const env = environment();
  try {
    env.renderer.update({ active: true, theme: 'light' });
    env.flush();
    assert.equal(env.samples, 1);
    assert.ok(env.canvases.some(canvas => canvas.context.colors.has('rgb(65,130,200)')));
    env.renderer.update({ active: false, theme: 'light' });
    env.renderer.update({ active: true, theme: 'light' });
    env.flush();
    assert.equal(env.samples, 1, 'toggling reuses sampled pixels and rendered glyphs');
    env.renderer.update({ active: true, theme: 'dark' });
    env.flush();
    assert.equal(env.samples, 2);
    env.renderer.update({ active: true, theme: 'light' });
    env.flush();
    assert.equal(env.samples, 2, 'returning to a theme reuses its artwork');
    assert.equal(env.pendingFrames, 0, 'resting artwork needs no animation');
  } finally { env.dispose(); }
});

test('cursor movement uses cached glyph pixels, repaints locally, and sleeps when settled', () => {
  const env = environment();
  try {
    env.renderer.update({ active: true, theme: 'light' });
    env.flush();
    env.move(600, 320);
    env.flush();
    env.move(640, 320);
    const frames = env.flush(600);
    assert.ok(frames > 10 && frames < 600, `stationary cursor should settle; ran ${frames} frames`);
    assert.equal(env.pendingFrames, 0);
    assert.equal(env.canvas.context.textCalls, 0, 'animated frames never shape text');
    assert.ok(env.canvas.context.maxArea < 1280 * 640 * 0.05, 'the brush repaint stays compact');
    assert.ok(Math.max(...env.history.map(frame => frame.glyphs)) < 4000, 'unaffected characters stay out of the animation');
    assert.equal(env.history.at(-1).glyphs, 0, 'a stationary cursor leaves no persistent hole');
    env.leave();
    env.flush(600);
    assert.equal(env.pendingFrames, 0, 'characters finish returning after the cursor leaves');
    assert.equal(env.history.at(-1).glyphs, 0, 'the final frame restores the resting artwork');
  } finally { env.dispose(); }
});

test('characters follow cursor direction and stay within a small displacement', () => {
  const env = environment();
  try {
    env.renderer.update({ active: true, theme: 'light' });
    env.flush();
    env.move(600, 320);
    env.flush();
    assert.equal(env.canvas.context.glyphBlits, 0, 'entering without movement does not repel characters');
    env.move(640, 320);
    env.flush();
    assert.ok(env.canvas.context.shifts.length > 0);
    assert.ok(env.canvas.context.shifts.every(shift => shift.x > 0 && Math.abs(shift.y) < 0.001), 'a rightward stroke moves characters right, not radially');

    env.leave();
    env.flush(600);
    env.move(680, 320);
    env.flush();
    env.move(640, 320);
    env.flush();
    assert.ok(env.canvas.context.shifts.length > 0);
    assert.ok(env.canvas.context.shifts.every(shift => shift.x < 0 && Math.abs(shift.y) < 0.001), 'a leftward stroke moves characters left');
    for (let index = 0; index < 40; index++) {
      env.move(index % 2 ? 560 : 720, 320);
      env.flush();
    }
    assert.ok(Math.max(...env.history.map(frame => frame.maxShift)) <= 12.001, 'fast sweeps cannot stretch a large hole');
  } finally { env.dispose(); }
});

test('hidden, disabled, and reduced-motion artwork does no animation work', () => {
  const env = environment();
  try {
    env.renderer.update({ active: true, theme: 'dark' });
    env.flush();
    env.move(600, 320);
    env.flush();
    env.move(640, 320);
    env.flush(3);
    env.visible(false);
    assert.equal(env.pendingFrames, 0);
    env.move();
    assert.equal(env.pendingFrames, 0);
    env.visible(true);
    env.flush();
    env.media.matches = true;
    env.media.dispatchEvent(new Event('change'));
    env.move();
    assert.equal(env.pendingFrames, 0);
    env.media.matches = false;
    env.renderer.update({ active: false, theme: 'dark' });
    env.move();
    assert.equal(env.pendingFrames, 0);
  } finally { env.dispose(); }
});

test('resize bursts rebuild only once at the final size and invalidate the old cache', async () => {
  const env = environment();
  try {
    env.renderer.update({ active: true, theme: 'light' });
    env.flush();
    env.resize(800, 400);
    env.resize(600, 300);
    env.resize(400, 200);
    assert.equal(env.pendingFrames, 0);
    await new Promise(resolve => setTimeout(resolve, 150));
    env.flush();
    assert.equal(env.samples, 2);
    assert.equal(env.canvas.width, 400);
    assert.equal(env.canvas.height, 200);
  } finally { env.dispose(); }
});
