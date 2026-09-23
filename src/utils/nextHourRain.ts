export type RainSlot = { timeISO: string; mm?: number };

export type RainIntensity = "sèche" | "faible" | "modérée" | "forte";

/** Seuil de pluie par quart d'heure : en dessous, ce sont des traces. */
const WET_MM = 0.1;

/** Intensité selon le cumul d'un quart d'heure, ramené à l'heure (mm/h). */
export function rainIntensity(mm: number | undefined): RainIntensity {
  const perHour = (mm ?? 0) * 4;
  if ((mm ?? 0) < WET_MM) return "sèche";
  if (perHour < 2.5) return "faible";
  if (perHour < 7.6) return "modérée";
  return "forte";
}

function hhmm(timeISO: string) {
  return timeISO.slice(11, 16).replace(":", "h");
}

/**
 * Phrase de synthèse de l'heure à venir, à partir des cumuls au quart d'heure
 * (le premier créneau est le quart d'heure en cours) :
 * « Pas de pluie prévue dans l'heure », « Pluie faible attendue vers 14h15 »,
 * « Pluie modérée en cours, fin vers 14h30 », « Pluie en cours pour l'heure à venir ».
 */
export function summarizeNextHour(slots: RainSlot[]) {
  if (!slots.length) return null;
  const wet = slots.map((slot) => (slot.mm ?? 0) >= WET_MM);
  const firstWet = wet.indexOf(true);
  const peak = slots.reduce((max, slot) => Math.max(max, slot.mm ?? 0), 0);
  const intensity = rainIntensity(peak);

  if (firstWet < 0) return { raining: false, text: "Pas de pluie prévue dans l'heure", intensity };

  if (firstWet === 0) {
    const firstDry = wet.indexOf(false);
    return {
      raining: true,
      text:
        firstDry < 0
          ? `Pluie ${intensity} en cours pour l'heure à venir`
          : `Pluie ${intensity} en cours, fin vers ${hhmm(slots[firstDry].timeISO)}`,
      intensity,
    };
  }

  return { raining: true, text: `Pluie ${intensity} attendue vers ${hhmm(slots[firstWet].timeISO)}`, intensity };
}
