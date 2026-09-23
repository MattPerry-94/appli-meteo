/*
 * Service worker de l'Appli Météo : application installable et dernières
 * prévisions consultables hors ligne.
 *
 * - Pages : réseau d'abord (la dernière version du site), repli sur la page
 *   mise en cache si le réseau manque.
 * - Fichiers /assets/ : cache d'abord. Vite leur donne un nom qui change à
 *   chaque build, une version en cache est donc toujours la bonne.
 * - Données météo (Open-Meteo, relais Météo-France) : réseau d'abord avec un
 *   délai de 8 s, puis la dernière réponse enregistrée pour la même adresse.
 *   Une ville déjà consultée reste lisible sans connexion.
 * - Polices Google : servies depuis le cache puis rafraîchies en arrière-plan.
 *
 * Changer VERSION invalide les caches du site à la prochaine visite.
 */
const VERSION = "v1";
/** En-tête ajouté aux réponses enregistrées : l'appli y lit l'âge réel des données. */
const SAVED_AT_HEADER = "x-meteo-saved-at";
const SHELL_CACHE = `meteo-shell-${VERSION}`;
const DATA_CACHE = `meteo-data-${VERSION}`;
const SHELL_URLS = ["/", "/manifest.webmanifest", "/favicon.svg", "/icon-192.png", "/icon-512.png"];

const DATA_HOSTS = new Set([
  "api.open-meteo.com",
  "air-quality-api.open-meteo.com",
  "marine-api.open-meteo.com",
  "previous-runs-api.open-meteo.com",
  "archive-api.open-meteo.com",
]);
const FONT_HOSTS = new Set(["fonts.googleapis.com", "fonts.gstatic.com"]);
const NETWORK_TIMEOUT_MS = 8000;
/** Au-delà, les réponses les plus anciennes sont supprimées (villes plus consultées, jours passés). */
const DATA_CACHE_MAX_ENTRIES = 80;

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  // Les clés sont rendues dans l'ordre d'insertion : on retire les plus anciennes.
  await Promise.all(keys.slice(0, Math.max(0, keys.length - maxEntries)).map((key) => cache.delete(key)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !key.endsWith(`-${VERSION}`)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Copie de la réponse horodatée. Une réponse construite par le service worker
 * est de type « default » : la page peut lire cet en-tête, contrairement aux
 * en-têtes d'origine d'une réponse d'un autre domaine (Date n'est pas exposé).
 */
async function stamped(response) {
  const headers = new Headers(response.headers);
  headers.set(SAVED_AT_HEADER, new Date().toISOString());
  return new Response(await response.clone().blob(), { status: response.status, statusText: response.statusText, headers });
}

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const response = await withTimeout(fetch(request), NETWORK_TIMEOUT_MS);
    if (response.ok) {
      // Réécrire l'entrée la replace en fin de liste : la plus récente reste.
      await cache.delete(request);
      await cache.put(request, cacheName === DATA_CACHE ? await stamped(response) : response.clone());
      if (cacheName === DATA_CACHE) trimCache(DATA_CACHE, DATA_CACHE_MAX_ENTRIES);
    }
    return response;
  } catch (error) {
    const cached = (await cache.match(request)) || (fallbackUrl && (await caches.match(fallbackUrl)));
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(cacheName)).put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok || response.type === "opaque") cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || refresh;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, SHELL_CACHE, "/"));
    return;
  }

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith("/assets/")) {
      event.respondWith(cacheFirst(request, SHELL_CACHE));
    } else if (url.pathname.startsWith("/api/meteofrance")) {
      event.respondWith(networkFirst(request, DATA_CACHE));
    }
    return;
  }

  if (DATA_HOSTS.has(url.hostname)) {
    event.respondWith(networkFirst(request, DATA_CACHE));
  } else if (FONT_HOSTS.has(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
  }
});

/* ------------------------------------------------------------------ */
/* Alertes de vigilance                                                */
/* ------------------------------------------------------------------ */

// Mêmes adresse et forme que src/services/alertPrefs.ts.
const PREFS_CACHE = "meteo-prefs";
const PREFS_URL = "/__meteo/alert-prefs";
const RISK_LABELS = { 1: "Vent", 2: "Pluie-inondation", 3: "Orages", 4: "Crues", 5: "Neige-verglas", 6: "Canicule", 7: "Grand froid", 8: "Avalanches", 9: "Vagues-submersion" };
const LEVEL_NAMES = { 1: "verte", 2: "jaune", 3: "orange", 4: "rouge" };

async function readPrefs() {
  const response = await (await caches.open(PREFS_CACHE)).match(PREFS_URL);
  return response ? response.json() : null;
}

async function writePrefs(prefs) {
  await (await caches.open(PREFS_CACHE)).put(PREFS_URL, new Response(JSON.stringify(prefs), { headers: { "content-type": "application/json" } }));
}

/**
 * Version autonome de vigilanceAlertFor (src/utils/vigilanceAlert.ts), sur la
 * réponse brute de cartevigilance/encours : le worker ne peut pas importer le
 * code de l'appli. Département et domaine côtier (code + « 10 ») fusionnés.
 */
function alertFromCarte(data, code, lastKey) {
  const periods = (data && data.product && data.product.periods) || [];
  const ordered = [...periods].sort((a, b) => (a.echeance === "J" ? -1 : 0) - (b.echeance === "J" ? -1 : 0));
  for (const period of ordered.slice(0, 2)) {
    const domains = ((period.timelaps && period.timelaps.domain_ids) || []).filter((domain) => {
      const id = String(domain.domain_id).toUpperCase();
      return id === code || id === `${code}10`;
    });
    if (!domains.length) continue;
    const level = Math.max(...domains.map((domain) => Number(domain.max_color_id) || 1));
    if (level < 3) continue;

    const day = String(period.begin_validity_time || period.echeance).slice(0, 10);
    const key = `${code}:${day}:${level}`;
    if (key === lastKey) return null;

    const risks = {};
    for (const domain of domains) {
      for (const item of domain.phenomenon_items || []) {
        const id = Number(item.phenomenon_id);
        risks[id] = Math.max(risks[id] || 1, Number(item.phenomenon_max_color_id) || 1);
      }
    }
    const detail = Object.entries(risks)
      .filter(([, value]) => value >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([id, value]) => `${RISK_LABELS[id]} (${LEVEL_NAMES[value]})`)
      .join(", ");
    const label = period.echeance === "J1" ? "Demain" : "Aujourd'hui";
    return { key, title: `Vigilance ${LEVEL_NAMES[level]} — département ${code}`, body: `${label} : ${detail || "voir le bulletin Météo-France"}.` };
  }
  return null;
}

async function checkVigilance() {
  const prefs = await readPrefs();
  if (!prefs || !prefs.enabled || !prefs.departmentCode) return;
  const response = await fetch("/api/meteofrance/cartevigilance/encours", { cache: "no-store" });
  if (!response.ok) return;
  const alert = alertFromCarte(await response.json(), prefs.departmentCode, prefs.lastKey);
  if (!alert) return;
  await writePrefs({ ...prefs, lastKey: alert.key });
  await self.registration.showNotification(alert.title, {
    body: alert.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "vigilance",
    data: { url: prefs.url || "/" },
  });
}

// Vérification réveillée par le navigateur quand l'appli est installée
// (Periodic Background Sync, Chrome Android surtout).
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "vigilance") event.waitUntil(checkVigilance());
});

// Clic sur la notification : on revient sur un onglet ouvert, ou on en ouvre un sur la ville.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const open = clients.find((client) => new URL(client.url).origin === self.location.origin);
      if (open) return open.focus().then(() => open.navigate(url));
      return self.clients.openWindow(url);
    }),
  );
});
