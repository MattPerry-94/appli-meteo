import type { FavoriteCity } from "@/stores/appStore";

/**
 * Ville dans l'URL : /?ville=Nice&lat=43.7034&lon=7.2663&dep=06&pays=FR.
 * Les coordonnées suffisent à tout recalculer ; le nom, le département et le
 * pays évitent un géocodage à l'ouverture du lien.
 */
const KEYS = ["ville", "lat", "lon", "cp", "dep", "pays"] as const;

export function cityToParams(city: FavoriteCity) {
  const params: Record<string, string> = {
    ville: city.name,
    lat: city.lat.toFixed(4),
    lon: city.lon.toFixed(4),
  };
  if (city.postalCode) params.cp = city.postalCode;
  if (city.departmentCode) params.dep = city.departmentCode;
  if (city.countryCode) params.pays = city.countryCode;
  return params;
}

export function cityFromParams(params: URLSearchParams): FavoriteCity | null {
  const name = params.get("ville")?.trim();
  const rawLat = params.get("lat")?.trim();
  const rawLon = params.get("lon")?.trim();
  // Number(null) vaut 0 : sans ce test, un lien sans coordonnées placerait la
  // ville au large du golfe de Guinée.
  if (!rawLat || !rawLon) return null;
  const lat = Number(rawLat);
  const lon = Number(rawLon);
  if (!name || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;

  const postalCode = params.get("cp")?.trim() || undefined;
  const departmentCode = params.get("dep")?.trim().toUpperCase() || undefined;
  const countryCode = params.get("pays")?.trim().toUpperCase() || undefined;

  return {
    id: `${name}-${lat.toFixed(4)}-${lon.toFixed(4)}`.toLowerCase().split(" ").join("-"),
    name: name.slice(0, 80),
    lat,
    lon,
    ...(postalCode ? { postalCode } : {}),
    ...(departmentCode ? { departmentCode } : {}),
    ...(countryCode ? { countryCode } : {}),
  };
}

/** Paramètres courants sans ceux de la ville (on garde par exemple ?vue=vigilances). */
export function withoutCityParams(params: URLSearchParams) {
  const next = new URLSearchParams(params);
  for (const key of KEYS) next.delete(key);
  return next;
}

/** Lien absolu vers la ville, à partager. */
export function shareUrlFor(city: FavoriteCity, origin = window.location.origin) {
  return `${origin}/?${new URLSearchParams(cityToParams(city)).toString()}`;
}
