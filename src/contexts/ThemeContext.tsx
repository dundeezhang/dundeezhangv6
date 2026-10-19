"use client";

import { createContext, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { THEME_PREFERENCE_TTL, THEME_STORAGE_KEY } from "@/lib/appearance-bootstrap";

export type Theme = "light" | "dark";

export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isLoaded: boolean;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined,
);

// A manual choice overrides the system theme until it expires.
function hasRecentPreference() {
  try {
    const saved = JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) ?? "null");
    if (saved?.timestamp > Date.now() - THEME_PREFERENCE_TTL) return true;
  } catch {
    // Invalid data is removed below.
  }
  localStorage.removeItem(THEME_STORAGE_KEY);
  return false;
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

// The inline bootstrap resolves the saved or system theme onto <html> before
// first paint, so the document is the source of truth after hydration.
function subscribeToTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ["data-theme"] });
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleSystemThemeChange = (event: MediaQueryListEvent) => {
    if (!hasRecentPreference()) applyTheme(event.matches ? "dark" : "light");
  };
  mediaQuery.addEventListener("change", handleSystemThemeChange);
  return () => {
    observer.disconnect();
    mediaQuery.removeEventListener("change", handleSystemThemeChange);
  };
}

const getTheme = (): Theme =>
  document.documentElement.dataset.theme === "dark" ? "dark" : "light";
const getServerTheme = (): Theme => "light";
const subscribeToNothing = () => () => {};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribeToTheme, getTheme, getServerTheme);
  const isLoaded = useSyncExternalStore(subscribeToNothing, () => true, () => false);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    localStorage.setItem(
      THEME_STORAGE_KEY,
      JSON.stringify({ theme: nextTheme, timestamp: Date.now() }),
    );
    applyTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isLoaded }}>
      {children}
    </ThemeContext.Provider>
  );
}
