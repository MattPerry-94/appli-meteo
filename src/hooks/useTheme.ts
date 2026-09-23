import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function readSavedTheme(): Theme | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : null;
  } catch {
    return null;
  }
}

function readSystemTheme(): Theme {
  return typeof window.matchMedia === "function" && window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

/**
 * Thème clair / sombre. Tant que l'utilisateur n'a rien choisi, on suit le
 * réglage du système, y compris quand il change en cours de visite ; un clic
 * sur le bouton fige ensuite le choix.
 *
 * La classe est posée dès le chargement par le script inline d'index.html,
 * avant le premier rendu : sans lui, le mode sombre commençait par un flash
 * blanc. Ce hook reprend la main ensuite.
 */
export function useTheme() {
  const [savedTheme, setSavedTheme] = useState<Theme | null>(readSavedTheme);
  const [systemTheme, setSystemTheme] = useState<Theme>(readSystemTheme);
  const theme = savedTheme ?? systemTheme;

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) => setSystemTheme(event.matches ? "dark" : "light");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    root.style.colorScheme = theme;
  }, [theme]);

  const toggleTheme = () => {
    const next: Theme = theme === "light" ? "dark" : "light";
    setSavedTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Stockage indisponible (navigation privée) : le choix vaut pour la session.
    }
  };

  return {
    theme,
    toggleTheme,
    isDark: theme === "dark",
  };
}
