import { describe, expect, it } from "vitest";
import { compassFrench, europeanAqiClass, pollenLevel } from "@/utils/environment";

describe("europeanAqiClass", () => {
  it("suit les classes de l'indice européen", () => {
    expect(europeanAqiClass(12)?.label).toBe("Bon");
    expect(europeanAqiClass(34)?.label).toBe("Correct");
    expect(europeanAqiClass(60)?.label).toBe("Moyen");
    expect(europeanAqiClass(130)?.label).toBe("Extrêmement médiocre");
    expect(europeanAqiClass(undefined)).toBeNull();
  });
});

describe("pollenLevel", () => {
  it("applique des seuils propres à chaque espèce", () => {
    expect(pollenLevel("ragweed", 25)?.label).toBe("Élevé");
    expect(pollenLevel("birch", 25)?.label).toBe("Modéré");
    expect(pollenLevel("mugwort", 15.7)?.label).toBe("Modéré");
  });

  it("ne signale rien sous 1 grain/m³", () => {
    expect(pollenLevel("grass", 0.3)).toBeNull();
    expect(pollenLevel("grass", undefined)).toBeNull();
  });
});

describe("compassFrench", () => {
  it("donne le point cardinal le plus proche", () => {
    expect(compassFrench(104)).toBe("Est");
    expect(compassFrench(130)).toBe("Sud-est");
    expect(compassFrench(355)).toBe("Nord");
    expect(compassFrench(undefined)).toBeNull();
  });
});
