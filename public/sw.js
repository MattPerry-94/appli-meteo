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
