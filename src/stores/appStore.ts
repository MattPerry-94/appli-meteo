import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FavoriteCity = {
  id: string;
  name: string;
  adminArea?: string;
  /** Code département (06, 2A, 974…), quand le géocodeur a permis de le déterminer. */
  departmentCode?: string;
  postalCode?: string;
  countryCode?: string;
  lat: number;
  lon: number;
};

export type CitySource = "default" | "browser" | "manual";

/** Au-delà, la bande des favoris ne tient plus sur une ligne de téléphone. */
export const MAX_FAVORITES = 8;

type AppState = {
  activeCity: FavoriteCity;
  citySource: CitySource;
  hasAttemptedBrowserLocation: boolean;
  favorites: FavoriteCity[];
  setActiveCity: (city: FavoriteCity, source?: CitySource) => void;
  markBrowserLocationAttempted: () => void;
  resetActiveCity: () => void;
  /** Ajoute la ville si elle n'est pas en favori, la retire sinon. */
  toggleFavorite: (city: FavoriteCity) => void;
  removeFavorite: (cityId: string) => void;
};

const defaultCity: FavoriteCity = {
  id: "cagnes-sur-mer-06",
  name: "Cagnes-sur-Mer",
  adminArea: "Provence-Alpes-Côte d'Azur",
  departmentCode: "06",
  postalCode: "06800",
  countryCode: "FR",
  lat: 43.6635,
  lon: 7.1482,
};

/**
 * Deux entrées désignent la même ville si elles sont à moins d'environ 1 km :
 * la géolocalisation et la recherche donnent des identifiants différents
 * pour une même commune.
 */
export function isSameCity(a: FavoriteCity, b: FavoriteCity) {
  return a.id === b.id || (Math.abs(a.lat - b.lat) < 0.01 && Math.abs(a.lon - b.lon) < 0.01);
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeCity: defaultCity,
      citySource: "default",
      hasAttemptedBrowserLocation: false,
      favorites: [],
      setActiveCity: (city, source = "manual") => set({ activeCity: city, citySource: source }),
      markBrowserLocationAttempted: () => set({ hasAttemptedBrowserLocation: true }),
      resetActiveCity: () => set({ activeCity: defaultCity, citySource: "default", hasAttemptedBrowserLocation: false }),
      toggleFavorite: (city) =>
        set((state) => {
          if (state.favorites.some((favorite) => isSameCity(favorite, city))) {
            return { favorites: state.favorites.filter((favorite) => !isSameCity(favorite, city)) };
          }
          if (state.favorites.length >= MAX_FAVORITES) return {};
          return { favorites: [...state.favorites, city] };
        }),
      removeFavorite: (cityId) => set((state) => ({ favorites: state.favorites.filter((favorite) => favorite.id !== cityId) })),
    }),
    {
      name: "meteo:state",
      version: 5,
      migrate: (persistedState) => {
        const state = persistedState as Partial<AppState>;

        const migratedCity =
          state.activeCity ?? (Array.isArray(state.favorites) && state.favorites.length ? state.favorites[0] : null) ?? defaultCity;

        return {
          activeCity: migratedCity,
          citySource: state.citySource ?? "default",
          hasAttemptedBrowserLocation: state.hasAttemptedBrowserLocation ?? false,
          // La v1 avait déjà une liste de favoris : on la retrouve si elle existe.
          favorites: Array.isArray(state.favorites) ? state.favorites.slice(0, MAX_FAVORITES) : [],
        };
      },
    },
  ),
);
