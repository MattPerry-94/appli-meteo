import { useEffect, useState } from "react";
import { fetchMeteoFranceDepartmentBulletin, type MeteoFranceDepartmentBulletin } from "@/services/meteoFranceVigilance";

/** Météo-France met à jour ses bulletins au plus deux fois par jour, sauf événement. */
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Bulletin de vigilance du département, rafraîchi périodiquement et au retour
 * sur l'onglet. null quand aucun bulletin ne concerne le département.
 */
export function useDepartmentBulletin(departmentCode: string | null) {
  const [bulletin, setBulletin] = useState<MeteoFranceDepartmentBulletin | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setBulletin(null);
    if (!departmentCode) {
      setIsLoading(false);
      return;
    }

    let controller = new AbortController();

    function load(showLoading: boolean) {
      controller.abort();
      controller = new AbortController();
      const { signal } = controller;
      if (showLoading) setIsLoading(true);

      fetchMeteoFranceDepartmentBulletin(departmentCode!, { signal })
        .then((next) => {
          if (!signal.aborted) setBulletin(next);
        })
        .catch(() => {
          // Clé absente ou Météo-France indisponible : l'encart ne s'affiche
          // simplement pas, le reste de la page n'en dépend pas.
          if (!signal.aborted) setBulletin(null);
        })
        .finally(() => {
          if (!signal.aborted) setIsLoading(false);
        });
    }

    function loadIfVisible() {
      if (document.visibilityState === "visible") load(false);
    }

    load(true);
    const interval = window.setInterval(loadIfVisible, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", loadIfVisible);

    return () => {
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", loadIfVisible);
    };
  }, [departmentCode]);

  return { bulletin, isLoading };
}
