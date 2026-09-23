import { describe, expect, it } from "vitest";
import { findDepartmentBulletin, getDepartmentVigilance, parsePeriods } from "@/services/meteoFranceVigilance";

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

/** Domaine au format réel de cartevigilance/encours (V6). */
function domain(id: string, max: number, phenomena: Record<string, number>) {
  return {
    domain_id: id,
    max_color_id: max,
    phenomenon_items: Object.entries(phenomena).map(([phenomenonId, color]) => ({
      phenomenon_id: phenomenonId,
      phenomenon_max_color_id: color,
      timelaps_items: [],
    })),
  };
}

const carte = {
  product: {
    update_time: "2026-09-23T04:00:06Z",
    periods: [
      {
        echeance: "J1",
        begin_validity_time: "2026-09-24T00:00:00Z",
        timelaps: { domain_ids: [domain("06", 1, { "1": 1, "3": 1 })] },
      },
      {
        echeance: "J",
        begin_validity_time: "2026-09-23T04:00:00Z",
        timelaps: {
          domain_ids: [
            domain("FRA", 3, {}),
            domain("06", 2, { "1": 1, "3": 2 }),
            // Littoral des Alpes-Maritimes : porte le risque vagues-submersion.
            domain("0610", 3, { "9": 3 }),
            domain("59", 1, { "1": 1 }),
          ],
        },
      },
    ],
  },
};

describe("parsePeriods", () => {
  it("nomme les échéances J et J1 et met aujourd'hui en premier", () => {
    const periods = parsePeriods(carte);
    expect(periods.map((period) => [period.id, period.label])).toEqual([
      ["J", "Aujourd'hui"],
      ["J1", "Demain"],
    ]);
  });
});

describe("getDepartmentVigilance", () => {
  const today = parsePeriods(carte)[0];

  it("fusionne le département et son domaine côtier", () => {
    const vigilance = getDepartmentVigilance(today, "06");
    expect(vigilance?.overallLevel).toBe(3);
    expect(vigilance?.risks).toEqual({ 1: 1, 3: 2, 9: 3 });
  });

  it("n'attribue pas le littoral d'un autre département", () => {
    expect(getDepartmentVigilance(today, "59")?.overallLevel).toBe(1);
  });

  it("renvoie null pour un département absent", () => {
    expect(getDepartmentVigilance(today, "974")).toBeNull();
  });
});
