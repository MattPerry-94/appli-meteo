import type { Page } from "@playwright/test";
import { expect, test } from "./test";

/**
 * Aucun élément ne doit dépasser de l'écran ni avoir son texte coupé, de la
 * largeur du plus petit iPhone à la tablette. Les conteneurs à défilement
 * horizontal voulu (barre des favoris, tableaux) sont exclus.
 */
const WIDTHS = [320, 375, 768, 1280];
const PAGES = [
  { path: "/", ready: (page: Page) => expect(page.locator(".temp-gradient").first()).toHaveText(/\d+°/) },
  { path: "/carte", ready: (page: Page) => expect(page.getByRole("tab", { name: "Radar" })).toBeVisible() },
  { path: "/carte?vue=vigilances", ready: (page: Page) => expect(page.getByRole("img", { name: /Carte des vigilances/ })).toBeVisible() },
];

function findLayoutIssues() {
  const viewport = document.documentElement.clientWidth;
  const describe = (el: Element) => {
    const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
    return `${el.tagName.toLowerCase()}${text ? ` « ${text} »` : ""}`;
  };
  const inHorizontalScroller = (el: Element) => {
    for (let parent = el.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
      const overflow = getComputedStyle(parent).overflowX;
      if (overflow === "auto" || overflow === "scroll") return true;
    }
    return false;
  };

  const issues: string[] = [];
  if (document.documentElement.scrollWidth > viewport) issues.push(`page plus large que l'écran (${document.documentElement.scrollWidth} px)`);
  for (const el of document.body.querySelectorAll("*")) {
    if (el.closest("svg") && el.tagName.toLowerCase() !== "svg") continue;
    if (el.classList.contains("sr-only") || el.closest("iframe")) continue;
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.position === "fixed") continue;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) continue;

    if (!inHorizontalScroller(el) && (rect.right > viewport + 0.5 || rect.left < -0.5)) {
      issues.push(`dépasse : ${describe(el)} (${Math.round(rect.left)} → ${Math.round(rect.right)})`);
    }
    const clips = ["hidden", "clip"].includes(style.overflowX) || style.textOverflow === "ellipsis";
    if (clips && el.children.length === 0 && el.textContent?.trim() && el.scrollWidth > el.clientWidth + 1) {
      issues.push(`texte coupé : ${describe(el)}`);
    }
  }
  return issues;
}

for (const width of WIDTHS) {
  for (const target of PAGES) {
    test(`${target.path} tient dans ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(target.path);
      await target.ready(page);
      // Laisse les cartes chargées en différé prendre leur place.
      await page.waitForLoadState("networkidle");
      expect(await page.evaluate(findLayoutIssues)).toEqual([]);
    });
  }
}
