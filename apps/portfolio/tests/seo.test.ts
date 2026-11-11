import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { expect, test } from "@archont561/bun-test-utils";
import { loadProjectCatalog } from "../src/lib/project-catalog";
import { jsonLd } from "../src/lib/site";
import { THEME_STORAGE_KEY } from "../src/lib/theme";

interface Page {
  title: string;
  description: string;
  url: string;
  markdown: string;
  text: string;
}
const app = dirname(dirname(fileURLToPath(import.meta.url)));
const root = join(app, "../..");
const out = join(app, "out");
const origin = "https://archont561.github.io";

function file(path: string): string {
  return readFileSync(join(out, path), "utf8");
}
function manifest(): Page[] {
  return (JSON.parse(file("ai-manifest.json")) as { version: number; pages: Page[] }).pages;
}
function sourceRoutes(): string[] {
  return [...new Bun.Glob("**/*.mdx").scanSync({ cwd: join(root, "docs"), onlyFiles: true })]
    .map((path) => {
      const slug = path.replace(/\.mdx$/, "").replace(/(^|\/)index$/, "");
      return `/docs/${slug ? `${slug}/` : ""}`;
    })
    .sort();
}
function head(html: string): string {
  return html.split("</head>")[0] ?? "";
}

// These compare the real static build to the source tree, not just the manifest to itself.
test("every documentation source has a sitemap entry, LLM row, Markdown twin and head metadata", () => {
  const pages = manifest();
  expect(pages.map((page) => page.url).sort()).toEqual(sourceRoutes());
  expect(new Set(pages.map((page) => page.markdown)).size).toBe(pages.length);
  const sitemap = file("sitemap.xml");
  const llms = file("llms.txt");
  for (const page of pages) {
    expect(sitemap).toContain(`<loc>${origin}${page.url}</loc>`);
    expect(llms).toContain(`](${origin}${page.markdown})`);
    const twin = file(page.markdown.slice(1));
    expect(twin.trim().length).toBeGreaterThan(30);
    expect(twin).toContain(`# ${page.title}`);
    expect(page.text).toContain(`# ${page.title}`);
    const html = file(`${page.url.slice(1)}index.html`);
    expect(head(html)).toContain(`<link rel="canonical" href="${origin}${page.url}"`);
    expect(head(html)).toContain(
      `<link rel="alternate" type="text/markdown" href="${origin}${page.markdown}"`,
    );
    expect(head(html)).toContain(`<meta property="og:url" content="${origin}${page.url}"`);
    expect(head(html)).toContain('name="twitter:card"');
    expect(html).toContain(`href="${page.markdown}"`);
  }
  expect((sitemap.match(/<loc>/g) ?? []).length).toBe(pages.length + 4);
  for (const path of ["/", "/projects/", "/search/", "/packages/"])
    expect(sitemap).toContain(`<loc>${origin}${path}</loc>`);
});

test("discovery, JSON-LD, feeds, assets and search index use root-site paths", () => {
  const home = file("index.html");
  for (const path of [
    "index.html",
    "projects/index.html",
    "packages/index.html",
    "search/index.html",
  ]) {
    const html = file(path);
    const url =
      path === "index.html" ? `${origin}/` : `${origin}/${path.replace("index.html", "")}`;
    expect(head(html)).toContain(`<link rel="canonical" href="${url}"`);
    expect(head(html)).toContain(`<meta property="og:url" content="${url}"`);
    expect(head(html)).toContain('name="twitter:card"');
    expect(head(html)).toContain('href="/feed.xml"');
    expect(head(html)).toContain('href="/feed.json"');
  }
  expect(home).toContain('"@type":"WebSite"');
  expect(home).toContain('"@type":"ProfilePage"');
  expect(file("docs/projects/qgis-sdk/index.html")).toContain('"@type":"SoftwareSourceCode"');
  expect(file("robots.txt")).toContain(`Sitemap: ${origin}/sitemap.xml`);
  expect(file("robots.txt")).toContain("User-Agent: GPTBot");
  expect(file("feed.xml")).toContain('<rss version="2.0">');
  const feed = JSON.parse(file("feed.json")) as { version: string; items: { url: string }[] };
  expect(feed.version).toBe("https://jsonfeed.org/version/1.1");
  expect(feed.items.map((item) => item.url).sort()).toEqual(
    manifest()
      .map((page) => `${origin}${page.url}`)
      .sort(),
  );
  const search = JSON.parse(file("pagefind/pagefind-entry.json")) as {
    languages: { en: { page_count: number } };
  };
  expect(search.languages.en.page_count).toBe(manifest().length);
  for (const path of [
    ".nojekyll",
    "pagefind/pagefind-ui.css",
    "pagefind/pagefind-ui.js",
    "pagefind/pagefind.js",
    "brand/terrain-a-favicon.svg",
  ]) {
    expect(existsSync(join(out, path))).toBe(true);
  }
  expect(head(home)).not.toContain("/Archont561/");
});

test("Pagefind can search the generated index", async () => {
  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    fetch(request) {
      return new Response(Bun.file(join(out, new URL(request.url).pathname)));
    },
  });
  try {
    const pagefind = await import(pathToFileURL(join(out, "pagefind/pagefind.js")).href);
    await pagefind.options({ basePath: `http://127.0.0.1:${server.port}/pagefind/` });
    const result = await pagefind.search("qgis-sdk");
    const data = await Promise.all(
      result.results.map((item: { data: () => Promise<{ url: string }> }) => item.data()),
    );
    expect(
      data.some((item: { url: string }) => item.url.includes("/docs/projects/qgis-sdk/")),
    ).toBe(true);
    await pagefind.destroy();
  } finally {
    server.stop(true);
  }
});

test("static SEO and Markdown outputs are snapshot-locked", () => {
  const paths = [
    "ai-manifest.json",
    "feed.xml",
    "feed.json",
    "llms.txt",
    "llms-full.txt",
    "robots.txt",
    "sitemap.xml",
    ...manifest().map((page) => page.markdown.slice(1)),
  ].sort();
  const digests = paths.map(
    (path) => `${path} ${createHash("sha256").update(file(path)).digest("hex")}`,
  );
  expect(digests).toMatchSnapshot();
});

test("JSON-LD escapes script-breaking input without changing its data", () => {
  const text = jsonLd({ name: "</script><script>alert(1)</script>" });
  expect(text).not.toContain("<");
  expect(JSON.parse(text)).toEqual({ name: "</script><script>alert(1)</script>" });
});

function projectGroupsFromMeta(): Record<string, string[]> {
  const meta = JSON.parse(readFileSync(join(root, "docs/projects/meta.json"), "utf8")) as {
    pages: string[];
  };
  const groups: Record<string, string[]> = {};
  let category = "";
  for (const entry of meta.pages) {
    const separator = /^---(.+)---$/.exec(entry);
    if (separator?.[1]) {
      category = separator[1];
      groups[category] = [];
    } else if (entry !== "index") {
      if (!category) throw new Error(`Project ${entry} has no domain separator`);
      groups[category]?.push(entry);
    }
  }
  return groups;
}

test("project navigation metadata matches the curated domains", () => {
  const projects = JSON.parse(readFileSync(join(app, "src/lib/projects.json"), "utf8")) as {
    category: string;
    slug: string;
  }[];
  const expected: Record<string, string[]> = {};
  for (const project of projects) {
    if (!expected[project.category]) expected[project.category] = [];
    expected[project.category]?.push(project.slug);
  }
  expect(projectGroupsFromMeta()).toEqual(expected);
});

test("Fumadocs navigation covers every route and groups project pages without moving them", () => {
  const pages = manifest();
  const groups = projectGroupsFromMeta();
  for (const page of pages) {
    const html = file(`${page.url.slice(1)}index.html`);
    const nav = html.match(
      /<nav class="docs-navigation" aria-label="Documentation">[\s\S]*?<\/nav>/,
    )?.[0];
    if (!nav) throw new Error(`Missing documentation navigation on ${page.url}`);
    for (const target of pages) expect(nav).toContain(`href="${target.url}"`);
    expect(nav).toContain(`aria-current="page" href="${page.url}"`);
    expect((nav.match(/aria-current="page"/g) ?? []).length).toBe(1);
    for (const [name, slugs] of Object.entries(groups)) {
      const heading = nav.indexOf(`>${name}</span>`);
      expect(heading).toBeGreaterThan(-1);
      for (const slug of slugs)
        expect(nav.indexOf(`href="/docs/projects/${slug}/"`)).toBeGreaterThan(heading);
    }
    expect(html).toContain('class="docs-mobile-nav"');
  }
});

test("the shared navigation, static atlas placeholder, and project fallback are exported", () => {
  for (const [path, current] of [
    ["index.html", "/"],
    ["projects/index.html", "/projects/"],
    ["packages/index.html", "/packages/"],
    ["search/index.html", "/search/"],
    ["docs/index.html", "/docs/"],
    ["docs/projects/qgis-sdk/index.html", "/docs/"],
  ] as const) {
    const html = file(path);
    const header = html.match(/<header class="site-header">[\s\S]*?<\/header>/)?.[0];
    if (!header) throw new Error(`Missing shared header on ${path}`);
    for (const href of [
      "/",
      "/projects/",
      "/packages/",
      "/docs/",
      "/search/",
      "https://github.com/Archont561",
    ])
      expect(header).toContain(`href="${href}"`);
    expect(header).toMatch(new RegExp(`aria-current="page"[^>]*href="${current}"`));
    expect(header).toContain('class="site-mobile-menu"');
    // Before hydration Search is a normal link, not a falsely advertised dialog.
    expect(header).not.toContain('aria-haspopup="dialog"');
    expect(html).toContain('id="search-palette"');
    expect(html).toContain('href="#main-content"');
    expect(html).toContain('id="main-content"');
  }
});

test("static pages initialize the theme before hydration and expose a safe fallback", () => {
  for (const path of [
    "index.html",
    "projects/index.html",
    "packages/index.html",
    "search/index.html",
    "docs/index.html",
    "404.html",
  ]) {
    const html = file(path);
    expect(head(html)).toContain(THEME_STORAGE_KEY);
    expect(head(html)).toContain('setAttribute("data-terrain-theme"');
    const button = html.match(/<button class="theme-toggle"[^>]*>/)?.[0];
    expect(button).toContain('aria-label="Theme follows browser settings"');
    expect(button).toContain("disabled");
    expect(html).toContain("theme-icon-sun");
    expect(html).toContain("theme-icon-moon");
  }
});

test("the atlas preview, full project directory, and search fallback are exported", () => {
  const home = file("index.html");
  expect(home).toContain('<section class="atlas-preview"');
  expect(home).toContain('href="#work"');
  expect(home).toContain('id="work"');
  expect(home).toContain('href="/projects/"');
  expect(home).toContain("An interactive globe is planned. For now, explore the projects below.");
  const projects = loadProjectCatalog(root).projects;
  const featured = projects.filter((project) => project.featured.home);
  expect((home.match(/<a class="project-card /g) ?? []).length).toBe(featured.length);
  for (const project of featured) expect(home).toContain(`href="/docs/projects/${project.slug}/"`);
  const directory = file("projects/index.html");
  expect((directory.match(/<a class="project-card /g) ?? []).length).toBe(projects.length);
  for (const project of projects)
    expect(directory).toContain(`href="/docs/projects/${project.slug}/"`);
  expect(directory).toContain("Browse all projects below. Filters require JavaScript.");
  const noScript = file("search/index.html").match(/<noscript>[\s\S]*?<\/noscript>/)?.[0];
  expect(noScript).toContain("Search requires JavaScript.");
  expect(noScript).toContain('href="/projects/"');
});

interface RegistrySnapshot {
  retrieved: string;
  registries: {
    name: string;
    label: string;
    url: string;
    packages: { name: string; relation?: string; url: string }[];
  }[];
}

function registrySnapshot(): RegistrySnapshot {
  return JSON.parse(readFileSync(join(root, "data/packages.json"), "utf8")) as RegistrySnapshot;
}

async function exportedRegistryControls(html: string) {
  const inputs: { id: string | null; value: string | null; checked: boolean }[] = [];
  const labels: { id: string | null; text: string }[] = [];
  const sectionNames: (string | null)[] = [];
  let currentLabel: (typeof labels)[number] | undefined;
  const response = new HTMLRewriter()
    .on('fieldset.registry-filter input[type="radio"][name="registry"]', {
      element(element) {
        inputs.push({
          id: element.getAttribute("id"),
          value: element.getAttribute("value"),
          checked: element.hasAttribute("checked"),
        });
      },
    })
    .on('fieldset.registry-filter label[for^="registry-filter-"]', {
      element(element) {
        currentLabel = { id: element.getAttribute("for"), text: "" };
        labels.push(currentLabel);
        element.onEndTag(() => {
          currentLabel = undefined;
        });
      },
      text(chunk) {
        if (currentLabel) currentLabel.text += chunk.text;
      },
    })
    .on("section.registry-section[data-registry]", {
      element(element) {
        sectionNames.push(element.getAttribute("data-registry"));
      },
    })
    .transform(new Response(html));
  await response.text();
  return { inputs, labels, sectionNames };
}

async function exportedRegistrySection(html: string, name: string) {
  const section = {
    heading: "",
    links: [] as string[],
    rows: 0,
    hidden: false,
    scrollLabel: null as string | null,
    tabIndex: null as string | null,
  };
  const selector = `section.registry-section[data-registry="${name}"]`;
  const response = new HTMLRewriter()
    .on(selector, {
      element(element) {
        section.hidden = element.hasAttribute("hidden");
      },
    })
    .on(`${selector} h2`, {
      text(chunk) {
        section.heading += chunk.text;
      },
    })
    .on(`${selector} tbody tr`, {
      element() {
        section.rows++;
      },
    })
    .on(`${selector} a[href]`, {
      element(element) {
        const href = element.getAttribute("href");
        if (href) section.links.push(href);
      },
    })
    .on(`${selector} section.registry-table-scroll`, {
      element(element) {
        section.scrollLabel = element.getAttribute("aria-label");
        section.tabIndex = element.getAttribute("tabindex");
      },
    })
    .transform(new Response(html));
  await response.text();
  return section;
}

test("package filters export the complete snapshot, controls, and registry links", async () => {
  const data = registrySnapshot();
  const html = file("packages/index.html");
  const { inputs, labels, sectionNames } = await exportedRegistryControls(html);
  const names = ["all", ...data.registries.map((registry) => registry.name)];
  expect(html).toContain("<legend>Filter by registry</legend>");
  expect(inputs).toEqual(
    names.map((name) => ({
      id: `registry-filter-${name}`,
      value: name,
      checked: name === "all",
    })),
  );
  expect(labels.map((label) => label.id)).toEqual(names.map((name) => `registry-filter-${name}`));
  expect(labels[0]?.text).toContain("All registries");
  expect(sectionNames).toEqual(data.registries.map((registry) => registry.name));
  for (const registry of data.registries) {
    const section = await exportedRegistrySection(html, registry.name);
    const label = labels.find((item) => item.id === `registry-filter-${registry.name}`);
    const published = registry.packages.filter((item) =>
      ["authored", "upstream", "unreviewed"].includes(item.relation ?? ""),
    ).length;
    expect(label?.text).toContain(registry.label);
    expect(label?.text).toContain(`${published} published`);
    expect(section.hidden).toBe(false);
    expect(section.heading).toContain(registry.label);
    expect(section.heading).toContain(data.retrieved);
    expect(section.rows).toBe(registry.packages.length);
    expect(section.scrollLabel).toBe(`${registry.label} package table`);
    expect(section.tabIndex).toBe("0");
    expect(section.links).toContain(registry.url);
    for (const item of registry.packages) expect(section.links).toContain(item.url);
  }
});

test("exported CSS filters other registries and leaves All registries unfiltered", () => {
  const html = file("packages/index.html");
  const stylesheets = [...head(html).matchAll(/href="(\/_next\/static\/css\/[^"]+\.css)"/g)]
    .map((match) => match[1])
    .filter((path): path is string => Boolean(path));
  expect(stylesheets.length).toBeGreaterThan(0);
  const css = stylesheets.map((path) => file(path.slice(1))).join("\n");
  const hiddenRules = css.match(/[^{}]+\{[^{}]*display\s*:\s*none[^{}]*\}/g) ?? [];
  for (const registry of registrySnapshot().registries) {
    // A checked radio hides sections whose data-registry is not the selected value.
    const selector = new RegExp(
      `#registry-filter-${registry.name}:checked\\)\\s*~\\s*\\.registry-sections\\s+\\.registry-section:not\\(\\[data-registry=["']?${registry.name}["']?\\]\\)`,
    );
    expect(hiddenRules.some((rule) => selector.test(rule))).toBe(true);
  }
  expect(
    hiddenRules.some(
      (rule) => rule.includes("#registry-filter-all:checked") && rule.includes(".registry-section"),
    ),
  ).toBe(false);
  expect(css).toContain("input:checked");
  expect(css).toContain("input:focus-visible");
});

function softwareSourceJsonLd(html: string): Record<string, unknown> | undefined {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((match) => JSON.parse(match[1] ?? "{}") as Record<string, unknown>)
    .find((item) => item["@type"] === "SoftwareSourceCode");
}

function displayDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

test("project exports use catalog descriptions, source links, facts, and provenance", () => {
  const pages = new Map(manifest().map((page) => [page.url, page]));
  for (const project of loadProjectCatalog(root).projects) {
    const page = pages.get(`/docs/projects/${project.slug}/`);
    const markdown = file(`docs/projects/${project.slug}.md`);
    const html = file(`docs/projects/${project.slug}/index.html`);
    expect(page).toMatchObject({ title: project.name, description: project.description });
    expect(markdown).toContain(project.description);
    expect(markdown).toContain(project.url);
    expect(markdown).toContain("not a guarantee of feature completeness");
    if (project.descriptionSource.kind === "curated") {
      expect(markdown).toContain("curated from public project information");
    } else {
      expect(markdown).toContain(displayDate(project.descriptionSource.captured));
    }
    if (project.descriptionSource.kind === "legacy-github") {
      expect(markdown).toContain(
        "That older capture is not contained in the current repository snapshot",
      );
    }
    if (project.language && project.repositoryCaptured) {
      expect(markdown).toContain(displayDate(project.repositoryCaptured));
    }
    const structured = softwareSourceJsonLd(html);
    expect(structured).toMatchObject({
      name: project.name,
      description: project.description,
      codeRepository: project.url,
    });
    expect(structured?.programmingLanguage).toBe(project.language ?? undefined);
  }
});

test("project-specific Markdown is present in HTML, Markdown twins, and the AI manifest", () => {
  const markdown = file("docs/projects/qgis-sdk.md");
  const html = file("docs/projects/qgis-sdk/index.html");
  const page = manifest().find((item) => item.url === "/docs/projects/qgis-sdk/");
  expect(html).toContain('id="upstream-guides"');
  expect(html).toContain("a reference plugin");
  expect(markdown).toContain("## Upstream guides");
  expect(markdown).toContain("a reference plugin");
  expect(page?.text).toContain("a reference plugin");
});

test("on-page table-of-contents links point to rendered headings", () => {
  for (const page of manifest()) {
    const html = file(`${page.url.slice(1)}index.html`);
    const toc = html.match(/<nav aria-label="On this page">[\s\S]*?<\/nav>/)?.[0];
    if (!toc) continue;
    for (const match of toc.matchAll(/href="#([^"]+)"/g)) {
      expect(html).toContain(`id="${match[1]}"`);
    }
  }
});

test("previous documentation heading fragments remain valid", () => {
  const index = file("docs/index.html");
  expect(index).toContain('id="start-here"');
  expect(index).toContain('id="source-of-truth"');
  expect(file("docs/projects/index.html")).toContain('id="selected-repositories"');
  const projects = JSON.parse(readFileSync(join(app, "src/lib/projects.json"), "utf8")) as {
    slug: string;
  }[];
  for (const project of projects) {
    expect(file(`docs/projects/${project.slug}/index.html`)).toContain('id="overview"');
    expect(file(`docs/projects/${project.slug}.md`)).toContain('<span id="overview"></span>');
  }
});

test("the exported not-found page has a skip-link target and working navigation", () => {
  for (const path of ["404.html", "404/index.html", "_not-found/index.html"]) {
    const html = file(path);
    expect(html).toContain('href="#main-content"');
    expect(html).toContain('id="main-content"');
    expect(html).toContain("This page is not on the map.");
    expect(html).toContain('href="/docs/"');
  }
});
