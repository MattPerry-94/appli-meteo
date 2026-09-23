/**
 * Proxy serveur vers l'API Vigilance de Météo-France.
 *
 * La clé n'existe que côté serveur (METEOFRANCE_API_KEY, sans préfixe VITE_)
 * et n'est donc jamais envoyée au navigateur : le client appelle
 * /api/meteofrance/<endpoint>, cette fonction ajoute l'en-tête ApiKey et relaie
 * la réponse telle quelle (le corps est streamé).
 *
 * Runtime Node.js, région Paris (vercel.json) plutôt qu'Edge : une clé valide
 * se voyait refuser en 403 depuis le réseau Edge, alors qu'elle passait
 * depuis un poste en France. Un datacenter fixe à Paris donne une IP de
 * sortie stable et proche de Météo-France.
 */

const UPSTREAM_BASE = "https://public-api.meteofrance.fr/public/DPVigilance/v1";

/** Allowlist : empêche d'utiliser le proxy comme relais ouvert vers l'API. */
const ALLOWED_PATHS = new Set(["textesvigilance/encours", "cartevigilance/encours"]);

function problem(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

/**
 * Résumé de la réponse de refus, pour savoir qui refuse : la passerelle d'API
 * répond en JSON avec un code (900901 clé invalide, 900908 abonnement…), un
 * pare-feu répond une page HTML. Ne contient jamais la clé.
 */
async function describeRefusal(upstream: Response) {
  const text = (await upstream.text().catch(() => "")).trim();
  try {
    const body = JSON.parse(text) as { code?: unknown; message?: unknown; description?: unknown };
    const parts = [body.code, body.message, body.description].filter((part) => typeof part === "string" || typeof part === "number");
    if (parts.length) return `passerelle d'API : ${parts.join(" — ")}`;
  } catch {
    // Pas du JSON : page d'un pare-feu ou d'un CDN.
  }
  const plain = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
  return plain ? `réponse hors API (pare-feu ?) : « ${plain} »` : "réponse vide";
}

export async function GET(request: Request): Promise<Response> {
  // Des guillemets recopiés depuis un .env (METEOFRANCE_API_KEY="...") font
  // partie de la valeur sur Vercel : Météo-France refuserait alors la clé.
  const apiKey = process.env.METEOFRANCE_API_KEY?.trim().replace(/^(["'])(.*)\1$/, "$2").trim();
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
        "User-Agent": "appli-meteo (proxy Vercel)",
      },
      cache: "no-store",
    });
  } catch {
    return problem(502, "Météo-France est injoignable.");
  }

  // Refus : on dit qui refuse (passerelle ou pare-feu) et on donne la longueur
  // de la clé reçue, à comparer avec celle du .env local. Ni l'une ni l'autre
  // ne révèle la clé.
  if (upstream.status === 401 || upstream.status === 403) {
    return problem(
      upstream.status,
      `Météo-France refuse l'appel (${upstream.status}, clé de ${apiKey.length} caractères) — ${await describeRefusal(upstream)}.`,
    );
  }

  // Les bulletins ne changent que quelques fois par jour : le CDN de Vercel
  // garde la réponse 5 minutes (puis la resert le temps de la rafraîchir),
  // ce qui évite qu'un appel à Météo-France soit fait pour chaque visiteur —
  // l'API publique est limitée en nombre d'appels par minute. Le navigateur,
  // lui, ne met rien en cache (max-age=0). Les erreurs ne sont jamais cachées.
  const cacheControl = upstream.ok ? "public, max-age=0, s-maxage=300, stale-while-revalidate=600" : "no-store";
  const headers = new Headers({ "cache-control": cacheControl });
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  return new Response(upstream.body, { status: upstream.status, headers });
}
