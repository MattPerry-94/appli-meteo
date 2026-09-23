import { Star, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { WeatherIcon } from "@/components/WeatherIcon";
import type { CityBrief } from "@/services/openMeteo";
import { isSameCity, type FavoriteCity } from "@/stores/appStore";
import { formatTempC } from "@/utils/format";
import { getOpenMeteoVisual } from "@/utils/weather";

/**
 * Bande des villes favorites : un aperçu par ville (température, temps,
 * min → max), un clic pour l'afficher. Défile horizontalement sur mobile.
 */
export function FavoritesBar(props: {
  favorites: FavoriteCity[];
  briefs: Record<string, CityBrief>;
  activeCity: FavoriteCity;
  onSelect: (city: FavoriteCity) => void;
  onRemove: (city: FavoriteCity) => void;
}) {
  if (!props.favorites.length) {
    return (
      <div className="tile flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-slate-500 dark:text-zinc-400">
        <Star className="size-4 shrink-0" aria-hidden="true" />
        Ajoutez des villes en favori avec l'étoile de la ville active pour les retrouver ici.
      </div>
    );
  }

  return (
    <nav aria-label="Villes favorites" className="-mx-1 overflow-x-auto px-1 pb-1">
      <ul className="flex gap-2.5">
        {props.favorites.map((city) => {
          const brief = props.briefs[city.id];
          const visual = getOpenMeteoVisual(brief?.weatherCode);
          const isActive = isSameCity(city, props.activeCity);
          return (
            <li key={city.id} className="group relative shrink-0">
              <button
                type="button"
                onClick={() => props.onSelect(city)}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "surface surface-hover flex min-w-[9.5rem] items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left",
                  isActive && "accent-edge accent-wash",
                )}
              >
                <WeatherIcon kind={visual.kind} className="accent-ink size-5 shrink-0" />
                <span className="min-w-0">
                  <span className="block max-w-[8rem] truncate text-sm font-semibold text-slate-900 dark:text-zinc-50">{city.name}</span>
                  <span className="numeric block text-xs text-slate-500 dark:text-zinc-400">
                    <span className="font-semibold text-slate-800 dark:text-zinc-100">{formatTempC(brief?.tempC)}</span>
                    {brief ? ` · ${formatTempC(brief.tempMinC)} → ${formatTempC(brief.tempMaxC)}` : ""}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => props.onRemove(city)}
                aria-label={`Retirer ${city.name} des favoris`}
                className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-slate-900 text-white opacity-0 shadow transition-opacity focus-visible:opacity-100 group-hover:opacity-100 dark:bg-zinc-100 dark:text-zinc-900 [@media(hover:none)]:opacity-100"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
