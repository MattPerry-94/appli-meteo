import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { BrowserContext, Route } from "@playwright/test";

/**
 * Réponses réseau enregistrées une fois (npm run e2e:record) puis rejouées :
 * les tests ne dépendent ni d'Open-Meteo, ni de la clé Météo-France, ni de
 * la météo du jour.
 */
export type RecordedEntry = { key: string; status: number; contentType: string; body: string };
export type Recording = { recordedAt: string; timezone: string; entries: RecordedEntry[] };

export const FIXTURE_PATH = fileURLToPath(new URL("./fixtures/network.json", import.meta.url));

/** Hôtes rejoués. Le reste du réseau externe est coupé. */
export const RECORDED_HOSTS = [
  "api.open-meteo.com",
  "previous-runs-api.open-meteo.com",
  "archive-api.open-meteo.com",
  "air-quality-api.open-meteo.com",
  "marine-api.open-meteo.com",
  "geocoding-api.open-meteo.com",
  "nominatim.openstreetmap.org",
];

/** Clé stable : hôte + chemin + paramètres triés ; l'origine locale est omise (port variable). */
export function keyFor(rawUrl: string) {
  const url = new URL(rawUrl);
  const params = [...url.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
  const search = new URLSearchParams(params).toString();
  const host = url.pathname.startsWith("/api/meteofrance") ? "" : url.host;
  return `${host}${url.pathname}${search ? `?${search}` : ""}`;
}

export function isRecordedUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  return RECORDED_HOSTS.includes(url.host) || url.pathname.startsWith("/api/meteofrance/");
}

let cached: Recording | null = null;
export function loadRecording(): Recording {
  cached ??= JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as Recording;
  return cached;
}

/** Chemin seul (sans paramètres), pour retrouver une réponse proche si la requête exacte manque. */
function pathOf(key: string) {
  return key.split("?")[0];
}

export type ReplayOptions = {
  /** Remplace certaines réponses (ex. carte de vigilance passée en orange). */
  override?: (key: string, entry: RecordedEntry | undefined) => RecordedEntry | undefined;
};

/**
 * Rejoue l'enregistrement sur tout le contexte (pages et service worker).
 * Retourne la liste des requêtes sans réponse enregistrée, pour les signaler.
 */
export async function replayNetwork(context: BrowserContext, options: ReplayOptions = {}) {
  const recording = loadRecording();
  const exact = new Map(recording.entries.map((entry) => [entry.key, entry]));
  const byPath = new Map<string, RecordedEntry>();
  for (const entry of recording.entries) if (!byPath.has(pathOf(entry.key))) byPath.set(pathOf(entry.key), entry);
  const misses: string[] = [];

  await context.route(
    (url) => url.protocol.startsWith("http") && !["localhost", "127.0.0.1"].includes(url.hostname),
    (route: Route) => {
      const url = route.request().url();
      if (!isRecordedUrl(url)) return route.abort();
      return fulfill(route, url);
    },
  );
  await context.route("**/api/meteofrance/**", (route) => fulfill(route, route.request().url()));

  function fulfill(route: Route, url: string) {
    const key = keyFor(url);
    let entry = exact.get(key);
    if (!entry) {
      entry = byPath.get(pathOf(key));
      misses.push(key);
    }
    entry = options.override ? options.override(key, entry) : entry;
    if (!entry) return route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
    // Comme les vraies API : sans cet en-tête, les requêtes du service worker (mode cors) échouent.
    return route.fulfill({
      status: entry.status,
      contentType: entry.contentType,
      headers: { "access-control-allow-origin": "*" },
      body: entry.body,
    });
  }

  return { recording, misses };
}
