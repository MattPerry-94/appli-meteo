import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FavoriteCity } from "@/stores/appStore";
import type { CityForecastModelSet } from "@/services/openMeteo";
import { fetchForecastModelSet } from "@/services/openMeteo";

/** Les modèles Open-Meteo ne sont pas réactualisés plus d'une fois par heure. */
const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

export function useForecastBundles(cities: FavoriteCity[]) {
  const [bundles, setBundles] = useState<Record<string, CityForecastModelSet>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  // Les villes sont identifiées par cette clé : c'est l'identité du tableau qui
  // change à chaque rendu du parent, pas son contenu.
  const key = useMemo(() => cities.map((city) => `${city.id}:${city.lat.toFixed(4)}:${city.lon.toFixed(4)}`).join("|"), [cities]);

  // Garde `cities` hors des dépendances de l'effet, qui relancerait sinon un
  // fetch à chaque rendu.
  const citiesRef = useRef(cities);
  citiesRef.current = cities;

  // Empêche les rafraîchissements de s'empiler quand on bascule rapidement
  // d'onglet pendant qu'une requête est déjà en vol. Le verrou est propre à
  // chaque montage de l'effet (identifié par son signal) : un verrou global
  // bloquait le chargement d'une nouvelle ville tant que la requête annulée de
  // la précédente n'était pas retombée — et, en dev, tout premier chargement
  // (StrictMode monte l'effet deux fois).
  const inFlightSignalRef = useRef<AbortSignal | null>(null);

  const load = useCallback(async (signal: AbortSignal) => {
    if (inFlightSignalRef.current === signal || signal.aborted) return;
    inFlightSignalRef.current = signal;

    const targets = citiesRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const list = await Promise.all(targets.map((city) => fetchForecastModelSet(city, { signal })));
      if (signal.aborted) return;

      const next: Record<string, CityForecastModelSet> = {};
      for (const bundle of list) next[bundle.city.id] = bundle;
      setBundles(next);
      setUpdatedAt(new Date());
    } catch (e) {
      if (signal.aborted) return;
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      if (inFlightSignalRef.current === signal) inFlightSignalRef.current = null;
      if (!signal.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);

    // Rafraîchissement périodique + rattrapage au retour sur l'onglet : sans ça
    // un onglet laissé ouvert affiche indéfiniment les prévisions du moment où
    // il a été chargé.
    function loadIfVisible() {
      if (document.visibilityState === "visible") void load(controller.signal);
    }

    const interval = window.setInterval(loadIfVisible, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", loadIfVisible);

    return () => {
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", loadIfVisible);
    };
  }, [key, load]);

  return { bundles, isLoading, error, updatedAt };
}
