import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

export function Card(props: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white/80 ring-1 ring-slate-200/70 shadow-sm backdrop-blur-sm",
        "dark:bg-white/5 dark:ring-white/10 dark:shadow-none",
        props.className,
      )}
    >
      {props.children}
    </div>
  );
}
