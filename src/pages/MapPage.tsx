import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Cloud, CloudRain, RefreshCcw, ShieldAlert, Zap } from "lucide-react";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { cn } from "@/lib/utils";
import { fetchMeteoFranceNationalCardDocument } from "@/services/meteoFranceVigilance";
import { useAppStore } from "@/stores/appStore";

type TabId = "radar" | "vigilances";
type RadarLayerId = "rain" | "clouds" | "storms";

GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

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

type PdfPreviewPage = {
  pageNumber: number;
  dataUrl: string;
};

function PdfDocumentPreview(props: { src: string | null; title: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pages, setPages] = useState<PdfPreviewPage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    if (!props.src || !containerRef.current) return;

    let isActive = true;

    async function renderDocument() {
      setIsRendering(true);
      setError(null);
      setPages([]);

      try {
        const pdf = await getDocument({ url: props.src }).promise;
        const containerWidth = Math.max(containerRef.current.clientWidth - 16, 320);
        const nextPages: PdfPreviewPage[] = [];

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const initialViewport = page.getViewport({ scale: 1 });
          const scale = containerWidth / initialViewport.width;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (!context) {
            throw new Error("Canvas indisponible.");
          }

          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);

          const renderTask = page.render({ canvas, canvasContext: context, viewport }) as { promise: Promise<unknown> };
          await renderTask.promise;

          nextPages.push({
            pageNumber,
            dataUrl: canvas.toDataURL("image/png"),
          });
        }

        if (isActive) {
          setPages(nextPages);
          setIsRendering(false);
        }
      } catch (nextError) {
        if (isActive) {
          const message = nextError instanceof Error ? nextError.message : "Impossible d'afficher la carte officielle.";
          setError(message);
          setIsRendering(false);
        }
      }
    }

    void renderDocument();

    return () => {
      isActive = false;
    };
  }, [props.src]);

  return (
    <div ref={containerRef} className="rounded-[1.35rem] bg-white p-2">
      {pages.length > 0 ? (
        <div className="space-y-4">
          {pages.map((page) => (
            <img
              key={page.pageNumber}
              src={page.dataUrl}
              alt={`${props.title} - page ${page.pageNumber}`}
              className="mx-auto block w-full max-w-full rounded-xl"
            />
          ))}
        </div>
      ) : null}

      {isRendering ? <div className="py-6 text-center text-sm text-slate-500">Chargement de la carte officielle…</div> : null}

      {error ? <div className="py-6 text-center text-sm text-rose-600">{error}</div> : null}
    </div>
  );
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

  const [activeTab, setActiveTab] = useState<TabId>("radar");
  const [radarLayer, setRadarLayer] = useState<RadarLayerId>("rain");

  const [vigilanceUrl, setVigilanceUrl] = useState<string | null>(null);
  const [vigilanceUpdatedAt, setVigilanceUpdatedAt] = useState<string | null>(null);
  const [vigilanceError, setVigilanceError] = useState<string | null>(null);
  const [isLoadingVigilance, setIsLoadingVigilance] = useState(false);

  function refreshVigilance() {
    const controller = new AbortController();
    setIsLoadingVigilance(true);
    setVigilanceError(null);

    fetchMeteoFranceNationalCardDocument({ signal: controller.signal })
      .then((document) => {
        const nextUrl = URL.createObjectURL(document.blob);

        setVigilanceUrl((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return nextUrl;
        });
        setVigilanceUpdatedAt(document.updatedAtISO);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Impossible de charger la carte Météo-France.";
        setVigilanceError(message);
      })
      .finally(() => {
        setIsLoadingVigilance(false);
      });

    return controller;
  }

  useEffect(() => {
    if (activeTab !== "vigilances") return;
    const controller = refreshVigilance();
    return () => controller.abort();
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (vigilanceUrl) URL.revokeObjectURL(vigilanceUrl);
    };
  }, [vigilanceUrl]);

  const formattedUpdatedAt = formatUpdatedAt(vigilanceUpdatedAt);

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-sm text-slate-600 dark:text-zinc-300">Carte météo</div>
            <div className="mt-1 font-serif text-2xl tracking-tight">Radar et vigilances</div>
            <div className="mt-2 text-sm text-slate-500 dark:text-zinc-400">
              Ville active : {activeCity.name}
              {activeCity.postalCode ? ` (${activeCity.postalCode})` : ""}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("radar")}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ring-1 transition",
                activeTab === "radar"
                  ? "bg-sky-600 text-white ring-sky-600 shadow-sm"
                  : "bg-white/80 text-slate-800 ring-slate-200/70 hover:bg-white dark:bg-white/5 dark:text-zinc-200 dark:ring-white/10 dark:hover:bg-white/10",
              )}
            >
              <CloudRain className="size-4" />
              <span>Radar</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("vigilances")}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ring-1 transition",
                activeTab === "vigilances"
                  ? "bg-sky-600 text-white ring-sky-600 shadow-sm"
                  : "bg-white/80 text-slate-800 ring-slate-200/70 hover:bg-white dark:bg-white/5 dark:text-zinc-200 dark:ring-white/10 dark:hover:bg-white/10",
              )}
            >
              <ShieldAlert className="size-4" />
              <span>Vigilances</span>
            </button>
          </div>
        </div>
      </Card>

      {activeTab === "radar" ? (
        <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm text-slate-600 dark:text-zinc-300">Cartes météo</div>
                  <div className="mt-1 font-serif text-2xl tracking-tight">Pluie, nuages, orages</div>
                </div>
                <Badge tone="sky">Carte</Badge>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
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
                      onClick={() => setRadarLayer(layer.id)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ring-1 transition",
                        radarLayer === layer.id
                          ? "bg-sky-600 text-white ring-sky-600 shadow-sm"
                          : "bg-white/80 text-slate-800 ring-slate-200/70 hover:bg-white dark:bg-white/5 dark:text-zinc-200 dark:ring-white/10 dark:hover:bg-white/10",
                      )}
                    >
                      <Icon className="size-4" />
                      <span>{layer.label}</span>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm text-slate-600 dark:text-zinc-300">Zone suivie</div>
                  <div className="mt-1 font-serif text-2xl tracking-tight">{activeCity.name}</div>
                </div>
                <Badge tone="zinc">Locale</Badge>
              </div>

              <div className="mt-4 grid gap-3 text-sm text-slate-600 dark:text-zinc-300">
                <div className="rounded-2xl bg-white/70 p-3 ring-1 ring-slate-200/70 dark:bg-white/5 dark:ring-white/10">
                  Ville active : {activeCity.name}
                  {activeCity.postalCode ? ` (${activeCity.postalCode})` : ""} - {activeCity.lat.toFixed(4).replace(".", ",")} ;{" "}
                  {activeCity.lon.toFixed(4).replace(".", ",")}
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 p-3 text-amber-900 ring-1 ring-amber-200/70 dark:text-amber-100 dark:ring-amber-400/20">
                  <AlertTriangle className="size-4" />
                  <span>La timeline et les heures de prévision se pilotent directement dans la carte.</span>
                </div>
              </div>
            </Card>
          </div>

          <Card className="overflow-hidden p-2">
            <div className="relative h-[620px] overflow-hidden rounded-[1.35rem]">
              <WindyEmbedMap radarLayer={radarLayer} lat={activeCity.lat} lon={activeCity.lon} />
            </div>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-sm text-slate-600 dark:text-zinc-300">Vigilances Météo-France</div>
                <div className="mt-1 font-serif text-2xl tracking-tight">Carte nationale officielle</div>
                <div className="mt-2 text-sm text-slate-500 dark:text-zinc-400">Vigilances officielles pour la France.</div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    refreshVigilance();
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2 text-sm font-medium text-slate-800 ring-1 ring-slate-200/70 shadow-sm transition hover:bg-white dark:bg-white/5 dark:text-zinc-200 dark:ring-white/10 dark:shadow-none dark:hover:bg-white/10"
                >
                  <RefreshCcw className="size-4" />
                  <span>Actualiser</span>
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-zinc-400">
              {formattedUpdatedAt ? <span>Dernière récupération : {formattedUpdatedAt}</span> : null}
            </div>

            {vigilanceError ? (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-900 ring-1 ring-rose-200/70 dark:text-rose-100 dark:ring-rose-400/20">
                <AlertTriangle className="size-4" />
                <span>{vigilanceError}</span>
              </div>
            ) : null}
          </Card>

          <Card className="overflow-hidden p-2">
            {vigilanceUrl ? (
              <PdfDocumentPreview src={vigilanceUrl} title="Carte nationale vigilance Météo-France" />
            ) : (
              <div className="rounded-[1.35rem] bg-white px-6 py-16 text-center text-sm text-slate-500 dark:text-zinc-400">
                {isLoadingVigilance ? "Chargement de la carte officielle…" : "Aucune carte vigilance disponible pour le moment."}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
