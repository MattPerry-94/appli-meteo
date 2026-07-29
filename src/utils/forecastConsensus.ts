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
