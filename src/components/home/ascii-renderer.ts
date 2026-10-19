type Theme = "light" | "dark";
type Character = {
  originX: number;
  originY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  glyph: string;
};
type Bounds = { left: number; top: number; right: number; bottom: number };
type Artwork = {
  still: HTMLCanvasElement;
  characters: Character[];
  selected: Uint8Array;
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
};

export type AsciiRenderer = {
  update: (options: { active: boolean; theme: Theme }) => void;
  destroy: () => void;
};

const DARK_GLYPHS = " .,:;irsXA253hMHGS#9B&@";
const LIGHT_GLYPHS = " .:oxOX%#@";

export function createAsciiRenderer(
  frame: HTMLDivElement,
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  onReady?: () => void,
): AsciiRenderer {
  const context = canvas.getContext("2d");
  const sample = document.createElement("canvas");
  const sampleContext = sample.getContext("2d", { willReadFrequently: true });
  if (!context || !sampleContext) return { update() {}, destroy() {} };

  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const cache = new Map<Theme, Artwork>();
  const selected: number[] = [];
  const pointer = {
    x: 0, y: 0, clientX: 0, clientY: 0, lastClientX: 0, lastClientY: 0,
    flowX: 0, flowY: 0, hasPosition: false, active: false, changed: false,
  };
  let artwork: Artwork | undefined;
  let theme: Theme = "light";
  let active = false;
  let inViewport = false;
  let width = 0;
  let height = 0;
  let ratio = 1;
  let cacheKey = "";
  let animation = 0;
  let buildFrame = 0;
  let resizeTimer = 0;
  let previousTime = 0;
  let settledFrames = 0;
  let previousBounds: Bounds | undefined;
  let ready = false;

  function drawStill() {
    if (!artwork) return;
    context!.clearRect(0, 0, width, height);
    context!.drawImage(artwork.still, 0, 0, width, height);
  }

  function reset(paint = true) {
    cancelAnimationFrame(animation);
    animation = 0;
    previousTime = 0;
    settledFrames = 0;
    pointer.active = pointer.changed = false;
    pointer.hasPosition = false;
    pointer.flowX = pointer.flowY = 0;
    if (artwork) {
      for (const index of selected) {
        const character = artwork.characters[index];
        character.x = character.originX;
        character.y = character.originY;
        character.vx = character.vy = 0;
        artwork.selected[index] = 0;
      }
    }
    selected.length = 0;
    if (paint && previousBounds) drawStill();
    previousBounds = undefined;
  }

  function build() {
    buildFrame = 0;
    if (!active || !inViewport || document.hidden || !image.complete || !image.naturalWidth) return;
    const nextWidth = frame.clientWidth;
    const nextHeight = frame.clientHeight;
    if (!nextWidth || !nextHeight) return;
    const nextRatio = Math.min(window.devicePixelRatio || 1, 2);
    const key = `${nextWidth}:${nextHeight}:${nextRatio}:${image.currentSrc || image.src}`;
    reset(false);
    if (key !== cacheKey) {
      cache.clear();
      cacheKey = key;
    }
    width = nextWidth;
    height = nextHeight;
    ratio = nextRatio;
    const pixelWidth = Math.round(width * ratio);
    const pixelHeight = Math.round(height * ratio);
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;

    artwork = cache.get(theme);
    if (!artwork) {
      const still = document.createElement("canvas");
      still.width = pixelWidth;
      still.height = pixelHeight;
      const stillContext = still.getContext("2d");
      if (!stillContext) return;
      stillContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      const columns = Math.max(1, Math.min(240, Math.floor(width / 4.75)));
      const cellWidth = width / columns;
      const fontSize = cellWidth / 0.6;
      const bold = theme === "light";
      const rows = Math.max(1, Math.floor(height / (fontSize * (bold ? 1 : 1.15))));
      const cellHeight = height / rows;
      const font = `${bold ? 700 : 400} ${fontSize}px Menlo, Consolas, monospace`;
      stillContext.font = font;
      stillContext.textAlign = "center";
      stillContext.textBaseline = "middle";
      stillContext.lineWidth = 0.25;

      // The preview has no srcset, so its intrinsic pixels also work in Safari.
      const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
      const cropWidth = width / scale;
      const cropHeight = height / scale;
      sample.width = columns;
      sample.height = rows;
      sampleContext!.drawImage(
        image,
        (image.naturalWidth - cropWidth) * 0.5,
        (image.naturalHeight - cropHeight) * 0.55,
        cropWidth, cropHeight, 0, 0, columns, rows,
      );
      const pixels = sampleContext!.getImageData(0, 0, columns, rows).data;
      const characters: Character[] = [];
      const glyphs = bold ? LIGHT_GLYPHS : DARK_GLYPHS;
      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          const offset = (row * columns + column) * 4;
          const red = pixels[offset];
          const green = pixels[offset + 1];
          const blue = pixels[offset + 2];
          const brightness = (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255;
          const lightBrightness = Math.min(1, Math.max(0, (brightness - 0.16) / 0.68));
          const density = bold ? 1 - lightBrightness : brightness;
          const glyph = glyphs[Math.round(density * (glyphs.length - 1))];
          const x = (column + 0.5) * cellWidth;
          const y = (row + 0.5) * cellHeight;
          characters.push({ originX: x, originY: y, x, y, vx: 0, vy: 0, glyph });
          if (glyph === " ") continue;
          let color = `rgb(${red},${green},${blue})`;
          if (!bold) {
            // Brighten dark-mode colors without mixing white into their hues.
            const peak = Math.max(red, green, blue);
            const trough = Math.min(red, green, blue);
            const saturation = peak === trough ? 1 : Math.min(1.18, peak / (peak - trough));
            const darkPeak = Math.min(255, (0.16 + 0.84 * Math.pow(peak / 255, 0.78)) * 255 * 1.12);
            const gain = peak ? darkPeak / peak : 0;
            const channel = (value: number) => Math.round(Math.max(0, Math.min(255, (peak - (peak - value) * saturation) * gain)));
            color = `rgb(${channel(red)},${channel(green)},${channel(blue)})`;
          }
          stillContext.fillStyle = color;
          stillContext.fillText(glyph, x, y);
          if (bold) {
            stillContext.strokeStyle = color;
            stillContext.strokeText(glyph, x, y);
          }
        }
      }
      artwork = { still, characters, selected: new Uint8Array(characters.length), columns, rows, cellWidth, cellHeight };
      cache.set(theme, artwork);
    }
    context!.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawStill();
    if (!ready) {
      ready = true;
      onReady?.();
    }
  }

  function queueBuild() {
    if (active && inViewport && !document.hidden && !buildFrame) {
      buildFrame = requestAnimationFrame(build);
    }
  }

  function resize() {
    window.clearTimeout(resizeTimer);
    if (!artwork) queueBuild();
    else resizeTimer = window.setTimeout(queueBuild, 120);
  }

  function animate(time: number) {
    animation = 0;
    if (!artwork || !active || !inViewport || document.hidden || motion.matches) return;
    const step = previousTime ? Math.min((time - previousTime) / (1000 / 60), 2) : 1;
    previousTime = time;
    // Strong damping gives the nudge one quick rebound before settling.
    const damping = Math.pow(0.76, step);
    const spring = 0.085 * step;
    const brushRadius = Math.min(36, Math.max(20, width * 0.028));
    const maxShift = Math.min(40, Math.max(24, width * 0.033));
    const { characters, cellWidth, cellHeight } = artwork;
    let fromX = pointer.x;
    let fromY = pointer.y;
    let moved = false;

    if (pointer.changed) {
      const bounds = frame.getBoundingClientRect();
      pointer.x = pointer.clientX - bounds.left;
      pointer.y = pointer.clientY - bounds.top;
      const dx = pointer.hasPosition ? pointer.clientX - pointer.lastClientX : 0;
      const dy = pointer.hasPosition ? pointer.clientY - pointer.lastClientY : 0;
      fromX = pointer.x - dx;
      fromY = pointer.y - dy;
      const speed = Math.hypot(dx, dy) / step;
      const scale = speed > 28 ? 28 / speed : 1;
      pointer.flowX = (dx / step) * scale;
      pointer.flowY = (dy / step) * scale;
      pointer.lastClientX = pointer.clientX;
      pointer.lastClientY = pointer.clientY;
      pointer.hasPosition = true;
      pointer.changed = false;
      moved = dx !== 0 || dy !== 0;
    } else {
      const fade = Math.pow(0.55, step);
      pointer.flowX *= fade;
      pointer.flowY *= fade;
    }

    const pathX = pointer.x - fromX;
    const pathY = pointer.y - fromY;
    const pathLengthSquared = pathX * pathX + pathY * pathY;
    const flowLength = Math.hypot(pointer.flowX, pointer.flowY);
    const directionX = flowLength ? pointer.flowX / flowLength : 1;
    const directionY = flowLength ? pointer.flowY / flowLength : 0;
    const distanceToBrush = (x: number, y: number) => {
      const along = pathLengthSquared
        ? Math.min(1, Math.max(0, ((x - fromX) * pathX + (y - fromY) * pathY) / pathLengthSquared))
        : 0;
      const dx = x - (fromX + pathX * along);
      const dy = y - (fromY + pathY * along);
      const distance = Math.abs(dx * directionX + dy * directionY)
        + Math.abs(dy * directionX - dx * directionY) * 1.6;
      return distance * distance;
    };

    if (moved) {
      // Select a narrow brush stroke along the cursor's path, even for fast sweeps.
      const firstColumn = Math.max(0, Math.floor((Math.min(fromX, pointer.x) - brushRadius) / cellWidth));
      const lastColumn = Math.min(artwork.columns - 1, Math.floor((Math.max(fromX, pointer.x) + brushRadius) / cellWidth));
      const firstRow = Math.max(0, Math.floor((Math.min(fromY, pointer.y) - brushRadius) / cellHeight));
      const lastRow = Math.min(artwork.rows - 1, Math.floor((Math.max(fromY, pointer.y) + brushRadius) / cellHeight));
      for (let row = firstRow; row <= lastRow; row++) {
        for (let column = firstColumn; column <= lastColumn; column++) {
          const index = row * artwork.columns + column;
          const character = characters[index];
          if (artwork.selected[index] || character.glyph === " ") continue;
          if (distanceToBrush(character.originX, character.originY) >= brushRadius * brushRadius) continue;
          artwork.selected[index] = 1;
          selected.push(index);
        }
      }
    }

    let count = 0;
    let maxMovement = 0;
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    for (const index of selected) {
      const character = characters[index];
      const oldX = character.x;
      const oldY = character.y;
      if (pointer.active) {
        const distanceSquared = distanceToBrush(character.x, character.y);
        if (distanceSquared < brushRadius * brushRadius) {
          const falloff = 1 - Math.sqrt(distanceSquared) / brushRadius;
          const drag = falloff * falloff * 0.6 * step;
          character.vx += pointer.flowX * drag;
          character.vy += pointer.flowY * drag;
        }
      }
      character.vx += (character.originX - character.x) * spring;
      character.vy += (character.originY - character.y) * spring;
      character.vx *= damping;
      character.vy *= damping;
      character.x += character.vx * step;
      character.y += character.vy * step;
      const shiftX = character.x - character.originX;
      const shiftY = character.y - character.originY;
      const shift = Math.hypot(shiftX, shiftY);
      if (shift > maxShift) {
        character.x = character.originX + (shiftX / shift) * maxShift;
        character.y = character.originY + (shiftY / shift) * maxShift;
        character.vx *= 0.35;
        character.vy *= 0.35;
      }
      maxMovement = Math.max(maxMovement, Math.abs(character.x - oldX) + Math.abs(character.y - oldY));

      if (Math.abs(character.x - character.originX) + Math.abs(character.y - character.originY)
        + Math.abs(character.vx) + Math.abs(character.vy) <= 0.1) {
        character.x = character.originX;
        character.y = character.originY;
        character.vx = character.vy = 0;
        artwork.selected[index] = 0;
        continue;
      }
      selected[count++] = index;
      left = Math.min(left, character.originX, character.x);
      top = Math.min(top, character.originY, character.y);
      right = Math.max(right, character.originX, character.x);
      bottom = Math.max(bottom, character.originY, character.y);
    }
    selected.length = count;
    const bounds = count ? {
      left: left - cellWidth / 2 - 2,
      top: top - cellHeight / 2 - 2,
      right: right + cellWidth / 2 + 2,
      bottom: bottom + cellHeight / 2 + 2,
    } : undefined;

    // Restore just the affected rectangle, including the previous frame's trail.
    if (bounds || previousBounds) {
      const old = previousBounds || bounds!;
      const next = bounds || old;
      const x = Math.max(0, Math.floor(Math.min(old.left, next.left)));
      const y = Math.max(0, Math.floor(Math.min(old.top, next.top)));
      const w = Math.min(width, Math.ceil(Math.max(old.right, next.right))) - x;
      const h = Math.min(height, Math.ceil(Math.max(old.bottom, next.bottom))) - y;
      if (w > 0 && h > 0) {
        context!.clearRect(x, y, w, h);
        context!.drawImage(artwork.still, x * ratio, y * ratio, w * ratio, h * ratio, x, y, w, h);
      }
      for (const index of selected) {
        const character = characters[index];
        context!.clearRect(character.originX - cellWidth / 2 - 0.5, character.originY - cellHeight / 2 - 0.5, cellWidth + 1, cellHeight + 1);
      }
      for (const index of selected) {
        const character = characters[index];
        // Move cached glyph pixels instead of shaping and stroking text each frame.
        context!.drawImage(
          artwork.still,
          (character.originX - cellWidth / 2) * ratio,
          (character.originY - cellHeight / 2) * ratio,
          cellWidth * ratio, cellHeight * ratio,
          character.x - cellWidth / 2, character.y - cellHeight / 2,
          cellWidth, cellHeight,
        );
      }
    }
    previousBounds = bounds;

    settledFrames = maxMovement < 0.025 ? settledFrames + 1 : 0;
    if (selected.length && (!pointer.active || settledFrames < 12)) animation = requestAnimationFrame(animate);
    else previousTime = 0;
  }

  function wake() {
    settledFrames = 0;
    if (!animation && active && inViewport && !document.hidden && !motion.matches) {
      animation = requestAnimationFrame(animate);
    }
  }

  function move(event: PointerEvent) {
    if (!active || !inViewport || !artwork || motion.matches) return;
    if (pointer.active && event.clientX === pointer.clientX && event.clientY === pointer.clientY) return;
    pointer.clientX = event.clientX;
    pointer.clientY = event.clientY;
    pointer.active = pointer.changed = true;
    wake();
  }

  function leave() {
    pointer.active = pointer.changed = false;
    pointer.hasPosition = false;
    pointer.flowX = pointer.flowY = 0;
    if (selected.length) wake();
  }

  function release(event: PointerEvent) {
    if (event.pointerType !== "mouse") leave();
  }

  function visibilityChanged() {
    if (document.hidden) reset();
    else queueBuild();
  }

  function motionChanged() {
    reset();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(frame);
  const visibility = new IntersectionObserver(([entry]) => {
    inViewport = entry.isIntersecting;
    if (inViewport) queueBuild();
    else reset();
  });
  visibility.observe(frame);
  image.addEventListener("load", queueBuild);
  frame.addEventListener("pointermove", move, { passive: true });
  frame.addEventListener("pointerleave", leave);
  frame.addEventListener("pointerup", release);
  frame.addEventListener("pointercancel", leave);
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", visibilityChanged);
  motion.addEventListener("change", motionChanged);

  return {
    update(options) {
      if (active === options.active && theme === options.theme) return;
      reset(false);
      active = options.active;
      theme = options.theme;
      if (active) queueBuild();
    },
    destroy() {
      reset(false);
      cancelAnimationFrame(buildFrame);
      window.clearTimeout(resizeTimer);
      resizeObserver.disconnect();
      visibility.disconnect();
      cache.clear();
      image.removeEventListener("load", queueBuild);
      frame.removeEventListener("pointermove", move);
      frame.removeEventListener("pointerleave", leave);
      frame.removeEventListener("pointerup", release);
      frame.removeEventListener("pointercancel", leave);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", visibilityChanged);
      motion.removeEventListener("change", motionChanged);
    },
  };
}
