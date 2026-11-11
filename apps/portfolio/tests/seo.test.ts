import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { jsonLd } from "../src/lib/site";

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
  expect((sitemap.match(/<loc>/g) ?? []).length).toBe(pages.length + 3);
  for (const path of ["/", "/search/", "/packages/"])
    expect(sitemap).toContain(`<loc>${origin}${path}</loc>`);
});

test("discovery, JSON-LD, feeds, assets and search index use root-site paths", () => {
  const home = file("index.html");
  for (const path of ["index.html", "packages/index.html", "search/index.html"]) {
    const html = file(path);
    const url =
      path === "index.html" ? `${origin}/` : `${origin}/${path.replace("index.html", "")}`;
    expect(head(html)).toContain(`<link rel="canonical" href="${url}"`);
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
