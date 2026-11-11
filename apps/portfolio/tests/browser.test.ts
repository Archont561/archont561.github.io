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

async function expectNotFoundAnimations(page: Page, reducedMotion: boolean) {
  for (const name of ["not-found-orbit", "not-found-pulse"]) {
    const animation = await page
      .locator(`.${name}`)
      .evaluate((node) => getComputedStyle(node).animationName);
    expect(animation).toBe(reducedMotion ? "none" : name);
  }
}

async function expectResponsiveWidths(page: Page) {
  for (const width of [320, 360, 361, 375, 390, 400, 410, 411, 480, 768]) {
    await page.setViewportSize({ width, height: 800 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
}

async function expectSearchFallback(page: Page) {
  const fallback = page.locator(".search-panel noscript");
  expect(await fallback.isVisible()).toBe(true);
  expect(await fallback.textContent()).toContain("Search requires JavaScript.");
  expect(await fallback.getByRole("link", { name: "documentation" }).getAttribute("href")).toBe(
    "/docs/",
  );
}

async function themeTokens(page: Page, mode: "day" | "night") {
  return page.evaluate((selected) => {
    const style = getComputedStyle(document.documentElement);
    const value = (name: string) => style.getPropertyValue(name).trim();
    return {
      primary: value("--color-primary"),
      secondary: value("--color-secondary"),
      primaryAlias: value("--green"),
      secondaryAlias: value("--atlas-accent"),
      expectedPrimary: value(`--palette-${selected}-primary`),
      expectedSecondary: value(`--palette-${selected}-secondary`),
    };
  }, mode);
}

async function primaryButtonColors(page: Page) {
  // Let the button's background transition finish before comparing colors.
  await page.waitForFunction(() => {
    const button = document.querySelector<HTMLElement>(".button.primary");
    if (!button) return false;
    const probe = document.createElement("span");
    button.appendChild(probe);
    probe.style.color = "var(--color-primary)";
    const matches = getComputedStyle(button).backgroundColor === getComputedStyle(probe).color;
    probe.remove();
    return matches;
  });
  return page
    .locator(".button.primary")
    .first()
    .evaluate((button) => {
      const style = getComputedStyle(button);
      const background = style.backgroundColor;
      const foreground = style.color;
      const probe = document.createElement("span");
      button.appendChild(probe);
      probe.style.color = "var(--color-primary)";
      const expectedBackground = getComputedStyle(probe).color;
      probe.style.color = "var(--color-on-primary)";
      const expectedForeground = getComputedStyle(probe).color;
      probe.remove();
      return { background, foreground, expectedBackground, expectedForeground };
    });
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
  "inline bootstrap applies browser and saved themes before React hydration",
  async ({ browser, portfolioUrl }) => {
    const instance: Browser = browser;
    const context = await instance.newContext({ colorScheme: "dark" });
    // Block framework scripts, not the synchronous inline bootstrap in the head.
    await context.route("**/_next/static/**/*.js*", (route) => route.abort());
    try {
      const page = await context.newPage();
      await page.goto(`${portfolioUrl}/`);
      expect(await page.locator("html").getAttribute("data-terrain-theme")).toBe("night");
      expect(await page.locator(".theme-toggle").isDisabled()).toBe(true);
      expect(await page.locator(".theme-icon-sun").isVisible()).toBe(true);
      expect(await page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY)).toBeNull();
      const night = await themeTokens(page, "night");
      expect(night.primary).toBe(night.expectedPrimary);
      expect(night.secondary).toBe(night.expectedSecondary);

      await page.evaluate((key) => localStorage.setItem(key, "light"), THEME_STORAGE_KEY);
      await page.reload();
      expect(await page.locator("html").getAttribute("data-terrain-theme")).toBe("day");
      expect(await page.locator(".theme-toggle").isDisabled()).toBe(true);
      expect(await page.locator(".theme-icon-moon").isVisible()).toBe(true);
      const day = await themeTokens(page, "day");
      expect(day.primary).toBe(day.expectedPrimary);
      expect(day.secondary).toBe(day.expectedSecondary);
    } finally {
      await context.close();
    }
  },
  timeout,
);

browserTest(
  "semantic color tokens switch with the theme on the portfolio and docs",
  async ({ browserPage, portfolioUrl }) => {
    const page: Page = browserPage;
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(`${portfolioUrl}/`);
    await expectTheme(page, "day");
    const day = await themeTokens(page, "day");
    expect(day.primary).toBe(day.expectedPrimary);
    expect(day.secondary).toBe(day.expectedSecondary);
    expect(day.primaryAlias).toBe(day.primary);
    expect(day.secondaryAlias).toBe(day.secondary);
    const dayButton = await primaryButtonColors(page);
    expect(dayButton.background).toBe(dayButton.expectedBackground);
    expect(dayButton.foreground).toBe(dayButton.expectedForeground);

    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await expectTheme(page, "night");
    const night = await themeTokens(page, "night");
    expect(night.primary).toBe(night.expectedPrimary);
    expect(night.secondary).toBe(night.expectedSecondary);
    expect(night.primaryAlias).toBe(night.primary);
    expect(night.secondaryAlias).toBe(night.secondary);
    const nightButton = await primaryButtonColors(page);
    expect(nightButton.background).toBe(nightButton.expectedBackground);
    expect(nightButton.foreground).toBe(nightButton.expectedForeground);
    expect(nightButton.background).not.toBe(dayButton.background);
    expect(night.primary).not.toBe(day.primary);
    expect(night.secondary).not.toBe(day.secondary);
    await page.goto(`${portfolioUrl}/docs/`);
    await expectTheme(page, "night");
    expect((await themeTokens(page, "night")).primary).toBe(night.primary);
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
  "the not-found page offers workspace navigation and indexed search",
  async ({ browserPage, portfolioUrl }) => {
    const page: Page = browserPage;
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const response = await page.goto(`${portfolioUrl}/a-missing-trail/`);
    expect(response?.status()).toBe(404);
    await expectNotFoundAnimations(page, false);
    expect(
      await page
        .getByRole("heading", { level: 1, name: "This page is not on the map." })
        .isVisible(),
    ).toBe(true);
    const index = page.getByRole("navigation", { name: "Explore the workspace" });
    expect(await index.getByRole("link", { name: /Project directory/ }).getAttribute("href")).toBe(
      "/projects/",
    );
    expect(await index.getByRole("link", { name: /Full sitemap/ }).getAttribute("href")).toBe(
      "/sitemap.xml",
    );

    const search = page.locator('.not-found-search[aria-haspopup="dialog"]');
    await search.waitFor();
    await search.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Search the workspace" });
    await dialog.waitFor();
    await page.keyboard.press("Escape");
    expect(await search.evaluate((node) => document.activeElement === node)).toBe(true);
    await search.click();
    await dialog.waitFor();
    await dialog.getByRole("combobox", { name: "Search the documentation" }).fill("qgis-sdk");
    const result = dialog.getByRole("option").filter({ hasText: "qgis-sdk" }).first();
    await result.waitFor();
    await result.click();
    await page.waitForURL("**/docs/projects/qgis-sdk/");
  },
  timeout,
);

browserTest(
  "the mobile not-found page works without JavaScript and respects reduced motion",
  async ({ browser, portfolioUrl }) => {
    const instance: Browser = browser;
    const context = await instance.newContext({
      javaScriptEnabled: false,
      colorScheme: "dark",
      reducedMotion: "reduce",
      viewport: { width: 320, height: 800 },
    });
    try {
      const page = await context.newPage();
      const response = await page.goto(`${portfolioUrl}/missing/nested/page/`);
      expect(response?.status()).toBe(404);
      expect(
        await page
          .getByRole("heading", { level: 1, name: "This page is not on the map." })
          .isVisible(),
      ).toBe(true);
      await expectResponsiveWidths(page);
      await page.setViewportSize({ width: 375, height: 800 });
      await expectNotFoundAnimations(page, true);
      expect(
        await page
          .getByRole("navigation", { name: "Explore the workspace" })
          .getByRole("link")
          .count(),
      ).toBe(5);
      await page.getByRole("link", { name: "Search the workspace", exact: true }).click();
      await page.waitForURL("**/search/");
      await expectSearchFallback(page);
      await page.goBack();
      await page
        .getByRole("navigation", { name: "Explore the workspace" })
        .getByRole("link", { name: /Project directory/ })
        .click();
      await page.waitForURL("**/projects/");
      expect(await page.locator(".project-directory").isVisible()).toBe(true);
    } finally {
      await context.close();
    }
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
      const night = await themeTokens(page, "night");
      expect(night.primary).toBe(night.expectedPrimary);
      await page.emulateMedia({ colorScheme: "light" });
      const day = await themeTokens(page, "day");
      expect(day.primary).toBe(day.expectedPrimary);
      expect(day.primary).not.toBe(night.primary);
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
