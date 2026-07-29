import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import type { CityForecastBundle } from "@/services/openMeteo";
import { formatTempC, formatUv } from "@/utils/format";
import { getOpenMeteoVisual, getUvLevel } from "@/utils/weather";

function KindIcon(props: { kind: ReturnType<typeof getOpenMeteoVisual>["kind"] }) {
  const className = "size-4";
  if (props.kind === "clear") return <Sun className={className} />;
  if (props.kind === "rain") return <CloudRain className={className} />;
  if (props.kind === "snow") return <CloudSnow className={className} />;
  if (props.kind === "storm") return <CloudLightning className={className} />;
  if (props.kind === "fog") return <CloudFog className={className} />;
  return <Cloud className={className} />;
}

export function CityCard(props: { bundle: CityForecastBundle | null; selected?: boolean; onSelect?: () => void }) {
  const city = props.bundle?.city;
  const today = props.bundle?.daily?.[0];
  const current = props.bundle?.current;

  const visual = getOpenMeteoVisual(current?.weatherCode ?? today?.weatherCode);
  const uv = getUvLevel(today?.uvMax);

  return (
    <button type="button" onClick={props.onSelect} className="text-left">
      <Card
        className={cn(
          "h-full p-4 transition",
          "hover:bg-white hover:ring-slate-300/70",
          "dark:hover:bg-white/7 dark:hover:ring-white/20",
          props.selected && "bg-sky-500/10 ring-sky-200/70 dark:bg-white/10 dark:ring-white/25",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="break-words font-medium text-slate-900 dark:text-white">{city?.name ?? "—"}</div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-300">
              <span className="inline-flex items-center gap-1 text-slate-800 dark:text-zinc-200">
                <KindIcon kind={visual.kind} />
                <span className="truncate">{visual.label}</span>
              </span>
              {city?.postalCode ? <span className="text-slate-300 dark:text-zinc-500">•</span> : null}
              {city?.postalCode ? <span className="text-slate-500 dark:text-zinc-400">{city.postalCode}</span> : null}
              {city?.adminArea ? <span className="text-slate-300 dark:text-zinc-500">•</span> : null}
              {city?.adminArea ? <span className="text-slate-500 dark:text-zinc-400">{city.adminArea}</span> : null}
            </div>
          </div>

          <div className="text-right">
            <div className="font-serif text-3xl leading-none tracking-tight">{formatTempC(current?.tempC)}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
              <span className="text-slate-800 dark:text-zinc-200">{formatTempC(today?.tempMinC)}</span>
              <span className="px-1 text-slate-400 dark:text-zinc-600">→</span>
              <span className="text-slate-800 dark:text-zinc-200">{formatTempC(today?.tempMaxC)}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge tone={uv?.tone ?? "zinc"}>
            UV {formatUv(today?.uvMax)} {uv?.label ? `· ${uv.label}` : ""}
          </Badge>
          <Badge tone="sky">7 jours</Badge>
        </div>
      </Card>
    </button>
  );
}
