import {
  getDepartmentVigilance,
  VIGILANCE_RISK_LABELS,
  type VigilanceLevelId,
  type VigilanceRiskId,
  type VigilanceSnapshot,
} from "@/services/meteoFranceVigilance";
import { FRENCH_DEPARTMENT_NAMES } from "@/utils/department";
import { VIGILANCE_LEVEL_NAMES } from "@/utils/vigilance";

/** Seuil d'alerte : orange (3) ou rouge (4). Le jaune reste une simple pastille. */
export const ALERT_LEVEL: VigilanceLevelId = 3;

export type VigilanceAlert = {
  /** Identifie l'épisode : même département, même jour, même niveau → une seule notification. */
  key: string;
  title: string;
  body: string;
};

/**
 * Notification à envoyer pour le département, ou null. Parcourt aujourd'hui
 * puis demain et garde la première échéance en orange ou rouge. `lastKey`
 * est la clé de la dernière notification envoyée : un épisode déjà signalé
 * ne l'est pas deux fois, mais un passage d'orange à rouge l'est.
 */
export function vigilanceAlertFor(snapshot: VigilanceSnapshot, departmentCode: string, lastKey?: string | null): VigilanceAlert | null {
  for (const period of snapshot.periods.slice(0, 2)) {
    const vigilance = getDepartmentVigilance(period, departmentCode);
    if (!vigilance || vigilance.overallLevel < ALERT_LEVEL) continue;

    const day = period.beginISO?.slice(0, 10) ?? period.id;
    const key = `${vigilance.code}:${day}:${vigilance.overallLevel}`;
    if (key === lastKey) return null;

    const risks = (Object.entries(vigilance.risks) as Array<[string, VigilanceLevelId]>)
      .filter(([, level]) => level >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([riskId, level]) => `${VIGILANCE_RISK_LABELS[Number(riskId) as VigilanceRiskId]} (${VIGILANCE_LEVEL_NAMES[level]})`);
    const name = FRENCH_DEPARTMENT_NAMES[vigilance.code] ?? vigilance.code;

    return {
      key,
      title: `Vigilance ${VIGILANCE_LEVEL_NAMES[vigilance.overallLevel]} — ${name} (${vigilance.code})`,
      body: `${period.label} : ${risks.join(", ") || "voir le bulletin Météo-France"}.`,
    };
  }
  return null;
}
