import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  error: "border-rose-500/25 bg-rose-500/10 text-rose-800 dark:border-rose-300/20 dark:text-rose-100",
  warning: "border-amber-500/25 bg-amber-400/10 text-amber-900 dark:border-amber-300/20 dark:text-amber-100",
};

/** Encart de message (erreur ou avertissement), avec icône d'alerte. */
export function Notice(props: { tone?: keyof typeof TONES; children: ReactNode; className?: string }) {
  const tone = props.tone ?? "error";
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex items-center gap-2.5 rounded-2xl border p-3.5 text-sm", TONES[tone], props.className)}
    >
      <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
      <span>{props.children}</span>
    </div>
  );
}
