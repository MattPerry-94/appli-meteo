import { describe, expect, it } from "vitest";
import { describeBias, scoreModels } from "@/utils/modelScore";

describe("scoreModels", () => {
  it("calcule écart moyen et biais, et trie du plus juste au moins juste", () => {
    const scores = scoreModels([20, 22, 24], {
      a: [21, 23, 25], // +1 partout
      b: [20, 21.5, 24.5], // 0, -0,5, +0,5
    });
    expect(scores.map((score) => score.modelId)).toEqual(["b", "a"]);
    expect(scores[0].maeC).toBeCloseTo(1 / 3);
    expect(scores[0].biasC).toBeCloseTo(0);
    expect(scores[1]).toMatchObject({ maeC: 1, biasC: 1, count: 3 });
  });

  it("ne compare que les heures présentes des deux côtés", () => {
    const [score] = scoreModels([20, undefined, 24], { a: [22, 30, undefined] });
    expect(score).toMatchObject({ maeC: 2, count: 1 });
  });

  it("écarte un modèle sans aucune heure comparable", () => {
    expect(scoreModels([20], { a: [undefined] })).toEqual([]);
  });
});

describe("describeBias", () => {
  it("formule le biais en français", () => {
    expect(describeBias(0.62)).toBe("tend à prévoir trop chaud de 0,6°");
    expect(describeBias(-1.04)).toBe("tend à prévoir trop froid de 1°");
    expect(describeBias(0.2)).toBe("sans biais marqué");
  });
});
