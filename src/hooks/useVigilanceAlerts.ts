import { useCallback, useEffect, useState } from "react";
import type { VigilanceSnapshot } from "@/services/meteoFranceVigilance";
import { readAlertPrefs, writeAlertPrefs } from "@/services/alertPrefs";
import { useAppStore, type FavoriteCity } from "@/stores/appStore";
import { shareUrlFor } from "@/utils/cityUrl";
import { vigilanceAlertFor } from "@/utils/vigilanceAlert";

export type AlertSupport = "ok" | "unsupported" | "denied";

/** Intervalle demandé au navigateur pour la vérification en arrière-plan (il peut l'allonger). */
const PERIODIC_SYNC_MIN_INTERVAL_MS = 60 * 60 * 1000;

function notificationSupport(): AlertSupport {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission === "denied" ? "denied" : "ok";
}

async function showNotification(title: string, body: string, url: string) {
  const options = { body, icon: "/icon-192.png", badge: "/icon-192.png", tag: "vigilance", data: { url } };
  const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
  if (registration) await registration.showNotification(title, options);
  else new Notification(title, options);
}

/**
 * Vérification en arrière-plan quand l'appli est installée (Chrome Android
 * surtout). Sans elle, l'alerte ne part que pendant que l'appli est ouverte,
 * même dans un onglet en arrière-plan.
 */
async function registerPeriodicCheck() {
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    const periodicSync = (registration as ServiceWorkerRegistration & { periodicSync?: { register: (tag: string, options: object) => Promise<void> } })
      ?.periodicSync;
    if (!periodicSync) return;
    const status = await navigator.permissions.query({ name: "periodic-background-sync" as PermissionName });
    if (status.state === "granted") await periodicSync.register("vigilance", { minInterval: PERIODIC_SYNC_MIN_INTERVAL_MS });
  } catch {
    // API absente ou refusée : l'alerte en page suffit.
  }
}

/**
 * Alerte de vigilance orange ou rouge pour le département de la ville
 * active, via une notification du système. Désactivée par défaut : elle
 * demande l'autorisation au premier clic.
 */
export function useVigilanceAlerts(snapshot: VigilanceSnapshot | null, departmentCode: string | null, city: FavoriteCity) {
  const enabled = useAppStore((s) => s.notifyVigilance);
  const setEnabled = useAppStore((s) => s.setNotifyVigilance);
  const [support, setSupport] = useState<AlertSupport>(notificationSupport);

  // Le service worker lit ces préférences pour ses vérifications en arrière-plan.
  useEffect(() => {
    void writeAlertPrefs({ enabled, departmentCode, cityName: city.name, url: shareUrlFor(city) });
    if (enabled) void registerPeriodicCheck();
  }, [enabled, departmentCode, city]);

  useEffect(() => {
    if (!enabled || !snapshot || !departmentCode || notificationSupport() !== "ok" || Notification.permission !== "granted") return;
    let cancelled = false;
    void (async () => {
      const prefs = await readAlertPrefs();
      const alert = vigilanceAlertFor(snapshot, departmentCode, prefs?.lastKey);
      if (!alert || cancelled) return;
      await writeAlertPrefs({ lastKey: alert.key });
      await showNotification(alert.title, alert.body, shareUrlFor(city));
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, snapshot, departmentCode, city]);

  const toggle = useCallback(async () => {
    if (enabled) {
      setEnabled(false);
      return;
    }
    if (notificationSupport() === "unsupported") return;
    const permission = await Notification.requestPermission();
    setSupport(permission === "denied" ? "denied" : "ok");
    if (permission === "granted") setEnabled(true);
  }, [enabled, setEnabled]);

  return { enabled, support, toggle };
}
