import { useEffect, useState } from "react";
import { searchCities, type OpenMeteoGeocodingResult } from "@/services/openMeteo";

const DEBOUNCE_MS = 220;

/** Recherche de villes au fil de la frappe, avec anti-rebond et annulation. */
export function useCitySearch(query: string) {
  const normalized = query.trim();
  const [results, setResults] = useState<OpenMeteoGeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Dernière requête effectivement aboutie : sert à afficher « aucun résultat ». */
  const [searchedQuery, setSearchedQuery] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      if (!normalized) {
        setResults([]);
        setError(null);
        setSearchedQuery("");
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const next = await searchCities(normalized, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setResults(next);
        setError(null);
        setSearchedQuery(normalized);
      } catch {
        // Une frappe suivante annule la requête en vol : ce n'est pas une erreur.
        if (controller.signal.aborted) return;
        setResults([]);
        setError("La recherche de villes est indisponible pour le moment. Réessayez dans un instant.");
        setSearchedQuery(normalized);
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [normalized]);

  const isEmpty = !error && !isSearching && Boolean(normalized) && searchedQuery === normalized && !results.length;

  return { normalized, results, isSearching, error, isEmpty };
}
