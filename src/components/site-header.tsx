"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { animate } from "motion/react";

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
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previousProgress = -1;
    let navigating = false;
    let transition: ReturnType<typeof animate> | undefined;

    const scrollProgress = () => {
      const scroll = Math.max(0, window.scrollY);
      return reducedMotion.matches
        ? Number(scroll > 90)
        : Math.min(scroll / 180, 1);
    };
    const setProgress = (progress: number) => {
      if (progress === previousProgress) return;
      previousProgress = progress;
      header.style.setProperty("--header-progress", String(progress));
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
    const onMotionPreferenceChange = () => {
      interruptTransition();
      scheduleUpdate();
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
        if (reducedMotion.matches || target === previousProgress) {
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
    reducedMotion.addEventListener("change", onMotionPreferenceChange);

    return () => {
      cancelAnimationFrame(frame);
      transition?.stop();
      transitionOnNavigation.current = () => {};
      observer.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("wheel", interruptTransition);
      window.removeEventListener("touchstart", interruptTransition);
      window.removeEventListener("keydown", onScrollKey);
      reducedMotion.removeEventListener("change", onMotionPreferenceChange);
      root.style.removeProperty("--site-header-height");
    };
  }, []);

  useEffect(() => {
    const header = headerRef.current;
    const content = document.querySelector("#main-content > .page-content");
    if (!header || !content) return;

    let frame = 0;
    const updateShadow = () => {
      frame = 0;
      const headerBounds = header.getBoundingClientRect();
      const contentBounds = content.getBoundingClientRect();
      header.dataset.overContent = String(
        contentBounds.top < headerBounds.bottom && contentBounds.bottom > headerBounds.top,
      );
    };
    const scheduleUpdate = () => {
      if (!frame) frame = requestAnimationFrame(updateShadow);
    };

    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(content);
    observer.observe(header);
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    scheduleUpdate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      delete header.dataset.overContent;
    };
  }, [pathname]);

  return (
    <>
      <div className="site-header-spacer" aria-hidden="true" />
      <header ref={headerRef} className="site-header">
        {children}
      </header>
    </>
  );
}
