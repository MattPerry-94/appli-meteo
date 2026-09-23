import { Trophy } from "lucide-react";
import { Card } from "@/components/Card";
import { cn } from "@/lib/utils";
import { getForecastViewLabel, type ForecastSourceId } from "@/services/openMeteo";
import type { ModelScoreReport } from "@/services/modelScores";
import { describeBias } from "@/utils/modelScore";

function formatDegrees(value: number) {
  return `${(Math.round(value * 10) / 10).toFixed(1).replace(".", ",")}°`;
}

function formatShortDate(dateISO: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(`${dateISO}T12:00:00`));
}

/**
 * Qui a vu juste ? Écart moyen de la température prévue la veille, modèle par
 * modèle, sur une semaine récente. Barres d'une seule teinte : c'est une
 * comparaison de grandeurs, l'identité est portée par le libellé.
 */
export function ModelScoreCard(props: { report: ModelScoreReport | null; isLoading: boolean; failed: boolean }) {
  if (props.failed) return null;

  const scores = props.report?.scores ?? [];
  const worst = Math.max(...scores.map((score) => score.maeC), 0.1);

  return (
    <Card className="p-5">
      <div className="eyebrow">Qui a vu juste ?</div>
      <div className="display mt-1 text-2xl">Score des modèles</div>
      {props.report ? (
        <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
          Température prévue la veille, comparée à la réanalyse ERA5, du {formatShortDate(props.report.fromDateISO)} au{" "}
          {formatShortDate(props.report.toDateISO).replace(/\.$/, "")}.
        </p>
      ) : null}

      {props.isLoading && !props.report ? (
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((index) => (
            <div key={index} className="skeleton h-9 rounded-xl" />
          ))}
        </div>
      ) : (
        <ol className="mt-4 space-y-2.5">
          {scores.map((score, index) => (
            <li key={score.modelId} className="grid grid-cols-[4.5rem_1fr_3rem] items-center gap-3">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-zinc-100">
                {index === 0 ? <Trophy className="accent-ink size-3.5" aria-label="Le plus juste" /> : null}
                {getForecastViewLabel(score.modelId as ForecastSourceId)}
              </span>
              <span className="min-w-0">
                <span className="block h-2 rounded-full bg-slate-900/[0.06] dark:bg-white/[0.07]">
                  <span
                    className={cn("chart-line-swatch block h-full rounded-full", index > 0 && "opacity-45")}
                    style={{ width: `${Math.max((score.maeC / worst) * 100, 4)}%` }}
                  />
                </span>
                <span className="mt-1 block truncate text-[11px] text-slate-500 dark:text-zinc-400">{describeBias(score.biasC)}</span>
              </span>
              <span className="numeric text-right text-sm font-semibold text-slate-800 dark:text-zinc-100">{formatDegrees(score.maeC)}</span>
            </li>
          ))}
        </ol>
      )}

      {scores.length ? (
        <p className="mt-3 text-[11px] text-slate-400 dark:text-zinc-500">
          Écart moyen, plus court = plus juste. ERA5 est une référence indépendante mais à maille large (9 à 25 km) : sur la côte ou en
          montagne, elle peut s'écarter du thermomètre local.
        </p>
      ) : null}
    </Card>
  );
}
