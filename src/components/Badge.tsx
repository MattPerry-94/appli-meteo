import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Tone = "zinc" | "sky" | "emerald" | "amber" | "orange" | "rose" | "red";

const toneClass: Record<Tone, string> = {
  zinc: "bg-slate-900/[0.055] text-slate-700 ring-slate-900/10 dark:bg-white/10 dark:text-zinc-200 dark:ring-white/15",
  sky: "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:bg-sky-400/15 dark:text-sky-200 dark:ring-sky-300/25",
  emerald:
    "bg-amber-400/15 text-amber-800 ring-amber-500/25 dark:bg-amber-400/15 dark:text-amber-200 dark:ring-amber-300/25",
  amber: "bg-amber-400/15 text-amber-800 ring-amber-500/25 dark:bg-amber-400/15 dark:text-amber-200 dark:ring-amber-300/25",
  orange:
    "bg-orange-400/15 text-orange-800 ring-orange-500/25 dark:bg-orange-400/15 dark:text-orange-200 dark:ring-orange-300/25",
  rose: "bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-rose-300/25",
  red: "bg-red-500/10 text-red-700 ring-red-500/20 dark:bg-red-500/15 dark:text-red-200 dark:ring-red-300/25",
};

export function Badge(props: { tone?: Tone; className?: string; children: ReactNode }) {
  const tone = props.tone ?? "zinc";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-tight ring-1 ring-inset backdrop-blur-sm",
        toneClass[tone],
        props.className,
      )}
    >
      {props.children}
    </span>
  );
}
