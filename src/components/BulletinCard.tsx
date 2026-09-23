import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import type { MeteoFranceDepartmentBulletin } from "@/services/meteoFranceVigilance";

function formatBulletinDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

/** Bulletin de vigilance Météo-France du département de la ville active. */
export function BulletinCard(props: { bulletin: MeteoFranceDepartmentBulletin | null; departmentCode: string | null }) {
  const { bulletin } = props;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="eyebrow">Bulletin Météo-France</div>
          <div className="display mt-1 break-words text-2xl">{bulletin ? bulletin.domainName : "Chargement du bulletin…"}</div>
        </div>

        {bulletin?.riskName ? (
          <Badge tone="amber" className="shrink-0">
            {bulletin.riskName}
          </Badge>
        ) : null}
      </div>

      {bulletin ? (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
            <span>{bulletin.blocTitle}</span>
            <span className="text-slate-300 dark:text-zinc-700">•</span>
            <span>{bulletin.typeName}</span>
            {bulletin.termName ? (
              <>
                <span className="text-slate-300 dark:text-zinc-700">•</span>
                <span>{bulletin.termName}</span>
              </>
            ) : null}
          </div>

          {bulletin.startISO || bulletin.endISO ? (
            <div className="tile numeric rounded-2xl p-3.5 text-sm text-slate-600 dark:text-zinc-300">
              {bulletin.startISO ? `Début : ${formatBulletinDate(bulletin.startISO)}` : null}
              {bulletin.startISO && bulletin.endISO ? " • " : null}
              {bulletin.endISO ? `Fin : ${formatBulletinDate(bulletin.endISO)}` : null}
            </div>
          ) : null}

          <div className="space-y-2.5">
            {bulletin.sections.map((section, index) => (
              <div key={`${section.title ?? "section"}-${index}`} className="tile rounded-2xl p-4">
                {section.title ? <div className="mb-2 text-sm font-bold text-slate-900 dark:text-zinc-50">{section.title}</div> : null}
                <div className="space-y-2 text-sm leading-6 text-slate-600 dark:text-zinc-300">
                  {section.lines.map((line, lineIndex) => (
                    <p key={`${index}-${lineIndex}`}>{line}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="tile mt-5 rounded-2xl p-4 text-sm text-slate-600 dark:text-zinc-300">
          Recherche du bulletin zonal ou régional correspondant au département {props.departmentCode}…
        </div>
      )}
    </Card>
  );
}
