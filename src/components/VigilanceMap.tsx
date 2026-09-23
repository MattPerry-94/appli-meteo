import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { DEPARTMENT_SHAPES, FRANCE_MAP_VIEWBOX } from "@/data/franceDepartments";
import {
  getDepartmentVigilance,
  VIGILANCE_RISK_LABELS,
  type VigilanceDepartment,
  type VigilanceLevelId,
  type VigilanceRiskId,
  type VigilanceSnapshot,
} from "@/services/meteoFranceVigilance";
import { FRENCH_DEPARTMENT_NAMES } from "@/utils/department";
import { describeVigilanceLevel, VIGILANCE_LEVEL_COLORS, VIGILANCE_LEVEL_NAMES } from "@/utils/vigilance";
import { VigilanceDot } from "@/components/VigilanceStrip";

type RiskFilter = "all" | VigilanceRiskId;

const ALL_RISKS: VigilanceRiskId[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const NO_DATA_COLOR = "#cbd5e1";

function levelFor(vigilance: VigilanceDepartment | null, filter: RiskFilter): VigilanceLevelId | null {
  if (!vigilance) return null;
  if (filter === "all") return vigilance.overallLevel;
  return vigilance.risks[filter] ?? 1;
}

function risksAbove(vigilance: VigilanceDepartment) {
  return (Object.entries(vigilance.risks) as Array<[string, VigilanceLevelId]>)
    .filter(([, level]) => level > 1)
    .sort((a, b) => b[1] - a[1])
    .map(([riskId, level]) => ({ riskId: Number(riskId) as VigilanceRiskId, level }));
}

/**
 * Carte de France des vigilances, dessinée à partir des données
 * cartevigilance/encours : couleur par département, filtrable par risque et
 * par échéance, détail au survol ou au toucher.
 */
export function VigilanceMap(props: { snapshot: VigilanceSnapshot; highlightCode: string | null }) {
  const [periodIndex, setPeriodIndex] = useState(0);
  const [filter, setFilter] = useState<RiskFilter>("all");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const period = props.snapshot.periods[Math.min(periodIndex, props.snapshot.periods.length - 1)];

  const byCode = useMemo(() => {
    const map = new Map<string, VigilanceDepartment | null>();
    if (!period) return map;
    for (const { code } of DEPARTMENT_SHAPES) {
      map.set(code, getDepartmentVigilance(period, code));
    }
    return map;
  }, [period]);

  // Risques présents quelque part, pour ne proposer que des filtres utiles.
  const activeRisks = useMemo(() => {
    const found = new Set<VigilanceRiskId>();
    for (const vigilance of byCode.values()) {
      if (vigilance) for (const { riskId } of risksAbove(vigilance)) found.add(riskId);
    }
    return [...found].sort((a, b) => a - b);
  }, [byCode]);

  const alerted = useMemo(
    () =>
      [...byCode.entries()]
        .map(([code, vigilance]) => ({ code, level: levelFor(vigilance, filter) }))
        .filter((entry): entry is { code: string; level: VigilanceLevelId } => (entry.level ?? 1) > 1)
        .sort((a, b) => b.level - a.level || a.code.localeCompare(b.code)),
    [byCode, filter],
  );

  const focusCode = selectedCode ?? props.highlightCode;
  const focus = focusCode ? byCode.get(focusCode) ?? null : null;

  if (!period) {
    return <div className="tile rounded-2xl p-4 text-sm text-slate-500 dark:text-zinc-400">Aucune période de vigilance publiée.</div>;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Échéance" className="segment-group">
            {props.snapshot.periods.slice(0, 2).map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={periodIndex === index}
                onClick={() => setPeriodIndex(index)}
                className={cn("segment", periodIndex === index && "segment-active")}
              >
                {item.label}
              </button>
            ))}
          </div>

          <label className="field flex items-center gap-2 rounded-2xl px-3 py-1.5 text-sm">
            <span className="text-slate-500 dark:text-zinc-400">Risque</span>
            <select
              value={String(filter)}
              onChange={(e) => setFilter(e.target.value === "all" ? "all" : (Number(e.target.value) as VigilanceRiskId))}
              className="bg-transparent font-semibold text-slate-800 outline-none dark:text-zinc-100"
            >
              <option value="all">Tous les risques</option>
              {ALL_RISKS.map((riskId) => (
                <option key={riskId} value={riskId}>
                  {VIGILANCE_RISK_LABELS[riskId]}
                  {activeRisks.includes(riskId) ? " •" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 rounded-[1.35rem] bg-white/60 p-2 shadow-inner dark:bg-white/[0.03]">
          <svg viewBox={FRANCE_MAP_VIEWBOX} role="img" aria-label={`Carte des vigilances, ${period.label.toLowerCase()}`} className="h-auto w-full">
            {DEPARTMENT_SHAPES.map((shape) => {
              const level = levelFor(byCode.get(shape.code) ?? null, filter);
              const isFocus = shape.code === focusCode;
              return (
                <path
                  key={shape.code}
                  d={shape.d}
                  fill={level ? VIGILANCE_LEVEL_COLORS[level] : NO_DATA_COLOR}
                  className={cn(
                    "cursor-pointer stroke-white transition-[opacity,stroke-width] duration-200 hover:opacity-80 dark:stroke-zinc-900",
                    isFocus ? "stroke-[3]" : "stroke-1",
                  )}
                  onMouseEnter={() => setSelectedCode(shape.code)}
                  onClick={() => setSelectedCode(shape.code)}
                >
                  <title>{`${shape.name} (${shape.code})${level ? ` : ${describeVigilanceLevel(level).toLowerCase()}` : ""}`}</title>
                </path>
              );
            })}
            {/* Le contour de la ville active passe au-dessus de ses voisins. */}
            {focusCode
              ? DEPARTMENT_SHAPES.filter((shape) => shape.code === focusCode).map((shape) => (
                  <path key="focus" d={shape.d} fill="none" className="pointer-events-none stroke-slate-900 stroke-[2.5] dark:stroke-white" />
                ))
              : null}
          </svg>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600 dark:text-zinc-300">
          {([1, 2, 3, 4] as VigilanceLevelId[]).map((level) => (
            <span key={level} className="inline-flex items-center gap-1.5">
              <VigilanceDot level={level} className="ring-0" />
              {VIGILANCE_LEVEL_NAMES[level]}
            </span>
          ))}
        </div>

        <p className="mt-3 text-[11px] text-slate-400 dark:text-zinc-500">
          Métropole uniquement : l'outre-mer a ses propres bulletins, sur{" "}
          <a href="https://meteofrance.com/meteo-outre-mer" target="_blank" rel="noreferrer" className="underline underline-offset-2">
            meteofrance.com
          </a>
          . Données : Météo-France. Contours : IGN Admin Express via france-geojson, Licence ouverte Etalab.
        </p>
      </div>

      <div className="space-y-3">
        <div className="tile rounded-2xl p-4" aria-live="polite">
          <div className="eyebrow">{selectedCode ? "Département survolé" : "Département de la ville active"}</div>
          {focusCode ? (
            <>
              <div className="display mt-1 text-xl">
                {FRENCH_DEPARTMENT_NAMES[focusCode] ?? focusCode} <span className="numeric text-slate-400 dark:text-zinc-500">({focusCode})</span>
              </div>
              {focus ? (
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-zinc-100">
                    <VigilanceDot level={focus.overallLevel} />
                    {describeVigilanceLevel(focus.overallLevel)}
                  </div>
                  {risksAbove(focus).map(({ riskId, level }) => (
                    <div key={riskId} className="flex items-center gap-2 text-slate-600 dark:text-zinc-300">
                      <VigilanceDot level={level} className="size-2 ring-0" />
                      {VIGILANCE_RISK_LABELS[riskId]} · {VIGILANCE_LEVEL_NAMES[level]}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-sm text-slate-500 dark:text-zinc-400">Pas de donnée pour ce département.</div>
              )}
            </>
          ) : (
            <div className="mt-2 text-sm text-slate-500 dark:text-zinc-400">Survolez ou touchez un département.</div>
          )}
        </div>

        <div className="tile rounded-2xl p-4">
          <div className="eyebrow">
            Départements en vigilance{filter === "all" ? "" : ` · ${VIGILANCE_RISK_LABELS[filter].toLowerCase()}`}
          </div>
          {alerted.length ? (
            <ul className="mt-3 grid max-h-[320px] gap-1 overflow-auto">
              {alerted.map(({ code, level }) => (
                <li key={code}>
                  <button
                    type="button"
                    onClick={() => setSelectedCode(code)}
                    className="tile-interactive flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm"
                  >
                    <VigilanceDot level={level} className="ring-0" />
                    <span className="min-w-0 flex-1 truncate text-slate-800 dark:text-zinc-100">{FRENCH_DEPARTMENT_NAMES[code] ?? code}</span>
                    <span className="numeric text-xs text-slate-500 dark:text-zinc-400">{code}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-2 text-sm text-slate-500 dark:text-zinc-400">Aucun département en vigilance jaune ou plus.</div>
          )}
        </div>
      </div>
    </div>
  );
}
