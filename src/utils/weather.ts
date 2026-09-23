export type WeatherVisual = {
  label: string;
  kind: "clear" | "clouds" | "rain" | "snow" | "storm" | "fog";
};

export function getOpenMeteoVisual(code: number | undefined): WeatherVisual {
  const c = typeof code === "number" ? code : -1;

  if (c === 0) return { label: "Dégagé", kind: "clear" };
  if (c === 1) return { label: "Principalement dégagé", kind: "clear" };
  if (c === 2) return { label: "Partiellement nuageux", kind: "clouds" };
  if (c === 3) return { label: "Couvert", kind: "clouds" };

  if (c === 45 || c === 48) return { label: "Brouillard", kind: "fog" };

  if (c === 51 || c === 53 || c === 55) return { label: "Bruine", kind: "rain" };
  if (c === 56 || c === 57) return { label: "Bruine verglaçante", kind: "rain" };

  if (c === 61 || c === 63 || c === 65) return { label: "Pluie", kind: "rain" };
  if (c === 66 || c === 67) return { label: "Pluie verglaçante", kind: "rain" };

  if (c === 71 || c === 73 || c === 75) return { label: "Neige", kind: "snow" };
  if (c === 77) return { label: "Grains de neige", kind: "snow" };

  if (c === 80 || c === 81 || c === 82) return { label: "Averses", kind: "rain" };
  if (c === 85 || c === 86) return { label: "Averses de neige", kind: "snow" };

  if (c === 95) return { label: "Orage", kind: "storm" };
  if (c === 96 || c === 99) return { label: "Orage (grêle)", kind: "storm" };

  return { label: "Météo", kind: "clouds" };
}

export function getUvLevel(value: number | undefined) {
  const uv = typeof value === "number" ? value : NaN;
  if (!Number.isFinite(uv)) return null;
  if (uv < 3) return { label: "Faible", tone: "emerald" as const };
  if (uv < 6) return { label: "Modéré", tone: "amber" as const };
  if (uv < 8) return { label: "Élevé", tone: "orange" as const };
  if (uv < 11) return { label: "Très élevé", tone: "rose" as const };
  return { label: "Extrême", tone: "red" as const };
}


export type TempBand = "cool" | "warm" | "hot";

/**
 * Ambiance chromatique du site, pilotee par la temperature (a 2 m) :
 *  - cool (< 16 C)  : bleus et blancs, teintes claires
 *  - warm (16-25 C) : orange et jaune
 *  - hot  (> 25 C)  : rouges
 * Une valeur absente retombe sur "cool", la teinte par defaut.
 */
export function getTempBand(value: number | undefined): TempBand {
  const temp = typeof value === "number" ? value : NaN;
  if (!Number.isFinite(temp)) return "cool";
  if (temp < 16) return "cool";
  if (temp <= 25) return "warm";
  return "hot";
}
