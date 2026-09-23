import { Snowflake, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Prevention = { kind: "heat" | "cold"; title: string; lines: string[] };

const HEAT_THRESHOLD_C = 28;
const COLD_THRESHOLD_C = 12;

function getPrevention(tempC: number | undefined): Prevention | null {
  if (typeof tempC !== "number") return null;

  if (tempC >= HEAT_THRESHOLD_C) {
    return {
      kind: "heat",
      title: "Prévention chaleur",
      lines: [
        "Buvez régulièrement, même sans soif.",
        "Évitez les efforts aux heures les plus chaudes et privilégiez l'ombre.",
        "Couvrez-vous la tête et portez des vêtements légers.",
        "Fermez les volets en journée et aérez tôt le matin ou le soir.",
        "Prenez des nouvelles des personnes fragiles autour de vous.",
      ],
    };
  }

  if (tempC <= COLD_THRESHOLD_C) {
    return {
      kind: "cold",
      title: "Prévention froid",
      lines: [
        "Habillez-vous chaudement, en plusieurs couches.",
        "Protégez les extrémités (mains, tête, cou), surtout en cas de vent.",
        "Limitez l'exposition prolongée à l'extérieur et gardez-vous au sec.",
        "Pensez aux personnes fragiles et adaptez les activités des enfants.",
        "Vérifiez le chauffage et l'aération du logement.",
      ],
    };
  }

  return null;
}

/** Conseils de prévention chaleur / froid ; rien entre les deux seuils. */
export function PreventionCard(props: { tempC: number | undefined; className?: string }) {
  const prevention = getPrevention(props.tempC);
  if (!prevention) return null;

  const isHeat = prevention.kind === "heat";
  const Icon = isHeat ? Sun : Snowflake;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-2xl border p-4 text-sm",
        isHeat
          ? "border-amber-500/25 bg-amber-400/10 text-amber-900 dark:border-amber-300/20 dark:text-amber-100"
          : "border-sky-500/25 bg-sky-400/10 text-sky-900 dark:border-sky-300/20 dark:text-sky-100",
        props.className,
      )}
    >
      <div className="mt-0.5 shrink-0">
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <div className="font-semibold">{prevention.title}</div>
        <ul className="mt-2 space-y-1.5 text-sm leading-6 opacity-90">
          {prevention.lines.map((line) => (
            <li key={line} className="flex gap-2">
              <span className="mt-[0.6rem] size-1 shrink-0 rounded-full bg-current opacity-50" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
