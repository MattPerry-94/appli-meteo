import { CloudRain, Umbrella } from "lucide-react";
import { cn } from "@/lib/utils";
import { rainIntensity, summarizeNextHour, type RainIntensity, type RainSlot } from "@/utils/nextHourRain";
import { formatMm } from "@/utils/format";

/** Opacité de la pluie par intensité : une seule teinte, du clair au foncé. */
const INTENSITY_OPACITY: Record<RainIntensity, number> = {
  sèche: 0,
  faible: 0.35,
  modérée: 0.65,
  forte: 1,
};

/** Pluie dans l'heure : phrase de synthèse et frise des quarts d'heure. */
export function NextHourRain(props: { slots: RainSlot[] | null; fine: boolean; className?: string }) {
  if (!props.slots?.length) return null;
  const summary = summarizeNextHour(props.slots);
  if (!summary) return null;
  const Icon = summary.raining ? Umbrella : CloudRain;

  return (
    <div className={cn("tile rounded-2xl p-3.5", props.className)}>
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-zinc-100">
        <Icon className="accent-ink size-4 shrink-0" aria-hidden="true" />
        <span>{summary.text}</span>
      </div>

      <div className="mt-3 grid grid-cols-5 gap-1" role="list" aria-label="Pluie par quart d'heure">
        {props.slots.map((slot, index) => {
          const intensity = rainIntensity(slot.mm);
          return (
            <div key={slot.timeISO} role="listitem" className="min-w-0 text-center">
              <div
                className="h-2.5 rounded-full bg-slate-900/[0.07] dark:bg-white/[0.08]"
                title={`${slot.timeISO.slice(11, 16)} : ${intensity === "sèche" ? "sec" : `${intensity}, ${formatMm(slot.mm)}`}`}
              >
                <div className="chart-rain-swatch h-full rounded-full" style={{ opacity: INTENSITY_OPACITY[intensity] }} />
              </div>
              <div className="numeric mt-1 text-[10px] text-slate-400 dark:text-zinc-500">
                {index === 0 ? "Maint." : slot.timeISO.slice(11, 16).replace(":", "h")}
              </div>
            </div>
          );
        })}
      </div>

      {!props.fine ? (
        <div className="mt-2 text-[11px] text-slate-400 dark:text-zinc-500">
          Hors France, les quarts d'heure sont interpolés depuis un modèle horaire : tendance indicative.
        </div>
      ) : null}
    </div>
  );
}
