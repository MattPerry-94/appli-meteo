import { useEffect, useState } from "react";
import type { FavoriteCity } from "@/stores/appStore";
import { fetchModelScores, type ModelScoreReport } from "@/services/modelScores";

// La réanalyse n'avance que d'un jour par jour : un calcul par ville et par
// session suffit, y compris quand on revient sur une ville déjà vue.
const cache = new Map<string, ModelScoreReport>();

export function useModelScores(city: FavoriteCity) {
  const key = `${city.lat.toFixed(3)}:${city.lon.toFixed(3)}`;
  const [report, setReport] = useState<ModelScoreReport | null>(cache.get(key) ?? null);
  const [isLoading, setIsLoading] = useState(!cache.has(key));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const cached = cache.get(key);
    setReport(cached ?? null);
    setFailed(false);
    if (cached) {
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    fetchModelScores(city, { signal: controller.signal })
      .then((next) => {
        cache.set(key, next);
        if (!controller.signal.aborted) setReport(next);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
    // La ville est identifiée par ses coordonnées (clé) : un nouvel objet
    // identique ne doit pas relancer le calcul.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { report, isLoading, failed };
}
