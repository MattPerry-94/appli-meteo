// @vitest-environment jsdom
import { StrictMode, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import type { FavoriteCity } from "@/stores/appStore";
import type { CityForecastModelSet } from "@/services/openMeteo";
import { useForecastBundles } from "@/hooks/useForecastBundles";

vi.mock("@/services/openMeteo", () => ({
  fetchForecastModelSet: vi.fn(
    (city: FavoriteCity, options?: { signal?: AbortSignal }) =>
      new Promise<CityForecastModelSet>((resolve, reject) => {
        const timer = setTimeout(() => resolve({ city } as CityForecastModelSet), 20);
        options?.signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new DOMException("Aborted", "AbortError"));
        });
      }),
  ),
}));

const nice: FavoriteCity = { id: "nice", name: "Nice", lat: 43.7, lon: 7.27 };
const lille: FavoriteCity = { id: "lille", name: "Lille", lat: 50.63, lon: 3.06 };

function strict({ children }: { children: ReactNode }) {
  return <StrictMode>{children}</StrictMode>;
}

afterEach(cleanup);

describe("useForecastBundles", () => {
  it("charge au premier rendu malgré le double montage de StrictMode", async () => {
    const { result } = renderHook(() => useForecastBundles([nice]), { wrapper: strict });
    await waitFor(() => expect(result.current.bundles.nice).toBeDefined());
    expect(result.current.isLoading).toBe(false);
  });

  it("charge la nouvelle ville quand on change pendant un chargement", async () => {
    const { result, rerender } = renderHook(({ cities }) => useForecastBundles(cities), {
      initialProps: { cities: [nice] },
    });
    // Changement immédiat, avant la réponse pour Nice.
    rerender({ cities: [lille] });
    await waitFor(() => expect(result.current.bundles.lille).toBeDefined());
  });
});
