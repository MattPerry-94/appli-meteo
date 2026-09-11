import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

export function Card(props: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("surface surface-sheen rounded-3xl", props.className)}>{props.children}</div>
  );
}
