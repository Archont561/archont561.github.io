import { Bot, FileSearch, type LucideIcon, Map as MapIcon, Rss } from "lucide-react";
import type { PreviewKind } from "@/src/lib/site-file-preview";

export const siteFileKinds = [
  "feed",
  "robots",
  "sitemap",
] as const satisfies readonly PreviewKind[];
export const seoKinds = ["pages", ...siteFileKinds] as const;
export type SeoKind = (typeof seoKinds)[number];

/** One source of labels and icons for the header menu and the SEO pages. */
export const seoSections = {
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
  SeoKind,
  { title: string; description: string; label: string; menuDescription: string; Icon: LucideIcon }
>;
