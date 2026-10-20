import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

/**
 * Tests de bout en bout sur le build de production (service worker compris),
 * réseau rejoué depuis e2e/fixtures : voir e2e/network.ts.
 */
export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
    // Vrai Chromium sans fenêtre : la version allégée (headless shell) refuse
    // toujours les notifications, que les tests d'alerte utilisent.
    channel: "chromium",
  },
  webServer: {
    command: `npx vite build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
