"use client";

import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { animate, mix } from "motion/react";
import signature from "@/data/signature-animation.json";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function SignatureName() {
  const nameRef = useRef<HTMLAnchorElement>(null);
  const selectLetter = useRef<(index: number | null) => void>(() => {});
  const hoverAtPoint = useRef<(x: number, y: number) => void>(() => {});
  const isClient = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);

  useEffect(() => {
    const name = nameRef.current;
    const svg = name?.querySelector<SVGSVGElement>(".masthead-hover-svg");
    const domain = name?.querySelector<HTMLElement>(".masthead-domain-text");
    if (!isClient || !name || !svg || !domain) return;

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let selected: number | null = null;
    let disposed = false;
    let ready = false;
    let hoverStrokeWidth = 0;
    let domainInk = { top: 0, bottom: 0 };

    const letters = signature.letters.map((letter, index) => {
      const text = name.querySelector<HTMLElement>(`[data-name-letter="${index}"]`)!;
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
      // Contour matching adds collapsed placeholders. Keep them on existing
      // ink during the morph, and omit them from the final handwritten shape.
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

      return {
        text, glyph, printed: letter.to, handwriting: fit(original), mixer: mix(letter.to, fit(matched)), progress: 0,
        control: undefined as { stop: () => void } | undefined,
      };
    });

    const measure = () => {
      const heading = name.closest("h1")!;
      const typography = getComputedStyle(heading);
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
      Object.assign(svg.style, {
        left: `${inkX * unit}px`, top: `${baseline + inkY * unit}px`,
        width: `${inkWidth * unit}px`, height: `${inkHeight * unit}px`,
      });

      // The domain stays one rectangular target, trimmed to its actual ink height.
      const bounds = domain.getBoundingClientRect();
      const style = getComputedStyle(domain);
      context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const domainMetrics = context.measureText(".com");
      const domainUnit = Number.parseFloat(style.fontSize) / signature.font.unitsPerEm;
      const domainAscent = domainMetrics.fontBoundingBoxAscent ?? signature.font.ascent * domainUnit;
      const domainDescent = domainMetrics.fontBoundingBoxDescent ?? signature.font.descent * domainUnit;
      const domainBaseline = (bounds.height - domainAscent - domainDescent) / 2 + domainAscent;
      domainInk = {
        top: domainBaseline - domainMetrics.actualBoundingBoxAscent,
        bottom: domainBaseline + domainMetrics.actualBoundingBoxDescent,
      };
    };

    const activate = (index: number | null) => {
      if (index === selected || (!ready && index !== null)) return;
      selected = index;
      name.toggleAttribute("data-letter-hover", index !== null);
      domain.toggleAttribute("data-hovered", index === letters.length);
      letters.forEach((letter, i) => {
        const hovered = i === index;
        letter.text.parentElement!.toggleAttribute("data-hovered", hovered);
        letter.glyph.toggleAttribute("data-hovered", hovered);
        const target = hovered ? 1 : 0;
        letter.control?.stop();
        if (letter.progress === target) {
          if (target === 0) {
            letter.glyph.setAttribute("d", letter.printed);
            letter.glyph.setAttribute("stroke-width", "0");
          }
          return;
        }
        const update = (progress: number) => {
          letter.progress = progress;
          letter.glyph.setAttribute("d", progress === 0 ? letter.printed : progress === 1 ? letter.handwriting : letter.mixer(progress));
          letter.glyph.setAttribute("stroke-width", String(progress * hoverStrokeWidth));
        };
        if (reducedMotion.matches) update(target);
        else letter.control = animate(letter.progress, target, {
          duration: 0.26, ease: [0.22, 1, 0.36, 1], onUpdate: update,
        });
      });
    };

    selectLetter.current = index => {
      if (index === null || (finePointer.matches && !document.documentElement.hasAttribute("data-signature-intro"))) activate(index);
    };
    hoverAtPoint.current = (x, y) => {
      if (!ready || !finePointer.matches || document.documentElement.hasAttribute("data-signature-intro")) return;
      // Keep each letter's normal width, but exclude empty line-box space
      // above and below its visible outline.
      for (let i = letters.length - 1; i >= 0; i--) {
        const cell = letters[i].text.parentElement!.getBoundingClientRect();
        const ink = letters[i].glyph.getBoundingClientRect();
        if (x >= cell.left && x <= cell.right && y >= ink.top && y <= ink.bottom) {
          activate(i);
          return;
        }
      }

      if (Number(getComputedStyle(domain.parentElement!).opacity) > 0) {
        const bounds = domain.getBoundingClientRect();
        if (x >= bounds.left && x <= bounds.right &&
          y >= bounds.top + domainInk.top && y <= bounds.top + domainInk.bottom) {
          activate(letters.length);
          return;
        }
      }
      activate(null);
    };
    const reset = () => activate(null);
    const observer = new ResizeObserver(measure);
    observer.observe(name);
    const typography = getComputedStyle(name);
    void document.fonts.load(`${typography.fontWeight} ${typography.fontSize} ${typography.fontFamily}`, "Dundee Zhang").then(() => {
      if (!disposed) {
        measure();
        ready = true;
        // Keep one renderer for idle, hover, and the opening handoff.
        name.setAttribute("data-outline-ready", "");
      }
    });
    finePointer.addEventListener("change", reset);
    reducedMotion.addEventListener("change", reset);

    return () => {
      disposed = true;
      observer.disconnect();
      finePointer.removeEventListener("change", reset);
      reducedMotion.removeEventListener("change", reset);
      name.removeAttribute("data-letter-hover");
      name.removeAttribute("data-outline-ready");
      domain.removeAttribute("data-hovered");
      letters.forEach(letter => {
        letter.control?.stop();
        letter.text.parentElement!.removeAttribute("data-hovered");
        letter.glyph.removeAttribute("data-hovered");
      });
      selectLetter.current = () => {};
      hoverAtPoint.current = () => {};
    };
  }, [isClient]);

  return (
    <Link
      ref={nameRef}
      className="masthead-name"
      href="/"
      aria-label="Dundee Zhang .com"
      onPointerEnter={event => hoverAtPoint.current(event.clientX, event.clientY)}
      onPointerMove={event => hoverAtPoint.current(event.clientX, event.clientY)}
      onPointerLeave={() => selectLetter.current(null)}
    >
      {signature.letters.map((letter, index) => (
        <span key={index} className="masthead-letter">
          {index === 6 && " "}<span data-name-letter={index}>{letter.name}</span>
        </span>
      ))}
      {" "}
      <span className="masthead-domain">
        <span className="masthead-domain-text">.com</span>
      </span>
      {isClient && (
        <svg className="masthead-hover-svg" viewBox={`0 0 ${signature.width} ${signature.height}`} preserveAspectRatio="none" shapeRendering="geometricPrecision" aria-hidden="true">
          {signature.letters.map((letter, index) => (
            <path key={index} className="masthead-hover-glyph" data-hover-letter={index} d={letter.to} transform={`translate(${letter.shift} 0)`} fill="currentColor" stroke="currentColor" strokeWidth="0" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
      )}
    </Link>
  );
}
