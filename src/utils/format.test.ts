import { describe, expect, it } from "vitest";
import { formatTempC, formatUv } from "@/utils/format";

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
});

