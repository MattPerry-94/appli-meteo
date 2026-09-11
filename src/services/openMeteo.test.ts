// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FavoriteCity } from "@/stores/appStore";
import { fetchForecastModelSet } from "@/services/openMeteo";

const city: FavoriteCity = {
  id: "tokyo",
  name: "Tokyo",
  countryCode: "JP",
  lat: 35.6895,
  lon: 139.6917,
};

/** Réponse Open-Meteo minimale, avec un bloc `current` paramétrable. */
function payload(current: Record<string, unknown>) {
  return {
    timezone: "Asia/Tokyo",
    current,
    daily: {
      time: ["2026-09-11"],
      temperature_2m_max: [28],
      temperature_2m_min: [21],
      weather_code: [0],
    },
    hourly: {
      time: ["2026-09-11T00:00"],
      temperature_2m: [22],
      relative_humidity_2m: [60],
    },
  };
}

function mockFetch(handler: (url: string) => unknown) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      const body = handler(url);
      if (body === null) return new Response("nope", { status: 503 });
      return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
    }),
  );
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchForecastModelSet", () => {
  it("laisse la température absente à undefined au lieu de retomber sur 0 °C", async () => {
    // Une temperature_2m manquante retombait sur 0, ce qui déclenchait à tort
    // l'encart « Prévention froid » (seuil <= 12 °C).
    mockFetch(() => payload({ weather_code: 0, relative_humidity_2m: 55 }));

    const set = await fetchForecastModelSet(city);

    expect(set.consensus.current?.tempC).toBeUndefined();
    expect(set.models.gfs.current?.tempC).toBeUndefined();
  });

  it("conserve la température quand elle est fournie", async () => {
    mockFetch(() => payload({ temperature_2m: 24, weather_code: 0 }));

    const set = await fetchForecastModelSet(city);

    expect(set.consensus.current?.tempC).toBe(24);
  });

  it("demande le fuseau de la ville et non un Europe/Paris figé", async () => {
    const calls = mockFetch(() => payload({ temperature_2m: 24 }));

    await fetchForecastModelSet(city);

    expect(calls.length).toBeGreaterThan(0);
    for (const url of calls) {
      expect(url).toContain("timezone=auto");
      expect(url).not.toContain("Europe%2FParis");
    }
  });

  it("remonte une erreur quand aucun modèle ne répond", async () => {
    mockFetch(() => null);

    await expect(fetchForecastModelSet(city)).rejects.toThrow(/aucun mod/i);
  });

  it("reste utilisable quand un seul modèle tombe", async () => {
    mockFetch((url) => (url.includes("ecmwf") ? null : payload({ temperature_2m: 20 })));

    const set = await fetchForecastModelSet(city);

    expect(set.models.ecmwf.unavailable).toBe(true);
    expect(set.models.gfs.unavailable).toBeUndefined();
    expect(set.consensus.current?.tempC).toBe(20);
  });
});
