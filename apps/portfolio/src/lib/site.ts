import type { Metadata } from "next";

export const ORIGIN = "https://archont561.github.io";
export const SITE_DESCRIPTION =
  "Open-source geospatial tooling, reproducible environments, testing systems, and agent workflows by Archont561.";

/** Stable URLs shared by metadata, the sitemap and the static AI export. */
export function docsUrl(slugs: string[]): string {
  return slugs.length ? `/docs/${slugs.join("/")}/` : "/docs/";
}

export function markdownUrl(slugs: string[]): string {
  return `/docs/${slugs.length ? slugs.join("/") : "index"}.md`;
}

export function staticPageMetadata(path: string, title: string, description: string): Metadata {
  const url = `${ORIGIN}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

/** Escape script-breaking characters in JSON-LD built from page metadata. */
export function jsonLd(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}
