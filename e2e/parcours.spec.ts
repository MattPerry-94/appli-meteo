import { expect, NICE_URL, test } from "./test";

test("l'accueil affiche la ville par défaut et toutes ses sections", async ({ page, networkMisses }) => {
  await page.goto("/");

  await expect(page.getByText("Ville active", { exact: true })).toBeVisible();
  await expect(page.getByText("Cagnes-sur-Mer").first()).toBeVisible();
  // Température actuelle chargée (le squelette a disparu).
  await expect(page.locator(".temp-gradient").first()).toHaveText(/-?\d+°/);
  await expect(page.getByText(/Mis à jour à \d\d:\d\d/)).toBeVisible();
  await expect(page.getByText(/Vigilance Météo-France/i)).toBeVisible();
  await expect(page.getByText("Température et pluie", { exact: true })).toBeVisible();
  await expect(page.getByText("Score des modèles", { exact: true })).toBeVisible();
  await expect(page.getByText("Qualité de l'air", { exact: true })).toBeVisible();
  await expect(page.getByText("Vagues et eau", { exact: true })).toBeVisible();
  await expect(page.getByText("Détails par heure", { exact: true })).toBeVisible();

  expect(networkMisses, "requêtes absentes de l'enregistrement : relancer npm run e2e:record").toEqual([]);
});

test("un lien partagé ouvre la ville qu'il contient", async ({ page }) => {
  await page.goto(NICE_URL);
  await expect(page.locator(".display.text-2xl").first()).toHaveText("Nice");
  await expect(page.getByRole("button", { name: "Ajouter Nice aux favoris" })).toBeVisible();
});

test("la recherche change la ville active et met à jour l'URL", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Rechercher une ville").fill("Nice");
  await page.getByRole("button", { name: /Afficher cette ville/ }).first().click();

  await expect(page.locator(".display.text-2xl").first()).toHaveText("Nice");
  await expect(page).toHaveURL(/ville=Nice/);
  await expect(page.getByLabel("Rechercher une ville")).toHaveValue("");
});

test("le bouton de partage copie le lien de la ville", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(NICE_URL);
  await page.getByRole("button", { name: "Partager la météo de Nice" }).click();

  await expect(page.getByText("Lien copié").first()).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("ville=Nice");
  expect(copied).toContain("lat=43.7034");
});

test("un favori apparaît dans la barre et survit au rechargement", async ({ page }) => {
  await page.goto(NICE_URL);
  await page.getByRole("button", { name: "Ajouter Nice aux favoris" }).click();

  const bar = page.getByRole("navigation", { name: "Villes favorites" });
  await expect(bar.getByRole("button", { name: /^Nice / })).toBeVisible();

  await page.goto("/");
  await expect(bar.getByRole("button", { name: /^Nice / })).toBeVisible();
  await bar.getByRole("button", { name: "Retirer Nice des favoris" }).click();
  await expect(bar).toHaveCount(0);
});

test("le thème sombre se choisit et se mémorise", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const html = page.locator("html");
  await expect(html).not.toHaveClass(/dark/);

  await page.getByRole("button", { name: /passer en thème sombre/ }).click();
  await expect(html).toHaveClass(/dark/);
  await page.reload();
  await expect(html).toHaveClass(/dark/);
});

test("la carte des vigilances affiche les départements et l'échéance de demain", async ({ page }) => {
  await page.goto("/carte?vue=vigilances");

  const map = page.getByRole("img", { name: /Carte des vigilances, aujourd'hui/i });
  await expect(map).toBeVisible();
  expect(await map.locator("path").count()).toBeGreaterThan(90);

  await page.getByRole("tab", { name: "Demain" }).click();
  await expect(page.getByRole("img", { name: /Carte des vigilances, demain/i })).toBeVisible();
  await expect(page.getByText("Alpes-Maritimes (06)", { exact: true })).toBeVisible();
});
