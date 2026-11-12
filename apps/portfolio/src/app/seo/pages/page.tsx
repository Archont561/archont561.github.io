import PageSeoPreview from "@/src/components/page-seo-preview";
import SeoPageShell, { seoPageMetadata } from "@/src/components/seo-page-shell";
import type { InspectablePage } from "@/src/lib/page-seo";
import { docsUrl } from "@/src/lib/site";
import { seoKinds, seoSections } from "@/src/lib/site-file-nav";
import { source } from "@/src/lib/source";

export const metadata = seoPageMetadata("pages");

/** The selector is built from this site's known routes, not arbitrary guest input. */
function inspectablePages(): InspectablePage[] {
  const site: InspectablePage[] = [
    { path: "/", label: "Home", group: "Site" },
    { path: "/projects/", label: "Projects", group: "Site" },
    { path: "/packages/", label: "Packages", group: "Site" },
    { path: "/search/", label: "Search", group: "Site" },
    { path: "/404.html", label: "Not found", group: "Site" },
  ];
  const docs: InspectablePage[] = source.getPages().map((page) => ({
    path: docsUrl(page.slugs),
    label: page.data.title,
    group: "Documentation",
  }));
  docs.sort((a, b) => a.path.localeCompare(b.path, "en"));
  const seo: InspectablePage[] = seoKinds.map((kind) => ({
    path: `/seo/${kind}/`,
    label: seoSections[kind].label,
    group: "SEO",
  }));
  return [...site, ...docs, ...seo];
}

export default function Page() {
  return (
    <SeoPageShell kind="pages">
      <PageSeoPreview pages={inspectablePages()} />
    </SeoPageShell>
  );
}
