"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { ChatTheme, getThemeById, obsidian } from "@/lib/themes";

interface ThemeCtx {
  theme: ChatTheme;
  setThemeId: (id: string) => void;
}

const ThemeContext = createContext<ThemeCtx>({
  theme: obsidian,
  setThemeId: () => {},
});

const STORAGE_KEY = "ib_theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ChatTheme>(obsidian);

  // Load saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setTheme(getThemeById(saved));
  }, []);

  // Apply theme to document body so all pages inherit it
  useEffect(() => {
    document.body.style.background = theme.bg;
    document.body.style.color = theme.text;
    document.body.style.fontFamily = theme.fontBody;
    // Update meta theme-color for mobile browser chrome
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme.bg);
  }, [theme]);

  const setThemeId = useCallback((id: string) => {
    const t = getThemeById(id);
    setTheme(t);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setThemeId }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Returns the active ChatTheme. Use this in any component that needs theme colors. */
export function useTheme(): ChatTheme {
  return useContext(ThemeContext).theme;
}

/** Returns [theme, setThemeId] — use in settings/picker UIs. */
export function useThemeSwitch(): [ChatTheme, (id: string) => void] {
  const { theme, setThemeId } = useContext(ThemeContext);
  return [theme, setThemeId];
}
