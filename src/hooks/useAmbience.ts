import { useEffect } from "react";
import { getTempBand } from "@/utils/weather";

/**
 * Diffuse l'ambiance chromatique à tout le site.
 *
 * Même principe que useTheme : on pose un attribut sur <html>, et le CSS y
 * accroche les tokens d'accent (--accent, --accent-ink, --accent-deep…). Tous
 * les composants qui utilisent ces variables — boutons, onglets, icônes,
 * badges, curseurs, halo du fond — changent de teinte d'un coup, sans qu'il
 * faille faire redescendre la température jusqu'à eux.
 */
export function useAmbience(tempC: number | undefined) {
  const band = getTempBand(tempC);

  useEffect(() => {
    document.documentElement.dataset.ambience = band;
  }, [band]);

  return band;
}
