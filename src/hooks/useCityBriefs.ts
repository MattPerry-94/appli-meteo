import { useEffect, useMemo, useRef, useState } from "react";
import type { FavoriteCity } from "@/stores/appStore";
import { fetchCityBriefs, type CityBrief } from "@/services/openMeteo";

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

/** Aperçu météo des favoris, rafraîchi toutes les 10 minutes et au retour sur l'onglet. */
export function useCityBriefs(cities: FavoriteCity[]) {
  const [briefs, setBriefs] = useState<Record<string, CityBrief>>({});
  const key = useMemo(() => cities.map((city) => `${city.id}:${city.lat.toFixed(3)}:${city.lon.toFixed(3)}`).join("|"), [cities]);
  const citiesRef = useRef(cities);
  citiesRef.current = cities;

  useEffect(() => {
    if (!citiesRef.current.length) {
      setBriefs({});
      return;
    }

    let controller = new AbortController();

    function load() {
      controller.abort();
      controller = new AbortController();
      const { signal } = controller;
      fetchCityBriefs(citiesRef.current, { signal })
        .then((list) => {
          if (!signal.aborted) setBriefs(Object.fromEntries(list.map((brief) => [brief.cityId, brief])));
        })
        .catch(() => {
          // Aperçu secondaire : on garde les dernières valeurs connues.
        });
    }

    function loadIfVisible() {
      if (document.visibilityState === "visible") load();
    }

    load();
    const interval = window.setInterval(loadIfVisible, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", loadIfVisible);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", loadIfVisible);
    };
  }, [key]);

  return briefs;
}
