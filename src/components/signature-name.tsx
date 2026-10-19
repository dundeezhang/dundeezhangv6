"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { animate, mix } from "motion/react";
import signature from "@/data/signature-animation.json";
import type { PiecePointer, PieceRect, SignaturePhysics } from "@/lib/signature-physics";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const svgNamespace = "http://www.w3.org/2000/svg";
const domainIndex = signature.letters.length;

export function SignatureName() {
  const nameRef = useRef<HTMLSpanElement>(null);
  const selectLetter = useRef<(index: number | null) => void>(() => {});
  const hoverAtPoint = useRef<(x: number, y: number) => void>(() => {});
  const hoverDomain = useRef<(hovered: boolean) => void>(() => {});
  const dropPiece = useRef<(index: number, pointer?: PiecePointer) => void>(() => {});
  const isClient = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);

  useEffect(() => {
    const name = nameRef.current;
    const svg = name?.querySelector<SVGSVGElement>(".masthead-hover-svg");
    const domain = name?.querySelector<HTMLButtonElement>(".masthead-domain-text");
    if (!isClient || !name || !svg || !domain) return;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fallen = new Set<number>();
    const pointers = new Map<number, PiecePointer>();
    let physics: SignaturePhysics | undefined;
    let physicsLoading: Promise<SignaturePhysics> | undefined;
    let selected: number | null = null;
    let disposed = false;
    let ready = false;
    let recovering = false;
    let dropEpoch = 0;
    let hoverStrokeWidth = 0;
    let domainHovered = false;
    let domainScale = 1;
    let domainControl: ReturnType<typeof animate> | undefined;
    let previousScroll = window.scrollY;

    const letters = signature.letters.map((letter, index) => {
      const text = name.querySelector<HTMLElement>(`[data-name-letter="${index}"]`)!;
      const button = text.parentElement as HTMLButtonElement;
      const glyph = svg.querySelector<SVGPathElement>(`[data-hover-letter="${index}"]`)!;
      glyph.setAttribute("d", letter.to);
      glyph.setAttribute("stroke-width", "0");
      const target = glyph.getBBox();
      const contours = letter.from.split(/(?=M)/);
      const hasInk = contours.map(contour => {
        const points = contour.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
        const xs = points.filter((_, i) => i % 2 === 0);
        const ys = points.filter((_, i) => i % 2 !== 0);
        return Math.max(...xs) - Math.min(...xs) > 0.05 || Math.max(...ys) - Math.min(...ys) > 0.05;
      });
      // Drop collapsed contour placeholders without changing the handwriting.
      const original = contours.filter((_, i) => hasInk[i]).join("");
      const anchor = original.match(/-?\d+(?:\.\d+)?/g)!.slice(0, 2);
      const matched = contours.map((contour, i) => {
        if (hasInk[i]) return contour;
        let coordinate = 0;
        return contour.replace(/-?\d+(?:\.\d+)?/g, () => anchor[coordinate++ % 2]);
      }).join("");
      glyph.setAttribute("d", original);
      const source = glyph.getBBox();
      glyph.setAttribute("d", letter.to);
      const scale = target.height / source.height;
      const x = target.x + target.width / 2 - (source.x + source.width / 2) * scale;
      const y = target.y + target.height - (source.y + source.height) * scale;
      const fit = (path: string) => {
        let coordinate = 0;
        return path.replace(/-?\d+(?:\.\d+)?/g, value =>
          (Number(value) * scale + (coordinate++ % 2 === 0 ? x : y)).toFixed(2),
        );
      };
      return { text, button, glyph, printed: letter.to, handwriting: fit(original), mixer: mix(letter.to, fit(matched)), progress: 0, control: undefined as ReturnType<typeof animate> | undefined };
    });
    type Letter = typeof letters[number];

    const paintLetter = (letter: Letter, progress: number) => {
      letter.progress = progress;
      letter.glyph.setAttribute("d", progress === 0 ? letter.printed : progress === 1 ? letter.handwriting : letter.mixer(progress));
      letter.glyph.setAttribute("stroke-width", String(progress * hoverStrokeWidth));
    };
    const setDomainScale = (scale: number) => {
      domainScale = scale;
      const left = domain.parentElement!.getBoundingClientRect().left;
      const shift = Math.min(0, document.documentElement.clientWidth - 8 - left - domain.offsetWidth * scale);
      domain.style.transform = `translateX(${shift}px) scale(${scale})`;
    };
    const domainHoverScale = () => Number.parseFloat(getComputedStyle(name.closest("h1")!).fontSize) / Number.parseFloat(getComputedStyle(domain).fontSize);
    const setDomainHover = (hovered: boolean) => {
      domainHovered = hovered && !fallen.has(domainIndex) && !recovering;
      domain.toggleAttribute("data-hovered", domainHovered);
      domainControl?.stop();
      const target = domainHovered ? domainHoverScale() : 1;
      if (reducedMotion.matches) setDomainScale(target);
      else domainControl = animate(domainScale, target, { duration: 0.3, ease: [0.22, 1, 0.36, 1], onUpdate: setDomainScale });
    };
    const measure = () => {
      const typography = getComputedStyle(name.closest("h1")!);
      const fontSize = Number.parseFloat(typography.fontSize);
      hoverStrokeWidth = fontSize * 0.008;
      letters.forEach(letter => letter.glyph.setAttribute("stroke-width", String(letter.progress * hoverStrokeWidth)));
      const context = document.createElement("canvas").getContext("2d");
      if (!context) return;
      context.font = `${typography.fontWeight} ${fontSize}px ${typography.fontFamily}`;
      const metrics = context.measureText("Dundee Zhang");
      const unit = fontSize / signature.font.unitsPerEm;
      const ascent = metrics.fontBoundingBoxAscent ?? signature.font.ascent * unit;
      const descent = metrics.fontBoundingBoxDescent ?? signature.font.descent * unit;
      const baseline = (name.getBoundingClientRect().height - ascent - descent) / 2 + ascent;
      const [inkX, inkY, inkWidth, inkHeight] = signature.font.inkBounds;
      Object.assign(svg.style, { left: `${inkX * unit}px`, top: `${baseline + inkY * unit}px`, width: `${inkWidth * unit}px`, height: `${inkHeight * unit}px` });
      const domainFont = getComputedStyle(domain);
      context.font = `${domainFont.fontWeight} ${domainFont.fontSize} ${domainFont.fontFamily}`;
      const domainMetrics = context.measureText(".com");
      const domainAscent = domainMetrics.fontBoundingBoxAscent ?? Number.parseFloat(domainFont.fontSize);
      const domainDescent = domainMetrics.fontBoundingBoxDescent ?? 0;
      domain.style.transformOrigin = `left ${(domain.offsetHeight - domainAscent - domainDescent) / 2 + domainAscent}px`;
      if (domainHovered) { domainControl?.stop(); setDomainScale(domainHoverScale()); }
    };
    const activate = (index: number | null) => {
      if (index === selected || (!ready && index !== null)) return;
      selected = index;
      letters.forEach((letter, i) => {
        if (fallen.has(i)) return;
        const hovered = i === index;
        letter.glyph.toggleAttribute("data-hovered", hovered);
        const target = hovered ? 1 : 0;
        letter.control?.stop();
        if (reducedMotion.matches || letter.progress === target) paintLetter(letter, target);
        else letter.control = animate(letter.progress, target, { duration: 0.26, ease: [0.22, 1, 0.36, 1], onUpdate: progress => paintLetter(letter, progress) });
      });
    };
    const letterHome = (letter: Letter): PieceRect => {
      const rect = letter.glyph.getBoundingClientRect();
      return { left: rect.left - 2, top: rect.top - 2, width: rect.width + 4, height: rect.height + 4 };
    };
    const makeLetterArtwork = (letter: Letter) => {
      const box = letter.glyph.getBBox();
      const rect = letter.glyph.getBoundingClientRect();
      const paddingX = 2 * box.width / rect.width;
      const paddingY = 2 * box.height / rect.height;
      const artwork = document.createElementNS(svgNamespace, "svg");
      artwork.setAttribute("viewBox", `${box.x - paddingX} ${box.y - paddingY} ${box.width + paddingX * 2} ${box.height + paddingY * 2}`);
      artwork.setAttribute("preserveAspectRatio", "none");
      artwork.setAttribute("aria-hidden", "true");
      const path = letter.glyph.cloneNode(true) as SVGPathElement;
      ["transform", "class", "data-hover-letter", "data-fallen"].forEach(attribute => path.removeAttribute(attribute));
      artwork.append(path);
      return { artwork, path };
    };
    const makeDomainArtwork = (rect: PieceRect) => {
      const style = getComputedStyle(domain);
      const fontSize = Number.parseFloat(style.fontSize) * domainScale;
      const context = document.createElement("canvas").getContext("2d")!;
      context.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
      context.letterSpacing = `${Number.parseFloat(style.letterSpacing) * domainScale}px`;
      const metrics = context.measureText(".com");
      const ascent = metrics.fontBoundingBoxAscent ?? fontSize;
      const descent = metrics.fontBoundingBoxDescent ?? fontSize * 0.3;
      const artwork = document.createElementNS(svgNamespace, "svg");
      artwork.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
      artwork.setAttribute("preserveAspectRatio", "none");
      artwork.setAttribute("aria-hidden", "true");
      const text = document.createElementNS(svgNamespace, "text");
      text.textContent = ".com";
      text.setAttribute("y", String((rect.height - ascent - descent) / 2 + ascent));
      Object.assign(text.style, { fontFamily: style.fontFamily, fontSize: `${fontSize}px`, fontWeight: style.fontWeight, letterSpacing: `${Number.parseFloat(style.letterSpacing) * domainScale}px`, fill: "currentColor" });
      artwork.append(text);
      // SVG text getBBox includes font-cell whitespace; Canvas exposes the ink.
      const baseline = (rect.height - ascent - descent) / 2 + ascent;
      const box = {
        left: -metrics.actualBoundingBoxLeft - 2, top: baseline - metrics.actualBoundingBoxAscent - 2,
        width: metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight + 4,
        height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent + 4,
      };
      artwork.setAttribute("viewBox", `${box.left} ${box.top} ${box.width} ${box.height}`);
      const home = () => {
        const current = domain.getBoundingClientRect();
        return { left: current.left + box.left / rect.width * current.width, top: current.top + box.top / rect.height * current.height,
          width: box.width / rect.width * current.width, height: box.height / rect.height * current.height };
      };
      return { artwork, rect: { left: rect.left + box.left, top: rect.top + box.top, width: box.width, height: box.height }, home };
    };
    const restoreSlot = (id: number) => {
      if (id === domainIndex) domain.removeAttribute("data-fallen");
      else letters[id].glyph.removeAttribute("data-fallen");
    };
    const finishPiece = (id: number) => {
      restoreSlot(id);
      fallen.delete(id);
      if (id === domainIndex) domain.disabled = false;
      else { letters[id].button.disabled = false; paintLetter(letters[id], 0); }
    };

    async function recover() {
      if (recovering || fallen.size === 0) return;
      recovering = true;
      dropEpoch++;
      const ids = [...fallen].sort((a, b) => a - b);
      activate(null);
      setDomainHover(false);
      name!.dataset.signatureState = "assembling";
      await physics?.recover();
      if (disposed) return;
      ids.forEach(restoreSlot);
      name!.dataset.signatureState = "morphing";
      const letterIds = ids.filter(id => id < domainIndex);
      const duration = letterIds.length > 1 ? 0.24 : 0.32;
      const step = letterIds.length > 1 ? (0.8 - duration) / (letterIds.length - 1) : 0;
      await Promise.all(letterIds.map(async (id, order) => {
        const letter = letters[id];
        letter.control?.stop();
        if (reducedMotion.matches) { paintLetter(letter, 0); return; }
        const control = animate(1, 0, { duration, delay: order * step, ease: [0.65, 0, 0.25, 1], onUpdate: progress => paintLetter(letter, progress) });
        letter.control = control;
        await control;
      }));
      if (disposed) return;
      ids.forEach(finishPiece);
      recovering = false;
      selected = null;
      name!.dataset.signatureState = "idle";
    }

    dropPiece.current = (id, pointer) => {
      if (!ready || recovering || fallen.has(id) || document.documentElement.hasAttribute("data-signature-intro")) return;
      const epoch = dropEpoch;
      if (pointer) pointers.set(pointer.id, pointer);
      fallen.add(id);
      name.dataset.signatureState = "falling";
      if (id === domainIndex) domain.disabled = true;
      else {
        const letter = letters[id];
        letter.button.disabled = true;
        letter.control?.stop();
        paintLetter(letter, 1);
        letter.glyph.removeAttribute("data-hovered");
      }
      activate(null);
      physicsLoading ??= import("@/lib/signature-physics").then(module => {
        physics = module.createSignaturePhysics();
        if (disposed) physics.dispose();
        return physics;
      });
      void physicsLoading.then(world => {
        if (disposed || recovering || epoch !== dropEpoch) return;
        const heldPointer = pointer ? pointers.get(pointer.id) : undefined;
        if (id === domainIndex) {
          const rect = domain.getBoundingClientRect();
          const piece = makeDomainArtwork(rect);
          domain.setAttribute("data-fallen", "");
          setDomainHover(false);
          domainControl?.stop();
          setDomainScale(1);
          world.drop({ id, label: ".com", ...piece, onHome: () => restoreSlot(id), pointer: heldPointer });
        } else {
          const letter = letters[id];
          const { artwork, path } = makeLetterArtwork(letter);
          const rect = letterHome(letter);
          letter.glyph.setAttribute("data-fallen", "");
          world.drop({ id, label: signature.letters[id].name, artwork, rect,
            home: () => { path.setAttribute("stroke-width", String(hoverStrokeWidth)); return letterHome(letter); },
            onHome: () => restoreSlot(id), pointer: heldPointer });
        }
      }).catch(() => {
        physicsLoading = undefined;
        finishPiece(id);
        if (fallen.size === 0) name.dataset.signatureState = "idle";
      });
    };
    selectLetter.current = index => {
      if (index === null || !document.documentElement.hasAttribute("data-signature-intro")) activate(index);
    };
    hoverAtPoint.current = (x, y) => {
      if (!ready || !finePointer.matches || document.documentElement.hasAttribute("data-signature-intro")) return;
      for (let i = letters.length - 1; i >= 0; i--) {
        if (fallen.has(i)) continue;
        const cell = letters[i].button.getBoundingClientRect();
        const ink = letters[i].glyph.getBoundingClientRect();
        if (x >= cell.left && x <= cell.right && y >= ink.top && y <= ink.bottom) { activate(i); return; }
      }
      activate(null);
    };
    hoverDomain.current = setDomainHover;
    const reset = () => { activate(null); setDomainHover(false); };
    const onMotionPreferenceChange = () => { reset(); if (reducedMotion.matches) void recover(); };
    const onScroll = () => {
      if (window.scrollY === previousScroll) return;
      previousScroll = window.scrollY;
      void recover();
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") void recover(); };
    const onPointerMove = (event: PointerEvent) => {
      if (pointers.has(event.pointerId)) pointers.set(event.pointerId, { id: event.pointerId, x: event.clientX, y: event.clientY });
    };
    const onPointerUp = (event: PointerEvent) => pointers.delete(event.pointerId);
    const observer = new ResizeObserver(measure);
    observer.observe(name);
    const typography = getComputedStyle(name);
    void document.fonts.load(`${typography.fontWeight} ${typography.fontSize} ${typography.fontFamily}`, "Dundee Zhang").then(() => {
      if (!disposed) { measure(); ready = true; name.setAttribute("data-outline-ready", ""); }
    });
    finePointer.addEventListener("change", reset);
    reducedMotion.addEventListener("change", onMotionPreferenceChange);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      disposed = true;
      observer.disconnect();
      physics?.dispose();
      domainControl?.stop();
      finePointer.removeEventListener("change", reset);
      reducedMotion.removeEventListener("change", onMotionPreferenceChange);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      name.removeAttribute("data-outline-ready");
      name.removeAttribute("data-signature-state");
      domain.removeAttribute("data-fallen");
      domain.removeAttribute("data-hovered");
      domain.disabled = false;
      domain.style.removeProperty("transform");
      domain.style.removeProperty("transform-origin");
      letters.forEach(letter => {
        letter.control?.stop();
        letter.glyph.removeAttribute("data-hovered");
        letter.glyph.removeAttribute("data-fallen");
        letter.button.disabled = false;
      });
      selectLetter.current = () => {};
      hoverAtPoint.current = () => {};
      hoverDomain.current = () => {};
      dropPiece.current = () => {};
    };
  }, [isClient]);

  return (
    <span ref={nameRef} className="masthead-name" role="group" aria-label="Interactive Dundee Zhang signature"
      onPointerEnter={event => hoverAtPoint.current(event.clientX, event.clientY)}
      onPointerMove={event => {
        if ((event.target as Element).closest(".masthead-domain-text")) selectLetter.current(null);
        else hoverAtPoint.current(event.clientX, event.clientY);
      }}
      onPointerLeave={() => selectLetter.current(null)}>
      {signature.letters.map((letter, index) => (
        <span key={index} className="masthead-letter">
          {index === 6 && " "}<button type="button" className="masthead-piece-trigger" aria-label={`Drop letter ${letter.name} (${index + 1})`}
            onFocus={() => selectLetter.current(index)} onBlur={() => selectLetter.current(null)}
            onPointerDown={event => {
              if (event.button !== 0) return;
              event.preventDefault();
              dropPiece.current(index, { id: event.pointerId, x: event.clientX, y: event.clientY });
            }}
            onClick={event => { if (event.detail === 0) dropPiece.current(index); }}
          ><span data-name-letter={index}>{letter.name}</span></button>
        </span>
      ))}
      {" "}
      <span className="masthead-domain">
        <button type="button" className="masthead-piece-trigger masthead-domain-text" aria-label="Drop .com"
          onPointerEnter={() => hoverDomain.current(true)} onPointerLeave={() => hoverDomain.current(false)}
          onFocus={() => hoverDomain.current(true)} onBlur={() => hoverDomain.current(false)}
          onPointerDown={event => {
            if (event.button !== 0) return;
            event.preventDefault();
            dropPiece.current(domainIndex, { id: event.pointerId, x: event.clientX, y: event.clientY });
          }}
          onClick={event => { if (event.detail === 0) dropPiece.current(domainIndex); }}
        >.com</button>
      </span>
      {isClient && (
        <svg className="masthead-hover-svg" viewBox={`0 0 ${signature.width} ${signature.height}`} preserveAspectRatio="none" shapeRendering="geometricPrecision" aria-hidden="true">
          {signature.letters.map((letter, index) => (
            <path key={index} className="masthead-hover-glyph" data-hover-letter={index} d={letter.to} transform={`translate(${letter.shift} 0)`} fill="currentColor" stroke="currentColor" strokeWidth="0" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
      )}
    </span>
  );
}
