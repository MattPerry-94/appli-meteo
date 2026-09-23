/**
 * Préférences d'alerte partagées entre la page et le service worker. Le
 * Cache Storage est le seul stockage que les deux lisent sans dépendance
 * (localStorage n'existe pas dans un service worker) : les préférences y
 * sont rangées comme une fausse réponse JSON. Garder la même adresse et la
 * même forme que dans public/sw.js.
 */
export const ALERT_PREFS_CACHE = "meteo-prefs";
export const ALERT_PREFS_URL = "/__meteo/alert-prefs";

export type AlertPrefs = {
  enabled: boolean;
  departmentCode: string | null;
  cityName: string;
  /** Lien ouvert au clic sur la notification. */
  url: string;
  /** Dernier épisode signalé (voir vigilanceAlertFor), commun à la page et au worker. */
  lastKey: string | null;
};

function available() {
  return typeof caches !== "undefined";
}

export async function readAlertPrefs(): Promise<AlertPrefs | null> {
  if (!available()) return null;
  try {
    const response = await (await caches.open(ALERT_PREFS_CACHE)).match(ALERT_PREFS_URL);
    return response ? ((await response.json()) as AlertPrefs) : null;
  } catch {
    return null;
  }
}

export async function writeAlertPrefs(update: Partial<AlertPrefs>) {
  if (!available()) return;
  try {
    const current = (await readAlertPrefs()) ?? { enabled: false, departmentCode: null, cityName: "", url: "/", lastKey: null };
    const next = { ...current, ...update };
    await (await caches.open(ALERT_PREFS_CACHE)).put(
      ALERT_PREFS_URL,
      new Response(JSON.stringify(next), { headers: { "content-type": "application/json" } }),
    );
  } catch {
    // Stockage indisponible (navigation privée) : l'alerte en page marche encore.
  }
}
