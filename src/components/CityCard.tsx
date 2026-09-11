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
  // Sans onSelect la carte n'est pas interactive : la rendre en <button>
  // donnerait un element focusable au clavier qui ne fait rien.
  const isInteractive = typeof props.onSelect === "function";
  const Wrapper = isInteractive ? "button" : "div";
  const city = props.bundle?.city;
  const today = props.bundle?.daily?.[0];
  const current = props.bundle?.current;

  const visual = getOpenMeteoVisual(current?.weatherCode ?? today?.weatherCode);
  const uv = getUvLevel(today?.uvMax);

  return (
    <Wrapper
      {...(isInteractive ? { type: "button" as const, onClick: props.onSelect, "aria-pressed": Boolean(props.selected) } : {})}
      className="block w-full text-left"
    >
      <Card
        className={cn(
          "h-full overflow-hidden p-5",
          isInteractive && "surface-hover",
          props.selected && "accent-edge accent-wash",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="break-words text-base font-semibold text-slate-900 dark:text-white">{city?.name ?? "—"}</div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-zinc-400">
              <span className="accent-ink inline-flex items-center gap-1.5 font-medium">
                <KindIcon kind={visual.kind} />
                <span className="truncate">{visual.label}</span>
              </span>
              {city?.postalCode ? <span className="text-slate-300 dark:text-zinc-600">•</span> : null}
              {city?.postalCode ? <span className="numeric">{city.postalCode}</span> : null}
              {city?.adminArea ? <span className="text-slate-300 dark:text-zinc-600">•</span> : null}
              {city?.adminArea ? <span>{city.adminArea}</span> : null}
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div className="display temp-gradient numeric text-5xl">
              {formatTempC(current?.tempC)}
            </div>
            <div className="numeric mt-1.5 text-xs text-slate-500 dark:text-zinc-400">
              <span className="font-semibold text-slate-700 dark:text-zinc-200">{formatTempC(today?.tempMinC)}</span>
              <span className="px-1 text-slate-300 dark:text-zinc-600">→</span>
              <span className="font-semibold text-slate-700 dark:text-zinc-200">{formatTempC(today?.tempMaxC)}</span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Badge tone={uv?.tone ?? "zinc"}>
            UV {formatUv(today?.uvMax)} {uv?.label ? `· ${uv.label}` : ""}
          </Badge>
          <Badge tone="sky">7 jours</Badge>
        </div>
      </Card>
    </Wrapper>
  );
}
