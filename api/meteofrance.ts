/**
 * Proxy serveur vers l'API Vigilance de Météo-France.
 *
 * La clé n'existe que côté serveur (METEOFRANCE_API_KEY, sans préfixe VITE_)
 * et n'est donc jamais envoyée au navigateur : le client appelle
 * /api/meteofrance/<endpoint>, cette fonction ajoute l'en-tête ApiKey et relaie
 * la réponse telle quelle (le corps est streamé).
 */

export const config = { runtime: "edge" };

const UPSTREAM_BASE = "https://public-api.meteofrance.fr/public/DPVigilance/v1";

/** Allowlist : empêche d'utiliser le proxy comme relais ouvert vers l'API. */
const ALLOWED_PATHS = new Set(["textesvigilance/encours", "cartevigilance/encours"]);

function problem(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "GET") {
    return problem(405, "Méthode non autorisée.");
  }

  const apiKey = process.env.METEOFRANCE_API_KEY?.trim();
  if (!apiKey) {
    return problem(500, "Clé Météo-France absente côté serveur (variable d'environnement METEOFRANCE_API_KEY).");
  }

  // Hors Next.js, Vercel ne route pas les fichiers « attrape-tout »
  // ([...path].ts) : vercel.json réécrit /api/meteofrance/<endpoint> vers
  // /api/meteofrance?path=<endpoint>. Le chemin brut reste accepté au cas où
  // la fonction recevrait l'URL d'origine.
  const requestUrl = new URL(request.url);
  const rawPath = requestUrl.searchParams.get("path") ?? requestUrl.pathname.replace(/^\/api\/meteofrance\/?/, "");
  const path = rawPath.replace(/^\/+|\/+$/g, "");

  if (!ALLOWED_PATHS.has(path)) {
    return problem(404, "Ressource Météo-France inconnue.");
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${UPSTREAM_BASE}/${path}`, {
      headers: {
        ApiKey: apiKey,
        Accept: request.headers.get("accept") ?? "*/*",
      },
      cache: "no-store",
    });
  } catch {
    return problem(502, "Météo-France est injoignable.");
  }

  // Les bulletins ne changent que quelques fois par jour : le CDN de Vercel
  // garde la réponse 5 minutes (puis la resert le temps de la rafraîchir),
  // ce qui évite qu'un appel à Météo-France soit fait pour chaque visiteur —
  // l'API publique est limitée en nombre d'appels par minute. Le navigateur,
  // lui, ne met rien en cache (max-age=0). Les erreurs ne sont jamais cachées.
  const cacheControl = upstream.ok ? "public, max-age=0, s-maxage=300, stale-while-revalidate=600" : "no-store";
  const headers = new Headers({ "cache-control": cacheControl });
  const contentType = upstream.headers.get("content-type");
  const disposition = upstream.headers.get("content-disposition");
  if (contentType) headers.set("content-type", contentType);
  if (disposition) headers.set("content-disposition", disposition);

  return new Response(upstream.body, { status: upstream.status, headers });
}
