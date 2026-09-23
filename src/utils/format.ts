export function formatTempC(value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) return "—";
  return `${Math.round(value)}°`;
}

export function formatPercent(value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) return "—";
  return `${Math.round(value)}%`;
}

export function formatWindKph(value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) return "—";
  return `${Math.round(value)} km/h`;
}

/** Cumul de pluie : une décimale, virgule française ; les traces comptent pour 0. */
export function formatMm(value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) return "—";
  if (value < 0.1) return "0 mm";
  return `${(Math.round(value * 10) / 10).toString().replace(".", ",")} mm`;
}

export function formatUv(value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(1).replace(".", ",");
}

export function formatDayShort(dateISO: string) {
  const d = new Date(`${dateISO}T00:00:00`);
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(d);
}

export function formatDayLong(dateISO: string) {
  const d = new Date(`${dateISO}T00:00:00`);
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "2-digit", month: "short" }).format(d);
}

export function formatTimeHHmmFromISODateTime(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(d);
}

export function formatTimeHHmm(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(date);
}
