import { useMemo } from "react";
import { WeatherIcon } from "@/components/WeatherIcon";
import type { CityForecastBundle, HourlyForecastPoint } from "@/services/openMeteo";
import { formatMm, formatPercent, formatTempC, formatTimeHHmmFromISODateTime, formatUv, formatWindKph } from "@/utils/format";
import { getOpenMeteoVisual, getUvLevel } from "@/utils/weather";

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
    <div className="tile mt-3 overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="eyebrow">Détails par heure</div>
        <div className="numeric text-xs font-semibold text-slate-500 dark:text-zinc-400">
          {points.length ? `${points.length}h` : "—"}
        </div>
      </div>

      <div className="divider-fade" />

      <div className="grid max-h-[320px] gap-1.5 overflow-auto p-2.5">
        {points.length ? (
          points.map((p) => {
            const v = getOpenMeteoVisual(p.weatherCode);
            const uv = getUvLevel(p.uv);
            return (
              <div
                key={p.timeISO}
                className="tile tile-interactive grid grid-cols-[52px_24px_1fr] items-center gap-3 rounded-xl px-3 py-2"
              >
                <div className="numeric text-xs font-bold text-slate-700 dark:text-zinc-200">
                  {formatTimeHHmmFromISODateTime(p.timeISO)}
                </div>
                <WeatherIcon kind={v.kind} className="accent-ink" />
                <div className="min-w-0">
                  <div className="numeric flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-zinc-400">
                    <span className="text-sm font-bold text-slate-900 dark:text-zinc-50">{formatTempC(p.tempC)}</span>
                    {p.apparentTempC !== undefined ? <span>ressenti {formatTempC(p.apparentTempC)}</span> : null}
                    <span>
                      Pluie {formatPercent(p.precipProbabilityPct)}
                      {p.precipMm !== undefined && p.precipMm >= 0.1 ? ` · ${formatMm(p.precipMm)}` : ""}
                    </span>
                    <span>
                      Vent {formatWindKph(p.windKph)}
                      {p.windGustKph !== undefined ? ` (raf. ${formatWindKph(p.windGustKph)})` : ""}
                    </span>
                    <span>Humidité {formatPercent(p.humidityPct)}</span>
                    <span>
                      UV {formatUv(p.uv)} {uv?.label ? `· ${uv.label}` : ""}
                    </span>
                    {props.showReliability && p.reliability ? <span>{p.reliability}</span> : null}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="tile rounded-xl p-3 text-sm text-slate-500 dark:text-zinc-400">Aucune donnée horaire disponible.</div>
        )}
      </div>
    </div>
  );
}
