"use client";

import { useState } from "react";
import type { ComponentProps } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useTheme } from "@/hooks/use-theme";

export interface FadeLink {
  href: string;
  label: string;
  ariaLabel?: string;
  title?: string;
  className?: string;
  target?: string;
  rel?: string;
}

type FadeLinksProps = Pick<ComponentProps<"nav">, "className" | "aria-label"> & {
  links: FadeLink[];
};

// Hovering or focusing one link brings it forward and fades its siblings.
export function FadeLinks({ links, ...navProps }: FadeLinksProps) {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [focusedLink, setFocusedLink] = useState<string | null>(null);
  const activeLink = hoveredLink ?? focusedLink;
  const restingOpacity = theme === "dark" ? 0.7 : 0.65;

  return (
    <nav
      {...navProps}
      onPointerLeave={() => setHoveredLink(null)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocusedLink(null);
      }}
    >
      {links.map(({ href, label, ariaLabel, ...attributes }) => (
        <motion.a
          key={href}
          href={href}
          aria-label={ariaLabel}
          {...attributes}
          style={{ transition: "none" }}
          initial={false}
          animate={{ opacity: activeLink ? (activeLink === label ? 1 : 0.25) : restingOpacity }}
          transition={{ duration: reducedMotion ? 0 : 0.16, ease: "easeInOut" }}
          onPointerEnter={(event) => {
            if (event.pointerType !== "touch") setHoveredLink(label);
          }}
          onFocus={() => setFocusedLink(label)}
        >
          {label}
        </motion.a>
      ))}
    </nav>
  );
}
