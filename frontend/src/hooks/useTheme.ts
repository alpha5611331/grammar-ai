import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "grammar-ai-theme";

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getStoredTheme(): Theme | null {
  const value = localStorage.getItem(STORAGE_KEY);
  return value === "light" || value === "dark" ? value : null;
}

function applyTheme(theme: Theme | null): void {
  if (theme) {
    document.documentElement.setAttribute("data-theme", theme);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

// Theme resolution: defaults to following the OS (index.css's
// @media (prefers-color-scheme: dark)), with an explicit override settable via
// the titlebar's toggle button, persisted in localStorage and applied as
// data-theme="light"/"dark" on <html> (see index.css's :root[data-theme=...]
// blocks). While no explicit choice has been made, the OS preference is tracked
// live so the button's icon (and the app's appearance) follows a live OS-level
// theme change without needing a reload.
export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(
    () => getStoredTheme() ?? (systemPrefersDark() ? "dark" : "light")
  );

  useEffect(() => {
    const stored = getStoredTheme();
    applyTheme(stored);
    if (stored) return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (getStoredTheme()) return; // an explicit choice was made since mount - ignore OS changes
      setTheme(mq.matches ? "dark" : "light");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
      return next;
    });
  }, []);

  return { theme, toggle };
}
