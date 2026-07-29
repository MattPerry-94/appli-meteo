import { describe, expect, it } from "vitest";
import { getOpenMeteoVisual, getUvLevel } from "@/utils/weather";

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

