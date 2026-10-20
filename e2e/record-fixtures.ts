/**
 * Enregistre les réponses réseau rejouées par les tests de bout en bout.
 *
 *   npm run dev -- --port 5199     (avec METEOFRANCE_API_KEY dans .env)
 *   npm run e2e:record
 *
 * À relancer quand une API change de format. Les tests figent l'horloge sur
 * l'heure d'enregistrement : les données restent cohérentes avec « maintenant ».
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { chromium } from "@playwright/test";
import { FIXTURE_PATH, isRecordedUrl, keyFor, type RecordedEntry, type Recording } from "./network.ts";

const BASE = process.env.RECORD_BASE ?? "http://localhost:5199";
const TIMEZONE = "Europe/Paris";

const browser = await chromium.launch();
const context = await browser.newContext({ timezoneId: TIMEZONE, locale: "fr-FR", serviceWorkers: "block" });
const entries = new Map<string, RecordedEntry>();
const recordedAt = new Date().toISOString();

context.on("response", async (response) => {
  const url = response.url();
  if (!isRecordedUrl(url) || response.request().method() !== "GET") return;
  try {
    const body = await response.text();
    entries.set(keyFor(url), {
      key: keyFor(url),
      status: response.status(),
      contentType: response.headers()["content-type"] ?? "application/json",
      body,
    });
  } catch {
    // Réponse sans corps (redirection) : ignorée.
  }
});

const page = await context.newPage();
const settle = () => page.waitForLoadState("networkidle").then(() => page.waitForTimeout(1500));

// Parcours couverts par les tests : ville par défaut, ville par l'URL, recherche, carte.
await page.goto(`${BASE}/`);
await settle();
await page.goto(`${BASE}/?ville=Nice&lat=43.7034&lon=7.2663&cp=06000&dep=06&pays=FR`);
await settle();
await page.goto(`${BASE}/`);
await settle();
await page.getByLabel("Rechercher une ville").fill("Nice");
await settle();
await page.goto(`${BASE}/carte?vue=vigilances`);
await settle();
await page.getByRole("tab", { name: "Demain" }).click();
await settle();

await browser.close();

const failed = [...entries.values()].filter((entry) => entry.status >= 400);
if (failed.length) {
  console.error("Réponses en erreur, enregistrement annulé :", failed.map((entry) => `${entry.status} ${entry.key}`));
  process.exit(1);
}
const recording: Recording = { recordedAt, timezone: TIMEZONE, entries: [...entries.values()].sort((a, b) => a.key.localeCompare(b.key)) };
mkdirSync(dirname(FIXTURE_PATH), { recursive: true });
writeFileSync(FIXTURE_PATH, `${JSON.stringify(recording, null, 1)}\n`);
console.log(`${recording.entries.length} réponses enregistrées (${recordedAt}) :`);
for (const entry of recording.entries) console.log(`  ${entry.status} ${entry.key.slice(0, 110)}`);
