export type RainviewerFrame = {
  time: number;
  path: string;
};

export type RainviewerRadarConfig = {
  host: string;
  frames: RainviewerFrame[];
};

export function buildRainviewerTileUrl(host: string, path: string) {
  const base = host.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}/256/{z}/{x}/{y}/2/1_1.png`;
}

export async function fetchRainviewerRadar(options?: { signal?: AbortSignal }): Promise<RainviewerRadarConfig | null> {
  const res = await fetch("https://api.rainviewer.com/public/weather-maps.json", { signal: options?.signal });
  if (!res.ok) return null;
  const data = (await res.json()) as Record<string, unknown>;

  const host = typeof data.host === "string" ? data.host : "https://tilecache.rainviewer.com";
  const radarObj = typeof data.radar === "object" && data.radar ? (data.radar as Record<string, unknown>) : null;
  const past = Array.isArray(radarObj?.past) ? (radarObj?.past as unknown[]) : [];

  const frames: RainviewerFrame[] = past
    .map((x) => {
      if (typeof x !== "object" || !x) return null;
      const obj = x as Record<string, unknown>;
      const time = typeof obj.time === "number" ? obj.time : null;
      const path = typeof obj.path === "string" ? obj.path : null;
      if (!time || !path) return null;
      return { time, path } satisfies RainviewerFrame;
    })
    .filter((f): f is RainviewerFrame => Boolean(f));

  if (!frames.length) return null;
  return { host, frames };
}

