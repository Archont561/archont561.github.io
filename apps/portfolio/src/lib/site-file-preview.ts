import { ORIGIN } from "@/src/lib/site";

export type PreviewKind = "feed" | "robots" | "sitemap";
export type FeedFormat = "rss" | "atom" | "json";
export type SiteFileViewMode = "rendered" | "source" | "both";

export const feedFormats: {
  id: FeedFormat;
  label: string;
  path: string;
  language: "markup" | "json";
}[] = [
  { id: "rss", label: "RSS", path: "/feed.rss", language: "markup" },
  { id: "atom", label: "Atom", path: "/feed.atom", language: "markup" },
  { id: "json", label: "JSON Feed", path: "/feed.json", language: "json" },
];

export type FeedItem = { title: string; description: string; path: string | null; date?: string };
export type FeedPreview = { title: string; description: string; items: FeedItem[] };
export type RobotRule = { line: number; directive: string; value: string };
export type SitemapEntry = { path: string | null; location: string; date?: string };
export type PreviewData =
  | { kind: "feed"; feed: FeedPreview }
  | { kind: "robots"; rules: RobotRule[] }
  | { kind: "sitemap"; entries: SitemapEntry[] };

export function feedFormat(value: string | null): FeedFormat {
  return value === "atom" || value === "json" ? value : "rss";
}

export function siteFileViewMode(value: string | null): SiteFileViewMode {
  return value === "source" || value === "both" ? value : "rendered";
}

/** Only render links into this site; canonical links become local preview paths. */
export function sitePath(value: string): string | null {
  if (!value.trim()) return null;
  try {
    const url = new URL(value, `${ORIGIN}/`);
    // A same-origin URL can still have a pathname beginning with //; returning
    // that as an href would turn it into a protocol-relative external link.
    if (url.origin !== ORIGIN || url.username || url.password || url.pathname.startsWith("//"))
      return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function children(element: Element, name: string): Element[] {
  return Array.from(element.children).filter((child) => child.localName === name);
}

function childText(element: Element, name: string): string {
  return children(element, name)[0]?.textContent?.trim() ?? "";
}

function xmlDocument(text: string): Document {
  const document = new DOMParser().parseFromString(text, "application/xml");
  if (document.getElementsByTagName("parsererror").length) throw new Error("Invalid XML document");
  return document;
}

function rssPreview(root: Element): FeedPreview {
  if (root.localName !== "rss") throw new Error("Not an RSS feed");
  const channel = children(root, "channel")[0];
  if (!channel) throw new Error("RSS channel is missing");
  return {
    title: childText(channel, "title"),
    description: childText(channel, "description"),
    items: children(channel, "item").map((item) => ({
      title: childText(item, "title"),
      description: childText(item, "description"),
      path: sitePath(childText(item, "link")),
      ...(childText(item, "pubDate") ? { date: childText(item, "pubDate") } : {}),
    })),
  };
}

function atomPreview(root: Element): FeedPreview {
  if (root.localName !== "feed" || root.namespaceURI !== "http://www.w3.org/2005/Atom") {
    throw new Error("Not an Atom feed");
  }
  return {
    title: childText(root, "title"),
    description: childText(root, "subtitle"),
    items: children(root, "entry").map((item) => {
      const link = children(item, "link").find((element) => {
        const rel = element.getAttribute("rel");
        return !rel || rel === "alternate";
      });
      return {
        title: childText(item, "title"),
        description: childText(item, "summary"),
        path: sitePath(link?.getAttribute("href") ?? ""),
        // Atom's required updated fallback is a feed-edition date, not a page date.
        ...(childText(item, "published") ? { date: childText(item, "published") } : {}),
      };
    }),
  };
}

export function jsonFeedPreview(text: string): FeedPreview {
  const feed: unknown = JSON.parse(text);
  if (!isRecord(feed) || !Array.isArray(feed.items)) throw new Error("Invalid JSON Feed");
  return {
    title: stringValue(feed.title),
    description: stringValue(feed.description),
    items: feed.items.filter(isRecord).map((item) => ({
      title: stringValue(item.title),
      description: stringValue(item.content_text),
      path: sitePath(stringValue(item.url)),
      ...(stringValue(item.date_modified) ? { date: stringValue(item.date_modified) } : {}),
    })),
  };
}

export function robotsPreview(text: string): RobotRule[] {
  return text.split(/\r?\n/).flatMap((line, lineNumber) => {
    const value = line.trim();
    const index = value.indexOf(":");
    if (!value || value.startsWith("#") || index < 1) return [];
    return [
      {
        line: lineNumber,
        directive: value.slice(0, index).trim(),
        value: value.slice(index + 1).trim(),
      },
    ];
  });
}

function sitemapPreview(root: Element): SitemapEntry[] {
  if (root.localName !== "urlset") throw new Error("Not a sitemap URL set");
  return children(root, "url").map((item) => {
    const location = childText(item, "loc");
    const date = childText(item, "lastmod");
    return { location, path: sitePath(location), ...(date ? { date } : {}) };
  });
}

/** Parse only the known local artifacts; no fetched text is inserted as HTML. */
export function parseSiteFile(kind: PreviewKind, format: FeedFormat, text: string): PreviewData {
  if (kind === "robots") return { kind, rules: robotsPreview(text) };
  if (kind === "feed" && format === "json") return { kind, feed: jsonFeedPreview(text) };
  const root = xmlDocument(text).documentElement;
  if (kind === "sitemap") return { kind, entries: sitemapPreview(root) };
  return { kind, feed: format === "atom" ? atomPreview(root) : rssPreview(root) };
}
