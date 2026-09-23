import { Flower2, Wind } from "lucide-react";
import { Card } from "@/components/Card";
import type { AirQuality } from "@/services/environment";
import { europeanAqiClass, pollenLevel, POLLEN_LABELS, type EnvLevel, type PollenId } from "@/utils/environment";

/** Couleurs d'état, toujours accompagnées d'un libellé : jamais la couleur seule. */
const LEVEL_COLORS: Record<EnvLevel, string> = {
  0: "#34b35a",
  1: "#9bc53d",
  2: "#f2d027",
  3: "#f28c28",
  4: "#d7263d",
  5: "#7b2d8e",
};

function LevelDot(props: { level: EnvLevel }) {
  return <span aria-hidden="true" className="inline-block size-2.5 shrink-0 rounded-full" style={{ backgroundColor: LEVEL_COLORS[props.level] }} />;
}

function formatMicrograms(value: number | undefined) {
  return typeof value === "number" ? `${Math.round(value)} µg/m³` : "—";
}

/** Indice européen de qualité de l'air, polluants principaux et pollens du moment. */
export function AirQualityCard(props: { air: AirQuality | null }) {
  const air = props.air;
  if (!air) return null;
  const aqi = europeanAqiClass(air.europeanAqi);

  const pollens = (Object.entries(air.pollens) as Array<[PollenId, number]>)
    .map(([pollen, grains]) => ({ pollen, grains, level: pollenLevel(pollen, grains) }))
    .filter((entry): entry is { pollen: PollenId; grains: number; level: NonNullable<ReturnType<typeof pollenLevel>> } => Boolean(entry.level))
    .sort((a, b) => b.level.level - a.level.level || b.grains - a.grains);
  const hasPollenData = Object.keys(air.pollens).length > 0;

  return (
    <Card className="p-5">
      <div className="eyebrow">Air et pollens</div>
      <div className="display mt-1 text-2xl">Qualité de l'air</div>

      {aqi ? (
        <div className="mt-4 flex items-center gap-3">
          <div className="numeric text-4xl font-semibold text-slate-900 dark:text-zinc-50">{Math.round(air.europeanAqi!)}</div>
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-zinc-100">
              <LevelDot level={aqi.level} />
              {aqi.label}
            </div>
            <div className="text-xs text-slate-500 dark:text-zinc-400">Indice européen (0 à 100 et plus)</div>
          </div>
        </div>
      ) : null}

      <dl className="numeric mt-4 grid grid-cols-2 gap-2 text-xs">
        {[
          ["PM2,5", air.pm25],
          ["PM10", air.pm10],
          ["Ozone", air.ozone],
          ["NO₂", air.no2],
        ].map(([label, value]) => (
          <div key={label as string} className="tile rounded-xl px-3 py-2">
            <dt className="eyebrow">{label}</dt>
            <dd className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-zinc-100">{formatMicrograms(value as number | undefined)}</dd>
          </div>
        ))}
      </dl>

      {hasPollenData ? (
        <div className="mt-4">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-zinc-100">
            <Flower2 className="accent-ink size-4" aria-hidden="true" />
            Pollens
          </div>
          {pollens.length ? (
            <ul className="mt-2 grid gap-1.5">
              {pollens.map(({ pollen, grains, level }) => (
                <li key={pollen} className="flex items-center gap-2 text-sm text-slate-700 dark:text-zinc-200">
                  <LevelDot level={level.level} />
                  <span className="flex-1">{POLLEN_LABELS[pollen]}</span>
                  <span className="font-semibold">{level.label}</span>
                  <span className="numeric w-20 text-right text-xs text-slate-400 dark:text-zinc-500">{Math.round(grains)} grains/m³</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Aucun pollen notable en ce moment.</p>
          )}
        </div>
      ) : (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
          <Wind className="size-3.5" aria-hidden="true" />
          Pollens : prévision disponible en Europe uniquement.
        </p>
      )}

      <p className="mt-3 text-[11px] text-slate-400 dark:text-zinc-500">Modèle CAMS (Copernicus), résolution 10 à 40 km : valeurs indicatives.</p>
    </Card>
  );
}
