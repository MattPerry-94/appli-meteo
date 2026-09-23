import { describe, expect, it } from "vitest";
import { formatMm, formatSpreadC, formatTempC, formatUv } from "@/utils/format";

describe("format", () => {
  it("formatTempC arrondit et ajoute le symbole", () => {
    expect(formatTempC(12.4)).toBe("12°");
    expect(formatTempC(12.6)).toBe("13°");
  });

  it("formatTempC gère undefined", () => {
    expect(formatTempC(undefined)).toBe("—");
  });

  it("formatUv utilise la virgule", () => {
    expect(formatUv(6)).toBe("6,0");
    expect(formatUv(8.25)).toBe("8,3");
  });
  it("formatMm arrondit au dixième et ignore les traces", () => {
    expect(formatMm(1.26)).toBe("1,3 mm");
    expect(formatMm(12)).toBe("12 mm");
    expect(formatMm(0.04)).toBe("0 mm");
    expect(formatMm(undefined)).toBe("—");
  });
  it("formatSpreadC arrondit au demi-degré et se tait sous 0,5°", () => {
    expect(formatSpreadC(1.4)).toBe("±1,5°");
    expect(formatSpreadC(2)).toBe("±2°");
    expect(formatSpreadC(0.2)).toBe("");
    expect(formatSpreadC(undefined)).toBe("");
  });
});

