"use client";

import { useEffect, useRef } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { BadgeShelf } from "@/components/badge-shelf";
import { FadeLinks, type FadeLink } from "@/components/fade-links";

const newTab = { target: "_blank", rel: "noopener noreferrer" };

const socialLinks: FadeLink[] = [
  { href: "https://x.com/dundeez", label: "X", ...newTab },
  { href: "https://github.com/dundeezhang", label: "GitHub", ...newTab },
  { href: "https://linkedin.com/in/dundeezhang", label: "LinkedIn", ...newTab },
  { href: "mailto:dh2zhang@uwaterloo.ca", label: "Email" },
];

export function Footer() {
  const footerRef = useRef<HTMLElement>(null);

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

  return (
    <footer ref={footerRef} className="site-footer">
      <div className="footer-start">
        <BadgeShelf />
        <div className="footer-meta">
          <ThemeToggle />
          <p>dundeezhang.com</p>
        </div>
      </div>
      <FadeLinks className="footer-links" aria-label="Social links" links={socialLinks} />
    </footer>
  );
}
