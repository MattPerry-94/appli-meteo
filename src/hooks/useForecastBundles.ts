import { useEffect, useMemo, useState } from "react";
import type { FavoriteCity } from "@/stores/appStore";
import type { CityForecastModelSet } from "@/services/openMeteo";
import { fetchForecastModelSet } from "@/services/openMeteo";

export function useForecastBundles(cities: FavoriteCity[]) {
  const [bundles, setBundles] = useState<Record<string, CityForecastModelSet>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = useMemo(() => cities.map((city) => `${city.id}:${city.lat.toFixed(4)}:${city.lon.toFixed(4)}`).join("|"), [cities]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function run() {
      setIsLoading(true);
      setError(null);
      try {
        const list = await Promise.all(cities.map((city) => fetchForecastModelSet(city, { signal: controller.signal })));
        if (cancelled) return;

        const next: Record<string, CityForecastModelSet> = {};
        for (const bundle of list) next[bundle.city.id] = bundle;
        setBundles(next);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Erreur de chargement");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [cities, key]);

  return { bundles, isLoading, error };
}
