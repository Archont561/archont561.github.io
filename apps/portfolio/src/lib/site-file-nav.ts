import {
  Bot,
  Braces,
  FileJson,
  FileSearch,
  FileStack,
  FileText,
  type LucideIcon,
  Map as MapIcon,
  Rss,
  ScanSearch,
} from "lucide-react";
import type { PreviewKind } from "@/src/lib/site-file-preview";

export const siteFileKinds = [
  "feed",
  "robots",
  "sitemap",
] as const satisfies readonly PreviewKind[];
export const previewKinds = ["pages", ...siteFileKinds] as const;
export type PreviewPageKind = (typeof previewKinds)[number];
export type ResourceGroup = "seo" | "machine";

/** Shared labels and descriptions for the existing static preview pages. */
export const previewSections = {
  pages: {
    title: "See a page through a crawler's eyes.",
    description: "Inspect the metadata and social sharing details published with each page.",
    label: "Page SEO",
    menuDescription: "Open Graph & metadata",
    Icon: FileSearch,
  },
  feed: {
    title: "The field notes feed.",
    description: "Follow the workspace in a feed reader, or explore its latest documentation here.",
    label: "Feed",
    menuDescription: "RSS, Atom & JSON",
    Icon: Rss,
  },
  robots: {
    title: "A guide for crawlers.",
    description:
      "A readable view of the instructions this site gives to search engines and other crawlers.",
    label: "Robots",
    menuDescription: "Crawler instructions",
    Icon: Bot,
  },
  sitemap: {
    title: "A map of the workspace.",
    description: "Explore the pages listed in the site's machine-readable sitemap.",
    label: "Sitemap",
    menuDescription: "Indexable pages",
    Icon: MapIcon,
  },
} as const satisfies Record<
  PreviewPageKind,
  { title: string; description: string; label: string; menuDescription: string; Icon: LucideIcon }
>;

export type ResourceLink = {
  href: string;
  label: string;
  menuDescription: string;
  Icon: LucideIcon;
  previewKind?: PreviewPageKind;
  raw?: boolean;
};

function previewLink(kind: PreviewPageKind): ResourceLink {
  const { label, menuDescription, Icon } = previewSections[kind];
  return { href: `/seo/${kind}/`, label, menuDescription, Icon, previewKind: kind };
}

/** Robots and sitemap serve SEO as well as machines; group them by their primary purpose. */
export const resourceMenus = {
  seo: {
    label: "SEO",
    ariaLabel: "SEO resources",
    Icon: ScanSearch,
    links: [previewLink("pages"), previewLink("robots"), previewLink("sitemap")],
  },
  machine: {
    label: "Machine-readable",
    ariaLabel: "Machine-readable resources",
    Icon: Braces,
    links: [
      // Keep the existing preview URL even though the feed is now in a different menu.
      previewLink("feed"),
      {
        href: "/llms.txt",
        label: "LLM index",
        menuDescription: "Index of Markdown pages",
        Icon: FileText,
        raw: true,
      },
      {
        href: "/llms-full.txt",
        label: "Full documentation",
        menuDescription: "Complete text in one file",
        Icon: FileStack,
        raw: true,
      },
      {
        href: "/ai-manifest.json",
        label: "AI manifest",
        menuDescription: "Page metadata & text as JSON",
        Icon: FileJson,
        raw: true,
      },
      {
        href: "/docs/index.md",
        label: "Markdown overview",
        menuDescription: "Documentation home as Markdown",
        Icon: FileText,
        raw: true,
      },
    ],
  },
} satisfies Record<
  ResourceGroup,
  { label: string; ariaLabel: string; Icon: LucideIcon; links: ResourceLink[] }
>;

export function previewGroup(kind: PreviewPageKind): ResourceGroup {
  return kind === "feed" ? "machine" : "seo";
}
