import { describe, expect, it } from "vitest";
import { findDepartmentBulletin } from "@/services/meteoFranceVigilance";

/** Un terme de bulletin, avec les lignes de texte fournies. */
function term(lines: string[], extra: Record<string, unknown> = {}) {
  return { term_names: "Aujourd'hui", risk_name: "Jaune", subdivision_text: [{ bold_text: "Situation", text: lines }], ...extra };
}

/** Réponse textesvigilance/encours minimale : un bloc par zone. */
function payload(blocs: Array<{ domain: string; name: string; terms: ReturnType<typeof term>[] }>) {
  return {
    product: {
      update_time: "2026-09-23T06:00:00Z",
      text_bloc_items: [
        { domain_id: "FRA", domain_name: "France", bloc_items: [] },
        ...blocs.map((bloc) => ({
          domain_id: bloc.domain,
          domain_name: bloc.name,
          bloc_title: "Bulletin de suivi",
          bloc_items: [{ type_name: "Suivi", text_items: [{ hazard_name: "Orages", term_items: bloc.terms }] }],
        })),
      ],
    },
  };
}

describe("findDepartmentBulletin", () => {
  it("trouve le département par son code entre parenthèses", () => {
    const data = payload([{ domain: "SE", name: "Sud-Est", terms: [term(["Alpes-Maritimes (06), Var (83) : orages."])] }]);
    const bulletin = findDepartmentBulletin(data, "06");
    expect(bulletin?.domainName).toBe("Sud-Est");
    expect(bulletin?.riskName).toBe("Jaune");
    expect(bulletin?.sections[0].lines[0]).toContain("Alpes-Maritimes");
  });

  it("ne confond pas un code avec une heure ou une date", () => {
    const data = payload([{ domain: "SE", name: "Sud-Est", terms: [term(["Début des orages à 06:00, le 06 octobre."])] }]);
    expect(findDepartmentBulletin(data, "06")).toBeNull();
  });

  it("ne confond pas « Nord » avec un point cardinal", () => {
    const data = payload([
      { domain: "SO", name: "Sud-Ouest", terms: [term(["Vent de nord, rafales dans le Nord-Est du bassin."])] },
    ]);
    expect(findDepartmentBulletin(data, "59")).toBeNull();
  });

  it("ne confond pas « Loire » avec « Haute-Loire »", () => {
    const data = payload([{ domain: "CE", name: "Centre-Est", terms: [term(["Haute-Loire et Loire-Atlantique concernées."])] }]);
    expect(findDepartmentBulletin(data, "42")).toBeNull();
  });

  it("préfère un code explicite à une mention du nom", () => {
    const data = payload([
      { domain: "RIV", name: "Crues", terms: [term(["Montée des eaux sur le Rhône."])] },
      { domain: "CE", name: "Centre-Est", terms: [term(["Rhône (69) : orages en soirée."])] },
    ]);
    expect(findDepartmentBulletin(data, "69")?.domainName).toBe("Centre-Est");
  });

  it("retombe sur le nom quand aucun code n'est cité", () => {
    const data = payload([{ domain: "NE", name: "Nord-Est", terms: [term(["Orages attendus sur la Marne."])] }]);
    expect(findDepartmentBulletin(data, "51")?.domainName).toBe("Nord-Est");
  });

  it("ignore le bloc national et les réponses vides", () => {
    expect(findDepartmentBulletin({}, "06")).toBeNull();
    expect(findDepartmentBulletin(payload([]), "06")).toBeNull();
  });
});
