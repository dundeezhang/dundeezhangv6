"use client";

import { Sun, Moon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTheme } from "@/hooks/use-theme";
import { DEFAULT_ICON_SIZE } from "@/constants/icons";

export function ThemeToggle() {
  const { theme, toggleTheme, isLoaded } = useTheme();
  const reducedMotion = useReducedMotion();
  const Icon = theme === "light" ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      disabled={!isLoaded}
      className="theme-toggle-btn"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      aria-pressed={theme === "dark"}
    >
      <span className="theme-toggle-hover" aria-hidden="true">
        <AnimatePresence initial={false}>
          <motion.span
            key={theme}
            className="theme-toggle-glyph"
            initial={{ opacity: 0, rotate: -180, scale: 0.65 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 180, scale: 0.65 }}
            transition={{ duration: reducedMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <Icon size={DEFAULT_ICON_SIZE} aria-hidden="true" />
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
  );
}
