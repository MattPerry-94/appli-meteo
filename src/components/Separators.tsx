import { cn } from "@/lib/utils";

/**
 * Puce « • » entre deux informations : purement décorative, donc masquée aux
 * lecteurs d'écran (et exemptée du contraste minimal du texte).
 */
export function Dot(props: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("text-slate-300 dark:text-zinc-600", props.className)}>
      •
    </span>
  );
}

/** Flèche « → » d'une plage (min → max) : affichée pâle, lue « à ». */
export function RangeArrow(props: { className?: string }) {
  return (
    <>
      <span aria-hidden="true" className={cn("font-normal text-slate-300 dark:text-zinc-600", props.className)}>
        →
      </span>
      <span className="sr-only"> à </span>
    </>
  );
}
