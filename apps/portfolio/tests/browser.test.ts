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

async function projectIconColors(page: Page) {
  return page.evaluate(() => {
    const context = document.createElement("canvas").getContext("2d");
    if (!context) throw new Error("Canvas is unavailable");
    const read = (color: string) => {
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3);
    };
    return ["geospatial", "environments", "testing", "agents", "developer-tools"].map(
      (category) => {
        const icon = document.querySelector(`.tone-${category} .project-icon`);
        if (!icon) throw new Error(`Missing ${category} icon`);
        const style = getComputedStyle(icon);
        return { category, background: read(style.backgroundColor), foreground: read(style.color) };
      },
    );
  });
}

function luminance(rgb: number[]): number {
  const [red = 0, green = 0, blue = 0] = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(first: number[], second: number[]): number {
  const [low = 0, high = 0] = [luminance(first), luminance(second)].sort((a, b) => a - b);
  return (high + 0.05) / (low + 0.05);
}

async function metadataValue(page: Page, name: string) {
  return page
    .locator(".page-seo-tag")
    .filter({ has: page.getByText(name, { exact: true }) })
    .locator("dd")
    .textContent();
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
  for (const width of [
    320, 360, 361, 375, 390, 400, 410, 411, 480, 768, 1000, 1001, 1100, 1101, 1200, 1201,
  ]) {
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
  "the SEO menu exposes icon links and supports keyboard and pointer navigation",
  async ({ browserPage, portfolioUrl }) => {
    const page: Page = browserPage;
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${portfolioUrl}/`);
    const navigation = page.getByRole("navigation", { name: "Primary navigation" });
    const menu = navigation.locator(".site-seo-menu");
    const trigger = menu.locator(".site-seo-menu-trigger");
    const resources = menu.getByRole("list", { name: "SEO resources" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    expect(await resources.isVisible()).toBe(true);
    for (const [label, href] of [
      ["Page SEO", "/seo/pages/?page=%2F"],
      ["Feed", "/seo/feed/"],
      ["Robots", "/seo/robots/"],
      ["Sitemap", "/seo/sitemap/"],
    ] as const) {
      const link = resources.getByRole("link", { name: new RegExp(`^${label}`) });
      expect(await link.getAttribute("href")).toBe(href);
      expect(await link.locator(".site-seo-menu-icon svg").count()).toBe(1);
    }
    await page.keyboard.press("Escape");
    expect(await menu.getAttribute("open")).toBeNull();
    expect(await trigger.evaluate((node) => document.activeElement === node)).toBe(true);
    await trigger.click();
    await page.locator(".site-header-caption").click();
    expect(await menu.getAttribute("open")).toBeNull();
    await trigger.click();
    await resources.getByRole("link", { name: /^Feed/ }).click();
    await page.waitForURL("**/seo/feed/");
    expect(await trigger.getAttribute("data-active")).toBe("true");
    await trigger.click();
    expect(await resources.getByRole("link", { name: /^Feed/ }).getAttribute("aria-current")).toBe(
      "page",
    );
    await resources.getByRole("link", { name: /^Robots/ }).click();
    await page.waitForURL("**/seo/robots/");
    await trigger.click();
    await resources.getByRole("link", { name: /^Sitemap/ }).click();
    await page.waitForURL("**/seo/sitemap/");
    for (const kind of ["feed", "robots", "sitemap"])
      expect((await page.request.get(`${portfolioUrl}/preview/${kind}/`)).status()).toBe(404);
  },
  timeout,
);

browserTest(
  "a guest can inspect the current page's actual Open Graph metadata",
  // biome-ignore lint/complexity/noExcessiveLinesPerFunction: the flow checks selection, modes, and history together.
  async ({ browserPage, portfolioUrl }) => {
    const page: Page = browserPage;
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${portfolioUrl}/docs/projects/qgis-sdk/`);
    const menu = page
      .getByRole("navigation", { name: "Primary navigation" })
      .locator(".site-seo-menu");
    await menu.locator(".site-seo-menu-trigger").click();
    const link = menu.getByRole("link", { name: /^Page SEO/ });
    const href = await link.getAttribute("href");
    expect(new URL(href ?? "", portfolioUrl).searchParams.get("page")).toBe(
      "/docs/projects/qgis-sdk/",
    );
    await link.click();
    await page.getByRole("heading", { name: "Published metadata" }).waitFor();
    const select = page.getByLabel("PAGE TO INSPECT");
    expect(await select.inputValue()).toBe("/docs/projects/qgis-sdk/");
    expect(await metadataValue(page, "title")).toBe("qgis-sdk · Archont561");
    expect(await metadataValue(page, "description")).toContain("QGIS 4 plugins");
    expect(await metadataValue(page, "og:title")).toBe("qgis-sdk");
    expect(await metadataValue(page, "og:type")).toBe("article");
    expect(await metadataValue(page, "twitter:card")).toBe("summary");
    expect(await metadataValue(page, "twitter:title")).toBe("qgis-sdk");
    expect(await metadataValue(page, "canonical")).toBe(
      "https://archont561.github.io/docs/projects/qgis-sdk/",
    );
    expect(await page.locator(".page-seo-card-copy strong").textContent()).toBe("qgis-sdk");
    expect(await page.getByText("No og:image is declared for this page.").isVisible()).toBe(true);
    const modes = page.getByRole("navigation", { name: "View mode" });
    await modes.getByRole("link", { name: "Source" }).click();
    expect(await page.locator(".site-file-code-inner").textContent()).toContain(
      '<meta property="og:title" content="qgis-sdk">',
    );
    expect(await page.locator(".site-file-code .token.tag").count()).toBeGreaterThan(0);
    await modes.getByRole("link", { name: "Both" }).click();
    await select.selectOption("/projects/");
    await page.waitForFunction(
      () =>
        document.querySelector(".page-seo-card-copy strong")?.textContent === "Project directory",
    );
    expect(await metadataValue(page, "og:title")).toBe("Project directory");
    expect(await page.getByRole("region", { name: "Metadata source" }).isVisible()).toBe(true);
    await page.goBack();
    await page.waitForFunction(
      () => document.querySelector(".page-seo-card-copy strong")?.textContent === "qgis-sdk",
    );
    expect(await select.inputValue()).toBe("/docs/projects/qgis-sdk/");
    await expectResponsiveWidths(page);
    await page
      .getByRole("navigation", { name: "Site data previews" })
      .getByRole("link", { name: "Page SEO" })
      .click();
    await page.waitForFunction(
      () => document.querySelector<HTMLSelectElement>("#page-seo-select")?.value === "/",
    );
    expect(new URL(page.url()).search).toBe("");
  },
  timeout,
);

browserTest(
  "the metadata inspector confines requests to known pages and treats tags as text",
  async ({ browserPage, portfolioUrl }) => {
    const page: Page = browserPage;
    const externalRequests: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).hostname === "evil.example") externalRequests.push(request.url());
    });
    await page.route("**/projects/", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: '<!doctype html><html><head><title>Safe page</title><meta property="og:title" content="&lt;img src=x onerror=alert(1)&gt;"><meta property="og:image" content="https://evil.example/image.png"><script>window.injected = true</script><img src="https://evil.example/hidden.png"></head><body>Test</body></html>',
      }),
    );
    await page.goto(
      `${portfolioUrl}/seo/pages/?page=${encodeURIComponent("https://evil.example/")}`,
    );
    await page
      .getByText("That page is not in this site's list. Showing the homepage instead.")
      .waitFor();
    const select = page.getByLabel("PAGE TO INSPECT");
    expect(await select.inputValue()).toBe("/");
    await select.selectOption("/projects/");
    await page.waitForFunction(
      () =>
        document.querySelector(".page-seo-card-copy strong")?.textContent ===
        "<img src=x onerror=alert(1)>",
    );
    expect(await metadataValue(page, "og:title")).toBe("<img src=x onerror=alert(1)>");
    expect(await page.locator(".page-seo-card img").count()).toBe(0);
    expect(
      await page.getByText("Only same-site Open Graph images are loaded here.").isVisible(),
    ).toBe(true);
    expect(await page.evaluate(() => "injected" in window)).toBe(false);
    await page
      .getByRole("navigation", { name: "View mode" })
      .getByRole("link", { name: "Source" })
      .click();
    expect(await page.locator(".site-file-code-inner").textContent()).not.toContain("<script>");
    expect(externalRequests).toEqual([]);
  },
  timeout,
);

browserTest(
  "the metadata inspector handles local images and failed pages",
  // biome-ignore lint/complexity/noExcessiveLinesPerFunction: the flow verifies recovery after each kind of failure.
  async ({ browserPage, portfolioUrl }) => {
    const page: Page = browserPage;
    const externalRequests: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).hostname === "evil.example") externalRequests.push(request.url());
    });
    await page.route("**/projects/", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<html><head><title>Local image</title><meta property="og:image" content="../brand/terrain-a-favicon.svg"></head></html>',
      }),
    );
    await page.route("**/packages/", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<html><head><title>Missing image</title><meta property="og:image" content="/brand/not-found.png"></head></html>',
      }),
    );
    await page.route("**/search/", (route) => route.fulfill({ status: 503, body: "Unavailable" }));
    await page.route("**/docs/", (route) => route.fulfill({ body: "No HTML head" }));
    await page.route("**/docs/ai-access/", (route) =>
      route.fulfill({
        status: 302,
        headers: { location: "https://evil.example/" },
      }),
    );
    await page.goto(`${portfolioUrl}/seo/pages/?page=%2Fprojects%2F`);
    const image = page.locator(".page-seo-card img");
    await image.waitFor();
    const imageUrl = new URL((await image.getAttribute("src")) ?? "", portfolioUrl);
    expect(imageUrl.origin).toBe(new URL(portfolioUrl).origin);
    expect(imageUrl.pathname).toBe("/brand/terrain-a-favicon.svg");
    await page.waitForFunction(
      () => (document.querySelector(".page-seo-card img") as HTMLImageElement)?.naturalWidth > 0,
    );
    const select = page.getByLabel("PAGE TO INSPECT");
    await select.selectOption("/packages/");
    await page.getByText("The Open Graph image could not be loaded.").waitFor();
    const failure = page.locator('.site-file-status[role="alert"]');
    for (const path of ["/search/", "/docs/", "/docs/ai-access/"]) {
      const request = page.waitForRequest((item) => new URL(item.url()).pathname === path);
      await select.selectOption(path);
      await request;
      await failure.waitFor();
      expect(await failure.textContent()).toContain("metadata could not be read");
    }
    expect(externalRequests).toEqual([]);
    await select.selectOption("/");
    await page.getByText("No og:image is declared for this page.").waitFor();
  },
  timeout,
);

browserTest(
  "the not-found page links to its own metadata",
  async ({ browserPage, portfolioUrl }) => {
    const page: Page = browserPage;
    await page.goto(`${portfolioUrl}/not-a-real-page/`);
    const menu = page
      .getByRole("navigation", { name: "Primary navigation" })
      .locator(".site-seo-menu");
    await menu.locator(".site-seo-menu-trigger").click();
    const link = menu.getByRole("link", { name: /^Page SEO/ });
    expect(
      new URL((await link.getAttribute("href")) ?? "", portfolioUrl).searchParams.get("page"),
    ).toBe("/404.html");
    await link.click();
    await page.getByRole("heading", { name: "Published metadata" }).waitFor();
    expect(await page.getByLabel("PAGE TO INSPECT").inputValue()).toBe("/404.html");
    expect(await metadataValue(page, "robots")).toBe("noindex");
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
    const menu = page.locator(".site-mobile-menu > summary");
    const toggle = page.locator(".theme-toggle");
    expect(await menu.isVisible()).toBe(true);
    expect(await toggle.isVisible()).toBe(true);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await menu.click();
    const navigation = page.getByRole("navigation", { name: "Mobile navigation" });
    await navigation.waitFor();
    const seo = navigation.locator(".site-seo-menu");
    const seoTrigger = seo.locator(".site-seo-menu-trigger");
    await seoTrigger.click();
    expect(await seo.getByRole("list", { name: "SEO resources" }).isVisible()).toBe(true);
    await page.keyboard.press("Escape");
    expect(await seo.getAttribute("open")).toBeNull();
    expect(await seoTrigger.evaluate((node) => document.activeElement === node)).toBe(true);
    expect(await navigation.isVisible()).toBe(true);
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

browserTest(
  "project category icons adapt to light and dark themes with readable contrast",
  async ({ browserPage, portfolioUrl }) => {
    const page: Page = browserPage;
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(`${portfolioUrl}/projects/`);
    await expectTheme(page, "day");
    const day = await projectIconColors(page);
    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await expectTheme(page, "night");
    const night = await projectIconColors(page);
    expect(night.length).toBe(5);
    for (const [index, icon] of night.entries()) {
      const dayIcon = day[index];
      if (!dayIcon) throw new Error(`Missing day icon for ${icon.category}`);
      expect(icon.category).toBe(dayIcon.category);
      expect(luminance(icon.background)).toBeLessThan(0.1);
      expect(luminance(icon.background)).toBeLessThan(luminance(dayIcon.background));
      expect(contrast(icon.background, icon.foreground)).toBeGreaterThanOrEqual(3);
    }
  },
  timeout,
);

browserTest(
  "dark project icons also follow the browser without JavaScript",
  async ({ browser, portfolioUrl }) => {
    const instance: Browser = browser;
    const context = await instance.newContext({ javaScriptEnabled: false, colorScheme: "dark" });
    try {
      const page = await context.newPage();
      await page.goto(`${portfolioUrl}/projects/`);
      for (const icon of await projectIconColors(page)) {
        expect(luminance(icon.background)).toBeLessThan(0.1);
        expect(contrast(icon.background, icon.foreground)).toBeGreaterThanOrEqual(3);
      }
    } finally {
      await context.close();
    }
  },
  timeout,
);

browserTest(
  "the feed switches formats and view modes while preserving highlighted source",
  async ({ browserPage, portfolioUrl }) => {
    const page: Page = browserPage;
    await page.goto(`${portfolioUrl}/seo/feed/?format=atom&view=rendered`);
    const formats = page.getByRole("navigation", { name: "Feed format" });
    const views = page.getByRole("navigation", { name: "View mode" });
    await page.getByRole("heading", { name: "Archont561 field notes" }).waitFor();
    expect(
      await formats.getByRole("link", { name: "Atom", exact: true }).getAttribute("aria-current"),
    ).toBe("page");
    expect(await page.getByRole("link", { name: "Open raw Atom" }).getAttribute("href")).toBe(
      "/feed.atom",
    );
    expect(await views.getByRole("link", { name: "Rendered" }).getAttribute("aria-current")).toBe(
      "page",
    );
    const count = await page.locator(".site-file-feed-item").count();
    expect(count).toBeGreaterThan(0);
    await views.getByRole("link", { name: "Source", exact: true }).click();
    await page.getByRole("region", { name: "Atom source" }).waitFor();
    expect(await page.locator(".site-file-feed-item").count()).toBe(0);
    expect(await page.locator(".site-file-code .token.tag").count()).toBeGreaterThan(0);
    const raw = await page.evaluate(async () => (await fetch("/feed.atom")).text());
    expect(await page.locator(".site-file-code-inner").textContent()).toBe(raw);
    await formats.getByRole("link", { name: "JSON Feed" }).click();
    await page.getByRole("region", { name: "JSON Feed source" }).waitFor();
    expect(await page.getByRole("link", { name: "Open raw JSON Feed" }).getAttribute("href")).toBe(
      "/feed.json",
    );
    expect(await page.locator(".site-file-code .token.property").count()).toBeGreaterThan(0);
    const json = await page.evaluate(async () => (await fetch("/feed.json")).text());
    expect(await page.locator(".site-file-code-inner").textContent()).toBe(json);
    await page.goBack();
    await page.getByRole("region", { name: "Atom source" }).waitFor();
    expect(page.url()).toContain("format=atom&view=source");
    await page.goForward();
    await page.getByRole("region", { name: "JSON Feed source" }).waitFor();
    expect(page.url()).toContain("format=json&view=source");
  },
  timeout,
);

browserTest(
  "combined and rendered views remain usable at mobile widths",
  async ({ browserPage, portfolioUrl }) => {
    const page: Page = browserPage;
    await page.goto(`${portfolioUrl}/seo/feed/?format=json&view=both`);
    await page.getByRole("region", { name: "JSON Feed source" }).waitFor();
    const views = page.getByRole("navigation", { name: "View mode" });
    const count = await page.locator(".site-file-feed-item").count();
    expect(count).toBeGreaterThan(0);
    expect(await views.getByRole("link", { name: "Both" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(await views.getByRole("link", { name: "Source" }).getAttribute("href")).toContain(
      "format=json&view=source",
    );
    await views.getByRole("link", { name: "Rendered" }).click();
    expect(await page.locator(".site-file-code-inner").count()).toBe(0);
    expect(await page.locator(".site-file-feed-item").count()).toBe(count);
    await views.getByRole("link", { name: "Both" }).click();
    expect(await page.getByRole("region", { name: "JSON Feed source" }).isVisible()).toBe(true);
    await expectResponsiveWidths(page);
  },
  timeout,
);

browserTest(
  "robots and sitemap views render and show the exported source",
  async ({ browserPage, portfolioUrl }) => {
    const page: Page = browserPage;
    await page.goto(`${portfolioUrl}/seo/robots/?view=source`);
    await page.getByRole("region", { name: "robots.txt source" }).waitFor();
    expect(await page.getByRole("link", { name: "Open raw robots.txt" }).getAttribute("href")).toBe(
      "/robots.txt",
    );
    expect(await page.getByRole("region", { name: "robots.txt source" }).textContent()).toContain(
      "User-Agent: GPTBot",
    );
    await page
      .getByRole("navigation", { name: "View mode" })
      .getByRole("link", { name: "Both" })
      .click();
    expect(await page.getByText("GPTBot", { exact: true }).isVisible()).toBe(true);
    expect(await page.getByRole("region", { name: "robots.txt source" }).isVisible()).toBe(true);
    const nav = page.getByRole("navigation", { name: "Site data previews" });
    await nav.getByRole("link", { name: "Sitemap" }).click();
    await page.waitForURL("**/seo/sitemap/");
    await page.getByRole("heading", { name: "Pages on the map" }).waitFor();
    expect(await page.locator(".site-file-sitemap-item").count()).toBeGreaterThan(projects.length);
    expect(
      await page.getByRole("link", { name: "/docs/projects/qgis-sdk/" }).getAttribute("href"),
    ).toBe("/docs/projects/qgis-sdk/");
    await page
      .getByRole("navigation", { name: "View mode" })
      .getByRole("link", { name: "Source" })
      .click();
    expect(await page.locator(".site-file-code .token.tag").count()).toBeGreaterThan(0);
    for (const path of [
      "/feed.xml",
      "/feed.rss",
      "/feed.atom",
      "/feed.json",
      "/robots.txt",
      "/sitemap.xml",
    ]) {
      const [raw, queried] = await page.evaluate(async (file) => {
        const responses = await Promise.all([fetch(file), fetch(`${file}?preview=true`)]);
        return Promise.all(responses.map((response) => response.text()));
      }, path);
      expect(queried).toBe(raw);
    }
  },
  timeout,
);

browserTest(
  "feed previews reject unsafe links and report malformed XML",
  async ({ browserPage, portfolioUrl }) => {
    const page: Page = browserPage;
    const source =
      '<?xml version="1.0"?>\r\n<rss version="2.0">\n<channel>\r<title>Example feed</title><description>Safe</description><item><title>&lt;script&gt;alert(1)&lt;/script&gt;</title><link>javascript:alert(1)</link><description>Content</description></item><item><title>Ambiguous same-origin URL</title><link>https://archont561.github.io//evil.example/</link></item></channel></rss>\r\n';
    await page.route("**/feed.rss", (route) =>
      route.fulfill({ status: 200, contentType: "application/rss+xml", body: source }),
    );
    await page.goto(`${portfolioUrl}/seo/feed/`);
    await page.getByRole("heading", { name: "Example feed" }).waitFor();
    expect(await page.locator(".site-file-item-title").first().textContent()).toBe(
      "<script>alert(1)</script>",
    );
    expect(await page.locator(".site-file-item-title").count()).toBe(2);
    expect(await page.locator(".site-file-item-title a").count()).toBe(0);
    expect(await page.locator(".site-file-rendered script").count()).toBe(0);
    await page
      .getByRole("navigation", { name: "View mode" })
      .getByRole("link", { name: "Source" })
      .click();
    expect(await page.locator(".site-file-code-inner").textContent()).toBe(source);
    await page.unroute("**/feed.rss");
    await page.route("**/feed.rss", (route) =>
      route.fulfill({ status: 200, body: "<rss><unclosed>" }),
    );
    await page.reload();
    await page.getByRole("alert").waitFor();
    expect(await page.getByRole("link", { name: "Open raw RSS" }).getAttribute("href")).toBe(
      "/feed.rss",
    );
  },
  timeout,
);

browserTest(
  "the mobile SEO menu works without JavaScript",
  async ({ browser, portfolioUrl }) => {
    const instance: Browser = browser;
    const context = await instance.newContext({
      javaScriptEnabled: false,
      viewport: { width: 320, height: 800 },
    });
    try {
      const page = await context.newPage();
      await page.goto(`${portfolioUrl}/`);
      const mobileMenu = page.locator(".site-mobile-menu");
      await mobileMenu.locator(":scope > summary").click();
      const seoMenu = mobileMenu.locator(".site-seo-menu");
      await seoMenu.locator(".site-seo-menu-trigger").click();
      const resources = seoMenu.getByRole("list", { name: "SEO resources" });
      expect(await resources.getByRole("link").count()).toBe(4);
      await resources.getByRole("link", { name: /^Robots/ }).click();
      await page.waitForURL("**/seo/robots/");
      expect(
        await page
          .locator(".site-file-noscript")
          .getByRole("link", { name: "robots.txt" })
          .getAttribute("href"),
      ).toBe("/robots.txt");
      await page.goto(`${portfolioUrl}/seo/pages/`);
      expect(await page.getByLabel("PAGE TO INSPECT").isDisabled()).toBe(true);
      expect(await page.locator(".site-file-noscript").isVisible()).toBe(true);
    } finally {
      await context.close();
    }
  },
  timeout,
);

browserTest(
  "site-file previews provide mobile and no-JavaScript raw links",
  async ({ browser, portfolioUrl }) => {
    const instance: Browser = browser;
    const context = await instance.newContext({
      javaScriptEnabled: false,
      colorScheme: "dark",
      viewport: { width: 320, height: 800 },
    });
    try {
      const page = await context.newPage();
      await page.goto(`${portfolioUrl}/seo/feed/`);
      const fallback = page.locator(".site-file-noscript");
      expect(await fallback.isVisible()).toBe(true);
      for (const [label, path] of [
        ["RSS", "/feed.rss"],
        ["Atom", "/feed.atom"],
        ["JSON Feed", "/feed.json"],
      ] as const) {
        expect(
          await fallback.getByRole("link", { name: label, exact: true }).getAttribute("href"),
        ).toBe(path);
      }
      await expectResponsiveWidths(page);
      await page.setViewportSize({ width: 320, height: 800 });
      await page
        .getByRole("navigation", { name: "Site data previews" })
        .getByRole("link", { name: "Sitemap" })
        .click();
      await page.waitForURL("**/seo/sitemap/");
      expect(
        await page
          .locator(".site-file-noscript")
          .getByRole("link", { name: "sitemap.xml" })
          .getAttribute("href"),
      ).toBe("/sitemap.xml");
    } finally {
      await context.close();
    }
  },
  timeout,
);
