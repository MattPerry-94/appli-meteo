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

type AppState = {
  activeCity: FavoriteCity;
  citySource: CitySource;
  hasAttemptedBrowserLocation: boolean;
  setActiveCity: (city: FavoriteCity, source?: CitySource) => void;
  markBrowserLocationAttempted: () => void;
  resetActiveCity: () => void;
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

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeCity: defaultCity,
      citySource: "default",
      hasAttemptedBrowserLocation: false,
      setActiveCity: (city, source = "manual") => set({ activeCity: city, citySource: source }),
      markBrowserLocationAttempted: () => set({ hasAttemptedBrowserLocation: true }),
      resetActiveCity: () => set({ activeCity: defaultCity, citySource: "default", hasAttemptedBrowserLocation: false }),
    }),
    {
      name: "meteo:state",
      version: 4,
      migrate: (persistedState) => {
        const state = persistedState as Partial<AppState> & { favorites?: FavoriteCity[] };

        const migratedCity =
          state.activeCity ??
          (Array.isArray(state.favorites) && state.favorites.length ? state.favorites[0] : null) ??
          defaultCity;

        return {
          activeCity: migratedCity,
          citySource: state.citySource ?? "default",
          hasAttemptedBrowserLocation: state.hasAttemptedBrowserLocation ?? false,
        };
      },
    },
  ),
);
