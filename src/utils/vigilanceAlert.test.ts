import { describe, expect, it } from "vitest";
import { vigilanceAlertFor } from "@/utils/vigilanceAlert";
import type { VigilanceSnapshot } from "@/services/meteoFranceVigilance";

function snapshot(today: number, tomorrow = 1, risks: Record<number, 1 | 2 | 3 | 4> = { 3: 3, 1: 2 }): VigilanceSnapshot {
  return {
    updatedAtISO: "2026-09-23T04:00:00Z",
    sourceUrl: "",
    periods: [
      {
        id: "J",
        label: "Aujourd'hui",
        beginISO: "2026-09-23T04:00:00Z",
        summaryText: "",
        departments: [{ code: "06", overallLevel: today as 1, risks: today >= 3 ? risks : {} }],
      },
      {
        id: "J1",
        label: "Demain",
        beginISO: "2026-09-24T00:00:00Z",
        summaryText: "",
        departments: [{ code: "06", overallLevel: tomorrow as 1, risks: tomorrow >= 3 ? { 6: tomorrow as 3 } : {} }],
      },
    ],
  };
}

describe("vigilanceAlertFor", () => {
  it("alerte en orange avec le détail des risques", () => {
    expect(vigilanceAlertFor(snapshot(3), "06")).toEqual({
      key: "06:2026-09-23:3",
      title: "Vigilance orange — Alpes-Maritimes (06)",
      body: "Aujourd'hui : Orages (orange), Vent (jaune).",
    });
  });

  it("n'alerte ni en vert ni en jaune", () => {
    expect(vigilanceAlertFor(snapshot(2), "06")).toBeNull();
  });

  it("annonce une vigilance prévue pour demain", () => {
    expect(vigilanceAlertFor(snapshot(1, 3), "06")?.body).toBe("Demain : Canicule (orange).");
  });

  it("ne répète pas un épisode déjà signalé, mais signale son passage au rouge", () => {
    expect(vigilanceAlertFor(snapshot(3), "06", "06:2026-09-23:3")).toBeNull();
    expect(vigilanceAlertFor(snapshot(4, 1, { 3: 4 }), "06", "06:2026-09-23:3")?.title).toBe("Vigilance rouge — Alpes-Maritimes (06)");
  });
});
