"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { ThemeId, ThemeDefinition } from "@/lib/types";
import { getTheme, defaultTheme } from "@/lib/themes";

// ─── Context ──────────────────────────────────────────────────────────────────

interface ThemeContextValue {
  themeId: ThemeId;
  theme: ThemeDefinition;
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeId: "classic-chat",
  theme: defaultTheme,
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultThemeId?: ThemeId;
}

export function ThemeProvider({
  children,
  defaultThemeId = "classic-chat",
}: ThemeProviderProps) {
  const [themeId, setThemeId] = useState<ThemeId>(defaultThemeId);

  const setTheme = useCallback((id: ThemeId) => {
    setThemeId(id);
    if (typeof window !== "undefined") {
      localStorage.setItem("chirpie-theme", id);
    }
  }, []);

  // Restore from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("chirpie-theme") as ThemeId | null;
    if (stored) setThemeId(stored);
  }, []);

  const theme = getTheme(themeId);

  return (
    <ThemeContext.Provider value={{ themeId, theme, setTheme }}>
      <div data-theme={themeId} className="min-h-screen transition-colors duration-300">
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
