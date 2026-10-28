"use client";

import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { animate, cubicBezier, mix } from "motion/react";
import signature from "@/data/signature-animation.json";

// These pen routes reveal the filled, pressure-shaped outlines in writing order.
const strokes = [
  { letter: 0, width: 28, duration: 0.14, d: "M101 98 C105 160 115 251 130 322" },
  { letter: 0, width: 48, duration: 0.38, d: "M26 87 C14 91 12 89 30 80 C105 37 220 45 277 105 C339 164 298 277 218 365 C175 407 99 450 69 432 C24 402 98 350 149 328" },
  { letter: 1, width: 28, duration: 0.13, d: "M323 199 C318 218 333 280 353 278 C379 279 363 222 360 200" },
  { letter: 2, width: 30, duration: 0.13, d: "M385 196 C387 217 398 254 403 265 C396 228 411 193 424 218 C433 233 433 251 438 265" },
  { letter: 3, width: 34, duration: 0.2, d: "M529 233 C510 215 484 207 469 220 C445 243 457 281 483 274 C504 268 522 252 539 241 L558 236" },
  { letter: 3, width: 22, duration: 0.12, d: "M530 231 C513 178 503 117 501 74" },
  { letter: 4, width: 34, duration: 0.12, d: "M558 237 C551 229 556 199 562 202 C570 211 551 248 583 256 C595 259 608 246 620 237" },
  { letter: 5, width: 34, duration: 0.12, d: "M620 238 C616 223 618 201 626 205 C637 228 612 243 641 254 C656 261 667 259 678 251" },
  { letter: 6, width: 44, duration: 0.34, d: "M770 42 C808 22 885 13 914 32 C942 55 859 161 798 252 C782 278 782 285 808 283 C874 278 960 270 1019 269" },
  { letter: 7, width: 32, duration: 0.21, d: "M1013 48 C1011 79 1037 159 1048 211 C1036 174 1048 145 1064 158 C1083 173 1081 211 1093 204" },
  { letter: 8, width: 32, duration: 0.12, d: "M1118 160 C1104 158 1101 200 1116 204 C1132 212 1139 173 1133 160 C1129 184 1140 202 1150 201" },
  { letter: 9, width: 32, duration: 0.12, d: "M1168 166 C1168 178 1179 206 1178 187 C1180 158 1199 159 1214 183" },
  { letter: 10, width: 44, duration: 0.28, d: "M1284 167 C1264 155 1252 167 1253 187 C1258 210 1273 183 1282 177 C1294 166 1310 259 1294 337 C1282 406 1247 411 1251 372 C1252 335 1283 286 1300 274" },
];

const writingDuration = strokes.reduce((total, stroke) => total + stroke.duration * 0.8, 0);
const writingPace = (writingDuration - 0.9) / writingDuration;

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function SignatureIntro() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const maskId = useId().replace(/:/g, "");
  const isClient = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);

  useEffect(() => {
    const html = document.documentElement;
    const overlay = overlayRef.current;
    if (!isClient || !overlay || html.dataset.signatureIntro !== "pending") return;

    const controls = new Set<{ stop: () => void }>();
    let cancelled = false;

    const finish = () => {
      cancelled = true;
      controls.forEach(control => control.stop());
      controls.clear();
      delete html.dataset.signatureIntro;
      overlay.dataset.phase = "done";
    };
    const track = <T extends { stop: () => void }>(control: T): T => {
      controls.add(control);
      return control;
    };

    // Interaction should always reach the server-rendered page immediately.
    document.addEventListener("pointerdown", finish, { once: true, capture: true });
    document.addEventListener("keydown", finish, { once: true, capture: true });
    window.addEventListener("wheel", finish, { once: true, passive: true });
    window.addEventListener("resize", finish, { once: true });
    const failSafe = window.setTimeout(finish, 6500);

    async function play() {
      const heading = document.querySelector<HTMLElement>(".masthead");
      const mark = overlay!.querySelector<HTMLElement>(".signature-mark");
      const curtain = overlay!.querySelector<HTMLElement>(".signature-curtain");
      if (!heading || !mark || !curtain || window.scrollY > 10) {
        finish();
        return;
      }

      const typography = getComputedStyle(heading);
      const fontSize = Number.parseFloat(typography.fontSize);
      const font = `${typography.fontWeight} ${fontSize}px ${typography.fontFamily}`;
      await Promise.race([
        document.fonts.load(font, "Dundee Zhang"),
        new Promise(resolve => window.setTimeout(resolve, 1200)),
      ]);
      if (cancelled) return;
      if (!document.fonts.check(font, "Dundee Zhang") || window.scrollY > 10) {
        finish();
        return;
      }

      // Let the resting name finish its font measurement, then land on its
      // actual SVG viewport rather than estimating a second text baseline.
      await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()));
      if (cancelled) return;
      const restingName = document.querySelector<SVGSVGElement>(".masthead-name[data-outline-ready] .masthead-hover-svg");
      if (!restingName) { finish(); return; }
      const rect = restingName.getBoundingClientRect();
      const width = Math.min(window.innerWidth * 0.86, window.innerHeight * 1.8, 1600);
      const scale = width / signature.width;
      const start = {
        left: (window.innerWidth - width) / 2,
        top: (window.innerHeight - signature.height * scale) / 2,
        width: width / signature.sourceXScale,
        height: signature.height * scale,
      };
      const end = {
        left: rect.left, top: rect.top, width: rect.width, height: rect.height,
      };
      // Native SVG viewport dimensions keep masks and paths crisp at any DPR.
      // A transformed compositor layer can cache the large signature as pixels.
      Object.assign(mark.style, {
        left: `${start.left}px`, top: `${start.top}px`,
        width: `${start.width}px`, height: `${start.height}px`,
      });
      html.dataset.signatureIntro = "playing";
      overlay!.dataset.phase = "writing";

      const penPaths = overlay!.querySelectorAll<SVGPathElement>("[data-signature-stroke]");
      const glyphPaths = overlay!.querySelectorAll<SVGPathElement>("[data-signature-letter]");
      for (let i = 0; i < penPaths.length; i++) {
        if (cancelled) return;
        const pen = penPaths[i];
        const glyph = glyphPaths[strokes[i].letter];
        const length = pen.getTotalLength();
        // A gap longer than the path keeps the next rounded dash cap from
        // exposing ink at the unwritten end, particularly in Chromium.
        pen.setAttribute("stroke-dasharray", `${length} ${length + strokes[i].width + 2}`);
        pen.setAttribute("stroke-dashoffset", String(length));
        await track(animate(0, 1, {
          duration: strokes[i].duration * 0.8 * writingPace,
          ease: [0.65, 0, 0.35, 1],
          onUpdate: progress => {
            pen.setAttribute("stroke-dashoffset", String(length * (1 - progress)));
            if (progress > 0) {
              pen.setAttribute("visibility", "visible");
              glyph.setAttribute("visibility", "visible");
            }
          },
        }));
      }
      if (cancelled) return;

      overlay!.dataset.phase = "moving";
      glyphPaths.forEach(path => {
        path.removeAttribute("mask");
        path.setAttribute("visibility", "visible");
      });
      const travel = track(animate(mark, {
        left: [start.left, end.left], top: [start.top, end.top],
        width: [start.width, end.width], height: [start.height, end.height],
      }, { duration: 0.85, ease: [0.87, 0, 0.13, 1] }));
      track(animate(curtain, { opacity: [1, 0] }, { duration: 0.75, delay: 0.4, ease: "easeInOut" }));
      await travel;
      if (cancelled) return;

      overlay!.dataset.phase = "morphing";
      const letterDuration = 0.16;
      const step = (0.8 - letterDuration) / (signature.letters.length - 1);
      const easeLetter = cubicBezier(0.65, 0, 0.25, 1);
      const mixers = signature.letters.map(letter => mix(letter.from, letter.to));
      await track(animate(0, 0.8, {
        duration: 0.8,
        ease: "linear",
        onUpdate: seconds => {
          const progress = signature.letters.map((_, i) => easeLetter(Math.max(0, Math.min(1, (seconds - i * step) / letterDuration))));
          let shift = signature.letters[0].shift * progress[0];
          glyphPaths.forEach((path, i) => {
            if (i > 0) shift += (signature.letters[i].shift - signature.letters[i - 1].shift) * progress[i - 1];
            path.setAttribute("transform", `translate(${shift} 0)`);
            path.setAttribute("d", mixers[i](progress[i]));
          });
        },
      }));
      if (cancelled) return;

      // Identical outlines occupy identical coordinates. Swap visibility in
      // one paint instead of crossfading two renderings of the same letters.
      finish();
    }

    // Deferring a frame keeps React Strict Mode's setup/cleanup rehearsal inert.
    const firstFrame = window.requestAnimationFrame(() => { void play().catch(finish); });
    return () => {
      cancelled = true;
      controls.forEach(control => control.stop());
      window.cancelAnimationFrame(firstFrame);
      window.clearTimeout(failSafe);
      document.removeEventListener("pointerdown", finish, true);
      document.removeEventListener("keydown", finish, true);
      window.removeEventListener("wheel", finish);
      window.removeEventListener("resize", finish);
    };
  }, [isClient]);

  return (
    <div ref={overlayRef} className="signature-intro" data-phase="pending" aria-hidden="true">
      <div className="signature-curtain" />
      {isClient && <div className="signature-mark">
        <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox={`0 0 ${signature.width} ${signature.height}`} preserveAspectRatio="none" shapeRendering="geometricPrecision">
          <defs>
            <clipPath id={`${maskId}-d-stem`} clipPathUnits="userSpaceOnUse">
              <path d={signature.letters[0].stem} />
            </clipPath>
            {signature.letters.map((letter, index) => (
              <mask key={`${letter.name}-${index}`} id={`${maskId}-letter-${index}`} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="-32" y="-32" width={signature.width + 64} height={signature.height + 64}>
                {strokes.filter(stroke => stroke.letter === index).map((stroke, i) => (
                  <g key={i} clipPath={index === 0 && i === 0 ? `url(#${maskId}-d-stem)` : undefined}>
                    <path data-signature-stroke={stroke.letter} d={stroke.d} transform={`scale(${signature.sourceXScale} 1)`} fill="none" stroke="white" strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="0 1" strokeDashoffset="1" visibility="hidden" />
                  </g>
                ))}
              </mask>
            ))}
          </defs>
          {signature.letters.map((letter, index) => (
            <path key={`${letter.name}-${index}`} data-signature-letter={index} d={letter.from} fill="currentColor" mask={`url(#${maskId}-letter-${index})`} visibility="hidden" />
          ))}
        </svg>
      </div>}
    </div>
  );
}
