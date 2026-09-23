/** Niveau d'état commun aux échelles air et pollens : il porte une couleur ET un libellé. */
export type EnvLevel = 0 | 1 | 2 | 3 | 4 | 5;

/** Classes de l'indice européen de qualité de l'air (Agence européenne pour l'environnement). */
const AQI_CLASSES: Array<{ max: number; label: string; level: EnvLevel }> = [
  { max: 20, label: "Bon", level: 0 },
  { max: 40, label: "Correct", level: 1 },
  { max: 60, label: "Moyen", level: 2 },
  { max: 80, label: "Médiocre", level: 3 },
  { max: 100, label: "Très médiocre", level: 4 },
  { max: Infinity, label: "Extrêmement médiocre", level: 5 },
];

export function europeanAqiClass(aqi: number | undefined) {
  if (typeof aqi !== "number") return null;
  return AQI_CLASSES.find((entry) => aqi <= entry.max)!;
}

export type PollenId = "alder" | "birch" | "grass" | "mugwort" | "olive" | "ragweed";

export const POLLEN_LABELS: Record<PollenId, string> = {
  alder: "Aulne",
  birch: "Bouleau",
  grass: "Graminées",
  mugwort: "Armoise",
  olive: "Olivier",
  ragweed: "Ambroisie",
};

/**
 * Seuils (grains/m³) entre faible, modéré, élevé et très élevé. Ils diffèrent
 * d'une espèce à l'autre : l'ambroisie gêne dès quelques grains, le bouleau
 * se compte par centaines. Valeurs indicatives, proches des échelles de
 * Copernicus et du RNSA.
 */
const POLLEN_THRESHOLDS: Record<PollenId, [number, number, number]> = {
  alder: [10, 100, 1000],
  birch: [10, 100, 1000],
  olive: [10, 100, 1000],
  grass: [5, 50, 200],
  mugwort: [5, 20, 100],
  ragweed: [5, 20, 50],
};

const POLLEN_LEVEL_LABELS = ["Faible", "Modéré", "Élevé", "Très élevé"] as const;

/** Niveau d'un pollen, ou null sous 1 grain/m³ (rien à signaler). */
export function pollenLevel(pollen: PollenId, grains: number | undefined) {
  if (typeof grains !== "number" || grains < 1) return null;
  const [moderate, high, veryHigh] = POLLEN_THRESHOLDS[pollen];
  const index = grains < moderate ? 0 : grains < high ? 1 : grains < veryHigh ? 2 : 3;
  // Même échelle de couleurs que l'air : faible = « correct », très élevé = « très médiocre ».
  return { label: POLLEN_LEVEL_LABELS[index], level: (index + 1) as EnvLevel };
}

/** Direction d'où viennent les vagues, sur 8 points cardinaux : 104° → « Est ». */
export function compassFrench(degrees: number | undefined) {
  if (typeof degrees !== "number") return null;
  const points = ["Nord", "Nord-est", "Est", "Sud-est", "Sud", "Sud-ouest", "Ouest", "Nord-ouest"];
  return points[Math.round((((degrees % 360) + 360) % 360) / 45) % 8];
}
