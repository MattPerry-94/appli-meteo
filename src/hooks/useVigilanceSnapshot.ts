import { useCallback, useEffect, useState } from "react";
import { fetchMeteoFranceVigilance, type VigilanceSnapshot } from "@/services/meteoFranceVigilance";

const REFRESH_INTERVAL_MS = 15 * 60 * 1000;
/** En deçà, un nouvel appel réutilise la dernière réponse (accueil puis carte, retour d'onglet…). */
const FRESH_FOR_MS = 5 * 60 * 1000;

// Cache partagé par tous les composants : la carte de vigilance est la même
// pour toute la France, inutile de la télécharger une fois par écran.
let cached: { snapshot: VigilanceSnapshot; at: number } | null = null;
let inFlight: Promise<VigilanceSnapshot> | null = null;

function loadSnapshot(force: boolean) {
  if (!force && cached && Date.now() - cached.at < FRESH_FOR_MS) return Promise.resolve(cached.snapshot);
  if (inFlight) return inFlight;

  inFlight = fetchMeteoFranceVigilance()
    .then((snapshot) => {
      cached = { snapshot, at: Date.now() };
      return snapshot;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/** Carte de vigilance nationale (couleurs par département et par risque). */
export function useVigilanceSnapshot() {
  const [snapshot, setSnapshot] = useState<VigilanceSnapshot | null>(cached?.snapshot ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!cached);

  const load = useCallback((force: boolean, isActive: () => boolean = () => true) => {
    setIsLoading(true);
    return loadSnapshot(force)
      .then((next) => {
        if (!isActive()) return;
        setSnapshot(next);
        setError(null);
      })
      .catch((nextError: unknown) => {
        if (!isActive()) return;
        setError(nextError instanceof Error ? nextError.message : "Vigilances Météo-France indisponibles.");
      })
      .finally(() => {
        if (isActive()) setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    let active = true;
    const isActive = () => active;
    void load(false, isActive);

    function loadIfVisible() {
      if (document.visibilityState === "visible") void load(false, isActive);
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(true, isActive);
    }, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", loadIfVisible);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", loadIfVisible);
    };
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { snapshot, error, isLoading, refresh };
}
