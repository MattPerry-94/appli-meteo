import { useEffect, useState } from "react";
import { Check, Share2 } from "lucide-react";
import type { FavoriteCity } from "@/stores/appStore";
import { shareUrlFor } from "@/utils/cityUrl";

type ShareState = "idle" | "copied" | "manual";

/**
 * Sur écran tactile, la feuille de partage du système a du sens. Sur ordinateur
 * (Windows notamment), elle ouvre une fenêtre peu utile : on copie le lien.
 */
function prefersNativeShare() {
  return typeof navigator.share === "function" && window.matchMedia?.("(pointer: coarse)").matches === true;
}

/** Copie sans l'API presse-papiers, indisponible hors HTTPS (test sur le réseau local). */
function legacyCopy(text: string) {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

/**
 * Partage le lien de la ville : feuille de partage sur mobile, copie dans le
 * presse-papiers ailleurs, avec confirmation écrite ; en dernier recours le
 * lien s'affiche pour être copié à la main.
 */
export function ShareCityButton(props: { city: FavoriteCity }) {
  const [state, setState] = useState<ShareState>("idle");
  const url = shareUrlFor(props.city);

  useEffect(() => {
    if (state !== "copied") return;
    const timer = window.setTimeout(() => setState("idle"), 2500);
    return () => window.clearTimeout(timer);
  }, [state]);

  async function share() {
    if (prefersNativeShare()) {
      try {
        await navigator.share({ title: `Météo à ${props.city.name}`, url });
        return;
      } catch (error) {
        // Partage annulé par l'utilisateur : rien d'autre à faire.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
      return;
    } catch {
      // Presse-papiers refusé ou indisponible : on tente l'ancienne méthode.
    }
    setState(legacyCopy(url) ? "copied" : "manual");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={share}
        aria-label={`Partager la météo de ${props.city.name}`}
        title="Partager"
        className="btn btn-ghost gap-1.5 rounded-2xl px-2.5"
      >
        {state === "copied" ? <Check className="size-4 text-emerald-500" aria-hidden="true" /> : <Share2 className="size-4" aria-hidden="true" />}
        {state === "copied" ? <span className="text-xs font-semibold">Lien copié</span> : null}
      </button>
      <span className="sr-only" aria-live="polite">
        {state === "copied" ? "Lien copié" : ""}
      </span>
      {state === "manual" ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-2xl border border-black/10 bg-white p-3 shadow-lg dark:border-white/10 dark:bg-slate-900">
          <p className="text-xs font-semibold">Copiez ce lien :</p>
          <input
            readOnly
            value={url}
            autoFocus
            onFocus={(event) => event.currentTarget.select()}
            className="mt-2 w-full rounded-lg border border-black/10 bg-transparent px-2 py-1 text-xs dark:border-white/10"
          />
          <button type="button" onClick={() => setState("idle")} className="mt-2 text-xs font-semibold underline">
            Fermer
          </button>
        </div>
      ) : null}
    </div>
  );
}
