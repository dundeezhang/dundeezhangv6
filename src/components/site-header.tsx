"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { animate } from "motion/react";

// The mobile webring fades out over this much of the header's progress (see globals.css).
const utilityFadeEnd = 0.25;

export function SiteHeader({ children }: { children: ReactNode }) {
  const headerRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const transitionOnNavigation = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    transitionOnNavigation.current();
  }, [pathname]);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const root = document.documentElement;
    let frame = 0;
    let previousProgress = -1;
    let navigating = false;
    let transition: ReturnType<typeof animate> | undefined;

    const scrollProgress = () => {
      const scroll = Math.max(0, window.scrollY);
      return Math.min(scroll / 180, 1);
    };
    const setProgress = (progress: number) => {
      if (progress === previousProgress) return;
      previousProgress = progress;
      header.style.setProperty("--header-progress", String(progress));
      header.toggleAttribute("data-utility-hidden", progress >= utilityFadeEnd);
    };
    const update = () => {
      frame = 0;
      setProgress(scrollProgress());
    };
    const scheduleUpdate = () => {
      if (!frame && !navigating) frame = requestAnimationFrame(update);
    };
    const interruptTransition = () => {
      if (!navigating) return;
      cancelAnimationFrame(frame);
      frame = 0;
      transition?.stop();
      transition = undefined;
      navigating = false;
      scheduleUpdate();
    };
    const onScrollKey = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) {
        interruptTransition();
      }
    };
    const measure = () => {
      root.style.setProperty("--site-header-height", `${header.getBoundingClientRect().height}px`);
    };

    update();
    measure();
    transitionOnNavigation.current = () => {
      cancelAnimationFrame(frame);
      transition?.stop();
      navigating = true;
      // Read the destination scroll position after Next has committed the route.
      // Keep the currently rendered size until then, rather than snapping to zero.
      frame = requestAnimationFrame(() => {
        frame = 0;
        const target = scrollProgress();
        if (target === previousProgress) {
          setProgress(target);
          navigating = false;
          return;
        }
        transition = animate(previousProgress, target, {
          duration: 0.65,
          ease: [0.22, 1, 0.36, 1],
          onUpdate: setProgress,
          onComplete: () => {
            transition = undefined;
            navigating = false;
            update();
          },
        });
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("wheel", interruptTransition, { passive: true });
    window.addEventListener("touchstart", interruptTransition, { passive: true });
    window.addEventListener("keydown", onScrollKey);

    return () => {
      cancelAnimationFrame(frame);
      transition?.stop();
      transitionOnNavigation.current = () => {};
      observer.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("wheel", interruptTransition);
      window.removeEventListener("touchstart", interruptTransition);
      window.removeEventListener("keydown", onScrollKey);
      root.style.removeProperty("--site-header-height");
    };
  }, []);

  return (
    <>
      <div className="site-header-spacer" aria-hidden="true" />
      <header ref={headerRef} className="site-header">
        {children}
      </header>
    </>
  );
}
