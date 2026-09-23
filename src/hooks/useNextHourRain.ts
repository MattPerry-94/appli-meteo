import { useEffect, useState } from "react";
import type { FavoriteCity } from "@/stores/appStore";
import { fetchNextHourRain } from "@/services/openMeteo";
import type { RainSlot } from "@/utils/nextHourRain";

/** Les données au quart d'heure bougent vite : rafraîchies toutes les 5 minutes. */
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export function useNextHourRain(city: FavoriteCity) {
  const [slots, setSlots] = useState<RainSlot[] | null>(null);
  const [fine, setFine] = useState(true);

  const cityKey = `${city.lat.toFixed(4)}:${city.lon.toFixed(4)}:${city.countryCode ?? ""}`;

  useEffect(() => {
    setSlots(null);
    let controller = new AbortController();
    const target = city;

    function load() {
      controller.abort();
      controller = new AbortController();
      const { signal } = controller;
      fetchNextHourRain(target, { signal })
        .then((result) => {
          if (signal.aborted) return;
          setSlots(result.slots);
          setFine(result.fine);
        })
        .catch(() => {
          // Encart secondaire : en cas d'échec il disparaît, sans message.
          if (!signal.aborted) setSlots(null);
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
    // La ville est identifiée par ses coordonnées : un nouvel objet identique
    // ne doit pas relancer la requête.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityKey]);

  return { slots, fine };
}
