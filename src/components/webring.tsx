"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useTheme } from "@/hooks/use-theme";

const webringLinks = [
  {
    href: "https://cs.uwatering.com/#https://dundeezhang.com?nav=prev",
    label: "previous",
    ariaLabel: "Previous site in UWaterloo CS webring",
    title: "Previous site",
  },
  {
    href: "https://cs.uwatering.com/#https://dundeezhang.com",
    label: "webring",
    ariaLabel: "UWaterloo CS webring home",
    title: "UWaterloo CS webring",
    className: "webring-home",
    target: "_blank",
    rel: "noopener noreferrer",
  },
  {
    href: "https://cs.uwatering.com/#https://dundeezhang.com?nav=next",
    label: "next",
    ariaLabel: "Next site in UWaterloo CS webring",
    title: "Next site",
  },
];

export function Webring() {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [focusedLink, setFocusedLink] = useState<string | null>(null);
  const activeLink = hoveredLink ?? focusedLink;
  const restingOpacity = theme === "dark" ? 0.7 : 0.65;

  return (
    <nav
      className="webring"
      aria-label="UWaterloo CS webring"
      onPointerLeave={() => setHoveredLink(null)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocusedLink(null);
      }}
    >
      {webringLinks.map(({ href, label, ariaLabel, ...attributes }) => (
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
