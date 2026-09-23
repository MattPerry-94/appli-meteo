import type { FavoriteCity } from "@/stores/appStore";
import type { PollenId } from "@/utils/environment";

export type AirQuality = {
  europeanAqi?: number;
  pm25?: number;
  pm10?: number;
  ozone?: number;
  no2?: number;
  /** Absent hors d'Europe : le modèle de pollens CAMS ne couvre que l'Europe. */
  pollens: Partial<Record<PollenId, number>>;
};

export type SeaState = {
  waveHeightM?: number;
  wavePeriodS?: number;
  waveDirectionDeg?: number;
  waterTempC?: number;
  waveHeightMaxTodayM?: number;
};

const POLLEN_FIELDS: Record<PollenId, string> = {
  alder: "alder_pollen",
  birch: "birch_pollen",
  grass: "grass_pollen",
  mugwort: "mugwort_pollen",
  olive: "olive_pollen",
  ragweed: "ragweed_pollen",
};

function num(block: Record<string, unknown> | undefined, key: string) {
  return typeof block?.[key] === "number" ? (block[key] as number) : undefined;
}

async function getJson(url: URL, signal?: AbortSignal) {
  const res = await fetch(url.toString(), { signal });
  if (!res.ok) throw new Error(`Service indisponible (${res.status}).`);
  return (await res.json()) as { current?: Record<string, unknown>; daily?: Record<string, unknown[]> };
}

/** Qualité de l'air et pollens, modèle CAMS de Copernicus via Open-Meteo. */
export async function fetchAirQuality(city: FavoriteCity, options?: { signal?: AbortSignal }): Promise<AirQuality> {
  const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  url.searchParams.set("latitude", String(city.lat));
  url.searchParams.set("longitude", String(city.lon));
  url.searchParams.set("current", ["european_aqi", "pm2_5", "pm10", "ozone", "nitrogen_dioxide", ...Object.values(POLLEN_FIELDS)].join(","));
  url.searchParams.set("timezone", "auto");
  const { current } = await getJson(url, options?.signal);

  const pollens: AirQuality["pollens"] = {};
  for (const [pollen, field] of Object.entries(POLLEN_FIELDS) as Array<[PollenId, string]>) {
    const value = num(current, field);
    if (value !== undefined) pollens[pollen] = value;
  }

  return {
    europeanAqi: num(current, "european_aqi"),
    pm25: num(current, "pm2_5"),
    pm10: num(current, "pm10"),
    ozone: num(current, "ozone"),
    no2: num(current, "nitrogen_dioxide"),
    pollens,
  };
}

/**
 * État de la mer au point de grille marin le plus proche. Dans les terres,
 * Open-Meteo répond des valeurs nulles : on renvoie alors null, et l'encart
 * ne s'affiche pas.
 */
export async function fetchSeaState(city: FavoriteCity, options?: { signal?: AbortSignal }): Promise<SeaState | null> {
  const url = new URL("https://marine-api.open-meteo.com/v1/marine");
  url.searchParams.set("latitude", String(city.lat));
  url.searchParams.set("longitude", String(city.lon));
  url.searchParams.set("current", "wave_height,wave_direction,wave_period,sea_surface_temperature");
  url.searchParams.set("daily", "wave_height_max");
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set("timezone", "auto");
  const { current, daily } = await getJson(url, options?.signal);

  const sea: SeaState = {
    waveHeightM: num(current, "wave_height"),
    wavePeriodS: num(current, "wave_period"),
    waveDirectionDeg: num(current, "wave_direction"),
    waterTempC: num(current, "sea_surface_temperature"),
    waveHeightMaxTodayM: typeof daily?.wave_height_max?.[0] === "number" ? (daily.wave_height_max[0] as number) : undefined,
  };
  return sea.waveHeightM === undefined && sea.waterTempC === undefined ? null : sea;
}
