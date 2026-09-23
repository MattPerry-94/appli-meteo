import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeatherVisual } from "@/utils/weather";

const ICON_BY_KIND = {
  clear: Sun,
  clouds: Cloud,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
  fog: CloudFog,
} satisfies Record<WeatherVisual["kind"], typeof Sun>;

/** Pictogramme d'un type de temps (voir getOpenMeteoVisual). */
export function WeatherIcon(props: { kind: WeatherVisual["kind"]; className?: string }) {
  const Icon = ICON_BY_KIND[props.kind] ?? Cloud;
  return <Icon className={cn("size-4", props.className)} aria-hidden="true" />;
}
