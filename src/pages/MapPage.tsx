import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Cloud, CloudRain, RefreshCcw, ShieldAlert, Zap } from "lucide-react";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Notice } from "@/components/Notice";
import { cn } from "@/lib/utils";
import { VigilanceMap } from "@/components/VigilanceMap";
import { useVigilanceSnapshot } from "@/hooks/useVigilanceSnapshot";
import { inferDepartmentCode } from "@/utils/department";
import { useAppStore } from "@/stores/appStore";

type TabId = "radar" | "vigilances";
type RadarLayerId = "rain" | "clouds" | "storms";

function formatUpdatedAt(dateISO: string | null) {
  if (!dateISO) return null;

  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateISO));
}

function buildWindyEmbedUrl(params: { radarLayer: RadarLayerId; lat: number; lon: number }) {
  const overlayByLayer: Record<RadarLayerId, string> = {
    rain: "rain",
    clouds: "clouds",
    storms: "radar",
  };

  const search = new URLSearchParams({
    lat: params.lat.toFixed(3),
    lon: params.lon.toFixed(3),
    zoom: "6",
    level: "surface",
    overlay: overlayByLayer[params.radarLayer],
    type: "map",
    location: "coordinates",
    detailLat: params.lat.toFixed(3),
    detailLon: params.lon.toFixed(3),
    metricWind: "km/h",
    metricTemp: "C",
    radarRange: "-1",
  });

  return `https://embed.windy.com/embed2.html?${search.toString()}`;
}

function WindyEmbedMap(props: { radarLayer: RadarLayerId; lat: number; lon: number }) {
  const src = useMemo(
    () =>
      buildWindyEmbedUrl({
        radarLayer: props.radarLayer,
        lat: props.lat,
        lon: props.lon,
      }),
    [props.lat, props.lon, props.radarLayer],
  );

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[1.35rem] bg-white">
      <iframe
        key={src}
        src={src}
        title={`Carte ${props.radarLayer}`}
        className="h-full w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

export default function MapPage() {
  const activeCity = useAppStore((s) => s.activeCity);

  // L'onglet vit dans l'URL (/carte?vue=vigilances) : lien partageable, et le
  // bouton retour du navigateur revient à l'onglet précédent.
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: TabId = searchParams.get("vue") === "vigilances" ? "vigilances" : "radar";
  const setActiveTab = (tab: TabId) => setSearchParams(tab === "radar" ? {} : { vue: tab });
  const [radarLayer, setRadarLayer] = useState<RadarLayerId>("rain");

  const vigilance = useVigilanceSnapshot();
  const departmentCode = useMemo(() => inferDepartmentCode(activeCity), [activeCity]);

  const formattedUpdatedAt = formatUpdatedAt(vigilance.snapshot?.updatedAtISO ?? null);

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="eyebrow">Carte météo</div>
            <div className="display mt-1 text-2xl">Radar et vigilances</div>
            <div className="mt-2 text-sm text-slate-500 dark:text-zinc-400">
              Ville active : {activeCity.name}
              {activeCity.postalCode ? ` (${activeCity.postalCode})` : ""}
            </div>
          </div>

          <div role="tablist" aria-label="Vue de la carte" className="segment-group shrink-0">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "radar"}
              onClick={() => setActiveTab("radar")}
              className={cn("segment", activeTab === "radar" && "segment-active")}
            >
              <CloudRain className="size-4" />
              <span>Radar</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "vigilances"}
              onClick={() => setActiveTab("vigilances")}
              className={cn("segment", activeTab === "vigilances" && "segment-active")}
            >
              <ShieldAlert className="size-4" />
              <span>Vigilances</span>
            </button>
          </div>
        </div>
      </Card>

      {activeTab === "radar" ? (
        <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-5">
            <Card className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="eyebrow">Cartes météo</div>
                  <div className="display mt-1 text-2xl">Pluie, nuages, orages</div>
                </div>
                <Badge tone="sky" className="shrink-0">
                  Carte
                </Badge>
              </div>

              <div role="tablist" aria-label="Couche affichée" className="segment-group mt-4 grid w-full grid-cols-3">
                {[
                  { id: "rain" as const, label: "Pluie", icon: CloudRain },
                  { id: "clouds" as const, label: "Nuages", icon: Cloud },
                  { id: "storms" as const, label: "Orages", icon: Zap },
                ].map((layer) => {
                  const Icon = layer.icon;
                  return (
                    <button
                      key={layer.id}
                      type="button"
                      role="tab"
                      aria-selected={radarLayer === layer.id}
                      onClick={() => setRadarLayer(layer.id)}
                      className={cn("segment px-2 sm:px-3.5", radarLayer === layer.id && "segment-active")}
                    >
                      <Icon className="size-4" />
                      <span>{layer.label}</span>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="eyebrow">Zone suivie</div>
                  <div className="display mt-1 truncate text-2xl">{activeCity.name}</div>
                </div>
                <Badge tone="zinc" className="shrink-0">
                  Locale
                </Badge>
              </div>

              <div className="mt-4 grid gap-2.5 text-sm text-slate-600 dark:text-zinc-300">
                <div className="tile numeric rounded-2xl p-3.5">
                  Ville active : {activeCity.name}
                  {activeCity.postalCode ? ` (${activeCity.postalCode})` : ""} - {activeCity.lat.toFixed(4).replace(".", ",")} ;{" "}
                  {activeCity.lon.toFixed(4).replace(".", ",")}
                </div>

                <Notice tone="warning">La timeline et les heures de prévision se pilotent directement dans la carte.</Notice>
              </div>
            </Card>
          </div>

          <Card className="overflow-hidden p-2">
            <div className="relative h-[620px] overflow-hidden rounded-[1.35rem] shadow-inner">
              <WindyEmbedMap radarLayer={radarLayer} lat={activeCity.lat} lon={activeCity.lon} />
            </div>
          </Card>
        </div>
      ) : (
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="eyebrow">Vigilances Météo-France</div>
                <div className="display mt-1 text-2xl">Carte des vigilances</div>
                <div className="mt-2 text-sm text-slate-500 dark:text-zinc-400">
                  Niveaux officiels par département, d'après{" "}
                  <a href="https://vigilance.meteofrance.fr/fr" target="_blank" rel="noreferrer" className="accent-ink font-medium underline-offset-2 hover:underline">
                    vigilance.meteofrance.fr
                  </a>
                  .
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void vigilance.refresh();
                  }}
                  className="btn btn-ghost rounded-2xl"
                >
                  <RefreshCcw className={cn("accent-ink size-4", vigilance.isLoading && "animate-spin")} />
                  <span>Actualiser</span>
                </button>
              </div>
            </div>

            {formattedUpdatedAt ? (
              <div className="numeric mt-4 text-sm text-slate-500 dark:text-zinc-400">
                Mise à jour Météo-France : {formattedUpdatedAt}
              </div>
            ) : null}

            {vigilance.error ? (
              // Une carte déjà chargée reste affichée : l'erreur ne porte que sur l'actualisation.
              <Notice tone={vigilance.snapshot ? "warning" : "error"} className="mt-4">
                {vigilance.snapshot ? `Actualisation impossible, dernière carte connue affichée. ${vigilance.error}` : vigilance.error}
              </Notice>
            ) : null}
          </Card>

          <Card className="p-5">
            {vigilance.snapshot ? (
              <VigilanceMap snapshot={vigilance.snapshot} highlightCode={departmentCode} />
            ) : (
              <div className="tile rounded-2xl px-6 py-20 text-center text-sm text-slate-500 dark:text-zinc-400">
                {vigilance.isLoading ? "Chargement des vigilances…" : "Aucune carte de vigilance disponible pour le moment."}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
