import { describe, expect, it } from "vitest";
import { chooseRepresentativeWeatherCode, computeReliabilityLabel, halfSpread, hoursBetween, modelWeight, rangeOf, weightedAverage } from "@/utils/forecastConsensus";

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

describe("écart entre modèles", () => {
  it("halfSpread donne le demi-écart entre extrêmes", () => {
    expect(halfSpread([22, 25, 23])).toBe(1.5);
    expect(halfSpread([22, undefined, 22])).toBe(0);
  });

  it("ne dit rien avec un seul modèle", () => {
    expect(halfSpread([22, undefined])).toBeUndefined();
    expect(rangeOf([40])).toBeUndefined();
  });

  it("rangeOf donne la fourchette", () => {
    expect(rangeOf([10, 60, 30])).toEqual([10, 60]);
  });
});

describe("consensus pondéré", () => {
  it("AROME compte double sur 48 h, puis simple", () => {
    expect(modelWeight("arome", 0)).toBe(2);
    expect(modelWeight("arome", 47)).toBe(2);
    expect(modelWeight("arome", 48)).toBe(1);
    expect(modelWeight("ecmwf", 100)).toBeGreaterThan(modelWeight("gfs", 100));
  });

  it("ignore les valeurs absentes et leur poids", () => {
    expect(weightedAverage([{ value: 20, weight: 2 }, { value: undefined, weight: 5 }, { value: 23, weight: 1 }])).toBe(21);
    expect(weightedAverage([{ value: undefined, weight: 1 }])).toBeUndefined();
  });

  it("mesure l'échéance entre horodatages locaux", () => {
    expect(hoursBetween("2026-09-23T10:00", "2026-09-25T12:00")).toBe(50);
    expect(hoursBetween("2026-09-23T10:00", "2026-09-24")).toBe(14);
  });
});
