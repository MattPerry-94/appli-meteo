import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Tone = "zinc" | "sky" | "emerald" | "amber" | "orange" | "rose" | "red";

const toneClass: Record<Tone, string> = {
  zinc: "bg-slate-900/5 text-slate-700 ring-slate-200/70 dark:bg-white/10 dark:text-zinc-200 dark:ring-white/10",
  sky: "bg-sky-500/10 text-sky-800 ring-sky-200/70 dark:bg-sky-500/15 dark:text-sky-100 dark:ring-sky-400/20",
  emerald:
    "bg-amber-400/12 text-amber-900 ring-amber-200/80 dark:bg-amber-400/15 dark:text-amber-100 dark:ring-amber-300/20",
  amber: "bg-amber-400/12 text-amber-900 ring-amber-200/80 dark:bg-amber-400/15 dark:text-amber-100 dark:ring-amber-300/20",
  orange:
    "bg-orange-400/12 text-orange-900 ring-orange-200/80 dark:bg-orange-400/15 dark:text-orange-100 dark:ring-orange-300/20",
  rose: "bg-rose-500/10 text-rose-900 ring-rose-200/70 dark:bg-rose-500/15 dark:text-rose-100 dark:ring-rose-400/20",
  red: "bg-red-500/10 text-red-900 ring-red-200/70 dark:bg-red-500/15 dark:text-red-100 dark:ring-red-400/20",
};

export function Badge(props: { tone?: Tone; className?: string; children: ReactNode }) {
  const tone = props.tone ?? "zinc";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1",
        toneClass[tone],
        props.className,
      )}
    >
      {props.children}
    </span>
  );
}
