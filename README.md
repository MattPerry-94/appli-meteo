# Appli Météo

Application météo React qui croise trois modèles de prévision et affiche les
bulletins de vigilance Météo-France pour la ville active.

- **Consensus multi-modèles** — AROME (Météo-France), GFS (NOAA) et ECMWF sont
  interrogés en parallèle via [Open-Meteo](https://open-meteo.com/), puis
  moyennés. Un indice de fiabilité indique à quel point les modèles sont
  d'accord entre eux.
- **Prévisions à 7 jours** détaillées heure par heure, consultables modèle par
  modèle ou en consensus.
- **Vigilance Météo-France** — couleur de vigilance et bulletin du département
  de la ville active, et carte de France interactive des vigilances
  (aujourd'hui / demain, filtrable par risque).
- **Carte radar** — pluie, nuages et orages via l'embed Windy.
- **Ville active** déterminée par géolocalisation du navigateur, ou par
  recherche manuelle ; elle est mémorisée localement.

## Démarrage

```bash
npm install
cp .env.example .env   # puis renseignez METEOFRANCE_API_KEY
npm run dev
```

L'application est servie sur http://localhost:5173.

## Variables d'environnement

| Variable | Requis | Rôle |
| --- | --- | --- |
| `METEOFRANCE_API_KEY` | pour les vigilances | Clé du portail [public-api.meteofrance.fr](https://portail-api.meteofrance.fr/) (API DPVigilance). |

Open-Meteo et l'embed Windy ne demandent aucune clé : sans
`METEOFRANCE_API_KEY`, seuls les encarts de vigilance sont indisponibles, le
reste de l'application fonctionne.

> **La clé ne doit jamais être préfixée `VITE_`.** Vite inline toute variable
> `VITE_*` dans le bundle JavaScript envoyé au navigateur : elle deviendrait
> publique. Elle est ici lue uniquement côté serveur, par le proxy de dev
> ([vite.config.ts](vite.config.ts)) en local et par la fonction serverless
> [api/meteofrance/[...path].ts](api/meteofrance/%5B...path%5D.ts) en
> production. Le navigateur n'appelle que `/api/meteofrance/*`.

## Déploiement (Vercel)

Le dossier `api/` est déployé automatiquement comme fonction Edge. Déclarez
`METEOFRANCE_API_KEY` dans **Settings → Environment Variables**, sans préfixe.
Aucune autre configuration n'est nécessaire : `npm run build` produit le site
statique et Vercel route `/api/*` vers la fonction.

Les réponses de Météo-France sont mises en cache 5 minutes sur le CDN de Vercel
(`s-maxage=300`) : l'API publique est limitée en nombre d'appels par minute, et
un bulletin ne change que quelques fois par jour.

## Scripts

| Commande | Effet |
| --- | --- |
| `npm run dev` | Serveur de développement avec HMR et proxy Météo-France. |
| `npm run build` | Vérification TypeScript puis build de production dans `dist/`. |
| `npm run preview` | Sert le build de production localement. |
| `npm run check` | Typecheck seul. |
| `npm run lint` | ESLint. |
| `npm test` | Tests unitaires (Vitest). |

La CI GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml)) enchaîne
lint, typecheck, tests et build à chaque push sur `main` et sur les pull requests.

## Architecture

```
src/
  components/   Card, Badge, Notice, WeatherIcon, CityCard, CitySearchCard,
                BulletinCard, PreventionCard, VigilanceStrip, VigilanceMap,
                Forecast7Days, HourlyDetails, AppShell
  data/         franceDepartments.ts (contours SVG, IGN Admin Express, Licence ouverte)
  pages/        Home (prévisions + recherche), MapPage (radar + vigilances)
  services/     openMeteo.ts (prévisions, géocodage), meteoFranceVigilance.ts
  utils/        forecastConsensus.ts (moyennes + fiabilité), department.ts
                (code département d'une ville), format, weather
  stores/       appStore.ts (ville active, persistée via zustand/persist)
  hooks/        useForecastBundles, useDepartmentBulletin, useVigilanceSnapshot
                (fetch + rafraîchissement),
                useCitySearch, useGeolocatedCity, useTheme, useAmbience
api/
  meteofrance/  Proxy serveur détenant la clé Météo-France
```

Les prévisions sont rafraîchies toutes les 10 minutes et au retour sur l'onglet.

## Style

Tailwind CSS, avec un jeu de tokens et de classes de composants défini dans
[src/index.css](src/index.css) (`.surface`, `.tile`, `.segment`, `.btn`,
`.eyebrow`…). Les thèmes clair et sombre dérivent des mêmes variables CSS.
