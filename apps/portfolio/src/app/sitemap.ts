import type { MetadataRoute } from "next";
import { docsUrl, ORIGIN } from "@/src/lib/site";
import { source } from "@/src/lib/source";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...["/", "/packages/", "/search/"].map((path) => ({ url: `${ORIGIN}${path}` })),
    ...source
      .getPages()
      .sort((a, b) => docsUrl(a.slugs).localeCompare(docsUrl(b.slugs), "en"))
      .map((page) => ({
        url: `${ORIGIN}${docsUrl(page.slugs)}`,
        ...(page.data.date ? { lastModified: page.data.date } : {}),
      })),
  ];
}
