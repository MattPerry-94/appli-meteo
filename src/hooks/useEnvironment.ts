import { useEffect, useState } from "react";
import type { FavoriteCity } from "@/stores/appStore";
import { fetchAirQuality, fetchSeaState, type AirQuality, type SeaState } from "@/services/environment";

/** CAMS et les modèles de vagues sont horaires : 30 minutes suffisent. */
const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

/** Qualité de l'air, pollens et mer de la ville active ; chaque source peut manquer seule. */
export function useEnvironment(city: FavoriteCity) {
  const [air, setAir] = useState<AirQuality | null>(null);
  const [sea, setSea] = useState<SeaState | null>(null);
  const key = `${city.lat.toFixed(3)}:${city.lon.toFixed(3)}`;

  useEffect(() => {
    setAir(null);
    setSea(null);
    const target = city;
    let controller = new AbortController();

    function load() {
      controller.abort();
      controller = new AbortController();
      const { signal } = controller;
      fetchAirQuality(target, { signal })
        .then((next) => !signal.aborted && setAir(next))
        .catch(() => undefined);
      fetchSeaState(target, { signal })
        .then((next) => !signal.aborted && setSea(next))
        .catch(() => undefined);
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
    // Ville identifiée par ses coordonnées (clé) : un objet identique ne relance rien.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { air, sea };
}
