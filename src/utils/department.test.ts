import { describe, expect, it } from "vitest";
import { departmentCodeFromName, departmentCodeFromPostalCode, inferDepartmentCode } from "@/utils/department";

describe("department", () => {
  it("déduit le département des deux premiers chiffres du code postal", () => {
    expect(departmentCodeFromPostalCode("06800")).toBe("06");
    expect(departmentCodeFromPostalCode("59000")).toBe("59");
  });

  it("distingue Corse-du-Sud et Haute-Corse", () => {
    expect(departmentCodeFromPostalCode("20000")).toBe("2A"); // Ajaccio
    expect(departmentCodeFromPostalCode("20169")).toBe("2A"); // Bonifacio
    expect(departmentCodeFromPostalCode("20200")).toBe("2B"); // Bastia
    expect(departmentCodeFromPostalCode("20250")).toBe("2B"); // Corte
  });

  it("garde trois chiffres pour l'outre-mer", () => {
    expect(departmentCodeFromPostalCode("97400")).toBe("974");
  });

  it("retrouve le code depuis le nom, accents et casse ignorés", () => {
    expect(departmentCodeFromName("Alpes-Maritimes")).toBe("06");
    expect(departmentCodeFromName("cote d'or")).toBe("21");
    expect(departmentCodeFromName("Corse-du-Sud")).toBe("2A");
    expect(departmentCodeFromName("Provence-Alpes-Côte d'Azur")).toBeUndefined();
  });

  it("préfère le code explicite, puis le code postal", () => {
    const base = { id: "x", name: "X", lat: 0, lon: 0, countryCode: "FR" };
    expect(inferDepartmentCode({ ...base, departmentCode: "2B", postalCode: "20000" })).toBe("2B");
    expect(inferDepartmentCode({ ...base, adminArea: "Hauts-de-France", postalCode: "59000" })).toBe("59");
    expect(inferDepartmentCode({ ...base, adminArea: "06" })).toBe("06");
  });

  it("ignore les villes hors de France", () => {
    expect(inferDepartmentCode({ id: "x", name: "Monaco", lat: 0, lon: 0, countryCode: "MC", postalCode: "98000" })).toBeNull();
  });
});
