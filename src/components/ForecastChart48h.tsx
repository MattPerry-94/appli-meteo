import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/Card";
import type { CityForecastModelSet, ForecastSourceId, HourlyForecastPoint } from "@/services/openMeteo";
import { getForecastViewLabel } from "@/services/openMeteo";
import { formatMm, formatPercent, formatSpreadC, formatTempC } from "@/utils/format";
import { cityNowHourISO } from "@/utils/time";

const HOURS = 48;
const MODELS: ForecastSourceId[] = ["arome", "gfs", "ecmwf"];

// Géométrie (px). Deux graphiques empilés, un axe chacun, même axe du temps.
const PAD_LEFT = 34;
const PAD_RIGHT = 10;
const TEMP_TOP = 10;
const TEMP_HEIGHT = 150;
const GAP = 26;
const RAIN_HEIGHT = 56;
const AXIS_HEIGHT = 22;
const HEIGHT = TEMP_TOP + TEMP_HEIGHT + GAP + RAIN_HEIGHT + AXIS_HEIGHT;

function hourLabel(timeISO: string) {
  return `${Number(timeISO.slice(11, 13))}h`;
}

function dayLabel(timeISO: string) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric" }).format(new Date(`${timeISO.slice(0, 10)}T12:00:00`));
}

/** Graduations « rondes » couvrant [min, max]. */
function niceTicks(min: number, max: number, count = 4) {
  const span = Math.max(max - min, 1);
  const rawStep = span / count;
  const step = [1, 2, 5, 10].find((candidate) => candidate >= rawStep) ?? 10;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = start; value <= end + 1e-9; value += step) ticks.push(value);
  return ticks;
}

function linePath(points: Array<[number, number] | null>) {
  let d = "";
  let pen = false;
  for (const point of points) {
    if (!point) {
      pen = false;
      continue;
    }
    d += `${pen ? "L" : "M"}${point[0].toFixed(1)} ${point[1].toFixed(1)}`;
    pen = true;
  }
  return d;
}

/**
 * Les 48 prochaines heures du consensus : courbe de température et bande de
 * dispersion (du modèle le plus froid au plus chaud), puis probabilité et
 * cumul de pluie. Survol / toucher : détail de l'heure, modèle par modèle.
 */
export function ForecastChart48h(props: { forecastSet: CityForecastModelSet | null }) {
  // Ref de rappel : l'element n'existe qu'une fois les donnees arrivees (le
  // squelette s'affiche avant), un useEffect au montage ne le verrait jamais.
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(720);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!container || typeof ResizeObserver === "undefined") return;
    setWidth(Math.max(280, Math.round(container.clientWidth)));
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    observer.observe(container);
    return () => observer.disconnect();
  }, [container]);

  const consensus = props.forecastSet?.consensus;

  const points = useMemo(() => {
    if (!consensus) return [] as HourlyForecastPoint[];
    const start = cityNowHourISO(consensus.timezone);
    const from = consensus.hourly.findIndex((point) => point.timeISO >= start);
    return from < 0 ? [] : consensus.hourly.slice(from, from + HOURS);
  }, [consensus]);

  const scale = useMemo(() => {
    const values = points.flatMap((point) => [point.tempC, ...(point.tempRangeC ?? [])]).filter((value): value is number => typeof value === "number");
    if (!values.length) return null;
    const ticks = niceTicks(Math.min(...values), Math.max(...values));
    const lo = ticks[0];
    const hi = ticks[ticks.length - 1];
    const plotWidth = width - PAD_LEFT - PAD_RIGHT;
    const step = plotWidth / Math.max(points.length - 1, 1);
    const x = (index: number) => PAD_LEFT + index * step;
    const yTemp = (value: number) => TEMP_TOP + TEMP_HEIGHT - ((value - lo) / (hi - lo || 1)) * TEMP_HEIGHT;
    const rainTop = TEMP_TOP + TEMP_HEIGHT + GAP;
    const yRain = (pct: number) => rainTop + RAIN_HEIGHT - (pct / 100) * RAIN_HEIGHT;
    return { ticks, x, yTemp, yRain, rainTop, step };
  }, [points, width]);

  if (!consensus || !points.length || !scale) {
    return (
      <Card className="p-5">
        <div className="eyebrow">Prochaines 48 h</div>
        <div className="skeleton mt-4 h-[180px] rounded-2xl" />
      </Card>
    );
  }

  const { ticks, x, yTemp, yRain, rainTop, step } = scale;
  const line = linePath(points.map((point, index) => (typeof point.tempC === "number" ? [x(index), yTemp(point.tempC)] : null)));
  const bandPoints = points
    .map((point, index) => (point.tempRangeC ? { index, range: point.tempRangeC } : null))
    .filter((entry): entry is { index: number; range: [number, number] } => Boolean(entry));
  const band = bandPoints.length
    ? `M${bandPoints.map(({ index, range }) => `${x(index).toFixed(1)} ${yTemp(range[1]).toFixed(1)}`).join("L")}` +
      `L${[...bandPoints].reverse().map(({ index, range }) => `${x(index).toFixed(1)} ${yTemp(range[0]).toFixed(1)}`).join("L")}Z`
    : "";
  const barWidth = Math.max(2, step - 2);
  const midnights = points.map((point, index) => ({ point, index })).filter(({ point, index }) => index > 0 && point.timeISO.endsWith("T00:00"));
  const labelEvery = width < 520 ? 12 : 6;

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  const modelValues = hovered
    ? MODELS.map((modelId) => ({
        modelId,
        tempC: props.forecastSet?.models[modelId].hourly.find((point) => point.timeISO === hovered.timeISO)?.tempC,
      }))
    : [];

  function onPointer(event: React.PointerEvent<SVGRectElement>) {
    const rect = event.currentTarget.ownerSVGElement!.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * width;
    const index = Math.round((px - PAD_LEFT) / step);
    setHoverIndex(Math.min(Math.max(index, 0), points.length - 1));
  }

  const tooltipLeft = hoverIndex !== null ? Math.min(Math.max(x(hoverIndex) / width, 0.12), 0.88) * 100 : 0;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">Prochaines 48 h</div>
          <div className="display mt-1 text-2xl">Température et pluie</div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-zinc-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="chart-line-swatch inline-block h-0.5 w-4 rounded-full" /> Consensus
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="chart-band-swatch inline-block h-2.5 w-4 rounded-sm" /> Écart AROME · GFS · ECMWF
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="chart-rain-swatch inline-block h-2.5 w-2 rounded-sm" /> Probabilité de pluie
          </span>
        </div>
      </div>

      <div ref={setContainer} className="relative mt-4">
        <svg
          width="100%"
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label="Température et probabilité de pluie pour les 48 prochaines heures"
          className="block touch-pan-y select-none"
        >
          {/* Grille et axe des températures */}
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={PAD_LEFT} x2={width - PAD_RIGHT} y1={yTemp(tick)} y2={yTemp(tick)} className="stroke-slate-900/[0.07] dark:stroke-white/[0.08]" />
              <text x={PAD_LEFT - 6} y={yTemp(tick) + 3.5} textAnchor="end" className="numeric fill-slate-400 text-[10px] dark:fill-zinc-500">
                {tick}°
              </text>
            </g>
          ))}

          {/* Changements de jour */}
          {midnights.map(({ point, index }) => (
            <g key={point.timeISO}>
              <line x1={x(index)} x2={x(index)} y1={TEMP_TOP} y2={rainTop + RAIN_HEIGHT} className="stroke-slate-900/[0.12] dark:stroke-white/[0.14]" strokeDasharray="3 3" />
              <text x={x(index) + 4} y={TEMP_TOP + 9} className="fill-slate-500 text-[10px] font-semibold dark:fill-zinc-400">
                {dayLabel(point.timeISO)}
              </text>
            </g>
          ))}

          {band ? <path d={band} className="chart-band-fill" /> : null}
          <path d={line} fill="none" className="chart-line-stroke" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {/* Pluie : axe 0-100 %, graphique séparé */}
          <line x1={PAD_LEFT} x2={width - PAD_RIGHT} y1={rainTop + RAIN_HEIGHT} y2={rainTop + RAIN_HEIGHT} className="stroke-slate-900/[0.12] dark:stroke-white/[0.14]" />
          <text x={PAD_LEFT - 6} y={rainTop + 7} textAnchor="end" className="numeric fill-slate-400 text-[10px] dark:fill-zinc-500">
            100%
          </text>
          {points.map((point, index) => {
            const pct = point.precipProbabilityPct ?? 0;
            if (pct < 1) return null;
            const top = yRain(pct);
            return (
              <rect
                key={point.timeISO}
                x={x(index) - barWidth / 2}
                y={top}
                width={barWidth}
                height={Math.max(rainTop + RAIN_HEIGHT - top, 1)}
                rx={Math.min(2, barWidth / 2)}
                className="chart-rain-fill"
              />
            );
          })}

          {/* Heures */}
          {points.map((point, index) =>
            index % labelEvery === 0 ? (
              <text key={point.timeISO} x={x(index)} y={HEIGHT - 6} textAnchor="middle" className="numeric fill-slate-400 text-[10px] dark:fill-zinc-500">
                {index === 0 ? "Maint." : hourLabel(point.timeISO)}
              </text>
            ) : null,
          )}

          {/* Réticule */}
          {hovered && hoverIndex !== null ? (
            <g className="pointer-events-none">
              <line x1={x(hoverIndex)} x2={x(hoverIndex)} y1={TEMP_TOP} y2={rainTop + RAIN_HEIGHT} className="stroke-slate-900/40 dark:stroke-white/40" />
              {typeof hovered.tempC === "number" ? (
                <circle cx={x(hoverIndex)} cy={yTemp(hovered.tempC)} r={4.5} className="chart-dot-fill stroke-white dark:stroke-zinc-900" strokeWidth={2} />
              ) : null}
            </g>
          ) : null}

          {/* Zone de survol, plus large que les marques */}
          <rect
            x={PAD_LEFT - step / 2}
            y={0}
            width={width - PAD_LEFT - PAD_RIGHT + step}
            height={HEIGHT}
            fill="transparent"
            onPointerMove={onPointer}
            onPointerDown={onPointer}
            onPointerLeave={() => setHoverIndex(null)}
          />
        </svg>

        {hovered ? (
          <div
            className="tile pointer-events-none absolute top-0 z-10 w-44 -translate-x-1/2 rounded-xl px-3 py-2 text-xs shadow-soft"
            style={{ left: `${tooltipLeft}%` }}
          >
            <div className="font-semibold text-slate-900 dark:text-zinc-50">
              {dayLabel(hovered.timeISO)} · {hourLabel(hovered.timeISO)}
            </div>
            <div className="numeric mt-1 text-slate-700 dark:text-zinc-200">
              {formatTempC(hovered.tempC)} {formatSpreadC(hovered.tempSpreadC)}
            </div>
            <div className="numeric mt-1 grid grid-cols-[auto_1fr] gap-x-2 text-slate-500 dark:text-zinc-400">
              {modelValues.map(({ modelId, tempC }) => (
                <div key={modelId} className="contents">
                  <span>{getForecastViewLabel(modelId)}</span>
                  <span className="text-right">{formatTempC(tempC)}</span>
                </div>
              ))}
              <span>Pluie</span>
              <span className="text-right">
                {formatPercent(hovered.precipProbabilityPct)}
                {hovered.precipMm !== undefined && hovered.precipMm >= 0.1 ? ` · ${formatMm(hovered.precipMm)}` : ""}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
