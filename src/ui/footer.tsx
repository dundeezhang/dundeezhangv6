"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { BadgeShelf } from "@/components/badge-shelf";
import { useTheme } from "@/hooks/use-theme";

const socialLinks = [
  { href: "https://x.com/dundeez", label: "X" },
  { href: "https://github.com/dundeezhang", label: "GitHub" },
  { href: "https://linkedin.com/in/dundeezhang", label: "LinkedIn" },
  { href: "mailto:dh2zhang@uwaterloo.ca", label: "Email" },
];

export function Footer() {
  const footerRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  const [hoveredSocial, setHoveredSocial] = useState<string | null>(null);
  const [focusedSocial, setFocusedSocial] = useState<string | null>(null);
  const activeSocial = hoveredSocial ?? focusedSocial;
  const restingOpacity = theme === "dark" ? 0.7 : 0.65;

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;

    const root = document.documentElement;
    const updateHeight = () => {
      root.style.setProperty("--site-footer-height", `${footer.offsetHeight}px`);
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(footer);

    return () => {
      observer.disconnect();
      root.style.removeProperty("--site-footer-height");
    };
  }, []);

  useEffect(() => {
    const footer = footerRef.current;
    const content = document.querySelector("#main-content > .page-content");
    if (!footer || !content) return;

    let frame = 0;
    const updateShadow = () => {
      frame = 0;
      const footerBounds = footer.getBoundingClientRect();
      const contentBounds = content.getBoundingClientRect();
      footer.dataset.overContent = String(
        contentBounds.top < footerBounds.bottom && contentBounds.bottom > footerBounds.top,
      );
    };
    const scheduleUpdate = () => {
      if (!frame) frame = requestAnimationFrame(updateShadow);
    };

    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(content);
    observer.observe(footer);
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    scheduleUpdate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      delete footer.dataset.overContent;
    };
  }, [pathname]);

  return (
    <footer ref={footerRef} className="site-footer">
      <div className="footer-start">
        <BadgeShelf />
        <div className="footer-meta">
          <ThemeToggle />
          <p>dundeezhang.com</p>
        </div>
      </div>
      <nav
        className="footer-links"
        aria-label="Social links"
        onPointerLeave={() => setHoveredSocial(null)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setFocusedSocial(null);
        }}
      >
        {socialLinks.map(({ href, label }) => (
          <motion.a
            key={href}
            href={href}
            target={href.startsWith("https:") ? "_blank" : undefined}
            rel={href.startsWith("https:") ? "noopener noreferrer" : undefined}
            style={{ transition: "none" }}
            initial={false}
            animate={{ opacity: activeSocial ? (activeSocial === label ? 1 : 0.25) : restingOpacity }}
            transition={{ duration: reducedMotion ? 0 : 0.16, ease: "easeInOut" }}
            onPointerEnter={(event) => {
              if (event.pointerType !== "touch") setHoveredSocial(label);
            }}
            onFocus={() => setFocusedSocial(label)}
          >
            {label}
          </motion.a>
        ))}
      </nav>
    </footer>
  );
}
