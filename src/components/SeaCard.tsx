import { ArrowDown, Waves } from "lucide-react";
import { Card } from "@/components/Card";
import type { SeaState } from "@/services/environment";
import { compassFrench } from "@/utils/environment";

function formatMeters(value: number | undefined) {
  return typeof value === "number" ? `${value.toFixed(1).replace(".", ",")} m` : "—";
}

/** Mer : hauteur, période et direction des vagues, température de l'eau. Masqué dans les terres. */
export function SeaCard(props: { sea: SeaState | null }) {
  const sea = props.sea;
  if (!sea) return null;
  const direction = compassFrench(sea.waveDirectionDeg);

  return (
    <Card className="p-5">
      <div className="eyebrow">Mer</div>
      <div className="display mt-1 text-2xl">Vagues et eau</div>

      <div className="mt-4 flex items-end gap-6">
        <div>
          <div className="eyebrow">Eau</div>
          <div className="numeric text-4xl font-semibold text-slate-900 dark:text-zinc-50">
            {typeof sea.waterTempC === "number" ? `${Math.round(sea.waterTempC)}°` : "—"}
          </div>
        </div>
        <div>
          <div className="eyebrow">Vagues</div>
          <div className="numeric flex items-center gap-1.5 text-2xl font-semibold text-slate-900 dark:text-zinc-50">
            <Waves className="accent-ink size-5" aria-hidden="true" />
            {formatMeters(sea.waveHeightM)}
          </div>
        </div>
      </div>

      <dl className="numeric mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="tile rounded-xl px-3 py-2">
          <dt className="eyebrow">Période</dt>
          <dd className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-zinc-100">
            {typeof sea.wavePeriodS === "number" ? `${Math.round(sea.wavePeriodS)} s` : "—"}
          </dd>
        </div>
        <div className="tile rounded-xl px-3 py-2">
          <dt className="eyebrow">Houle venant de</dt>
          <dd className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-zinc-100">
            {typeof sea.waveDirectionDeg === "number" ? (
              // Flèche vers le bas pivotée de l'angle d'origine : elle pointe là où vont les vagues.
              <ArrowDown className="accent-ink size-3.5" style={{ transform: `rotate(${sea.waveDirectionDeg}deg)` }} aria-hidden="true" />
            ) : null}
            {direction ?? "—"}
          </dd>
        </div>
        <div className="tile col-span-2 rounded-xl px-3 py-2">
          <dt className="eyebrow">Vagues max aujourd'hui</dt>
          <dd className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-zinc-100">{formatMeters(sea.waveHeightMaxTodayM)}</dd>
        </div>
      </dl>

      <p className="mt-3 text-[11px] text-slate-400 dark:text-zinc-500">Point de mer le plus proche, modèles de vagues via Open-Meteo.</p>
    </Card>
  );
}
