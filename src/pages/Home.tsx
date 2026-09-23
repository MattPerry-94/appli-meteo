import { useMemo } from "react";
import { Star } from "lucide-react";
import { isSameCity, MAX_FAVORITES, useAppStore, type CitySource } from "@/stores/appStore";
import { useForecastBundles } from "@/hooks/useForecastBundles";
import { useAmbience } from "@/hooks/useAmbience";
import { useDepartmentBulletin } from "@/hooks/useDepartmentBulletin";
import { useVigilanceSnapshot } from "@/hooks/useVigilanceSnapshot";
import { useNextHourRain } from "@/hooks/useNextHourRain";
import { useModelScores } from "@/hooks/useModelScores";
import { useCityBriefs } from "@/hooks/useCityBriefs";
import { toFavoriteCity, useGeolocatedCity } from "@/hooks/useGeolocatedCity";
import { CityCard } from "@/components/CityCard";
import { CitySearchCard } from "@/components/CitySearchCard";
import { BulletinCard } from "@/components/BulletinCard";
import { PreventionCard } from "@/components/PreventionCard";
import { VigilanceStrip } from "@/components/VigilanceStrip";
import { NextHourRain } from "@/components/NextHourRain";
import { Forecast7Days } from "@/components/Forecast7Days";
import { ForecastChart48h } from "@/components/ForecastChart48h";
import { ModelScoreCard } from "@/components/ModelScoreCard";
import { FavoritesBar } from "@/components/FavoritesBar";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { Notice } from "@/components/Notice";
import { cn } from "@/lib/utils";
import { formatTimeHHmm } from "@/utils/format";
import { inferDepartmentCode } from "@/utils/department";

function sourceLabel(source: CitySource) {
  if (source === "browser") return "Navigateur";
  if (source === "manual") return "Recherche";
  return "Par défaut";
}

function SkeletonCard() {
  return (
    <Card className="h-[150px] p-5">
      <div className="space-y-3">
        <div className="skeleton h-4 w-40 rounded-md" />
        <div className="skeleton h-3 w-56 rounded-md" />
        <div className="flex gap-2 pt-5">
          <div className="skeleton h-6 w-20 rounded-full" />
          <div className="skeleton h-6 w-20 rounded-full" />
        </div>
      </div>
    </Card>
  );
}

export default function Home() {
  const activeCity = useAppStore((s) => s.activeCity);
  const citySource = useAppStore((s) => s.citySource);
  const setActiveCity = useAppStore((s) => s.setActiveCity);
  const favorites = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const isFavorite = favorites.some((city) => isSameCity(city, activeCity));
  const favoritesFull = !isFavorite && favorites.length >= MAX_FAVORITES;
  const briefs = useCityBriefs(favorites);

  const cities = useMemo(() => [activeCity], [activeCity]);
  const { bundles, isLoading, error, updatedAt } = useForecastBundles(cities);
  const forecastSet = bundles[activeCity.id] ?? null;
  const currentTempC = forecastSet?.consensus?.current?.tempC;

  // Diffuse la palette du site (bleu / orange / rouge) selon la température.
  useAmbience(currentTempC);

  const geolocation = useGeolocatedCity();
  const departmentCode = useMemo(() => inferDepartmentCode(activeCity), [activeCity]);
  const { bulletin, isLoading: isLoadingBulletin } = useDepartmentBulletin(departmentCode);
  const vigilance = useVigilanceSnapshot();
  const nextHourRain = useNextHourRain(activeCity);
  const modelScores = useModelScores(activeCity);

  return (
    <div className="space-y-5">
      <FavoritesBar
        favorites={favorites}
        briefs={briefs}
        activeCity={activeCity}
        onSelect={(city) => setActiveCity(city, "manual")}
        onRemove={toggleFavorite}
      />

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="eyebrow">Ville active</div>
              <div className="display mt-1 truncate text-2xl">{activeCity.name}</div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge tone="zinc">{sourceLabel(citySource)}</Badge>
              <button
                type="button"
                onClick={() => toggleFavorite(activeCity)}
                disabled={favoritesFull}
                aria-pressed={isFavorite}
                aria-label={isFavorite ? `Retirer ${activeCity.name} des favoris` : `Ajouter ${activeCity.name} aux favoris`}
                title={favoritesFull ? `${MAX_FAVORITES} favoris au maximum` : undefined}
                className="btn btn-ghost rounded-2xl px-2.5 disabled:opacity-40"
              >
                <Star className={isFavorite ? "size-4 fill-amber-400 text-amber-500" : "size-4"} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="mt-4">
            {isLoading && !forecastSet ? <SkeletonCard /> : <CityCard bundle={forecastSet?.consensus ?? null} />}
          </div>

          {geolocation.isLocating ? (
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
              <span className="accent-dot size-1.5 animate-pulse rounded-full" />
              Recherche de la ville du navigateur…
            </div>
          ) : null}

          {updatedAt ? (
            <div className="numeric mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
              <span className={cn("size-1.5 rounded-full bg-emerald-500", isLoading && "accent-dot animate-pulse")} />
              {isLoading ? "Actualisation…" : `Mis à jour à ${formatTimeHHmm(updatedAt)}`}
            </div>
          ) : null}

          <NextHourRain slots={nextHourRain.slots} fine={nextHourRain.fine} className="mt-4" />

          <VigilanceStrip
            snapshot={vigilance.snapshot}
            departmentCode={departmentCode}
            isLoading={vigilance.isLoading}
            className="mt-4"
          />

          <PreventionCard tempC={currentTempC} className="mt-4" />
        </Card>

        <CitySearchCard
          onSelect={(result) => setActiveCity(toFavoriteCity(result), "manual")}
          onLocate={geolocation.locate}
          locationError={geolocation.error}
        />
      </section>

      {error ? <Notice>{error}</Notice> : null}

      {bulletin || isLoadingBulletin ? (
        <section>
          <BulletinCard bulletin={bulletin} departmentCode={departmentCode} />
        </section>
      ) : null}

      <section>
        <ForecastChart48h forecastSet={forecastSet} />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <ModelScoreCard report={modelScores.report} isLoading={modelScores.isLoading} failed={modelScores.failed} />
      </section>

      <section>
        <Forecast7Days forecastSet={forecastSet} />
      </section>
    </div>
  );
}
