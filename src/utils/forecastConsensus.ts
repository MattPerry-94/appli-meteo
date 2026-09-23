import { getOpenMeteoVisual } from "@/utils/weather";

export type ReliabilityLabel = "Ultra fiable" | "Fiable" | "Peu fiable";

export type ConsensusInput = {
  weatherCode?: number;
  tempC?: number;
  tempMinC?: number;
  tempMaxC?: number;
  precipProbabilityPct?: number;
  windKph?: number;
  uv?: number;
  humidityPct?: number;
};

function majorityRatio(values: string[]) {
  if (values.length < 2) return null;
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  let max = 0;
  for (const count of counts.values()) {
    max = Math.max(max, count);
  }
  return max / values.length;
}

function bucketTemp(value: number) {
  return `t:${Math.floor(value / 3)}`;
}

function bucketPrecip(value: number) {
  if (value < 20) return "p:sec";
  if (value < 50) return "p:possible";
  return "p:probable";
}

function bucketWind(value: number) {
  if (value < 15) return "w:faible";
  if (value < 30) return "w:modere";
  if (value < 50) return "w:soutenu";
  return "w:fort";
}

function bucketUv(value: number) {
  if (value < 3) return "u:faible";
  if (value < 6) return "u:modere";
  if (value < 8) return "u:eleve";
  return "u:tres-eleve";
}

function bucketHumidity(value: number) {
  if (value < 40) return "h:sec";
  if (value < 70) return "h:normal";
  return "h:humide";
}

function averageTemp(input: ConsensusInput) {
  if (typeof input.tempC === "number") return input.tempC;
  const values = [input.tempMinC, input.tempMaxC].filter((value): value is number => typeof value === "number");
  if (!values.length) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function computeReliabilityLabel(inputs: ConsensusInput[]): ReliabilityLabel | null {
  const comparable = inputs.filter((input) =>
    [
      input.weatherCode,
      input.tempC,
      input.tempMinC,
      input.tempMaxC,
      input.precipProbabilityPct,
      input.windKph,
      input.uv,
      input.humidityPct,
    ].some((value) => typeof value === "number"),
  );

  if (!comparable.length) return null;
  if (comparable.length === 1) return "Peu fiable";

  const ratios: number[] = [];

  const weatherRatio = majorityRatio(
    comparable
      .map((input) => (typeof input.weatherCode === "number" ? getOpenMeteoVisual(input.weatherCode).kind : null))
      .filter((value): value is ReturnType<typeof getOpenMeteoVisual>["kind"] => value !== null),
  );
  if (weatherRatio !== null) ratios.push(weatherRatio);

  const tempRatio = majorityRatio(
    comparable
      .map((input) => averageTemp(input))
      .filter((value): value is number => typeof value === "number")
      .map(bucketTemp),
  );
  if (tempRatio !== null) ratios.push(tempRatio);

  const precipRatio = majorityRatio(
    comparable
      .map((input) => input.precipProbabilityPct)
      .filter((value): value is number => typeof value === "number")
      .map(bucketPrecip),
  );
  if (precipRatio !== null) ratios.push(precipRatio);

  const windRatio = majorityRatio(
    comparable
      .map((input) => input.windKph)
      .filter((value): value is number => typeof value === "number")
      .map(bucketWind),
  );
  if (windRatio !== null) ratios.push(windRatio);

  const uvRatio = majorityRatio(
    comparable
      .map((input) => input.uv)
      .filter((value): value is number => typeof value === "number")
      .map(bucketUv),
  );
  if (uvRatio !== null) ratios.push(uvRatio);

  const humidityRatio = majorityRatio(
    comparable
      .map((input) => input.humidityPct)
      .filter((value): value is number => typeof value === "number")
      .map(bucketHumidity),
  );
  if (humidityRatio !== null) ratios.push(humidityRatio);

  if (!ratios.length) return comparable.length === 2 ? "Peu fiable" : "Peu fiable";

  if (comparable.length === 2) {
    return ratios.every((ratio) => ratio === 1) ? "Fiable" : "Peu fiable";
  }

  if (ratios.every((ratio) => ratio === 1)) return "Ultra fiable";

  const score = ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
  return score >= 2 / 3 ? "Fiable" : "Peu fiable";
}

export function chooseRepresentativeWeatherCode(codes: Array<number | undefined>) {
  const defined = codes.filter((value): value is number => typeof value === "number");
  if (!defined.length) return undefined;

  const byKind = new Map<string, number[]>();
  for (const code of defined) {
    const kind = getOpenMeteoVisual(code).kind;
    byKind.set(kind, [...(byKind.get(kind) ?? []), code]);
  }

  let winnerKind: string | null = null;
  let winnerCodes: number[] = [];
  for (const [kind, list] of byKind.entries()) {
    if (list.length > winnerCodes.length) {
      winnerKind = kind;
      winnerCodes = list;
    }
  }

  if (!winnerKind || !winnerCodes.length) return defined[0];
  return winnerCodes[0];
}

export function averageDefined(values: Array<number | undefined>) {
  const defined = values.filter((value): value is number => typeof value === "number");
  if (!defined.length) return undefined;
  return defined.reduce((sum, value) => sum + value, 0) / defined.length;
}

/**
 * Demi-écart entre le modèle le plus haut et le plus bas : « 24° ±1,5° »
 * signifie que les modèles vont de 22,5° à 25,5°. undefined sous deux valeurs,
 * un seul modèle ne disant rien de l'incertitude.
 */
export function halfSpread(values: Array<number | undefined>) {
  const defined = values.filter((value): value is number => typeof value === "number");
  if (defined.length < 2) return undefined;
  return (Math.max(...defined) - Math.min(...defined)) / 2;
}

/** Plus petite et plus grande valeur des modèles, ou undefined sous deux valeurs. */
export function rangeOf(values: Array<number | undefined>): [number, number] | undefined {
  const defined = values.filter((value): value is number => typeof value === "number");
  if (defined.length < 2) return undefined;
  return [Math.min(...defined), Math.max(...defined)];
}

export type WeightedModelId = "arome" | "gfs" | "ecmwf";

/**
 * Poids d'un modèle dans le consensus, selon l'échéance (heures depuis
 * maintenant). AROME (maille de 1,3 à 2,5 km) est bien meilleur que les
 * modèles globaux à courte échéance : il compte double sur 48 h, puis
 * simple jusqu'à la fin de sa portée (4 jours). ECMWF est en moyenne le plus
 * juste des deux globaux, d'où un léger avantage sur GFS.
 */
export function modelWeight(modelId: WeightedModelId, leadHours: number) {
  if (modelId === "arome") return leadHours < 48 ? 2 : 1;
  if (modelId === "ecmwf") return 1.2;
  return 1;
}

/** Moyenne pondérée des valeurs définies ; les poids des valeurs absentes ne comptent pas. */
export function weightedAverage(entries: Array<{ value: number | undefined; weight: number }>) {
  let sum = 0;
  let total = 0;
  for (const { value, weight } of entries) {
    if (typeof value !== "number" || weight <= 0) continue;
    sum += value * weight;
    total += weight;
  }
  return total > 0 ? sum / total : undefined;
}

/** Heures entre deux horodatages locaux Open-Meteo (« 2026-09-23T14:00 »). */
export function hoursBetween(fromISO: string, toISO: string) {
  const toMs = (iso: string) => Date.parse(`${iso.length === 10 ? `${iso}T00:00` : iso}:00Z`);
  return (toMs(toISO) - toMs(fromISO)) / 3_600_000;
}
