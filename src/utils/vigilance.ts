import type { VigilanceLevelId } from "@/services/meteoFranceVigilance";

/**
 * Teintes des quatre niveaux de vigilance, proches de celles de Météo-France.
 * Elles portent un sens réglementaire : elles ne suivent ni le thème ni
 * l'ambiance du site.
 */
export const VIGILANCE_LEVEL_COLORS: Record<VigilanceLevelId, string> = {
  1: "#34b35a",
  2: "#f2d027",
  3: "#f28c28",
  4: "#d7263d",
};

export const VIGILANCE_LEVEL_NAMES: Record<VigilanceLevelId, string> = {
  1: "verte",
  2: "jaune",
  3: "orange",
  4: "rouge",
};

/** Phrase courte : « Vigilance orange », « Pas de vigilance particulière ». */
export function describeVigilanceLevel(level: VigilanceLevelId) {
  return level === 1 ? "Pas de vigilance particulière" : `Vigilance ${VIGILANCE_LEVEL_NAMES[level]}`;
}
