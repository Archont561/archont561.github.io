import Link from "next/link";
import DocsSearch from "@/src/components/docs-search";
import SiteHeader from "@/src/components/site-header";
import { staticPageMetadata } from "@/src/lib/site";

export const metadata = staticPageMetadata(
  "/search/",
  "Search the workspace",
  "Search the Archont561 field notes.",
);

export default function Page() {
  return (
    <>
      <SiteHeader active="search" />
      <main id="main-content" className="utility-page search-page" tabIndex={-1}>
        <Link href="/docs/" className="utility-back">
          ← Back to the field notes
        </Link>
        <p className="utility-kicker">FIELD NOTES / SEARCH</p>
        <h1>Find your way around.</h1>
        <p className="utility-description">
          Search the documentation, project notes, and guides. The index is built with the site; no
          server or API key is needed.
        </p>
        <div className="search-panel">
          <DocsSearch />
          <noscript>
            Search requires JavaScript. You can still browse the{" "}
            <Link href="/docs/">documentation</Link> or the{" "}
            <Link href="/projects/">project list</Link>.
          </noscript>
        </div>
      </main>
    </>
  );
}
