import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Bandeau affiché sans connexion : les données visibles sont alors les
 * dernières enregistrées par le service worker, pas des valeurs fraîches.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && navigator.onLine === false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="mt-3 flex items-center gap-2.5 rounded-2xl border border-amber-500/25 bg-amber-400/10 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-300/20 dark:text-amber-100"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden="true" />
      Hors connexion : dernières prévisions enregistrées sur cet appareil. Elles se mettront à jour au retour du réseau.
    </div>
  );
}
