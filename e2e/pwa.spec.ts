import type { Page } from "@playwright/test";
import type { RecordedEntry } from "./network";
import { expect, test } from "./test";

// Service worker actif : c'est lui qu'on teste ici.
test.use({ serviceWorkers: "allow" });
// Il s'enregistre à l'événement load, après le chargement complet de la page.
test.slow();

/** Attend que la page soit contrôlée par le service worker, sans recharger (première visite). */
async function waitForServiceWorker(page: Page) {
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), { timeout: 30_000 }).toBe(true);
}

/** Nombre de réponses enregistrées par le service worker, tous caches confondus. */
function cachedCount(page: Page, pattern: string) {
  return page.evaluate(async (needle) => {
    let count = 0;
    for (const name of await caches.keys()) {
      for (const request of await (await caches.open(name)).keys()) if (request.url.includes(needle)) count += 1;
    }
    return count;
  }, pattern);
}

test("dès la première visite, l'appli rouvre hors connexion avec les dernières prévisions", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.locator(".temp-gradient").first()).toHaveText(/\d+°/);
  await waitForServiceWorker(page);
  // Scripts et prévisions chargés avant l'activation du worker : il doit les avoir récupérés.
  await expect.poll(() => cachedCount(page, "/assets/"), { timeout: 30_000 }).toBeGreaterThan(0);
  await expect.poll(() => cachedCount(page, "//api.open-meteo.com/v1/forecast"), { timeout: 30_000 }).toBeGreaterThan(0);
  const temperature = await page.locator(".temp-gradient").first().textContent();

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByText(/^Hors connexion :/)).toBeVisible();
  await expect(page.locator(".temp-gradient").first()).toHaveText(temperature ?? "");
  await expect(page.getByText(/Données du|Mis à jour à/)).toBeVisible();
});

/** Carte de vigilance enregistrée, avec les Alpes-Maritimes passées en orange orages aujourd'hui. */
function withOrangeAlpesMaritimes(entry: RecordedEntry): RecordedEntry {
  const carte = JSON.parse(entry.body);
  for (const period of carte.product.periods) {
    if (period.echeance !== "J") continue;
    const domain = period.timelaps.domain_ids.find((item: { domain_id: string }) => item.domain_id === "06");
    domain.max_color_id = 3;
    const storms = domain.phenomenon_items.find((item: { phenomenon_id: string }) => item.phenomenon_id === "3");
    storms.phenomenon_max_color_id = 3;
  }
  return { ...entry, body: JSON.stringify(carte) };
}

test.describe("alerte de vigilance", () => {
  let orange = false;
  test.use({
    permissions: ["notifications"],
    replay: {
      override: (key, entry) => (orange && entry && key.endsWith("/cartevigilance/encours") ? withOrangeAlpesMaritimes(entry) : entry),
    },
  });

  test("une vigilance orange déclenche une seule notification", async ({ page }) => {
    orange = false;
    await page.goto("/");
    await waitForServiceWorker(page);

    await page.getByRole("button", { name: /M'alerter en cas de vigilance/ }).click();
    await expect(page.getByRole("button", { name: /Alerte active/ })).toBeVisible();

    const notifications = () =>
      page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        return (await registration!.getNotifications()).map((item) => ({ title: item.title, url: item.data?.url as string }));
      });
    expect(await notifications()).toEqual([]);

    orange = true;
    await page.reload();
    await expect.poll(notifications, { timeout: 30_000 }).toHaveLength(1);
    const [notification] = await notifications();
    expect(notification.title).toMatch(/orange/i);
    expect(notification.url).toContain("ville=");

    // Même épisode au rechargement suivant : pas de doublon.
    await page.reload();
    await page.waitForLoadState("networkidle");
    expect(await notifications()).toHaveLength(1);
  });
});
