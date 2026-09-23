import { useState } from "react";
import { LocateFixed, Search } from "lucide-react";
import { Card } from "@/components/Card";
import { Notice } from "@/components/Notice";
import { useCitySearch } from "@/hooks/useCitySearch";
import type { OpenMeteoGeocodingResult } from "@/services/openMeteo";

function formatCoordinate(value: number) {
  return value.toFixed(4).replace(".", ",");
}

/** Recherche d'une ville par son nom, ou par la position du navigateur. */
export function CitySearchCard(props: {
  onSelect: (result: OpenMeteoGeocodingResult) => void;
  onLocate: () => Promise<boolean>;
  locationError: string | null;
}) {
  const [query, setQuery] = useState("");
  const search = useCitySearch(query);

  async function locate() {
    if (await props.onLocate()) setQuery("");
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="eyebrow">Recherche</div>
          <div className="display mt-1 text-2xl">Changer de ville</div>
        </div>
        <button type="button" onClick={locate} className="btn btn-ghost shrink-0 rounded-2xl">
          <LocateFixed className="accent-ink size-4" />
          <span>Ma position</span>
        </button>
      </div>

      <div className="field mt-4 flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5">
        <Search className="size-4 shrink-0 text-slate-400 dark:text-zinc-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setQuery("");
          }}
          type="search"
          aria-label="Rechercher une ville"
          placeholder="Ex: Nice, Saint-Laurent-du-Var, Antibes…"
          className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 focus-visible:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
        {search.isSearching ? <div className="accent-dot size-2 shrink-0 animate-pulse rounded-full" /> : null}
      </div>

      <div className="mt-3 space-y-2">
        {search.results.map((result) => (
          <button
            key={result.id}
            type="button"
            onClick={() => {
              props.onSelect(result);
              setQuery("");
            }}
            className="tile tile-interactive block w-full rounded-2xl px-3.5 py-3 text-left"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="break-words text-sm font-semibold text-slate-900 dark:text-zinc-50">{result.name}</div>
                <div className="numeric mt-1 text-xs text-slate-500 dark:text-zinc-400">
                  {[result.postalCode, result.adminArea, result.countryCode].filter(Boolean).join(" • ")}
                </div>
              </div>
              <div className="shrink-0 text-right text-xs text-slate-500 dark:text-zinc-400">
                <div className="numeric">
                  {formatCoordinate(result.lat)} ; {formatCoordinate(result.lon)}
                </div>
                <div className="accent-ink mt-1 font-medium">Afficher cette ville</div>
              </div>
            </div>
          </button>
        ))}

        {search.error ? <Notice>{search.error}</Notice> : null}

        {search.isEmpty ? (
          <div className="tile rounded-2xl p-3.5 text-sm text-slate-500 dark:text-zinc-400">
            Aucune ville trouvée pour « {search.normalized} ».
          </div>
        ) : null}

        {props.locationError ? <Notice>{props.locationError}</Notice> : null}
      </div>
    </Card>
  );
}
