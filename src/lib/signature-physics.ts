import { Bodies, Body, Composite, Constraint, Engine, Sleeping, Vector } from "matter-js";
import { animate } from "motion/react";

export type PieceRect = { left: number; top: number; width: number; height: number };
export type PiecePointer = { id: number; x: number; y: number };
type PieceInput = {
  id: number;
  label: string;
  artwork: SVGSVGElement;
  rect: PieceRect;
  home: () => PieceRect;
  onHome: () => void;
  pointer?: PiecePointer;
};
type Piece = {
  input: PieceInput;
  element: HTMLButtonElement;
  body: Body;
  width: number;
  height: number;
  drag?: {
    pointerId: number;
    constraint: Constraint;
    last: { x: number; y: number; time: number };
    velocity: { x: number; y: number };
  };
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const lerp = (from: number, to: number, progress: number) => from + (to - from) * progress;
const frameDuration = 1000 / 60;

// This module (including Matter) is requested only after a signature piece is clicked.
export function createSignaturePhysics() {
  const engine = Engine.create({ enableSleeping: true });
  const layer = document.createElement("div");
  layer.className = "signature-physics-layer";
  layer.dataset.state = "idle";
  document.body.append(layer);

  const pieces = new Map<number, Piece>();
  const returnControls = new Set<ReturnType<typeof animate>>();
  const returnResolvers = new Set<() => void>();
  let walls: Body[] = [];
  let frame = 0;
  let previousTime = 0;
  let disposed = false;
  let returning = false;
  let returnPromise: Promise<void> | undefined;

  function setBounds() {
    Composite.remove(engine.world, walls);
    const width = document.documentElement.clientWidth;
    const height = window.innerHeight;
    const wall = { isStatic: true, restitution: 0.4, friction: 0.45 };
    walls = [
      Bodies.rectangle(width / 2, height + 50, width + 200, 100, wall),
      Bodies.rectangle(-50, height / 2, 100, height + 200, wall),
      Bodies.rectangle(width + 50, height / 2, 100, height + 200, wall),
      Bodies.rectangle(width / 2, -50, width + 200, 100, wall),
    ];
    Composite.add(engine.world, walls);
    for (const piece of pieces.values()) {
      Body.setPosition(piece.body, {
        x: clamp(piece.body.position.x, piece.width / 2 + 1, width - piece.width / 2 - 1),
        y: clamp(piece.body.position.y, piece.height / 2 + 1, height - piece.height / 2 - 1),
      });
      Sleeping.set(piece.body, false);
    }
    start();
  }

  function render(piece: Piece, x: number, y: number, width: number, height: number, angle: number) {
    // Resize the actual SVG viewport so returning pieces remain vector sharp.
    Object.assign(piece.element.style, {
      width: `${width}px`, height: `${height}px`,
      transform: `translate3d(${x - width / 2}px, ${y - height / 2}px, 0) rotate(${angle}rad)`,
    });
  }

  function tick(time: number) {
    frame = 0;
    if (disposed || returning || document.hidden || pieces.size === 0) return;
    Engine.update(engine, Math.min(previousTime ? time - previousTime : frameDuration, frameDuration));
    previousTime = time;
    let awake = false;
    for (const piece of pieces.values()) {
      render(piece, piece.body.position.x, piece.body.position.y, piece.width, piece.height, piece.body.angle);
      awake ||= !piece.body.isSleeping || !!piece.drag;
    }
    if (awake) frame = requestAnimationFrame(tick);
    else { previousTime = 0; layer.dataset.state = "sleeping"; }
  }

  function start() {
    if (!frame && !disposed && !returning && pieces.size && !document.hidden) {
      previousTime = 0;
      layer.dataset.state = "falling";
      frame = requestAnimationFrame(tick);
    }
  }

  function release(piece: Piece, toss: boolean) {
    const drag = piece.drag;
    if (!drag) return;
    piece.drag = undefined;
    Composite.remove(engine.world, drag.constraint);
    if (piece.element.hasPointerCapture(drag.pointerId)) piece.element.releasePointerCapture(drag.pointerId);
    delete piece.element.dataset.dragging;
    if (toss) {
      // A long hold should release gently rather than reuse an old fast move.
      const fresh = performance.now() - drag.last.time < 110;
      const velocity = fresh ? drag.velocity : { x: 0, y: 0 };
      Body.setVelocity(piece.body, { x: clamp(velocity.x, -28, 28), y: clamp(velocity.y, -28, 28) });
      Body.setAngularVelocity(piece.body, clamp(piece.body.angularVelocity + velocity.x * 0.004, -0.2, 0.2));
    }
    Sleeping.set(piece.body, false);
    start();
  }

  function grab(piece: Piece, pointer: PiecePointer) {
    if (returning || piece.drag) return;
    const offset = Vector.sub({ x: pointer.x, y: pointer.y }, piece.body.position);
    const constraint = Constraint.create({
      pointA: { x: pointer.x, y: pointer.y }, bodyB: piece.body, pointB: offset,
      stiffness: 0.3, damping: 0.16, length: 0,
    });
    piece.drag = {
      pointerId: pointer.id, constraint,
      last: { x: pointer.x, y: pointer.y, time: performance.now() }, velocity: { x: 0, y: 0 },
    };
    piece.element.dataset.dragging = "true";
    Composite.add(engine.world, constraint);
    Sleeping.set(piece.body, false);
    try { piece.element.setPointerCapture(pointer.id); }
    catch { release(piece, false); }
    start();
  }

  function drop(input: PieceInput) {
    if (disposed || returning || pieces.has(input.id)) return;
    const element = document.createElement("button");
    element.type = "button";
    element.className = "signature-physics-piece";
    element.dataset.piece = String(input.id);
    element.setAttribute("aria-label", `Dropped ${input.label}. Drag to throw; press Escape to reassemble.`);
    element.append(input.artwork);
    const { width, height } = input.rect;
    const body = Bodies.rectangle(input.rect.left + width / 2, input.rect.top + height / 2, width, height, {
      restitution: 0.48, friction: 0.35, frictionAir: 0.012, sleepThreshold: 50,
      chamfer: { radius: Math.min(width, height) * 0.12 },
    });
    const piece: Piece = { input, element, body, width, height };
    pieces.set(input.id, piece);
    layer.append(element);
    Composite.add(engine.world, body);
    render(piece, body.position.x, body.position.y, width, height, 0);

    element.addEventListener("pointerdown", event => {
      if (event.button !== 0) return;
      event.preventDefault();
      grab(piece, { id: event.pointerId, x: event.clientX, y: event.clientY });
    });
    element.addEventListener("pointermove", event => {
      const drag = piece.drag;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const time = performance.now();
      const delta = Math.max(8, time - drag.last.time);
      drag.velocity = {
        x: lerp(drag.velocity.x, (event.clientX - drag.last.x) / delta * frameDuration, 0.65),
        y: lerp(drag.velocity.y, (event.clientY - drag.last.y) / delta * frameDuration, 0.65),
      };
      drag.last = { x: event.clientX, y: event.clientY, time };
      drag.constraint.pointA = { x: event.clientX, y: event.clientY };
      Sleeping.set(body, false);
      start();
    });
    element.addEventListener("pointerup", () => release(piece, true));
    element.addEventListener("pointercancel", () => release(piece, false));
    element.addEventListener("lostpointercapture", () => release(piece, false));
    element.addEventListener("keydown", event => {
      const directions: Record<string, [number, number]> = { ArrowLeft: [-10, -4], ArrowRight: [10, -4], ArrowUp: [0, -14], ArrowDown: [0, 8] };
      const velocity = directions[event.key];
      if (!velocity || returning) return;
      event.preventDefault();
      Body.setVelocity(body, { x: velocity[0], y: velocity[1] });
      Sleeping.set(body, false);
      start();
    });

    Body.setVelocity(body, { x: (input.id % 3 - 1) * 0.7, y: 0 });
    Body.setAngularVelocity(body, (input.id % 2 ? 1 : -1) * 0.018);
    if (input.pointer) grab(piece, input.pointer);
    start();
  }

  function recover() {
    if (returnPromise) return returnPromise;
    if (disposed || pieces.size === 0) return Promise.resolve();
    returning = true;
    layer.dataset.state = "returning";
    cancelAnimationFrame(frame);
    frame = 0;
    const returningPieces = [...pieces.values()].sort((a, b) => a.input.id - b.input.id);
    returnPromise = Promise.all(returningPieces.map((piece, index) => new Promise<void>(resolve => {
      returnResolvers.add(resolve);
      release(piece, false);
      Composite.remove(engine.world, piece.body);
      const start = { x: piece.body.position.x, y: piece.body.position.y, angle: Math.atan2(Math.sin(piece.body.angle), Math.cos(piece.body.angle)) };
      const finish = () => {
        if (!disposed) piece.input.onHome();
        piece.element.remove();
        pieces.delete(piece.input.id);
        returnResolvers.delete(resolve);
        resolve();
      };
      const control = animate(0, 1, {
        duration: 0.85, delay: index * 0.045, ease: [0.32, 0, 0.16, 1],
        onUpdate: progress => {
          // Resolve the live home every frame: the header may still be shrinking.
          const home = piece.input.home();
          const x = home.left + home.width / 2;
          const y = home.top + home.height / 2;
          const arc = Math.sin(Math.PI * progress) * Math.min(90, Math.abs(start.y - y) * 0.12);
          render(piece, lerp(start.x, x, progress), lerp(start.y, y, progress) - arc,
            lerp(piece.width, home.width, progress), lerp(piece.height, home.height, progress), start.angle * (1 - progress));
        },
        onComplete: () => { returnControls.delete(control); finish(); },
      });
      returnControls.add(control);
    }))).then(() => {
      returning = false;
      returnPromise = undefined;
      layer.dataset.state = "idle";
      Engine.clear(engine);
    });
    return returnPromise;
  }

  const onVisibility = () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else start();
  };
  setBounds();
  window.addEventListener("resize", setBounds);
  document.addEventListener("visibilitychange", onVisibility);

  return {
    drop, recover,
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      returnControls.forEach(control => control.stop());
      returnControls.clear();
      returnResolvers.forEach(resolve => resolve());
      returnResolvers.clear();
      for (const piece of pieces.values()) release(piece, false);
      pieces.clear();
      Composite.clear(engine.world, false);
      Engine.clear(engine);
      layer.remove();
      window.removeEventListener("resize", setBounds);
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}

export type SignaturePhysics = ReturnType<typeof createSignaturePhysics>;
