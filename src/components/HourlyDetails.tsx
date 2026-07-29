import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, Sun } from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/Card";
import type { CityForecastBundle, HourlyForecastPoint } from "@/services/openMeteo";
import { formatPercent, formatTempC, formatTimeHHmmFromISODateTime, formatUv, formatWindKph } from "@/utils/format";
import { getOpenMeteoVisual, getUvLevel } from "@/utils/weather";

function KindIcon(props: { kind: ReturnType<typeof getOpenMeteoVisual>["kind"]; className?: string }) {
  const className = cn("size-4", props.className);
  if (props.kind === "clear") return <Sun className={className} />;
  if (props.kind === "rain") return <CloudRain className={className} />;
  if (props.kind === "snow") return <CloudSnow className={className} />;
  if (props.kind === "storm") return <CloudLightning className={className} />;
  if (props.kind === "fog") return <CloudFog className={className} />;
  return <Cloud className={className} />;
}

function pointsForDay(points: HourlyForecastPoint[], dateISO: string) {
  const prefix = `${dateISO}T`;
  return points.filter((p) => p.timeISO.startsWith(prefix)).slice(0, 24);
}

export function HourlyDetails(props: { bundle: CityForecastBundle | null; dateISO: string | null; showReliability?: boolean }) {
  const points = useMemo(() => {
    if (!props.bundle || !props.dateISO) return [];
    return pointsForDay(props.bundle.hourly, props.dateISO);
  }, [props.bundle, props.dateISO]);

  return (
    <div className="mt-3 rounded-2xl bg-sky-50/70 ring-1 ring-sky-100 dark:bg-white/5 dark:ring-white/10">
      <div className="flex items-center justify-between gap-3 px-3 py-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
          Détails par heure
        </div>
        <div className="text-xs text-slate-500 dark:text-zinc-400">{points.length ? `${points.length}h` : "—"}</div>
      </div>

      <div className="grid max-h-[300px] gap-2 overflow-auto px-3 pb-3">
        {points.length ? (
          points.map((p) => {
            const v = getOpenMeteoVisual(p.weatherCode);
            const uv = getUvLevel(p.uv);
            return (
              <Card
                key={p.timeISO}
                className={cn(
                  "grid grid-cols-[64px_26px_1fr] items-center gap-3 px-3 py-2",
                  "bg-white/80 ring-slate-200/70 dark:bg-white/5 dark:ring-white/10",
                )}
              >
                <div className="text-xs font-semibold text-slate-700 dark:text-zinc-200">
                  {formatTimeHHmmFromISODateTime(p.timeISO)}
                </div>
                <KindIcon kind={v.kind} className="text-sky-700 dark:text-zinc-200" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-zinc-300">
                    <span className="text-slate-900 dark:text-zinc-100">{formatTempC(p.tempC)}</span>
                    <span>Pluie {formatPercent(p.precipProbabilityPct)}</span>
                    <span>Vent {formatWindKph(p.windKph)}</span>
                    <span>Humidité {formatPercent(p.humidityPct)}</span>
                    <span>
                      UV {formatUv(p.uv)} {uv?.label ? `· ${uv.label}` : ""}
                    </span>
                    {props.showReliability && p.reliability ? <span>{p.reliability}</span> : null}
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="rounded-xl bg-white/70 p-3 text-sm text-slate-600 ring-1 ring-slate-200/70 dark:bg-white/5 dark:text-zinc-300 dark:ring-white/10">
            Aucune donnée horaire disponible.
          </div>
        )}
      </div>
    </div>
  );
}
