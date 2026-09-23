import { useEffect, useState } from "react";
import { Check, Share2 } from "lucide-react";
import type { FavoriteCity } from "@/stores/appStore";
import { shareUrlFor } from "@/utils/cityUrl";

/**
 * Partage le lien de la ville : feuille de partage du système sur mobile,
 * copie dans le presse-papiers ailleurs, avec confirmation visible.
 */
export function ShareCityButton(props: { city: FavoriteCity }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function share() {
    const url = shareUrlFor(props.city);
    const title = `Météo à ${props.city.name}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        // Partage annulé par l'utilisateur : rien d'autre à faire.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt("Copiez ce lien :", url);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-label={`Partager la météo de ${props.city.name}`}
      title={copied ? "Lien copié" : "Partager"}
      className="btn btn-ghost rounded-2xl px-2.5"
    >
      {copied ? <Check className="size-4 text-emerald-500" aria-hidden="true" /> : <Share2 className="size-4" aria-hidden="true" />}
      <span className="sr-only" aria-live="polite">
        {copied ? "Lien copié" : ""}
      </span>
    </button>
  );
}
