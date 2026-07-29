import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, LocateFixed, Search, Snowflake, Sun } from "lucide-react";
import { useAppStore, type FavoriteCity, type CitySource } from "@/stores/appStore";
import { useForecastBundles } from "@/hooks/useForecastBundles";
import { CityCard } from "@/components/CityCard";
import { Forecast7Days } from "@/components/Forecast7Days";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { reverseGeocodeCity, searchCities, type OpenMeteoGeocodingResult } from "@/services/openMeteo";
import { fetchMeteoFranceDepartmentBulletin, type MeteoFranceDepartmentBulletin } from "@/services/meteoFranceVigilance";

function toCity(x: OpenMeteoGeocodingResult): FavoriteCity {
  return {
    id: x.id,
    name: x.name,
    adminArea: x.adminArea,
    postalCode: x.postalCode,
    countryCode: x.countryCode,
    lat: x.lat,
    lon: x.lon,
  };
}

function sourceLabel(source: CitySource) {
  if (source === "browser") return "Navigateur";
  if (source === "manual") return "Recherche";
  return "Par défaut";
}

function inferDepartmentCode(city: FavoriteCity) {
  if (city.countryCode && city.countryCode !== "FR") return null;

  const adminArea = city.adminArea?.trim().toUpperCase();
  if (adminArea && /^(?:[0-9]{2,3}|2A|2B)$/i.test(adminArea)) {
    return adminArea;
  }

  const postalCode = city.postalCode?.trim();
  if (!postalCode) return null;

  const digits = postalCode.replace(/\D/g, "");
  if (digits.length < 2) return null;
  if (digits.startsWith("97") || digits.startsWith("98")) {
    return digits.slice(0, 3);
  }
  return digits.slice(0, 2);
}

function formatBulletinDate(value?: string) {
  if (!value) return null;
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function SkeletonCard() {
  return (
    <Card className="h-[132px] p-4">
      <div className="animate-pulse space-y-3">
        <div className="h-4 w-40 rounded bg-slate-900/10 dark:bg-white/10" />
        <div className="h-3 w-56 rounded bg-slate-900/10 dark:bg-white/10" />
        <div className="mt-6 flex gap-2">
          <div className="h-6 w-16 rounded-full bg-slate-900/10 dark:bg-white/10" />
          <div className="h-6 w-16 rounded-full bg-slate-900/10 dark:bg-white/10" />
        </div>
      </div>
    </Card>
  );
}

export default function Home() {
  const activeCity = useAppStore((s) => s.activeCity);
  const citySource = useAppStore((s) => s.citySource);
  const hasAttemptedBrowserLocation = useAppStore((s) => s.hasAttemptedBrowserLocation);
  const setActiveCity = useAppStore((s) => s.setActiveCity);
  const markBrowserLocationAttempted = useAppStore((s) => s.markBrowserLocationAttempted);

  const cities = useMemo(() => [activeCity], [activeCity]);
  const { bundles, isLoading, error } = useForecastBundles(cities);
  const forecastSet = bundles[activeCity.id] ?? null;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OpenMeteoGeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [departmentBulletin, setDepartmentBulletin] = useState<MeteoFranceDepartmentBulletin | null>(null);
  const [isLoadingBulletin, setIsLoadingBulletin] = useState(false);

  const preventionCard = useMemo(() => {
    const tempC = forecastSet?.consensus?.current?.tempC;
    if (typeof tempC !== "number") return null;

    if (tempC >= 28) {
      return {
        kind: "heat" as const,
        title: "Prévention chaleur",
        lines: [
          "Buvez régulièrement, même sans soif.",
          "Évitez les efforts aux heures les plus chaudes et privilégiez l'ombre.",
          "Couvrez-vous la tête et portez des vêtements légers.",
          "Fermez les volets en journée et aérez tôt le matin ou le soir.",
          "Prenez des nouvelles des personnes fragiles autour de vous.",
        ],
      };
    }

    if (tempC <= 12) {
      return {
        kind: "cold" as const,
        title: "Prévention froid",
        lines: [
          "Habillez-vous chaudement, en plusieurs couches.",
          "Protégez les extrémités (mains, tête, cou), surtout en cas de vent.",
          "Limitez l'exposition prolongée à l'extérieur et gardez-vous au sec.",
          "Pensez aux personnes fragiles et adaptez les activités des enfants.",
          "Vérifiez le chauffage et l'aération du logement.",
        ],
      };
    }

    return null;
  }, [forecastSet?.consensus?.current?.tempC]);

  const normalized = useMemo(() => query.trim(), [query]);
  const departmentCode = useMemo(() => inferDepartmentCode(activeCity), [activeCity]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      if (!normalized) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const next = await searchCities(normalized, { signal: controller.signal });
        setResults(next);
      } finally {
        setIsSearching(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [normalized]);

  useEffect(() => {
    if (hasAttemptedBrowserLocation || citySource === "manual" || !navigator.geolocation) return;

    let cancelled = false;
    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (cancelled) return;
        const resolved = await reverseGeocodeCity(position.coords.latitude, position.coords.longitude);
        if (cancelled) return;
        if (resolved) {
          setActiveCity(toCity(resolved), "browser");
        }
        markBrowserLocationAttempted();
        setIsLocating(false);
      },
      () => {
        if (cancelled) return;
        markBrowserLocationAttempted();
        setIsLocating(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 1000 * 60 * 30,
      },
    );

    return () => {
      cancelled = true;
    };
  }, [citySource, hasAttemptedBrowserLocation, markBrowserLocationAttempted, setActiveCity]);

  useEffect(() => {
    if (!departmentCode) {
      setDepartmentBulletin(null);
      setIsLoadingBulletin(false);
      return;
    }

    const controller = new AbortController();
    setIsLoadingBulletin(true);

    fetchMeteoFranceDepartmentBulletin(departmentCode, { signal: controller.signal })
      .then((bulletin) => {
        setDepartmentBulletin(bulletin);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setDepartmentBulletin(null);
      })
      .finally(() => {
        setIsLoadingBulletin(false);
      });

    return () => controller.abort();
  }, [departmentCode]);

  async function locateFromBrowser() {
    if (!navigator.geolocation) {
      setLocationError("La géolocalisation du navigateur n'est pas disponible.");
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const resolved = await reverseGeocodeCity(position.coords.latitude, position.coords.longitude);
        if (resolved) {
          setActiveCity(toCity(resolved), "browser");
          setQuery("");
          setResults([]);
        } else {
          setLocationError("Impossible d'identifier une ville depuis la position du navigateur.");
        }
        setIsLocating(false);
      },
      () => {
        setLocationError("Le navigateur n'a pas fourni de position exploitable.");
        setIsLocating(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 1000 * 60 * 30,
      },
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm text-slate-600 dark:text-zinc-300">Ville active</div>
              <div className="mt-1 font-serif text-2xl tracking-tight">{activeCity.name}</div>
            </div>
            <Badge tone="zinc">{sourceLabel(citySource)}</Badge>
          </div>

          <div className="mt-4">
            {isLoading && !forecastSet ? <SkeletonCard /> : <CityCard bundle={forecastSet?.consensus ?? null} />}
          </div>

          {isLocating ? (
            <div className="mt-3 text-xs text-slate-500 dark:text-zinc-400">Recherche de la ville du navigateur…</div>
          ) : null}

          {preventionCard ? (
            <div
              className={[
                "mt-4 flex gap-3 rounded-xl p-3 text-sm ring-1",
                preventionCard.kind === "heat"
                  ? "bg-amber-500/10 text-amber-950 ring-amber-200/70 dark:text-amber-100 dark:ring-amber-400/20"
                  : "bg-sky-500/10 text-sky-950 ring-sky-200/70 dark:text-sky-100 dark:ring-sky-400/20",
              ].join(" ")}
            >
              <div className="mt-0.5">
                {preventionCard.kind === "heat" ? <Sun className="size-4" /> : <Snowflake className="size-4" />}
              </div>
              <div className="min-w-0">
                <div className="font-semibold">{preventionCard.title}</div>
                <ul className="mt-2 space-y-1 text-sm leading-6">
                  {preventionCard.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm text-slate-600 dark:text-zinc-300">Recherche</div>
              <div className="mt-1 font-serif text-2xl tracking-tight">Changer de ville</div>
            </div>
            <button
              type="button"
              onClick={locateFromBrowser}
              className="inline-flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2 text-sm font-medium text-slate-800 ring-1 ring-slate-200/70 shadow-sm transition hover:bg-white dark:bg-white/5 dark:text-zinc-200 dark:ring-white/10 dark:shadow-none dark:hover:bg-white/10"
            >
              <LocateFixed className="size-4" />
              <span>Ma position</span>
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/80 px-3 py-2 ring-1 ring-slate-200/70 shadow-sm dark:bg-white/5 dark:ring-white/10 dark:shadow-none">
            <Search className="size-4 text-slate-500 dark:text-zinc-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: Nice, Saint-Laurent-du-Var, Antibes…"
              className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
            {isSearching ? <div className="h-2 w-2 animate-pulse rounded-full bg-slate-500 dark:bg-zinc-400" /> : null}
          </div>

          <div className="mt-4 space-y-2">
            {results.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => {
                  setActiveCity(toCity(result), "manual");
                  setQuery("");
                  setResults([]);
                }}
                className="w-full rounded-xl bg-white/70 px-3 py-3 text-left ring-1 ring-slate-200/70 shadow-sm transition hover:bg-white dark:bg-white/5 dark:ring-white/10 dark:shadow-none dark:hover:bg-white/7"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="break-words font-medium text-slate-900 dark:text-zinc-50">{result.name}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                      {[result.postalCode, result.adminArea, result.countryCode].filter(Boolean).join(" • ")}
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-500 dark:text-zinc-400">
                    <div>
                      {result.lat.toFixed(4).replace(".", ",")} ; {result.lon.toFixed(4).replace(".", ",")}
                    </div>
                    <div className="mt-1 text-slate-400 dark:text-zinc-500">Afficher cette ville</div>
                  </div>
                </div>
              </button>
            ))}

            {locationError ? (
              <div className="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-900 ring-1 ring-rose-200/70 dark:text-rose-100 dark:ring-rose-400/20">
                {locationError}
              </div>
            ) : null}
          </div>
        </Card>
      </section>

      {error ? (
        <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-900 ring-1 ring-rose-200/70 dark:text-rose-100 dark:ring-rose-400/20">
          <AlertTriangle className="size-4" />
          <span>{error}</span>
        </div>
      ) : null}

      {departmentBulletin || isLoadingBulletin ? (
        <section>
          <Card className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-slate-600 dark:text-zinc-300">Bulletin Météo-France</div>
                <div className="mt-1 font-serif text-2xl tracking-tight">
                  {departmentBulletin ? departmentBulletin.domainName : "Chargement du bulletin…"}
                </div>
              </div>

              {departmentBulletin?.riskName ? <Badge tone="amber">{departmentBulletin.riskName}</Badge> : null}
            </div>

            {departmentBulletin ? (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-zinc-400">
                  <span>{departmentBulletin.blocTitle}</span>
                  <span>•</span>
                  <span>{departmentBulletin.typeName}</span>
                  {departmentBulletin.termName ? (
                    <>
                      <span>•</span>
                      <span>{departmentBulletin.termName}</span>
                    </>
                  ) : null}
                </div>

                {departmentBulletin.startISO || departmentBulletin.endISO ? (
                  <div className="rounded-xl bg-white/70 p-3 text-sm text-slate-600 ring-1 ring-slate-200/70 dark:bg-white/5 dark:text-zinc-300 dark:ring-white/10">
                    {departmentBulletin.startISO ? `Début : ${formatBulletinDate(departmentBulletin.startISO)}` : null}
                    {departmentBulletin.startISO && departmentBulletin.endISO ? " • " : null}
                    {departmentBulletin.endISO ? `Fin : ${formatBulletinDate(departmentBulletin.endISO)}` : null}
                  </div>
                ) : null}

                <div className="space-y-3">
                  {departmentBulletin.sections.map((section, index) => (
                    <div
                      key={`${section.title ?? "section"}-${index}`}
                      className="rounded-2xl bg-white/70 p-4 ring-1 ring-slate-200/70 dark:bg-white/5 dark:ring-white/10"
                    >
                      {section.title ? (
                        <div className="mb-2 text-sm font-semibold text-slate-900 dark:text-zinc-100">{section.title}</div>
                      ) : null}
                      <div className="space-y-2 text-sm leading-6 text-slate-700 dark:text-zinc-300">
                        {section.lines.map((line, lineIndex) => (
                          <p key={`${index}-${lineIndex}`}>{line}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-white/70 p-4 text-sm text-slate-600 ring-1 ring-slate-200/70 dark:bg-white/5 dark:text-zinc-300 dark:ring-white/10">
                Recherche du bulletin zonal ou régional correspondant au département {departmentCode}…
              </div>
            )}
          </Card>
        </section>
      ) : null}

      <section>
        <Forecast7Days forecastSet={forecastSet} />
      </section>
    </div>
  );
}
