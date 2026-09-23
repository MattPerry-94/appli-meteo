import { cn } from "@/lib/utils";
import {
  getDepartmentVigilance,
  VIGILANCE_RISK_LABELS,
  type VigilanceLevelId,
  type VigilanceRiskId,
  type VigilanceSnapshot,
} from "@/services/meteoFranceVigilance";
import { describeVigilanceLevel, VIGILANCE_LEVEL_COLORS, VIGILANCE_LEVEL_NAMES } from "@/utils/vigilance";

export function VigilanceDot(props: { level: VigilanceLevelId; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-2.5 shrink-0 rounded-full ring-2 ring-white/70 dark:ring-black/30", props.className)}
      style={{ backgroundColor: VIGILANCE_LEVEL_COLORS[props.level] }}
    />
  );
}

/**
 * Pastilles de vigilance Météo-France du département, aujourd'hui et demain,
 * avec le détail des risques dès qu'ils dépassent le vert.
 */
export function VigilanceStrip(props: {
  snapshot: VigilanceSnapshot | null;
  departmentCode: string | null;
  isLoading: boolean;
  className?: string;
}) {
  if (!props.departmentCode) return null;

  if (!props.snapshot) {
    return props.isLoading ? <div className={cn("skeleton h-10 rounded-2xl", props.className)} /> : null;
  }

  const rows = props.snapshot.periods
    .slice(0, 2)
    .map((period) => ({ period, vigilance: getDepartmentVigilance(period, props.departmentCode!) }))
    .filter((row) => row.vigilance);

  if (!rows.length) return null;

  return (
    <div className={cn("tile grid gap-2 rounded-2xl p-3.5", props.className)}>
      <div className="eyebrow">Vigilance Météo-France · département {props.departmentCode}</div>
      {rows.map(({ period, vigilance }) => {
        const risks = (Object.entries(vigilance!.risks) as Array<[string, VigilanceLevelId]>)
          .filter(([, level]) => level > 1)
          .sort((a, b) => b[1] - a[1]);

        return (
          <div key={period.id} className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm">
            <span className="w-24 shrink-0 text-xs font-semibold text-slate-500 dark:text-zinc-400">{period.label}</span>
            <VigilanceDot level={vigilance!.overallLevel} />
            <span className="font-semibold text-slate-800 dark:text-zinc-100">{describeVigilanceLevel(vigilance!.overallLevel)}</span>
            {risks.map(([riskId, level]) => (
              <span
                key={riskId}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/[0.05] px-2 py-0.5 text-xs text-slate-700 dark:bg-white/10 dark:text-zinc-200"
              >
                <VigilanceDot level={level} className="size-2 ring-0" />
                {VIGILANCE_RISK_LABELS[Number(riskId) as VigilanceRiskId]} · {VIGILANCE_LEVEL_NAMES[level]}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
