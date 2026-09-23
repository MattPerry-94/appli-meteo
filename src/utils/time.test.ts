import { describe, expect, it } from "vitest";
import { cityNowHourISO } from "@/utils/time";

describe("cityNowHourISO", () => {
  const instant = new Date("2026-09-23T08:45:00Z");

  it("donne l'heure locale de la ville, au format des séries Open-Meteo", () => {
    expect(cityNowHourISO("Europe/Paris", instant)).toBe("2026-09-23T10:00");
    expect(cityNowHourISO("Asia/Tokyo", instant)).toBe("2026-09-23T17:00");
    expect(cityNowHourISO("America/New_York", instant)).toBe("2026-09-23T04:00");
  });

  it("gère le passage de minuit", () => {
    expect(cityNowHourISO("Pacific/Auckland", new Date("2026-09-23T13:30:00Z"))).toBe("2026-09-24T01:00");
  });

  it("ne plante pas sur un fuseau inconnu", () => {
    expect(cityNowHourISO("Nulle/Part", instant)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:00$/);
  });
});
