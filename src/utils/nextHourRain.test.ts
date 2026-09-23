import { describe, expect, it } from "vitest";
import { rainIntensity, summarizeNextHour } from "@/utils/nextHourRain";

const times = ["2026-09-23T14:00", "2026-09-23T14:15", "2026-09-23T14:30", "2026-09-23T14:45", "2026-09-23T15:00"];
const slots = (mm: number[]) => mm.map((value, index) => ({ timeISO: times[index], mm: value }));

describe("summarizeNextHour", () => {
  it("annonce une heure sèche, traces comprises", () => {
    expect(summarizeNextHour(slots([0, 0.05, 0, 0, 0]))?.text).toBe("Pas de pluie prévue dans l'heure");
  });

  it("annonce l'arrivée de la pluie", () => {
    expect(summarizeNextHour(slots([0, 0, 0.3, 0.5, 0]))?.text).toBe("Pluie faible attendue vers 14h30");
  });

  it("annonce la fin d'une pluie en cours", () => {
    expect(summarizeNextHour(slots([1, 1.2, 0, 0, 0]))?.text).toBe("Pluie modérée en cours, fin vers 14h30");
  });

  it("annonce une pluie qui dure", () => {
    const summary = summarizeNextHour(slots([2.5, 3, 2, 2, 2]));
    expect(summary?.text).toBe("Pluie forte en cours pour l'heure à venir");
    expect(summary?.raining).toBe(true);
  });

  it("ne dit rien sans données", () => {
    expect(summarizeNextHour([])).toBeNull();
  });
});

describe("rainIntensity", () => {
  it("classe selon le cumul horaire équivalent", () => {
    expect(rainIntensity(0)).toBe("sèche");
    expect(rainIntensity(0.4)).toBe("faible"); // 1,6 mm/h
    expect(rainIntensity(1)).toBe("modérée"); // 4 mm/h
    expect(rainIntensity(2)).toBe("forte"); // 8 mm/h
  });
});
