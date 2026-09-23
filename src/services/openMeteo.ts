import type { FavoriteCity } from "@/stores/appStore";
import {
  chooseRepresentativeWeatherCode,
  computeReliabilityLabel,
  halfSpread,
  hoursBetween,
  modelWeight,
  rangeOf,
  weightedAverage,
  type ReliabilityLabel,
} from "@/utils/forecastConsensus";
import { departmentCodeFromName, departmentCodeFromPostalCode, isDepartmentCode } from "@/utils/department";
import { cityNowHourISO } from "@/utils/time";

export type ForecastSourceId = "arome" | "gfs" | "ecmwf";
export type ForecastViewId = ForecastSourceId | "consensus";

export type OpenMeteoGeocodingResult = {
  id: string;
  name: string;
  adminArea?: string;
  departmentCode?: string;
  postalCode?: string;
  countryCode?: string;
  lat: number;
  lon: number;
};

export type CurrentWeather = {
  /** Optionnel : une valeur absente doit rester absente, pas retomber sur 0 °C. */
  tempC?: number;
  /** Consensus seulement : demi-écart de température entre modèles. */
  tempSpreadC?: number;
  apparentTempC?: number;
  windKph?: number;
  windGustKph?: number;
  precipMm?: number;
  humidityPct?: number;
  weatherCode?: number;
  isDay?: boolean;
  reliability?: ReliabilityLabel | null;
  availableModels?: ForecastSourceId[];
};

export type DailyForecast = {
  dateISO: string;
  tempMinC?: number;
  tempMaxC?: number;
  /** Consensus seulement : demi-écarts entre modèles, et fourchette de pluie. */
  tempMinSpreadC?: number;
  tempMaxSpreadC?: number;
  precipProbabilityRange?: [number, number];
  apparentTempMinC?: number;
  apparentTempMaxC?: number;
  precipProbabilityPct?: number;
  precipSumMm?: number;
  windMaxKph?: number;
  windGustMaxKph?: number;
  uvMax?: number;
  humidityAvgPct?: number;
  weatherCode?: number;
  /** Heure locale de la ville, sans fuseau (« 2026-09-23T07:19 »). */
  sunriseISO?: string;
  sunsetISO?: string;
  reliability?: ReliabilityLabel | null;
  availableModels?: ForecastSourceId[];
};

export type HourlyForecastPoint = {
  timeISO: string;
  tempC?: number;
  /** Consensus seulement : demi-écart de température entre modèles. */
  tempSpreadC?: number;
  /** Consensus seulement : modèle le plus bas et le plus haut (bande du graphique). */
  tempRangeC?: [number, number];
  apparentTempC?: number;
  precipProbabilityPct?: number;
  precipMm?: number;
  windKph?: number;
  windGustKph?: number;
  uv?: number;
  humidityPct?: number;
  weatherCode?: number;
  reliability?: ReliabilityLabel | null;
  availableModels?: ForecastSourceId[];
};

export type CityForecastBundle = {
  city: FavoriteCity;
  modelId: ForecastViewId;
  modelLabel: string;
  timezone: string;
  updatedAtISO: string;
  note?: string;
  /** true quand le modele n'a pas repondu : a distinguer d'un modele sans donnees. */
  unavailable?: boolean;
  unavailableReason?: string;
  current?: CurrentWeather;
  daily: DailyForecast[];
  hourly: HourlyForecastPoint[];
};

export type CityForecastModelSet = {
  city: FavoriteCity;
  timezone: string;
  updatedAtISO: string;
  models: Record<ForecastSourceId, CityForecastBundle>;
  consensus: CityForecastBundle;
};

type ModelConfig = {
  label: string;
  modelParam: string;
  forecastDays: number;
  note?: string;
};

const MODEL_CONFIG: Record<ForecastSourceId, ModelConfig> = {
  arome: {
    label: "AROME",
    modelParam: "meteofrance_seamless",
    forecastDays: 4,
    note: "Source Météo-France via Open-Meteo. Très utile à court terme, puis limitée.",
  },
  gfs: {
    label: "GFS",
    modelParam: "ncep_gfs_seamless",
    forecastDays: 7,
    note: "Source NOAA GFS via Open-Meteo.",
  },
  ecmwf: {
    label: "ECMWF",
    modelParam: "ecmwf_ifs",
    forecastDays: 7,
    note: "Source ECMWF IFS via Open-Meteo.",
  },
};

/** Identifiant Open-Meteo du modèle (paramètre `models`). */
export function getModelParam(modelId: ForecastSourceId) {
  return MODEL_CONFIG[modelId].modelParam;
}

export function getForecastViewLabel(view: ForecastViewId) {
  if (view === "consensus") return "Consensus";
  return MODEL_CONFIG[view].label;
}

function withTimeout(signal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timeout);
        controller.abort();
      },
      { once: true },
    );
  }

  return { signal: controller.signal, cancel: () => window.clearTimeout(timeout) };
}

function buildUrl(city: FavoriteCity, modelId: ForecastSourceId, includeUv: boolean) {
  const config = MODEL_CONFIG[modelId];
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(city.lat));
  url.searchParams.set("longitude", String(city.lon));
  url.searchParams.set("models", config.modelParam);
  url.searchParams.set("forecast_days", String(config.forecastDays));
  // "auto" : Open-Meteo aligne les heures sur le fuseau de la ville demandee.
  // Un "Europe/Paris" fige decalait toutes les previsions hors de France.
  url.searchParams.set("timezone", "auto");

  const hourly = [
    "temperature_2m",
    "apparent_temperature",
    "precipitation_probability",
    "precipitation",
    "wind_speed_10m",
    "wind_gusts_10m",
    "relative_humidity_2m",
    "weather_code",
  ];
  if (includeUv) hourly.push("uv_index");

  const daily = [
    "temperature_2m_max",
    "temperature_2m_min",
    "apparent_temperature_max",
    "apparent_temperature_min",
    "precipitation_probability_max",
    "precipitation_sum",
    "wind_speed_10m_max",
    "wind_gusts_10m_max",
    "weather_code",
    "sunrise",
    "sunset",
  ];
  if (includeUv) daily.push("uv_index_max");

  const current = [
    "temperature_2m",
    "apparent_temperature",
    "weather_code",
    "is_day",
    "wind_speed_10m",
    "wind_gusts_10m",
    "precipitation",
    "relative_humidity_2m",
  ];

  url.searchParams.set("hourly", hourly.join(","));
  url.searchParams.set("daily", daily.join(","));
  url.searchParams.set("current", current.join(","));

  return url.toString();
}

function averageByDate(points: HourlyForecastPoint[]) {
  const grouped = new Map<string, number[]>();
  for (const point of points) {
    if (typeof point.humidityPct !== "number") continue;
    const dateISO = point.timeISO.slice(0, 10);
    grouped.set(dateISO, [...(grouped.get(dateISO) ?? []), point.humidityPct]);
  }

  const result = new Map<string, number>();
  for (const [dateISO, values] of grouped.entries()) {
    result.set(dateISO, values.reduce((sum, value) => sum + value, 0) / values.length);
  }
  return result;
}

/** Colonne d'une série Open-Meteo (daily.xxx, hourly.xxx) ; [] si absente. */
function column(block: Record<string, unknown> | null, key: string): unknown[] {
  const value = block?.[key];
  return Array.isArray(value) ? value : [];
}

function numberAt(values: unknown[], idx: number) {
  return typeof values[idx] === "number" ? (values[idx] as number) : undefined;
}

function stringAt(values: unknown[], idx: number) {
  return typeof values[idx] === "string" ? (values[idx] as string) : undefined;
}

function numberField(block: Record<string, unknown> | null, key: string) {
  return typeof block?.[key] === "number" ? (block[key] as number) : undefined;
}

function parseBundle(city: FavoriteCity, modelId: ForecastSourceId, data: Record<string, unknown>): CityForecastBundle {
  const config = MODEL_CONFIG[modelId];
  const timezone = typeof data.timezone === "string" ? data.timezone : "Europe/Paris";

  const currentObj = typeof data.current === "object" && data.current ? (data.current as Record<string, unknown>) : null;

  const dailyObj = typeof data.daily === "object" && data.daily ? (data.daily as Record<string, unknown>) : null;
  const dailyTime = Array.isArray(dailyObj?.time) ? (dailyObj.time as unknown[]) : [];
  const tMax = Array.isArray(dailyObj?.temperature_2m_max) ? (dailyObj.temperature_2m_max as unknown[]) : [];
  const tMin = Array.isArray(dailyObj?.temperature_2m_min) ? (dailyObj.temperature_2m_min as unknown[]) : [];
  const uv = Array.isArray(dailyObj?.uv_index_max) ? (dailyObj.uv_index_max as unknown[]) : [];
  const precip = Array.isArray(dailyObj?.precipitation_probability_max) ? (dailyObj.precipitation_probability_max as unknown[]) : [];
  const wind = Array.isArray(dailyObj?.wind_speed_10m_max) ? (dailyObj.wind_speed_10m_max as unknown[]) : [];
  const weatherCode = Array.isArray(dailyObj?.weather_code) ? (dailyObj.weather_code as unknown[]) : [];
  const apparentMax = column(dailyObj, "apparent_temperature_max");
  const apparentMin = column(dailyObj, "apparent_temperature_min");
  const precipSum = column(dailyObj, "precipitation_sum");
  const gustMax = column(dailyObj, "wind_gusts_10m_max");
  const sunrise = column(dailyObj, "sunrise");
  const sunset = column(dailyObj, "sunset");

  const hourlyObj = typeof data.hourly === "object" && data.hourly ? (data.hourly as Record<string, unknown>) : null;
  const hourlyTime = Array.isArray(hourlyObj?.time) ? (hourlyObj.time as unknown[]) : [];
  const hTemp = Array.isArray(hourlyObj?.temperature_2m) ? (hourlyObj.temperature_2m as unknown[]) : [];
  const hProb = Array.isArray(hourlyObj?.precipitation_probability) ? (hourlyObj.precipitation_probability as unknown[]) : [];
  const hWind = Array.isArray(hourlyObj?.wind_speed_10m) ? (hourlyObj.wind_speed_10m as unknown[]) : [];
  const hUv = Array.isArray(hourlyObj?.uv_index) ? (hourlyObj.uv_index as unknown[]) : [];
  const hHumidity = Array.isArray(hourlyObj?.relative_humidity_2m) ? (hourlyObj.relative_humidity_2m as unknown[]) : [];
  const hWeatherCode = Array.isArray(hourlyObj?.weather_code) ? (hourlyObj.weather_code as unknown[]) : [];
  const hApparent = column(hourlyObj, "apparent_temperature");
  const hPrecipMm = column(hourlyObj, "precipitation");
  const hGust = column(hourlyObj, "wind_gusts_10m");

  const hourly: HourlyForecastPoint[] = hourlyTime.map((time, idx) => ({
    timeISO: typeof time === "string" ? time : new Date().toISOString(),
    tempC: typeof hTemp[idx] === "number" ? (hTemp[idx] as number) : undefined,
    precipProbabilityPct: typeof hProb[idx] === "number" ? (hProb[idx] as number) : undefined,
    windKph: typeof hWind[idx] === "number" ? (hWind[idx] as number) : undefined,
    uv: typeof hUv[idx] === "number" ? (hUv[idx] as number) : undefined,
    humidityPct: typeof hHumidity[idx] === "number" ? (hHumidity[idx] as number) : undefined,
    weatherCode: typeof hWeatherCode[idx] === "number" ? (hWeatherCode[idx] as number) : undefined,
    apparentTempC: numberAt(hApparent, idx),
    precipMm: numberAt(hPrecipMm, idx),
    windGustKph: numberAt(hGust, idx),
  }));

  const humidityByDate = averageByDate(hourly);

  const daily: DailyForecast[] = dailyTime.map((time, idx) => {
    const dateISO = typeof time === "string" ? time : new Date().toISOString().slice(0, 10);
    return {
      dateISO,
      tempMaxC: typeof tMax[idx] === "number" ? (tMax[idx] as number) : undefined,
      tempMinC: typeof tMin[idx] === "number" ? (tMin[idx] as number) : undefined,
      uvMax: typeof uv[idx] === "number" ? (uv[idx] as number) : undefined,
      precipProbabilityPct: typeof precip[idx] === "number" ? (precip[idx] as number) : undefined,
      windMaxKph: typeof wind[idx] === "number" ? (wind[idx] as number) : undefined,
      humidityAvgPct: humidityByDate.get(dateISO),
      weatherCode: typeof weatherCode[idx] === "number" ? (weatherCode[idx] as number) : undefined,
      apparentTempMaxC: numberAt(apparentMax, idx),
      apparentTempMinC: numberAt(apparentMin, idx),
      precipSumMm: numberAt(precipSum, idx),
      windGustMaxKph: numberAt(gustMax, idx),
      sunriseISO: stringAt(sunrise, idx),
      sunsetISO: stringAt(sunset, idx),
    };
  });

  const current = currentObj
    ? {
        tempC: typeof currentObj.temperature_2m === "number" ? currentObj.temperature_2m : undefined,
        windKph: typeof currentObj.wind_speed_10m === "number" ? currentObj.wind_speed_10m : undefined,
        humidityPct: typeof currentObj.relative_humidity_2m === "number" ? currentObj.relative_humidity_2m : undefined,
        weatherCode: typeof currentObj.weather_code === "number" ? currentObj.weather_code : undefined,
        isDay: typeof currentObj.is_day === "number" ? currentObj.is_day === 1 : undefined,
        apparentTempC: numberField(currentObj, "apparent_temperature"),
        windGustKph: numberField(currentObj, "wind_gusts_10m"),
        precipMm: numberField(currentObj, "precipitation"),
      }
    : undefined;

  return {
    city,
    modelId,
    modelLabel: config.label,
    timezone,
    updatedAtISO: new Date().toISOString(),
    note: config.note,
    current,
    daily,
    hourly,
  };
}

function unavailableBundle(city: FavoriteCity, modelId: ForecastSourceId, reason: string): CityForecastBundle {
  return {
    city,
    modelId,
    modelLabel: MODEL_CONFIG[modelId].label,
    timezone: "Europe/Paris",
    updatedAtISO: new Date().toISOString(),
    note: MODEL_CONFIG[modelId].note,
    unavailable: true,
    unavailableReason: reason,
    daily: [],
    hourly: [],
  };
}

async function fetchModelForecastBundle(city: FavoriteCity, modelId: ForecastSourceId, options?: { signal?: AbortSignal }) {
  const { signal, cancel } = withTimeout(options?.signal, 18000);
  try {
    const urls = [buildUrl(city, modelId, true), buildUrl(city, modelId, false)];
    let lastFailure = "aucune réponse exploitable";

    for (const url of urls) {
      try {
        const res = await fetch(url, { signal });
        if (!res.ok) {
          lastFailure = `réponse HTTP ${res.status}`;
          continue;
        }
        const data = (await res.json()) as Record<string, unknown>;
        return parseBundle(city, modelId, data);
      } catch (error) {
        // Une annulation demandée par l'appelant doit remonter ; une panne
        // réseau ou un timeout ne doit pas faire tomber les deux autres modèles.
        if (options?.signal?.aborted) throw error;
        lastFailure = error instanceof Error ? error.message : "erreur réseau";
      }
    }

    return unavailableBundle(city, modelId, lastFailure);
  } finally {
    cancel();
  }
}

/** Moyenne des modèles, pondérée selon l'échéance (voir modelWeight). */
function weighted<T extends { id: ForecastSourceId }>(entries: T[], pick: (entry: T) => number | undefined, leadHours: number) {
  return weightedAverage(entries.map((entry) => ({ value: pick(entry), weight: modelWeight(entry.id, leadHours) })));
}

function getDay(bundle: CityForecastBundle, dateISO: string) {
  return bundle.daily.find((day) => day.dateISO === dateISO);
}

function getHour(bundle: CityForecastBundle, timeISO: string) {
  return bundle.hourly.find((point) => point.timeISO === timeISO);
}

function buildConsensusCurrent(city: FavoriteCity, models: Record<ForecastSourceId, CityForecastBundle>) {
  const entries = (Object.entries(models) as Array<[ForecastSourceId, CityForecastBundle]>)
    .map(([id, bundle]) => ({ id, current: bundle.current }))
    .filter((entry) => entry.current);

  if (!entries.length) return undefined;

  return {
    tempC: weighted(entries, (entry) => entry.current?.tempC, 0),
    tempSpreadC: halfSpread(entries.map((entry) => entry.current?.tempC)),
    apparentTempC: weighted(entries, (entry) => entry.current?.apparentTempC, 0),
    windKph: weighted(entries, (entry) => entry.current?.windKph, 0),
    windGustKph: weighted(entries, (entry) => entry.current?.windGustKph, 0),
    precipMm: weighted(entries, (entry) => entry.current?.precipMm, 0),
    humidityPct: weighted(entries, (entry) => entry.current?.humidityPct, 0),
    weatherCode: chooseRepresentativeWeatherCode(entries.map((entry) => entry.current?.weatherCode)),
    isDay: entries.find((entry) => typeof entry.current?.isDay === "boolean")?.current?.isDay,
    reliability: computeReliabilityLabel(
      entries.map((entry) => ({
        weatherCode: entry.current?.weatherCode,
        tempC: entry.current?.tempC,
        windKph: entry.current?.windKph,
        humidityPct: entry.current?.humidityPct,
      })),
    ),
    availableModels: entries.map((entry) => entry.id),
  };
}

function buildConsensusDaily(models: Record<ForecastSourceId, CityForecastBundle>, nowISO: string) {
  const allDates = Array.from(new Set(Object.values(models).flatMap((bundle) => bundle.daily.map((day) => day.dateISO)))).sort();

  return allDates.slice(0, 7).map((dateISO) => {
    // Échéance du milieu de journée : suffit à savoir si AROME est dans ses 48 h.
    const lead = Math.max(0, hoursBetween(nowISO, `${dateISO}T12:00`));
    const entries = (Object.entries(models) as Array<[ForecastSourceId, CityForecastBundle]>)
      .map(([id, bundle]) => ({ id, day: getDay(bundle, dateISO) }))
      .filter((entry): entry is { id: ForecastSourceId; day: DailyForecast } => Boolean(entry.day));

    return {
      dateISO,
      tempMinC: weighted(entries, (entry) => entry.day.tempMinC, lead),
      tempMaxC: weighted(entries, (entry) => entry.day.tempMaxC, lead),
      tempMinSpreadC: halfSpread(entries.map((entry) => entry.day.tempMinC)),
      tempMaxSpreadC: halfSpread(entries.map((entry) => entry.day.tempMaxC)),
      precipProbabilityRange: rangeOf(entries.map((entry) => entry.day.precipProbabilityPct)),
      apparentTempMinC: weighted(entries, (entry) => entry.day.apparentTempMinC, lead),
      apparentTempMaxC: weighted(entries, (entry) => entry.day.apparentTempMaxC, lead),
      precipProbabilityPct: weighted(entries, (entry) => entry.day.precipProbabilityPct, lead),
      precipSumMm: weighted(entries, (entry) => entry.day.precipSumMm, lead),
      windMaxKph: weighted(entries, (entry) => entry.day.windMaxKph, lead),
      windGustMaxKph: weighted(entries, (entry) => entry.day.windGustMaxKph, lead),
      // Donnée astronomique : identique d'un modèle à l'autre à la minute près.
      sunriseISO: entries.find((entry) => entry.day.sunriseISO)?.day.sunriseISO,
      sunsetISO: entries.find((entry) => entry.day.sunsetISO)?.day.sunsetISO,
      uvMax: weighted(entries, (entry) => entry.day.uvMax, lead),
      humidityAvgPct: weighted(entries, (entry) => entry.day.humidityAvgPct, lead),
      weatherCode: chooseRepresentativeWeatherCode(entries.map((entry) => entry.day.weatherCode)),
      reliability: computeReliabilityLabel(
        entries.map((entry) => ({
          weatherCode: entry.day.weatherCode,
          tempMinC: entry.day.tempMinC,
          tempMaxC: entry.day.tempMaxC,
          precipProbabilityPct: entry.day.precipProbabilityPct,
          windKph: entry.day.windMaxKph,
          uv: entry.day.uvMax,
          humidityPct: entry.day.humidityAvgPct,
        })),
      ),
      availableModels: entries.map((entry) => entry.id),
    } satisfies DailyForecast;
  });
}

function buildConsensusHourly(models: Record<ForecastSourceId, CityForecastBundle>, nowISO: string) {
  const allTimes = Array.from(new Set(Object.values(models).flatMap((bundle) => bundle.hourly.map((point) => point.timeISO)))).sort();

  return allTimes.map((timeISO) => {
    const lead = Math.max(0, hoursBetween(nowISO, timeISO));
    const entries = (Object.entries(models) as Array<[ForecastSourceId, CityForecastBundle]>)
      .map(([id, bundle]) => ({ id, point: getHour(bundle, timeISO) }))
      .filter((entry): entry is { id: ForecastSourceId; point: HourlyForecastPoint } => Boolean(entry.point));

    return {
      timeISO,
      tempC: weighted(entries, (entry) => entry.point.tempC, lead),
      tempSpreadC: halfSpread(entries.map((entry) => entry.point.tempC)),
      tempRangeC: rangeOf(entries.map((entry) => entry.point.tempC)),
      apparentTempC: weighted(entries, (entry) => entry.point.apparentTempC, lead),
      precipProbabilityPct: weighted(entries, (entry) => entry.point.precipProbabilityPct, lead),
      precipMm: weighted(entries, (entry) => entry.point.precipMm, lead),
      windKph: weighted(entries, (entry) => entry.point.windKph, lead),
      windGustKph: weighted(entries, (entry) => entry.point.windGustKph, lead),
      uv: weighted(entries, (entry) => entry.point.uv, lead),
      humidityPct: weighted(entries, (entry) => entry.point.humidityPct, lead),
      weatherCode: chooseRepresentativeWeatherCode(entries.map((entry) => entry.point.weatherCode)),
      reliability: computeReliabilityLabel(
        entries.map((entry) => ({
          weatherCode: entry.point.weatherCode,
          tempC: entry.point.tempC,
          precipProbabilityPct: entry.point.precipProbabilityPct,
          windKph: entry.point.windKph,
          uv: entry.point.uv,
          humidityPct: entry.point.humidityPct,
        })),
      ),
      availableModels: entries.map((entry) => entry.id),
    } satisfies HourlyForecastPoint;
  });
}

function buildConsensusBundle(city: FavoriteCity, models: Record<ForecastSourceId, CityForecastBundle>): CityForecastBundle {
  const timezone = Object.values(models).find((bundle) => bundle.timezone)?.timezone ?? "Europe/Paris";
  const nowISO = cityNowHourISO(timezone);

  return {
    city,
    modelId: "consensus",
    modelLabel: "Consensus",
    timezone,
    updatedAtISO: new Date().toISOString(),
    note: "Synthèse pondérée d'AROME, GFS et ECMWF : AROME compte double sur 48 h, ECMWF un peu plus que GFS. Fiabilité et écart restent mesurés entre modèles.",
    current: buildConsensusCurrent(city, models),
    daily: buildConsensusDaily(models, nowISO),
    hourly: buildConsensusHourly(models, nowISO),
  };
}

export async function searchCities(query: string, options?: { signal?: AbortSignal }): Promise<OpenMeteoGeocodingResult[]> {
  const q = query.trim();
  if (!q) return [];

  const { signal, cancel } = withTimeout(options?.signal, 12000);
  try {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", q);
    url.searchParams.set("count", "10");
    url.searchParams.set("language", "fr");
    url.searchParams.set("format", "json");

    const res = await fetch(url.toString(), { signal });
    // Une erreur HTTP doit se distinguer d'une recherche sans resultat.
    if (!res.ok) throw new Error(`Recherche de villes impossible (${res.status}).`);
    const data = (await res.json()) as { results?: Array<Record<string, unknown>> };
    const results = data.results ?? [];

    return results
      .map((item) => {
        const name = typeof item.name === "string" ? item.name : "";
        const admin1 = typeof item.admin1 === "string" ? item.admin1 : undefined;
        const admin2 = typeof item.admin2 === "string" ? item.admin2 : undefined;
        const postcodes = Array.isArray(item.postcodes) ? (item.postcodes as unknown[]) : [];
        const postalCode = typeof postcodes[0] === "string" ? (postcodes[0] as string) : undefined;
        const countryCode = typeof item.country_code === "string" ? item.country_code : undefined;
        // En France, admin2 est le département : c'est lui, et non le code
        // postal souvent absent pour les petites communes, qui permet de
        // retrouver le bulletin de vigilance.
        const departmentCode =
          countryCode?.toUpperCase() === "FR"
            ? (departmentCodeFromName(admin2) ?? departmentCodeFromPostalCode(postalCode))
            : undefined;
        const latitude = typeof item.latitude === "number" ? item.latitude : NaN;
        const longitude = typeof item.longitude === "number" ? item.longitude : NaN;

        const safe = name && Number.isFinite(latitude) && Number.isFinite(longitude);
        if (!safe) return null;

        const id = `${name}-${admin1 ?? ""}-${countryCode ?? ""}-${latitude.toFixed(4)}-${longitude.toFixed(4)}`
          .toLowerCase()
          .split(" ")
          .join("-");

        const result: OpenMeteoGeocodingResult = {
          id,
          name,
          lat: latitude,
          lon: longitude,
          ...(admin1 ? { adminArea: admin1 } : {}),
          ...(departmentCode ? { departmentCode } : {}),
          ...(postalCode ? { postalCode } : {}),
          ...(countryCode ? { countryCode } : {}),
        };

        return result;
      })
      .filter((item) => item !== null) as OpenMeteoGeocodingResult[];
  } finally {
    cancel();
  }
}

export async function reverseGeocodeCity(latitude: number, longitude: number, options?: { signal?: AbortSignal }) {
  const { signal, cancel } = withTimeout(options?.signal, 12000);
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("accept-language", "fr");

    const res = await fetch(url.toString(), {
      signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      address?: Record<string, string | undefined>;
    };

    const address = data.address ?? {};
    const name = address.city ?? address.town ?? address.village ?? address.municipality ?? address.county;
    if (!name) return null;

    const adminArea = address.state ?? address.region ?? undefined;
    const postalCode = address.postcode;
    const countryCode = address.country_code?.toUpperCase();
    // Nominatim expose le département en code ISO (« FR-06 », « FR-2A ») ; à
    // défaut on retombe sur son nom (county), puis sur le code postal.
    const isoDepartment = address["ISO3166-2-lvl6"]?.match(/^FR-(\w{2,3})$/)?.[1]?.toUpperCase();
    const departmentCode =
      countryCode === "FR"
        ? ((isDepartmentCode(isoDepartment) ? isoDepartment : undefined) ??
          departmentCodeFromName(address.county) ??
          departmentCodeFromPostalCode(postalCode))
        : undefined;

    return {
      id: `${name}-${adminArea ?? ""}-${countryCode ?? ""}-${latitude.toFixed(4)}-${longitude.toFixed(4)}`
        .toLowerCase()
        .split(" ")
        .join("-"),
      name,
      lat: latitude,
      lon: longitude,
      ...(adminArea ? { adminArea } : {}),
      ...(departmentCode ? { departmentCode } : {}),
      ...(postalCode ? { postalCode } : {}),
      ...(countryCode ? { countryCode } : {}),
    } satisfies OpenMeteoGeocodingResult;
  } catch {
    return null;
  } finally {
    cancel();
  }
}

export async function fetchForecastModelSet(city: FavoriteCity, options?: { signal?: AbortSignal }): Promise<CityForecastModelSet> {
  const [arome, gfs, ecmwf] = await Promise.all([
    fetchModelForecastBundle(city, "arome", options),
    fetchModelForecastBundle(city, "gfs", options),
    fetchModelForecastBundle(city, "ecmwf", options),
  ]);

  const models: Record<ForecastSourceId, CityForecastBundle> = {
    arome,
    gfs,
    ecmwf,
  };

  const failed = Object.values(models).filter((bundle) => bundle.unavailable);
  if (failed.length === Object.keys(models).length) {
    throw new Error(`Aucun modèle de prévision n'a répondu (${failed[0].unavailableReason}).`);
  }

  const consensus = buildConsensusBundle(city, models);

  return {
    city,
    timezone: consensus.timezone,
    updatedAtISO: new Date().toISOString(),
    models,
    consensus,
  };
}

/**
 * Pluie des cinq prochains quarts d'heure (le premier est celui en cours).
 * best_match laisse Open-Meteo choisir la meilleure source au quart d'heure :
 * AROME sur la France, HRRR aux États-Unis, ailleurs un modèle horaire
 * interpolé, moins fin — d'où le champ `fine`.
 */
export async function fetchNextHourRain(city: FavoriteCity, options?: { signal?: AbortSignal }) {
  const { signal, cancel } = withTimeout(options?.signal, 12000);
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(city.lat));
    url.searchParams.set("longitude", String(city.lon));
    url.searchParams.set("models", "best_match");
    url.searchParams.set("minutely_15", "precipitation");
    url.searchParams.set("forecast_minutely_15", "5");
    url.searchParams.set("timezone", "auto");

    const res = await fetch(url.toString(), { signal });
    if (!res.ok) throw new Error(`Pluie dans l'heure indisponible (${res.status}).`);
    const data = (await res.json()) as Record<string, unknown>;
    const block = typeof data.minutely_15 === "object" && data.minutely_15 ? (data.minutely_15 as Record<string, unknown>) : null;
    const times = column(block, "time");
    const mm = column(block, "precipitation");

    return {
      slots: times
        .map((time, idx) => (typeof time === "string" ? { timeISO: time, mm: numberAt(mm, idx) } : null))
        .filter((slot): slot is { timeISO: string; mm: number | undefined } => slot !== null),
      // France : AROME au quart d'heure ; États-Unis : HRRR. Ailleurs, interpolation.
      fine: city.countryCode?.toUpperCase() === "FR" || city.countryCode?.toUpperCase() === "US",
    };
  } finally {
    cancel();
  }
}
