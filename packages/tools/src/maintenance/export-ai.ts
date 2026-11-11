import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ORIGIN = "https://archont561.github.io";
const FEED_TITLE = "Archont561 field notes";

export interface AiPage {
  title: string;
  description: string;
  url: string;
  markdown: string;
  text: string;
  date?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePage(value: unknown): AiPage {
  if (!isRecord(value)) throw new Error("Invalid AI manifest page");
  const { title, description, url, markdown, text, date } = value;
  if (
    typeof title !== "string" ||
    !title.trim() ||
    typeof description !== "string" ||
    typeof text !== "string" ||
    !text.trim() ||
    typeof url !== "string" ||
    !/^\/docs\/(?:[a-z0-9][a-z0-9-]*\/)*$/.test(url) ||
    typeof markdown !== "string"
  )
    throw new Error("Invalid AI manifest page fields");
  const slug = url.slice("/docs/".length).replace(/\/$/, "") || "index";
  if (markdown !== `/docs/${slug}.md`) throw new Error(`Invalid Markdown path for ${url}`);
  if (date !== undefined) {
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))
      throw new Error(`Invalid date for ${url}`);
    const parsed = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date)
      throw new Error(`Invalid date for ${url}`);
  }
  return { title, description, url, markdown, text, ...(date ? { date } : {}) };
}

/** Only accept the shape and safe paths emitted by the static Fumadocs route. */
export function parseAiManifest(input: unknown): AiPage[] {
  if (!isRecord(input) || input.version !== 1 || !Array.isArray(input.pages) || !input.pages.length)
    throw new Error("Invalid or empty Fumadocs AI manifest; build the portfolio first");
  const pages = input.pages.map(parsePage).sort((a, b) => a.url.localeCompare(b.url, "en"));
  if (
    new Set(pages.map((page) => page.url)).size !== pages.length ||
    new Set(pages.map((page) => page.markdown)).size !== pages.length
  )
    throw new Error("Duplicate pages or Markdown paths in AI manifest");
  return pages;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function markdownLabel(value: string): string {
  return value
    .replace(/[\\[\]]/g, "\\$&")
    .replace(/\s+/g, " ")
    .trim();
}

function rss(pages: AiPage[]): string {
  const items = pages.map((page) => {
    const url = `${ORIGIN}${page.url}`;
    const date = page.date
      ? `      <pubDate>${new Date(`${page.date}T00:00:00Z`).toUTCString()}</pubDate>\n`
      : "";
    return `    <item>\n      <title>${escapeXml(page.title)}</title>\n      <link>${escapeXml(url)}</link>\n      <guid isPermaLink="true">${escapeXml(url)}</guid>\n${date}      <description>${escapeXml(page.description)}</description>\n    </item>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>${FEED_TITLE}</title>\n    <link>${ORIGIN}/docs/</link>\n    <description>Documentation for the Archont561 portfolio.</description>\n    <language>en</language>\n${items.join("\n")}\n  </channel>\n</rss>\n`;
}

function jsonFeed(pages: AiPage[]): string {
  return `${JSON.stringify(
    {
      version: "https://jsonfeed.org/version/1.1",
      title: FEED_TITLE,
      home_page_url: `${ORIGIN}/docs/`,
      feed_url: `${ORIGIN}/feed.json`,
      items: pages.map((page) => ({
        id: `${ORIGIN}${page.url}`,
        url: `${ORIGIN}${page.url}`,
        title: page.title,
        content_text: page.description,
        ...(page.date ? { date_modified: `${page.date}T00:00:00Z` } : {}),
      })),
    },
    null,
    2,
  )}\n`;
}

/** Generate only portable artifacts; source text must be Fumadocs-processed MDX. */
export function exportAi(siteDir: string): AiPage[] {
  const manifest = join(siteDir, "ai-manifest.json");
  const pages = parseAiManifest(JSON.parse(readFileSync(manifest, "utf8")) as unknown);
  const texts: string[] = [];
  for (const page of pages) {
    const text = page.text.replace(/\]\((\/docs(?=\/|[)#]))/g, `](${ORIGIN}$1`);
    texts.push(text);
    const target = join(siteDir, page.markdown.slice(1));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text);
  }
  const index = pages
    .map(
      (page) =>
        `- [${markdownLabel(page.title)}](${ORIGIN}${page.markdown}): ${markdownLabel(page.description)}`,
    )
    .join("\n");
  writeFileSync(
    join(siteDir, "llms.txt"),
    `# Archont561\n\n> Public geospatial and reproducibility tooling.\n\n## Documentation\n\n${index}\n`,
  );
  writeFileSync(
    join(siteDir, "llms-full.txt"),
    `${texts.map((text) => text.trim()).join("\n\n---\n\n")}\n`,
  );
  writeFileSync(join(siteDir, "feed.xml"), rss(pages));
  writeFileSync(join(siteDir, "feed.json"), jsonFeed(pages));
  writeFileSync(join(siteDir, ".nojekyll"), "");
  return pages;
}
