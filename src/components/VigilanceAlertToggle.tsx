import { Bell, BellOff, BellRing } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AlertSupport } from "@/hooks/useVigilanceAlerts";

/** Active ou coupe l'alerte de vigilance orange / rouge, en disant clairement son état. */
export function VigilanceAlertToggle(props: {
  enabled: boolean;
  support: AlertSupport;
  departmentCode: string | null;
  onToggle: () => void;
  className?: string;
}) {
  if (!props.departmentCode) return null;

  if (props.support === "unsupported") {
    return (
      <p className={cn("text-xs text-slate-400 dark:text-zinc-500", props.className)}>
        Ce navigateur ne permet pas les notifications : sur iPhone, ajoutez l'appli à l'écran d'accueil pour les activer.
      </p>
    );
  }

  if (props.support === "denied" && !props.enabled) {
    return (
      <p className={cn("flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400", props.className)}>
        <BellOff className="size-3.5 shrink-0" aria-hidden="true" />
        Notifications bloquées pour ce site : autorisez-les dans les réglages du navigateur pour recevoir les alertes.
      </p>
    );
  }

  const Icon = props.enabled ? BellRing : Bell;
  return (
    <button
      type="button"
      onClick={props.onToggle}
      aria-pressed={props.enabled}
      className={cn("btn btn-ghost w-full justify-start rounded-2xl text-left text-xs", props.className)}
    >
      <Icon className={cn("size-4 shrink-0", props.enabled && "accent-ink")} aria-hidden="true" />
      <span>
        {props.enabled
          ? `Alerte active : notification en cas de vigilance orange ou rouge (département ${props.departmentCode}).`
          : "M'alerter en cas de vigilance orange ou rouge"}
      </span>
    </button>
  );
}
