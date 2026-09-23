/**
 * Heure courante de la ville, au format des séries Open-Meteo
 * (« 2026-09-23T14:00 », heure locale de la ville, sans fuseau). Le navigateur
 * peut être dans un autre fuseau que la ville affichée.
 */
export function cityNowHourISO(timezone: string, now: Date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:00`;
  } catch {
    // Fuseau inconnu du navigateur : on retombe sur l'heure locale.
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:00`;
  }
}
