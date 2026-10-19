"use client";

import { useContext } from "react";
import { ThemeContext } from "../contexts/ThemeContextTypes";
import type { ThemeContextType } from "../contexts/ThemeContextTypes";

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
};
