import type { FavoriteCity } from "@/stores/appStore";
import { getModelParam, type ForecastSourceId } from "@/services/openMeteo";
import { scoreModels, type ModelScore } from "@/utils/modelScore";

const MODELS: ForecastSourceId[] = ["arome", "gfs", "ecmwf"];
const WINDOW_DAYS = 7;

export type ModelScoreReport = {
  fromDateISO: string;
  toDateISO: string;
  scores: ModelScore<ForecastSourceId>[];
};

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dateISO: string, days: number) {
  const date = new Date(`${dateISO}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDate(date);
}

async function getJson(url: URL, signal?: AbortSignal) {
  const res = await fetch(url.toString(), { signal });
  if (!res.ok) throw new Error(`Score des modèles indisponible (${res.status}).`);
  return (await res.json()) as { hourly?: Record<string, unknown[]> };
}

/**
 * Qui a vu juste ? Compare, sur les 7 derniers jours disponibles, la
 * température prévue la veille (échéance J+1) par chaque modèle à la
 * réanalyse ERA5.
 *
 * Pourquoi ERA5 et pas les jours les plus récents : la réanalyse n'est
 * publiée qu'avec environ 5 jours de retard, et l'archive comble les jours
 * suivants avec des prévisions ECMWF, ce qui avantagerait ce modèle. ERA5 est
 * une référence indépendante des runs opérationnels comparés — au prix d'une
 * maille plus large (9 km sur terre avec ERA5-Land, 25 km sinon).
 */
export async function fetchModelScores(city: FavoriteCity, options?: { signal?: AbortSignal }): Promise<ModelScoreReport> {
  const today = isoDate(new Date());

  const archiveUrl = new URL("https://archive-api.open-meteo.com/v1/archive");
  archiveUrl.searchParams.set("latitude", String(city.lat));
  archiveUrl.searchParams.set("longitude", String(city.lon));
  archiveUrl.searchParams.set("start_date", addDays(today, -16));
  archiveUrl.searchParams.set("end_date", addDays(today, -1));
  archiveUrl.searchParams.set("hourly", "temperature_2m");
  archiveUrl.searchParams.set("models", "era5_seamless");
  archiveUrl.searchParams.set("timezone", "auto");
  const archive = await getJson(archiveUrl, options?.signal);

  const archiveTimes = (archive.hourly?.time ?? []) as string[];
  const archiveTemps = (archive.hourly?.temperature_2m ?? []) as Array<number | null>;
  const truthByTime = new Map<string, number>();
  archiveTimes.forEach((time, index) => {
    const value = archiveTemps[index];
    if (typeof value === "number") truthByTime.set(time, value);
  });

  // Dernier jour complet de la réanalyse (ses 24 heures présentes).
  const days = [...new Set(archiveTimes.map((time) => time.slice(0, 10)))].sort();
  const completeDays = days.filter((day) => archiveTimes.filter((time) => time.startsWith(day) && truthByTime.has(time)).length === 24);
  const toDateISO = completeDays[completeDays.length - 1];
  if (!toDateISO) throw new Error("Réanalyse ERA5 indisponible pour ce lieu.");
  const fromDateISO = addDays(toDateISO, -(WINDOW_DAYS - 1));

  const runsUrl = new URL("https://previous-runs-api.open-meteo.com/v1/forecast");
  runsUrl.searchParams.set("latitude", String(city.lat));
  runsUrl.searchParams.set("longitude", String(city.lon));
  runsUrl.searchParams.set("hourly", "temperature_2m_previous_day1");
  runsUrl.searchParams.set("models", MODELS.map(getModelParam).join(","));
  runsUrl.searchParams.set("start_date", fromDateISO);
  runsUrl.searchParams.set("end_date", toDateISO);
  runsUrl.searchParams.set("timezone", "auto");
  const runs = await getJson(runsUrl, options?.signal);

  const times = (runs.hourly?.time ?? []) as string[];
  const truth = times.map((time) => truthByTime.get(time));
  const forecasts = Object.fromEntries(
    MODELS.map((modelId) => {
      const values = (runs.hourly?.[`temperature_2m_previous_day1_${getModelParam(modelId)}`] ?? []) as Array<number | null>;
      return [modelId, values.map((value) => (typeof value === "number" ? value : undefined))];
    }),
  ) as Record<ForecastSourceId, Array<number | undefined>>;

  return { fromDateISO, toDateISO, scores: scoreModels(truth, forecasts) };
}
