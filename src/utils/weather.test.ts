import { describe, expect, it } from "vitest";
import { getOpenMeteoVisual, getTempBand, getUvLevel } from "@/utils/weather";

describe("weather", () => {
  it("mappe quelques codes", () => {
    expect(getOpenMeteoVisual(0).kind).toBe("clear");
    expect(getOpenMeteoVisual(3).kind).toBe("clouds");
    expect(getOpenMeteoVisual(61).kind).toBe("rain");
    expect(getOpenMeteoVisual(95).kind).toBe("storm");
  });

  it("classe les niveaux UV", () => {
    expect(getUvLevel(2)?.label).toBe("Faible");
    expect(getUvLevel(4)?.label).toBe("Modéré");
    expect(getUvLevel(7)?.label).toBe("Élevé");
    expect(getUvLevel(9)?.label).toBe("Très élevé");
    expect(getUvLevel(11)?.label).toBe("Extrême");
  });
});


describe("getTempBand", () => {
  it("bascule en bleu sous 16 °C", () => {
    expect(getTempBand(-5)).toBe("cool");
    expect(getTempBand(15.9)).toBe("cool");
  });

  it("passe en orangé entre 16 et 25 °C inclus", () => {
    expect(getTempBand(16)).toBe("warm");
    expect(getTempBand(24)).toBe("warm");
    expect(getTempBand(25)).toBe("warm");
  });

  it("vire au rouge au-dessus de 25 °C", () => {
    expect(getTempBand(25.1)).toBe("hot");
    expect(getTempBand(38)).toBe("hot");
  });

  it("retombe sur le bleu quand la température est inconnue", () => {
    expect(getTempBand(undefined)).toBe("cool");
    expect(getTempBand(NaN)).toBe("cool");
  });
});
