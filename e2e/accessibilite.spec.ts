import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { findLowContrastText } from "./contrast";
import { expect, test } from "./test";

/**
 * Audit WCAG 2.1 AA (axe-core) de chaque page, en thème clair et sombre.
 * La carte Windy (iframe d'un autre site) est exclue : on ne la maîtrise pas.
 */
/** Fondus d'entrée et de changement d'ambiance terminés (les animations en boucle sont ignorées). */
async function waitForAnimations(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .getAnimations()
            .filter((animation) => animation.playState === "running" && animation.effect?.getTiming().iterations !== Infinity).length,
      ),
    )
    .toBe(0);
}

const PAGES = [
  { path: "/", ready: (page: Page) => expect(page.locator(".temp-gradient").first()).toHaveText(/\d+°/) },
  { path: "/carte", ready: (page: Page) => expect(page.getByRole("tab", { name: "Radar" })).toBeVisible() },
  { path: "/carte?vue=vigilances", ready: (page: Page) => expect(page.getByRole("img", { name: /Carte des vigilances/ })).toBeVisible() },
];

for (const scheme of ["light", "dark"] as const) {
  for (const target of PAGES) {
    test(`${target.path} respecte WCAG 2.1 AA en thème ${scheme === "light" ? "clair" : "sombre"}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      await page.goto(target.path);
      await target.ready(page);
      await page.waitForLoadState("networkidle");
      await waitForAnimations(page);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .exclude("iframe")
        .analyze();
      const violations = results.violations.map((violation) => ({
        regle: violation.id,
        impact: violation.impact,
        aide: violation.help,
        elements: violation.nodes.slice(0, 6).map((node) => `${node.target.join(" ")} — ${node.failureSummary?.split("\n")[1]?.trim() ?? ""}`),
      }));
      expect(violations).toEqual([]);
      // axe classe le contraste des surfaces translucides « à vérifier » : on le mesure nous-mêmes.
      expect(await page.evaluate(findLowContrastText)).toEqual([]);
    });
  }

  // La couleur d'accent suit la température (bleu, orange, rouge) : les trois doivent rester lisibles.
  test(`les trois ambiances de couleur restent lisibles en thème ${scheme === "light" ? "clair" : "sombre"}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator(".temp-gradient").first()).toHaveText(/\d+°/);
    await page.waitForLoadState("networkidle");
    for (const ambience of ["cool", "warm", "hot"]) {
      await page.evaluate((value) => {
        document.documentElement.dataset.ambience = value;
      }, ambience);
      // Le changement d'ambiance passe par un fondu : on mesure une fois les transitions finies.
      await waitForAnimations(page);
      const issues = await page.evaluate(findLowContrastText);
      expect(issues, `ambiance ${ambience}`).toEqual([]);
    }
  });
}

test("au clavier, chaque élément atteint par Tab montre où est le focus", async ({ page }) => {
  // Une soixantaine d'allers-retours avec la page : plus long que les autres tests.
  test.slow();
  await page.goto("/");
  await expect(page.locator(".temp-gradient").first()).toHaveText(/\d+°/);
  await page.waitForLoadState("networkidle");

  const withoutIndicator: string[] = [];
  const seen = new Set<string>();
  for (let step = 0; step < 60; step++) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      // Indicateur = l'apparence change entre l'état avec focus et sans focus,
      // sur l'élément ou sur son cadre (champ de recherche : .field:focus-within).
      const look = () =>
        [el, el.parentElement]
          .filter((node): node is HTMLElement => Boolean(node))
          .map((node) => {
            const style = getComputedStyle(node);
            const outline = style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0 ? `${style.outlineStyle} ${style.outlineColor}` : "";
            return [outline, style.boxShadow, style.backgroundColor, style.borderColor].join("|");
          })
          .join("/");
      const focusedLook = look();
      el.blur();
      const blurredLook = look();
      el.focus();
      const visible = focusedLook !== blurredLook;
      const label = el.getAttribute("aria-label") || el.textContent?.trim().replace(/\s+/g, " ").slice(0, 40) || el.tagName;
      return { id: `${el.tagName}:${label}`, visible };
    });
    if (!focused || seen.has(focused.id)) continue;
    seen.add(focused.id);
    if (!focused.visible) withoutIndicator.push(focused.id);
  }
  expect(seen.size).toBeGreaterThan(10);
  expect(withoutIndicator).toEqual([]);
});
