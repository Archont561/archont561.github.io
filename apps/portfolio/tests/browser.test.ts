import { test as base, expect } from "@archont561/bun-test-utils";
import { type Browser, type BrowserContext, chromium, type Page } from "playwright";
import projects from "@/src/lib/projects.json";
import { THEME_STORAGE_KEY } from "@/src/lib/theme";
import { selectChromium } from "@/tests/support/browser";
import { buildPortfolio, servePortfolio } from "@/tests/support/portfolio-server";

const launchOptions = await selectChromium((options) => chromium.launch(options), {
  PORTFOLIO_CHROMIUM_EXECUTABLE: process.env.PORTFOLIO_CHROMIUM_EXECUTABLE,
  PORTFOLIO_CHROMIUM_ARGS: process.env.PORTFOLIO_CHROMIUM_ARGS,
});
let exportBuild: Promise<void> | undefined;
if (!launchOptions) {
  const reason = process.env.PORTFOLIO_CHROMIUM_EXECUTABLE
    ? "the executable configured by PORTFOLIO_CHROMIUM_EXECUTABLE was not found; correct or unset it"
    : "Chromium is not installed; run 'bunx --no-install playwright install chromium' in apps/portfolio";
  console.info(`Portfolio browser tests skipped: ${reason}.`);
}

const test = base.extend({
  // A test-scoped browser also supports constrained single-process Chromium builds.
  browser: {
    scope: "test",
    setup: async (use) => {
      if (!launchOptions) throw new Error("Chromium is not installed");
      const browser = await chromium.launch(launchOptions);
      try {
        await use(browser);
      } finally {
        await browser.close();
      }
    },
  },
  portfolioExport: {
    scope: "session",
    setup: async (use) => {
      exportBuild ??= buildPortfolio();
      await exportBuild;
      await use(true);
    },
  },
  portfolioUrl: {
    deps: ["portfolioExport", "testServer"],
    setup: async (use, { testServer }) => {
      testServer.handle((request: Request) => servePortfolio(request));
      await use(`http://127.0.0.1:${testServer.port}`);
    },
  },
});

const browserTest = test.skipIf(!launchOptions);
const timeout = { timeout: 180_000 };

async function expectTheme(page: Page, theme: "day" | "night") {
  await page.waitForFunction(
    (value) => document.documentElement.dataset.terrainTheme === value,
    theme,
  );
  const dark = theme === "night";
  await page.getByRole("button", { name: `Switch to ${dark ? "light" : "dark"} theme` }).waitFor();
  expect(await page.locator(".theme-icon-sun").isVisible()).toBe(dark);
  expect(await page.locator(".theme-icon-moon").isVisible()).toBe(!dark);
}

browserTest(
  "theme follows, persists, and reacts to browser preference changes",
  async ({ browserPage, portfolioUrl }) => {
    const page: Page = browserPage;
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(`${portfolioUrl}/`);
    await expectTheme(page, "day");
    expect(await page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY)).toBeNull();

    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await expectTheme(page, "night");
    expect(await page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY)).toBe("dark");
    await page.reload();
    await expectTheme(page, "night");

    await page.getByRole("button", { name: "Switch to light theme" }).click();
    await expectTheme(page, "day");
    await page.emulateMedia({ colorScheme: "dark" });
    await expectTheme(page, "night");
    expect(await page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY)).toBe("dark");
    await page.getByRole("button", { name: "Switch to light theme" }).click();
    await page.reload();
    await expectTheme(page, "day");
    expect(await page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY)).toBe(
      "light",
    );
  },
  timeout,
);

browserTest(
  "theme choices synchronize between tabs without applying stale events",
  async ({ browserContext, browserPage, portfolioUrl }) => {
    const context: BrowserContext = browserContext;
    const first: Page = browserPage;
    await first.emulateMedia({ colorScheme: "light" });
    await first.goto(`${portfolioUrl}/`);
    const second = await context.newPage();
    try {
      await second.emulateMedia({ colorScheme: "light" });
      await second.goto(`${portfolioUrl}/docs/`);
      await expectTheme(first, "day");
      await expectTheme(second, "day");
      await first.getByRole("button", { name: "Switch to dark theme" }).click();
      await expectTheme(second, "night");
      await second.getByRole("button", { name: "Switch to light theme" }).click();
      await expectTheme(first, "day");
      await second.evaluate((key) => {
        window.dispatchEvent(
          new StorageEvent("storage", { key, newValue: "dark", storageArea: localStorage }),
        );
      }, THEME_STORAGE_KEY);
      await expectTheme(second, "day");
      expect(await second.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY)).toBe(
        "light",
      );
    } finally {
      await second.close();
    }
  },
  timeout,
);

browserTest(
  "blocked storage still allows theme changes during the current visit",
  async ({ browser, portfolioUrl }) => {
    const instance: Browser = browser;
    const context = await instance.newContext({ colorScheme: "dark" });
    await context.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        get() {
          throw new DOMException("Storage blocked", "SecurityError");
        },
      });
    });
    try {
      const page = await context.newPage();
      await page.goto(`${portfolioUrl}/`);
      await expectTheme(page, "night");
      await page.getByRole("button", { name: "Switch to light theme" }).click();
      await expectTheme(page, "day");
      await page.reload();
      await expectTheme(page, "night");
    } finally {
      await context.close();
    }
  },
  timeout,
);

browserTest(
  "project filters and search recover from an empty result",
  async ({ browserPage, portfolioUrl }) => {
    const page: Page = browserPage;
    await page.goto(`${portfolioUrl}/projects/`);
    const query = page.getByRole("textbox", { name: "Search projects" });
    await query.waitFor();
    const cards = page.locator(".project-directory .project-card");
    expect(await cards.count()).toBe(projects.length);
    await page.getByRole("button", { name: "Geospatial", exact: true }).click();
    await page.waitForFunction(
      () =>
        document.querySelector('.filters button[aria-pressed="true"]')?.textContent?.trim() ===
        "Geospatial",
    );
    expect(await cards.count()).toBe(
      projects.filter((project) => project.category === "Geospatial").length,
    );
    await query.fill("zzzzzzzzzz");
    await page.getByText("No projects match", { exact: false }).waitFor();
    expect(await cards.count()).toBe(0);
    await page.getByRole("button", { name: "Reset filters" }).click();
    await page.waitForFunction(
      (count) => document.querySelectorAll(".project-directory .project-card").length === count,
      projects.length,
    );
    expect(await query.inputValue()).toBe("");
  },
  timeout,
);

browserTest(
  "the search palette supports keyboard dismissal and indexed navigation",
  async ({ browserPage, portfolioUrl }) => {
    const page: Page = browserPage;
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${portfolioUrl}/`);
    const search = page.locator(".site-nav").getByRole("link", { name: /search/i });
    await page.waitForFunction(
      () => document.querySelector('.site-nav a[aria-haspopup="dialog"]') !== null,
    );
    await search.click();
    const dialog = page.getByRole("dialog", { name: "Search the workspace" });
    await dialog.waitFor();
    const input = dialog.getByRole("combobox", { name: "Search the documentation" });
    await input.fill("qgis-sdk");
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    await page.waitForFunction(() => document.activeElement?.closest(".site-nav") !== null);

    await page.keyboard.press("Control+k");
    await dialog.waitFor();
    await input.fill("qgis-sdk");
    const result = dialog.getByRole("option").filter({ hasText: "qgis-sdk" }).first();
    await result.waitFor();
    await result.click();
    await page.waitForURL("**/docs/projects/qgis-sdk/");
    expect(await page.getByRole("heading", { level: 1, name: "qgis-sdk" }).isVisible()).toBe(true);
  },
  timeout,
);

browserTest(
  "package registry filters work in the exported page",
  async ({ browserPage, portfolioUrl }) => {
    const page: Page = browserPage;
    await page.goto(`${portfolioUrl}/packages/`);
    await page.locator('label[for="registry-filter-npm"]').click();
    expect(await page.locator("#registry-filter-npm").isChecked()).toBe(true);
    expect(await page.locator('[data-registry="npm"]').isVisible()).toBe(true);
    expect(await page.locator('[data-registry="pypi"]').isVisible()).toBe(false);
    expect(await page.locator('[data-registry="prefix"]').isVisible()).toBe(false);
    await page.locator('label[for="registry-filter-all"]').click();
    expect(await page.locator('[data-registry="pypi"]').isVisible()).toBe(true);
    expect(await page.locator('[data-registry="prefix"]').isVisible()).toBe(true);
  },
  timeout,
);

browserTest(
  "mobile navigation and theme control remain accessible at 320 pixels",
  async ({ browserPage, portfolioUrl }) => {
    const page: Page = browserPage;
    await page.setViewportSize({ width: 320, height: 800 });
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(`${portfolioUrl}/docs/`);
    await expectTheme(page, "day");
    const menu = page.locator(".site-mobile-menu summary");
    const toggle = page.locator(".theme-toggle");
    expect(await menu.isVisible()).toBe(true);
    expect(await toggle.isVisible()).toBe(true);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await menu.click();
    const navigation = page.getByRole("navigation", { name: "Mobile navigation" });
    await navigation.waitFor();
    await page.keyboard.press("Escape");
    expect(await navigation.isVisible()).toBe(false);
    expect(await menu.evaluate((node) => document.activeElement === node)).toBe(true);
    await toggle.click();
    await expectTheme(page, "night");
    await menu.click();
    await navigation.getByRole("link", { name: "Projects", exact: true }).click();
    await page.waitForURL("**/projects/");
    await expectTheme(page, "night");
  },
  timeout,
);

browserTest(
  "without JavaScript the directory and browser theme remain usable",
  async ({ browser, portfolioUrl }) => {
    const instance: Browser = browser;
    const context = await instance.newContext({ javaScriptEnabled: false, colorScheme: "dark" });
    try {
      const page = await context.newPage();
      await page.goto(`${portfolioUrl}/projects/`);
      expect(await page.locator("html").getAttribute("data-terrain-theme")).toBeNull();
      expect(await page.locator(".theme-toggle").isDisabled()).toBe(true);
      expect(await page.locator(".theme-icon-sun").isVisible()).toBe(true);
      expect(await page.locator(".theme-icon-moon").isVisible()).toBe(false);
      expect(await page.locator(".project-directory .project-card").count()).toBe(projects.length);
      const fallback = page.locator(".project-directory-noscript");
      expect(await fallback.isVisible()).toBe(true);
      expect(await fallback.textContent()).toContain("Filters require JavaScript.");
    } finally {
      await context.close();
    }
  },
  timeout,
);
