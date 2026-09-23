import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { isSameCity, useAppStore } from "@/stores/appStore";
import { cityFromParams, cityToParams, withoutCityParams } from "@/utils/cityUrl";

/**
 * À appeler une fois, avant le premier rendu : une ville présente dans l'URL
 * (lien partagé) devient la ville active. Fait avant React, et non dans un
 * effet, pour que la géolocalisation automatique de l'accueil voie déjà une
 * ville choisie et ne la remplace pas.
 */
export function applyCityFromUrl(search = window.location.search) {
  const city = cityFromParams(new URLSearchParams(search));
  if (!city) return;
  const { activeCity, setActiveCity } = useAppStore.getState();
  if (!isSameCity(city, activeCity)) setActiveCity(city, "manual");
}

/** Garde l'URL alignée sur la ville active, sans ajouter d'entrée d'historique. */
export function useCityUrlSync() {
  const activeCity = useAppStore((s) => s.activeCity);
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    const next = withoutCityParams(params);
    for (const [key, value] of Object.entries(cityToParams(activeCity))) next.set(key, value);
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
  }, [activeCity, params, setParams]);
}
