export type ModelScore<Id extends string = string> = {
  modelId: Id;
  /** Écart moyen absolu à la référence, en °C. */
  maeC: number;
  /** Écart moyen signé : positif = le modèle a prévu trop chaud. */
  biasC: number;
  /** Nombre d'heures comparées. */
  count: number;
};

/**
 * Compare les prévisions de chaque modèle à une référence, heure par heure.
 * Seules les heures où la référence et le modèle existent comptent. Résultat
 * trié du plus juste au moins juste ; un modèle sans aucune heure comparable
 * est écarté.
 */
export function scoreModels<Id extends string>(truth: Array<number | undefined>, forecasts: Record<Id, Array<number | undefined>>) {
  const scores: ModelScore<Id>[] = [];

  for (const modelId of Object.keys(forecasts) as Id[]) {
    const values = forecasts[modelId];
    let absSum = 0;
    let signedSum = 0;
    let count = 0;
    truth.forEach((reference, index) => {
      const forecast = values[index];
      if (typeof reference !== "number" || typeof forecast !== "number") return;
      absSum += Math.abs(forecast - reference);
      signedSum += forecast - reference;
      count += 1;
    });
    if (count) scores.push({ modelId, maeC: absSum / count, biasC: signedSum / count, count });
  }

  return scores.sort((a, b) => a.maeC - b.maeC);
}

/** « tend à prévoir trop chaud de 0,6° » ; rien sous 0,3°, où le biais n'est pas significatif. */
export function describeBias(biasC: number) {
  if (Math.abs(biasC) < 0.3) return "sans biais marqué";
  const amount = `${(Math.round(Math.abs(biasC) * 10) / 10).toString().replace(".", ",")}°`;
  return biasC > 0 ? `tend à prévoir trop chaud de ${amount}` : `tend à prévoir trop froid de ${amount}`;
}
