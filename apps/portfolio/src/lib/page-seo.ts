import { ORIGIN } from "@/src/lib/site";
import { sitePath } from "@/src/lib/site-file-preview";

export type InspectablePage = {
  path: string;
  label: string;
  group: "Site" | "Documentation" | "SEO";
};
export type SeoTag = { name: string; value: string; source: string };
export type PageSeo = { tags: SeoTag[]; source: string };

/** The query can select only pages supplied by the static site, never an arbitrary URL. */
export function selectedPage(value: string | null, pages: InspectablePage[]): string | null {
  return pages.find((page) => page.path === value)?.path ?? null;
}

/** Resolve relative images against the selected page and avoid external or unsafe URLs. */
export function localSeoImage(value: string, pagePath = "/"): string | null {
  if (!value.trim()) return null;
  try {
    const pageUrl = new URL(pagePath, `${ORIGIN}/`);
    if (pageUrl.origin !== ORIGIN || pageUrl.username || pageUrl.password) return null;
    const imageUrl = new URL(value, pageUrl);
    return sitePath(imageUrl.href);
  } catch {
    return null;
  }
}

function tagFromElement(element: Element): SeoTag | null {
  const tag = element.localName;
  if (tag === "title") {
    return { name: "title", value: element.textContent ?? "", source: element.outerHTML };
  }
  if (tag === "meta") {
    const name =
      element.getAttribute("property") ??
      element.getAttribute("name") ??
      element.getAttribute("http-equiv") ??
      (element.hasAttribute("charset") ? "charset" : "");
    if (!name) return null;
    const value = element.getAttribute("content") ?? element.getAttribute("charset") ?? "";
    return { name: name.toLowerCase(), value, source: element.outerHTML };
  }
  const rel = element.getAttribute("rel")?.toLowerCase() ?? "";
  if (rel !== "canonical" && rel !== "alternate") return null;
  const type = element.getAttribute("type");
  return {
    name: type && rel === "alternate" ? `${rel} (${type})` : rel,
    value: element.getAttribute("href") ?? "",
    source: element.outerHTML,
  };
}

/** Parse only the head of a known local page; never insert its HTML into the live document. */
export function parsePageSeo(html: string): PageSeo {
  const head = /<head(?:\s[^>]*)?>([\s\S]*?)<\/head\s*>/i.exec(html)?.[1];
  if (head === undefined) throw new Error("The page has no HTML head");
  const parsed = new DOMParser().parseFromString(
    `<html><head>${head}</head><body></body></html>`,
    "text/html",
  );
  const tags = Array.from(parsed.head.querySelectorAll("title, meta, link[rel]"))
    .map(tagFromElement)
    .filter((tag): tag is SeoTag => tag !== null);
  // outerHTML keeps the published values but normalizes quote/case/closing syntax.
  return { tags, source: tags.map((tag) => tag.source).join("\n") };
}

export function seoValue(data: PageSeo, name: string): string {
  return data.tags.find((tag) => tag.name === name)?.value ?? "";
}
