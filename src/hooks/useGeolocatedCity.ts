import { useCallback, useEffect, useRef, useState } from "react";
import { reverseGeocodeCity, type OpenMeteoGeocodingResult } from "@/services/openMeteo";
import { useAppStore, type FavoriteCity } from "@/stores/appStore";

const POSITION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 10000,
  maximumAge: 1000 * 60 * 30,
};

export function toFavoriteCity(result: OpenMeteoGeocodingResult): FavoriteCity {
  return {
    id: result.id,
    name: result.name,
    adminArea: result.adminArea,
    departmentCode: result.departmentCode,
    postalCode: result.postalCode,
    countryCode: result.countryCode,
    lat: result.lat,
    lon: result.lon,
  };
}

function getPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, POSITION_OPTIONS);
  });
}

/**
 * Ville du navigateur : tentée une seule fois automatiquement à la première
 * visite (tant que l'utilisateur n'a pas choisi de ville lui-même), puis à la
 * demande via locate().
 */
export function useGeolocatedCity() {
  const citySource = useAppStore((s) => s.citySource);
  const hasAttemptedBrowserLocation = useAppStore((s) => s.hasAttemptedBrowserLocation);
  const setActiveCity = useAppStore((s) => s.setActiveCity);
  const markBrowserLocationAttempted = useAppStore((s) => s.markBrowserLocationAttempted);

  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /** Renvoie true si une ville a été trouvée et activée. */
  const resolveCity = useCallback(
    async (reportErrors: boolean) => {
      if (!navigator.geolocation) {
        if (reportErrors) setError("La géolocalisation du navigateur n'est pas disponible.");
        return false;
      }

      setIsLocating(true);
      setError(null);
      try {
        const position = await getPosition();
        const resolved = await reverseGeocodeCity(position.coords.latitude, position.coords.longitude);
        if (!mountedRef.current) return false;
        if (resolved) {
          setActiveCity(toFavoriteCity(resolved), "browser");
          return true;
        }
        if (reportErrors) setError("Impossible d'identifier une ville depuis la position du navigateur.");
        return false;
      } catch {
        if (mountedRef.current && reportErrors) setError("Le navigateur n'a pas fourni de position exploitable.");
        return false;
      } finally {
        if (mountedRef.current) setIsLocating(false);
      }
    },
    [setActiveCity],
  );

  // Garde-fou : la ville trouvée change citySource, ce qui relancerait l'effet
  // avant que la tentative soit marquée comme faite.
  const autoAttemptedRef = useRef(false);

  useEffect(() => {
    if (autoAttemptedRef.current || hasAttemptedBrowserLocation || citySource === "manual" || !navigator.geolocation) return;
    autoAttemptedRef.current = true;
    void resolveCity(false).finally(markBrowserLocationAttempted);
  }, [citySource, hasAttemptedBrowserLocation, markBrowserLocationAttempted, resolveCity]);

  const locate = useCallback(() => resolveCity(true), [resolveCity]);

  return { isLocating, error, locate };
}
