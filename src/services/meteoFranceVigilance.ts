import { FRENCH_DEPARTMENT_NAMES } from "@/utils/department";

export type VigilanceRiskId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type VigilanceLevelId = 1 | 2 | 3 | 4;

export type VigilanceDepartment = {
  code: string;
  overallLevel: VigilanceLevelId;
  risks: Partial<Record<VigilanceRiskId, VigilanceLevelId>>;
};

export type VigilancePeriod = {
  id: string;
  label: string;
  beginISO?: string;
  endISO?: string;
  summaryText: string;
  departments: VigilanceDepartment[];
};

export type VigilanceSnapshot = {
  updatedAtISO: string;
  periods: VigilancePeriod[];
  sourceUrl: string;
};

export type VigilanceNationalCardDocument = {
  blob: Blob;
  filename?: string;
  contentType: string;
  updatedAtISO: string;
  sourceUrl: string;
};

export type MeteoFranceBulletinSection = {
  title?: string;
  lines: string[];
};

export type MeteoFranceDepartmentBulletin = {
  domainId: string;
  domainName: string;
  blocTitle: string;
  typeName: string;
  hazardName?: string;
  termName?: string;
  startISO?: string;
  endISO?: string;
  riskName?: string;
  updatedAtISO: string;
  sections: MeteoFranceBulletinSection[];
};

// Le navigateur n'appelle jamais Meteo-France directement : la cle vit cote
// serveur, derriere ce proxy (vite.config.ts en dev, api/meteofrance/ en prod).
const PROXY_BASE_URL = "/api/meteofrance";
const DEFAULT_SOURCE_URL = "https://vigilance.meteofrance.fr/fr";

export const VIGILANCE_RISK_LABELS: Record<VigilanceRiskId, string> = {
  1: "Vent",
  2: "Pluie-inondation",
  3: "Orages",
  4: "Crues",
  5: "Neige-verglas",
  6: "Canicule",
  7: "Grand froid",
  8: "Avalanches",
  9: "Vagues-submersion",
};

export const VIGILANCE_LEVEL_LABELS: Record<VigilanceLevelId, string> = {
  1: "Vert",
  2: "Jaune",
  3: "Orange",
  4: "Rouge",
};

function normalizeDepartmentCode(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim().toUpperCase();
    if (/^\d+$/.test(trimmed)) {
      return trimmed.length >= 3 ? trimmed : trimmed.padStart(2, "0");
    }
    return trimmed;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const raw = String(Math.trunc(value));
    return raw.length >= 3 ? raw : raw.padStart(2, "0");
  }

  return null;
}

function normalizeLevel(value: unknown): VigilanceLevelId {
  if (value === 2 || value === 3 || value === 4) return value;
  return 1;
}

function withTimeout(timeoutMs: number, signal?: AbortSignal) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timeout);
        controller.abort();
      },
      { once: true },
    );
  }

  return {
    signal: controller.signal,
    cancel() {
      window.clearTimeout(timeout);
    },
  };
}

function getConfiguredBaseUrl() {
  return PROXY_BASE_URL;
}

/**
 * Le proxy renvoie ses erreurs en JSON ({ error }). On les remonte telles
 * quelles pour distinguer une cle mal configuree d'une panne Meteo-France.
 */
async function describeFailure(response: Response, fallback: string) {
  try {
    const body = (await response.clone().json()) as { error?: unknown };
    if (typeof body.error === "string" && body.error.trim()) return body.error.trim();
  } catch {
    // Reponse non JSON (page d'erreur HTML, PDF tronque...) : on garde le fallback.
  }
  return `${fallback} (${response.status}).`;
}

function normalizeFreeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Les bulletins citent les départements sous la forme « Alpes-Maritimes (06) ».
 * Seul le code entre parenthèses est recherché : un code nu confondrait « 06 »
 * avec « 06:00 » ou « le 06 octobre ».
 */
function codeMatcher(departmentCode: string) {
  return new RegExp(`\\(\\s*${escapeRegExp(departmentCode)}\\s*\\)`);
}

/**
 * Nom complet, sensible à la casse, et borné par autre chose qu'une lettre ou
 * un trait d'union : « Nord » ne doit pas matcher « vent de nord » ni
 * « Nord-Est », « Loire » ne doit pas matcher « Haute-Loire ».
 */
function nameMatcher(departmentCode: string) {
  const name = FRENCH_DEPARTMENT_NAMES[departmentCode];
  if (!name) return null;
  return new RegExp(`(?<![\\p{L}'’-])${escapeRegExp(name)}(?![\\p{L}'’-])`, "u");
}

export function parsePeriods(data: Record<string, unknown>): VigilancePeriod[] {
  const product = typeof data.product === "object" && data.product ? (data.product as Record<string, unknown>) : null;
  const periods = Array.isArray(product?.periods) ? (product?.periods as unknown[]) : [];

  return periods
    .map((period, index) => {
      const obj = typeof period === "object" && period ? (period as Record<string, unknown>) : null;
      if (!obj) return null;

      const timelaps = typeof obj.timelaps === "object" && obj.timelaps ? (obj.timelaps as Record<string, unknown>) : null;
      const domainIds = Array.isArray(timelaps?.domain_ids) ? (timelaps?.domain_ids as unknown[]) : [];
      const textItems = typeof obj.text_items === "object" && obj.text_items ? (obj.text_items as Record<string, unknown>) : null;
      const summaryLines = Array.isArray(textItems?.text) ? (textItems?.text as unknown[]) : [];

      const departments: VigilanceDepartment[] = domainIds
        .map((domain) => {
          const domainObj = typeof domain === "object" && domain ? (domain as Record<string, unknown>) : null;
          if (!domainObj) return null;

          const code = normalizeDepartmentCode(domainObj.domain_id);
          if (!code) return null;

          const phenomenonItems = Array.isArray(domainObj.phenomenon_items) ? (domainObj.phenomenon_items as unknown[]) : [];
          const risks = phenomenonItems.reduce<Partial<Record<VigilanceRiskId, VigilanceLevelId>>>((acc, item) => {
            const riskObj = typeof item === "object" && item ? (item as Record<string, unknown>) : null;
            if (!riskObj) return acc;

            const riskId = typeof riskObj.phenomenon_id === "number" ? riskObj.phenomenon_id : Number(riskObj.phenomenon_id);
            if (!Number.isInteger(riskId) || riskId < 1 || riskId > 9) return acc;

            acc[riskId as VigilanceRiskId] = normalizeLevel(riskObj.phenomenon_max_color_id);
            return acc;
          }, {});

          return {
            code,
            overallLevel: normalizeLevel(domainObj.max_color_id),
            risks,
          } satisfies VigilanceDepartment;
        })
        .filter((item): item is VigilanceDepartment => Boolean(item));

      // Météo-France nomme ses échéances « J » et « J1 » (aujourd'hui, demain).
      const echeance = typeof obj.echeance === "string" ? obj.echeance.trim().toUpperCase() : "";
      const position = echeance === "J" ? 0 : echeance === "J1" ? 1 : index;
      const label = position === 0 ? "Aujourd'hui" : position === 1 ? "Demain" : `Période ${index + 1}`;

      const parsed: VigilancePeriod = {
        id: echeance || `P${index}`,
        label,
        beginISO: typeof obj.begin_validity_time === "string" ? obj.begin_validity_time : undefined,
        endISO: typeof obj.end_validity_time === "string" ? obj.end_validity_time : undefined,
        summaryText: summaryLines.filter((line): line is string => typeof line === "string").join(" "),
        departments,
      };
      return { period: parsed, position };
    })
    .filter((entry): entry is { period: VigilancePeriod; position: number } => Boolean(entry))
    // Aujourd'hui d'abord, puis demain, quel que soit l'ordre de la réponse.
    .sort((a, b) => a.position - b.position)
    .map((entry) => entry.period);
}

type BulletinCandidate = { bulletin: MeteoFranceDepartmentBulletin; searchLines: string[] };

function parseBulletinCandidates(data: Record<string, unknown>): BulletinCandidate[] {
  const product = typeof data.product === "object" && data.product ? (data.product as Record<string, unknown>) : null;
  const updatedAtISO = typeof product?.update_time === "string" ? product.update_time : new Date().toISOString();
  const textBlocItems = Array.isArray(product?.text_bloc_items) ? (product.text_bloc_items as unknown[]) : [];
  const candidates: BulletinCandidate[] = [];

  for (const bloc of textBlocItems) {
    const blocObject = typeof bloc === "object" && bloc ? (bloc as Record<string, unknown>) : null;
    if (!blocObject) continue;

    const domainId = typeof blocObject.domain_id === "string" ? blocObject.domain_id : "";
    if (!domainId || domainId === "FRA") continue;

    const blocTitle = typeof blocObject.bloc_title === "string" ? blocObject.bloc_title : "Bulletin vigilance";
    const domainName = typeof blocObject.domain_name === "string" ? blocObject.domain_name : "Zone";
    const blocItems = Array.isArray(blocObject.bloc_items) ? (blocObject.bloc_items as unknown[]) : [];

    for (const blocItem of blocItems) {
      const blocItemObject = typeof blocItem === "object" && blocItem ? (blocItem as Record<string, unknown>) : null;
      if (!blocItemObject) continue;

      const typeName = typeof blocItemObject.type_name === "string" ? blocItemObject.type_name : "Suivi de vigilance";
      const textItems = Array.isArray(blocItemObject.text_items) ? (blocItemObject.text_items as unknown[]) : [];

      for (const textItem of textItems) {
        const textItemObject = typeof textItem === "object" && textItem ? (textItem as Record<string, unknown>) : null;
        if (!textItemObject) continue;

        const hazardName = typeof textItemObject.hazard_name === "string" ? textItemObject.hazard_name : undefined;
        const termItems = Array.isArray(textItemObject.term_items) ? (textItemObject.term_items as unknown[]) : [];

        for (const term of termItems) {
          const termObject = typeof term === "object" && term ? (term as Record<string, unknown>) : null;
          if (!termObject) continue;

          const subdivisionText = Array.isArray(termObject.subdivision_text) ? (termObject.subdivision_text as unknown[]) : [];
          const sections: MeteoFranceBulletinSection[] = subdivisionText
            .map((entry) => {
              const sectionObject = typeof entry === "object" && entry ? (entry as Record<string, unknown>) : null;
              if (!sectionObject) return null;

              const titleParts = [sectionObject.bold_text, sectionObject.underline_text].filter(
                (part): part is string => typeof part === "string" && part.trim().length > 0,
              );
              const textLines = Array.isArray(sectionObject.text) ? (sectionObject.text as unknown[]) : [];
              const lines = textLines
                .filter((line): line is string => typeof line === "string")
                .map((line) => normalizeFreeText(line))
                .filter(Boolean);

              if (!titleParts.length && !lines.length) return null;

              return {
                title: titleParts.length ? normalizeFreeText(titleParts.join(" ")) : undefined,
                lines,
              } satisfies MeteoFranceBulletinSection;
            })
            .filter((item): item is NonNullable<typeof item> => Boolean(item));

          candidates.push({
            bulletin: {
              domainId,
              domainName,
              blocTitle,
              typeName,
              hazardName,
              termName: typeof termObject.term_names === "string" ? termObject.term_names : undefined,
              startISO: typeof termObject.start_time === "string" ? termObject.start_time : undefined,
              endISO: typeof termObject.end_time === "string" ? termObject.end_time : undefined,
              riskName: typeof termObject.risk_name === "string" ? termObject.risk_name : undefined,
              updatedAtISO,
              sections,
            },
            searchLines: sections.flatMap((section) => [section.title ?? "", ...section.lines]),
          });
        }
      }
    }
  }

  return candidates;
}

/**
 * Cherche dans la réponse de textesvigilance/encours le bulletin qui concerne
 * le département. Deux passes : d'abord le code « (06) », qui est non ambigu ;
 * le nom seul n'est tenté qu'ensuite, car beaucoup de départements portent le
 * nom d'une rivière (Loire, Rhône, Marne…) que les bulletins de crue citent.
 */
export function findDepartmentBulletin(data: Record<string, unknown>, departmentCode: string): MeteoFranceDepartmentBulletin | null {
  const code = departmentCode.trim().toUpperCase();
  if (!code) return null;

  const candidates = parseBulletinCandidates(data);
  const byName = nameMatcher(code);
  const matchers = [codeMatcher(code), ...(byName ? [byName] : [])];

  for (const matcher of matchers) {
    const found = candidates.find((candidate) => candidate.searchLines.some((line) => matcher.test(line)));
    if (found) return found.bulletin;
  }

  return null;
}

export async function fetchMeteoFranceDepartmentBulletin(
  departmentCode: string,
  options?: { signal?: AbortSignal },
): Promise<MeteoFranceDepartmentBulletin | null> {
  if (!departmentCode.trim()) return null;

  const { signal, cancel } = withTimeout(16000, options?.signal);

  try {
    const response = await fetch(`${getConfiguredBaseUrl()}/textesvigilance/encours`, {
      signal,
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    // Sans vigilance en cours (carte toute verte), Météo-France n'a aucun
    // texte à publier et répond 404 « no matching blob » : ce n'est pas une panne.
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(await describeFailure(response, "Récupération des textes de vigilance impossible"));
    }

    const data = (await response.json()) as Record<string, unknown>;
    return findDepartmentBulletin(data, departmentCode);
  } finally {
    cancel();
  }
}

/**
 * Vigilance d'un département pour une période. Les départements côtiers ont
 * un second domaine, suffixé « 10 » (0610 pour le littoral des
 * Alpes-Maritimes), qui porte le risque vagues-submersion : il est fusionné
 * avec le département, en gardant pour chaque risque le niveau le plus élevé.
 */
export function getDepartmentVigilance(period: VigilancePeriod, departmentCode: string): VigilanceDepartment | null {
  const code = departmentCode.trim().toUpperCase();
  const domains = period.departments.filter((department) => department.code === code || department.code === `${code}10`);
  if (!domains.length) return null;

  const risks: VigilanceDepartment["risks"] = {};
  for (const domain of domains) {
    for (const [riskId, level] of Object.entries(domain.risks) as Array<[string, VigilanceLevelId]>) {
      const id = Number(riskId) as VigilanceRiskId;
      risks[id] = Math.max(risks[id] ?? 1, level) as VigilanceLevelId;
    }
  }

  return {
    code,
    overallLevel: Math.max(...domains.map((domain) => domain.overallLevel)) as VigilanceLevelId,
    risks,
  };
}

export async function fetchMeteoFranceVigilance(options?: { signal?: AbortSignal }): Promise<VigilanceSnapshot> {
  const { signal, cancel } = withTimeout(16000, options?.signal);

  try {
    const response = await fetch(`${getConfiguredBaseUrl()}/cartevigilance/encours`, {
      signal,
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(await describeFailure(response, "Récupération des vigilances impossible"));
    }

    const data = (await response.json()) as Record<string, unknown>;
    const periods = parsePeriods(data);
    const product = typeof data.product === "object" && data.product ? (data.product as Record<string, unknown>) : null;

    return {
      updatedAtISO: typeof product?.update_time === "string" ? product.update_time : new Date().toISOString(),
      periods,
      sourceUrl: DEFAULT_SOURCE_URL,
    };
  } finally {
    cancel();
  }
}

export async function fetchMeteoFranceNationalCardDocument(options?: { signal?: AbortSignal }): Promise<VigilanceNationalCardDocument> {
  const { signal, cancel } = withTimeout(20000, options?.signal);

  try {
    const response = await fetch(`${getConfiguredBaseUrl()}/cartenationale/encours`, {
      signal,
      cache: "no-store",
      headers: {
        Accept: "*/*",
      },
    });

    if (!response.ok) {
      throw new Error(await describeFailure(response, "Récupération de la carte nationale impossible"));
    }

    const blob = await response.blob();
    const contentType = response.headers.get("content-type") ?? "application/pdf";
    const disposition = response.headers.get("content-disposition") ?? "";
    const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);

    return {
      blob,
      filename: filenameMatch?.[1],
      contentType,
      updatedAtISO: new Date().toISOString(),
      sourceUrl: DEFAULT_SOURCE_URL,
    };
  } finally {
    cancel();
  }
}
