import { ChevronDown, Sunrise, Sunset } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { WeatherIcon } from "@/components/WeatherIcon";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { HourlyDetails } from "@/components/HourlyDetails";
import type { CityForecastModelSet, ForecastSourceId, ForecastViewId } from "@/services/openMeteo";
import { getForecastViewLabel } from "@/services/openMeteo";
import {
  formatDayLong,
  formatDayShort,
  formatMm,
  formatPercent,
  formatSpreadC,
  formatTempC,
  formatTimeHHmmFromISODateTime,
  formatUv,
  formatWindKph,
} from "@/utils/format";
import { getOpenMeteoVisual, getUvLevel } from "@/utils/weather";

const views: ForecastViewId[] = ["consensus", "arome", "gfs", "ecmwf"];
const comparisonViews: ForecastSourceId[] = ["arome", "gfs", "ecmwf"];

export function Forecast7Days(props: { forecastSet: CityForecastModelSet | null }) {
  const [openIndex, setOpenIndex] = useState<number>(0);
  const [activeView, setActiveView] = useState<ForecastViewId>("consensus");

  const activeBundle =
    activeView === "consensus" ? (props.forecastSet?.consensus ?? null) : (props.forecastSet?.models[activeView] ?? null);

  const days = activeBundle?.daily ?? [];
  const safeOpenIndex = useMemo(() => {
    if (!days.length) return 0;
    return Math.min(Math.max(openIndex, 0), days.length - 1);
  }, [days.length, openIndex]);

  const active = days[safeOpenIndex];
  const uv = getUvLevel(active?.uvMax);
  const visual = getOpenMeteoVisual(active?.weatherCode);
  const missingModelText = activeView === "consensus" ? "—" : "Non disponible pour ce modèle";

  const comparison = useMemo(() => {
    if (!props.forecastSet || !active) return [];
    return comparisonViews.map((modelId) => {
      const bundle = props.forecastSet?.models[modelId];
      const day = bundle?.daily.find((item) => item.dateISO === active.dateISO);
      return {
        modelId,
        label: getForecastViewLabel(modelId),
        day,
      };
    });
  }, [active, props.forecastSet]);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <Card className="p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="eyebrow">Prévisions</div>
              <div className="display mt-1 break-words text-2xl">{props.forecastSet?.city.name ?? "—"}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="sky">{activeBundle?.modelLabel ?? getForecastViewLabel(activeView)}</Badge>
              {activeView === "consensus" ? <Badge tone="zinc">3 modèles comparés</Badge> : null}
            </div>
          </div>

          <div role="tablist" aria-label="Modèle de prévision" className="segment-group grid w-full grid-cols-2 sm:flex">
            {views.map((view) => (
              <button
                key={view}
                type="button"
                role="tab"
                aria-selected={activeView === view}
                onClick={() => setActiveView(view)}
                className={cn("segment flex-1 px-2.5 sm:px-3.5", activeView === view && "segment-active")}
              >
                {getForecastViewLabel(view)}
              </button>
            ))}
          </div>

          {activeBundle?.note ? <div className="text-xs text-slate-500 dark:text-zinc-400">{activeBundle.note}</div> : null}
        </div>

        {days.length ? (
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-900/[0.07] dark:border-white/10">
            {days.map((day, idx) => {
              const dayVisual = getOpenMeteoVisual(day.weatherCode);
              const dayUv = getUvLevel(day.uvMax);
              const isOpen = idx === safeOpenIndex;

              return (
                <button
                  key={`${day.dateISO}-${idx}`}
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(idx)}
                  className={cn(
                    "relative grid w-full grid-cols-[64px_28px_minmax(0,1fr)] items-center gap-3 px-4 py-3.5 text-left transition-colors sm:grid-cols-[64px_28px_1fr_auto]",
                    idx > 0 && "border-t border-slate-900/[0.06] dark:border-white/[0.07]",
                    "hover:bg-slate-900/[0.035] dark:hover:bg-white/[0.05]",
                    isOpen && "accent-wash",
                  )}
                >
                  {isOpen ? (
                    <span className="accent-bar absolute inset-y-1.5 left-0 w-1 rounded-full" />
                  ) : null}

                  <div className="eyebrow">{formatDayShort(day.dateISO)}</div>

                  <WeatherIcon kind={dayVisual.kind} className="accent-ink" />

                  <div className="min-w-0">
                    <div className="break-words text-sm font-semibold text-slate-800 dark:text-zinc-100">
                      {formatDayLong(day.dateISO)}
                    </div>
                    <div className="numeric mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-zinc-400">
                      <span className="font-semibold text-slate-700 dark:text-zinc-300">
                        {formatTempC(day.tempMinC)} <span className="font-normal text-slate-300 dark:text-zinc-600">→</span>{" "}
                        {formatTempC(day.tempMaxC)}
                        {activeView === "consensus" && formatSpreadC(day.tempMaxSpreadC) ? (
                          <span className="ml-1 font-normal text-slate-400 dark:text-zinc-500" title="Écart entre modèles sur le maximum">
                            {formatSpreadC(day.tempMaxSpreadC)}
                          </span>
                        ) : null}
                      </span>
                      <span className="text-slate-300 dark:text-zinc-700">•</span>
                      <span>
                        Pluie {day.precipProbabilityPct === undefined ? missingModelText : formatPercent(day.precipProbabilityPct)}
                        {day.precipSumMm !== undefined && day.precipSumMm >= 0.1 ? ` · ${formatMm(day.precipSumMm)}` : ""}
                      </span>
                      <span className="text-slate-300 dark:text-zinc-700">•</span>
                      <span>Vent {day.windMaxKph === undefined ? missingModelText : formatWindKph(day.windMaxKph)}</span>
                      <span className="text-slate-300 dark:text-zinc-700">•</span>
                      <span>
                        UV {day.uvMax === undefined ? missingModelText : `${formatUv(day.uvMax)}${dayUv?.label ? ` · ${dayUv.label}` : ""}`}
                      </span>
                    </div>
                  </div>

                  <div className="col-start-3 row-start-2 flex items-center justify-between gap-2 sm:col-auto sm:row-auto sm:justify-end">
                    {activeView === "consensus" ? (
                      <Badge tone="zinc" className="inline-flex max-w-full shrink-0">
                        {day.reliability ?? "—"}
                      </Badge>
                    ) : day.uvMax !== undefined ? (
                      <Badge tone={dayUv?.tone ?? "zinc"} className="inline-flex max-w-full shrink-0">
                        UV {formatUv(day.uvMax)} {dayUv?.label ? `· ${dayUv.label}` : ""}
                      </Badge>
                    ) : null}
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 text-slate-400 transition-transform duration-300 ease-spring dark:text-zinc-500",
                        isOpen && "accent-ink rotate-180",
                      )}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="tile mt-5 rounded-2xl p-4 text-sm text-slate-500 dark:text-zinc-400">
            {activeBundle?.unavailable
              ? `Ce modèle n'a pas répondu (${activeBundle.unavailableReason}). Les autres modèles restent disponibles.`
              : "Aucune donnée disponible pour ce modèle sur la période affichée."}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="eyebrow">Détails</div>
            <div className="display mt-1 truncate text-xl">{active ? formatDayLong(active.dateISO) : "—"}</div>
          </div>
          <Badge tone="zinc" className="shrink-0">
            {activeBundle?.modelLabel ?? getForecastViewLabel(activeView)}
          </Badge>
        </div>

        <div className="mt-5 grid gap-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="tile rounded-2xl p-3.5">
              <div className="eyebrow">Températures</div>
              <div className="numeric mt-1.5 text-sm font-semibold text-slate-900 dark:text-zinc-50">
                {formatTempC(active?.tempMinC)} <span className="font-normal text-slate-300 dark:text-zinc-600">→</span>{" "}
                {formatTempC(active?.tempMaxC)}
              </div>
              {activeView === "consensus" && (formatSpreadC(active?.tempMinSpreadC) || formatSpreadC(active?.tempMaxSpreadC)) ? (
                <div className="numeric mt-0.5 text-xs text-slate-500 dark:text-zinc-400" title="Écart entre les modèles">
                  Écart {formatSpreadC(active?.tempMinSpreadC) || "±0°"} / {formatSpreadC(active?.tempMaxSpreadC) || "±0°"}
                </div>
              ) : null}
            </div>

            <div className="tile rounded-2xl p-3.5">
              <div className="eyebrow">{activeView === "consensus" ? "Fiabilité" : "Indice UV"}</div>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-slate-900 dark:text-zinc-50">
                  {activeView === "consensus"
                    ? active?.reliability ?? "—"
                    : active?.uvMax === undefined
                      ? missingModelText
                      : `UV ${formatUv(active.uvMax)}${uv?.label ? ` · ${uv.label}` : ""}`}
                </div>
                {activeView === "consensus" ? (
                  <Badge tone="zinc">{active?.reliability ?? "—"}</Badge>
                ) : active?.uvMax !== undefined ? <Badge tone={uv?.tone ?? "zinc"}>{uv?.label ?? "—"}</Badge> : null}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="tile rounded-2xl p-3.5">
              <div className="eyebrow">Pluie</div>
              <div className="numeric mt-1.5 text-sm font-semibold text-slate-900 dark:text-zinc-50">
                {active?.precipProbabilityPct === undefined ? missingModelText : formatPercent(active.precipProbabilityPct)}
              </div>
              <div className="numeric mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                Cumul {formatMm(active?.precipSumMm)}
                {activeView === "consensus" && active?.precipProbabilityRange &&
                active.precipProbabilityRange[1] - active.precipProbabilityRange[0] >= 10
                  ? ` · ${Math.round(active.precipProbabilityRange[0])} à ${formatPercent(active.precipProbabilityRange[1])} selon les modèles`
                  : ""}
              </div>
            </div>
            <div className="tile rounded-2xl p-3.5">
              <div className="eyebrow">Vent (max)</div>
              <div className="numeric mt-1.5 text-sm font-semibold text-slate-900 dark:text-zinc-50">
                {active?.windMaxKph === undefined ? missingModelText : formatWindKph(active.windMaxKph)}
              </div>
              <div className="numeric mt-0.5 text-xs text-slate-500 dark:text-zinc-400">Rafales {formatWindKph(active?.windGustMaxKph)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="tile rounded-2xl p-3.5">
              <div className="eyebrow">Humidité</div>
              <div className="numeric mt-1.5 text-sm font-semibold text-slate-900 dark:text-zinc-50">
                {active?.humidityAvgPct === undefined ? missingModelText : formatPercent(active.humidityAvgPct)}
              </div>
            </div>
            <div className="tile rounded-2xl p-3.5">
              <div className="eyebrow">Sources prises en compte</div>
              <div className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-zinc-50">
                {active?.availableModels?.length ? active.availableModels.map((model) => getForecastViewLabel(model)).join(", ") : "—"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="tile rounded-2xl p-3.5">
              <div className="eyebrow">Ressenti</div>
              <div className="numeric mt-1.5 text-sm font-semibold text-slate-900 dark:text-zinc-50">
                {formatTempC(active?.apparentTempMinC)} <span className="font-normal text-slate-300 dark:text-zinc-600">→</span>{" "}
                {formatTempC(active?.apparentTempMaxC)}
              </div>
            </div>
            <div className="tile rounded-2xl p-3.5">
              <div className="eyebrow">Soleil</div>
              <div className="numeric mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-zinc-50">
                <Sunrise className="accent-ink size-4" aria-label="Lever" />
                {active?.sunriseISO ? formatTimeHHmmFromISODateTime(active.sunriseISO) : "—"}
                <Sunset className="accent-ink ml-1 size-4" aria-label="Coucher" />
                {active?.sunsetISO ? formatTimeHHmmFromISODateTime(active.sunsetISO) : "—"}
              </div>
            </div>
          </div>

          <div className="tile rounded-2xl p-3.5">
            <div className="eyebrow">Résumé</div>
            <div className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-zinc-50">
              <WeatherIcon kind={visual.kind} className="accent-ink" />
              <span>{visual.label}</span>
            </div>
          </div>

          {activeView === "consensus" && comparison.length ? (
            <div className="tile rounded-2xl p-3.5">
              <div className="eyebrow">Lecture par modèle</div>
              <div className="mt-3 grid gap-2">
                {comparison.map((item) => {
                  const itemVisual = getOpenMeteoVisual(item.day?.weatherCode);
                  return (
                    <div
                      key={item.modelId}
                      className="tile tile-interactive grid grid-cols-[80px_22px_1fr] items-center gap-3 rounded-xl px-3 py-2.5"
                    >
                      <div className="text-xs font-bold text-slate-700 dark:text-zinc-200">{item.label}</div>
                      <WeatherIcon kind={itemVisual.kind} className="accent-ink" />
                      <div className="numeric text-xs text-slate-500 dark:text-zinc-400">
                        {item.day ? (
                          <>
                            <span className="font-semibold text-slate-800 dark:text-zinc-100">{itemVisual.label}</span>
                            <span className="px-1 text-slate-300 dark:text-zinc-700">•</span>
                            <span>
                              {formatTempC(item.day.tempMinC)} <span className="text-slate-300 dark:text-zinc-600">→</span>{" "}
                              {formatTempC(item.day.tempMaxC)}
                            </span>
                            <span className="px-1 text-slate-300 dark:text-zinc-700">•</span>
                            <span>Pluie {formatPercent(item.day.precipProbabilityPct)}</span>
                          </>
                        ) : (
                          "Aucune donnée"
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <HourlyDetails bundle={activeBundle} dateISO={active?.dateISO ?? null} showReliability={activeView === "consensus"} />
      </Card>
    </div>
  );
}
