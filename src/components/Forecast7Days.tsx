import { ChevronDown, Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, Sun } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { HourlyDetails } from "@/components/HourlyDetails";
import type { CityForecastModelSet, ForecastSourceId, ForecastViewId } from "@/services/openMeteo";
import { getForecastViewLabel } from "@/services/openMeteo";
import { formatDayLong, formatDayShort, formatPercent, formatTempC, formatUv, formatWindKph } from "@/utils/format";
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
    <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm text-slate-600 dark:text-zinc-300">Prévisions</div>
              <div className="truncate font-serif text-2xl tracking-tight">{props.forecastSet?.city.name ?? "—"}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="sky">{activeBundle?.modelLabel ?? getForecastViewLabel(activeView)}</Badge>
              {activeView === "consensus" ? <Badge tone="zinc">3 modèles comparés</Badge> : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {views.map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setActiveView(view)}
                className={cn(
                  "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium ring-1 transition",
                  activeView === view
                    ? "bg-sky-500/15 text-sky-900 ring-sky-200/80 dark:bg-sky-500/15 dark:text-sky-100 dark:ring-sky-400/20"
                    : "bg-white text-slate-800 ring-slate-200/70 shadow-sm hover:bg-slate-50 dark:bg-white/5 dark:text-zinc-200 dark:ring-white/10 dark:shadow-none dark:hover:bg-white/10",
                )}
              >
                {getForecastViewLabel(view)}
              </button>
            ))}
          </div>

          {activeBundle?.note ? <div className="text-xs text-slate-500 dark:text-zinc-400">{activeBundle.note}</div> : null}
        </div>

        {days.length ? (
          <div className="mt-4 divide-y divide-slate-200/70 rounded-xl ring-1 ring-slate-200/70 dark:divide-white/10 dark:ring-white/10">
            {days.map((day, idx) => {
              const dayVisual = getOpenMeteoVisual(day.weatherCode);
              const dayUv = getUvLevel(day.uvMax);
              const isOpen = idx === safeOpenIndex;

              return (
                <button
                  key={`${day.dateISO}-${idx}`}
                  type="button"
                  onClick={() => setOpenIndex(idx)}
                  className={cn(
                    "grid w-full grid-cols-[72px_28px_1fr_auto] items-center gap-3 px-3 py-3 text-left transition",
                    "hover:bg-slate-900/5 dark:hover:bg-white/5",
                    isOpen && "bg-sky-500/10 dark:bg-white/7",
                  )}
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                    {formatDayShort(day.dateISO)}
                  </div>

                  <KindIcon kind={dayVisual.kind} className="text-sky-700 dark:text-zinc-200" />

                  <div className="min-w-0">
                    <div className="truncate text-sm text-slate-800 dark:text-zinc-200">{formatDayLong(day.dateISO)}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
                      <span>
                        {formatTempC(day.tempMinC)} <span className="text-slate-400 dark:text-zinc-600">→</span>{" "}
                        {formatTempC(day.tempMaxC)}
                      </span>
                      <span className="text-slate-300 dark:text-zinc-600">•</span>
                      <span>
                        Pluie {day.precipProbabilityPct === undefined ? missingModelText : formatPercent(day.precipProbabilityPct)}
                      </span>
                      <span className="text-slate-300 dark:text-zinc-600">•</span>
                      <span>Vent {day.windMaxKph === undefined ? missingModelText : formatWindKph(day.windMaxKph)}</span>
                      <span className="text-slate-300 dark:text-zinc-600">•</span>
                      <span>
                        UV {day.uvMax === undefined ? missingModelText : `${formatUv(day.uvMax)}${dayUv?.label ? ` · ${dayUv.label}` : ""}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeView === "consensus" ? (
                      <Badge tone="zinc" className="hidden sm:inline-flex">
                        {day.reliability ?? "—"}
                      </Badge>
                    ) : day.uvMax !== undefined ? (
                      <Badge tone={dayUv?.tone ?? "zinc"} className="hidden sm:inline-flex">
                        UV {formatUv(day.uvMax)} {dayUv?.label ? `· ${dayUv.label}` : ""}
                      </Badge>
                    ) : null}
                    <ChevronDown
                      className={cn(
                        "size-4 text-slate-400 transition dark:text-zinc-400",
                        isOpen && "rotate-180 text-slate-700 dark:text-zinc-200",
                      )}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-sky-50/70 p-4 text-sm text-slate-600 ring-1 ring-sky-100 dark:bg-white/5 dark:text-zinc-300 dark:ring-white/10">
            Aucune donnée disponible pour ce modèle sur la période affichée.
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-slate-600 dark:text-zinc-300">Détails</div>
            <div className="mt-1 font-serif text-xl tracking-tight">{active ? formatDayLong(active.dateISO) : "—"}</div>
          </div>
          <Badge tone="zinc">{activeBundle?.modelLabel ?? getForecastViewLabel(activeView)}</Badge>
        </div>

        <div className="mt-4 grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-sky-50/70 p-3 ring-1 ring-sky-100 dark:bg-white/5 dark:ring-white/10">
              <div className="text-xs text-slate-500 dark:text-zinc-400">Températures</div>
              <div className="mt-1 text-sm text-slate-900 dark:text-zinc-100">
                {formatTempC(active?.tempMinC)} <span className="text-slate-400 dark:text-zinc-600">→</span>{" "}
                {formatTempC(active?.tempMaxC)}
              </div>
            </div>

            <div className="rounded-xl bg-sky-50/70 p-3 ring-1 ring-sky-100 dark:bg-white/5 dark:ring-white/10">
              <div className="text-xs text-slate-500 dark:text-zinc-400">{activeView === "consensus" ? "Fiabilité" : "Indice UV"}</div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <div className="text-sm text-slate-900 dark:text-zinc-100">
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

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-sky-50/70 p-3 ring-1 ring-sky-100 dark:bg-white/5 dark:ring-white/10">
              <div className="text-xs text-slate-500 dark:text-zinc-400">Pluie</div>
              <div className="mt-1 text-sm text-slate-900 dark:text-zinc-100">
                {active?.precipProbabilityPct === undefined ? missingModelText : formatPercent(active.precipProbabilityPct)}
              </div>
            </div>
            <div className="rounded-xl bg-sky-50/70 p-3 ring-1 ring-sky-100 dark:bg-white/5 dark:ring-white/10">
              <div className="text-xs text-slate-500 dark:text-zinc-400">Vent (max)</div>
              <div className="mt-1 text-sm text-slate-900 dark:text-zinc-100">
                {active?.windMaxKph === undefined ? missingModelText : formatWindKph(active.windMaxKph)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-sky-50/70 p-3 ring-1 ring-sky-100 dark:bg-white/5 dark:ring-white/10">
              <div className="text-xs text-slate-500 dark:text-zinc-400">Humidité</div>
              <div className="mt-1 text-sm text-slate-900 dark:text-zinc-100">
                {active?.humidityAvgPct === undefined ? missingModelText : formatPercent(active.humidityAvgPct)}
              </div>
            </div>
            <div className="rounded-xl bg-sky-50/70 p-3 ring-1 ring-sky-100 dark:bg-white/5 dark:ring-white/10">
              <div className="text-xs text-slate-500 dark:text-zinc-400">Sources prises en compte</div>
              <div className="mt-1 text-sm text-slate-900 dark:text-zinc-100">
                {active?.availableModels?.length ? active.availableModels.map((model) => getForecastViewLabel(model)).join(", ") : "—"}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-sky-50/70 p-3 ring-1 ring-sky-100 dark:bg-white/5 dark:ring-white/10">
            <div className="text-xs text-slate-500 dark:text-zinc-400">Résumé</div>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-900 dark:text-zinc-100">
              <KindIcon kind={visual.kind} className="text-sky-700 dark:text-zinc-200" />
              <span>{visual.label}</span>
            </div>
          </div>

          {activeView === "consensus" && comparison.length ? (
            <div className="rounded-2xl bg-sky-50/70 p-3 ring-1 ring-sky-100 dark:bg-white/5 dark:ring-white/10">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">Lecture par modèle</div>
              <div className="mt-3 grid gap-2">
                {comparison.map((item) => {
                  const itemVisual = getOpenMeteoVisual(item.day?.weatherCode);
                  return (
                    <div
                      key={item.modelId}
                      className="grid grid-cols-[88px_22px_1fr] items-center gap-3 rounded-xl bg-white/80 px-3 py-2 ring-1 ring-slate-200/70 dark:bg-white/5 dark:ring-white/10"
                    >
                      <div className="text-xs font-semibold text-slate-700 dark:text-zinc-200">{item.label}</div>
                      <KindIcon kind={itemVisual.kind} className="text-sky-700 dark:text-zinc-200" />
                      <div className="text-xs text-slate-600 dark:text-zinc-300">
                        {item.day ? (
                          <>
                            <span className="text-slate-900 dark:text-zinc-100">{itemVisual.label}</span>
                            <span className="px-1 text-slate-300 dark:text-zinc-600">•</span>
                            <span>
                              {formatTempC(item.day.tempMinC)} <span className="text-slate-400 dark:text-zinc-600">→</span>{" "}
                              {formatTempC(item.day.tempMaxC)}
                            </span>
                            <span className="px-1 text-slate-300 dark:text-zinc-600">•</span>
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
