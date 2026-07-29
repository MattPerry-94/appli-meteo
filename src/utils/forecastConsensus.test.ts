import { describe, expect, it } from "vitest";
import { chooseRepresentativeWeatherCode, computeReliabilityLabel } from "@/utils/forecastConsensus";

describe("forecastConsensus", () => {
  it("retourne ultra fiable quand les 3 modèles convergent", () => {
    expect(
      computeReliabilityLabel([
        { weatherCode: 61, tempMaxC: 28, precipProbabilityPct: 75, windKph: 18 },
        { weatherCode: 63, tempMaxC: 29, precipProbabilityPct: 70, windKph: 20 },
        { weatherCode: 61, tempMaxC: 28, precipProbabilityPct: 72, windKph: 19 },
      ]),
    ).toBe("Ultra fiable");
  });

  it("retourne fiable quand 2 modèles sur 3 se rejoignent", () => {
    expect(
      computeReliabilityLabel([
        { weatherCode: 95, tempMaxC: 25, precipProbabilityPct: 80, windKph: 25 },
        { weatherCode: 95, tempMaxC: 24, precipProbabilityPct: 78, windKph: 24 },
        { weatherCode: 3, tempMaxC: 30, precipProbabilityPct: 10, windKph: 10 },
      ]),
    ).toBe("Fiable");
  });

  it("retourne peu fiable quand 2 modèles divergent", () => {
    expect(
      computeReliabilityLabel([
        { weatherCode: 0, tempMaxC: 30, precipProbabilityPct: 5, windKph: 8 },
        { weatherCode: 95, tempMaxC: 21, precipProbabilityPct: 85, windKph: 35 },
      ]),
    ).toBe("Peu fiable");
  });

  it("choisit un code météo représentatif", () => {
    expect(chooseRepresentativeWeatherCode([61, 63, 2])).toBe(61);
    expect(chooseRepresentativeWeatherCode([undefined, 95, 96])).toBe(95);
  });
});
