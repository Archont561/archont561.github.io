import Link from "next/link";
import SiteHeader from "@/src/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="utility-page search-page" tabIndex={-1}>
        <p className="utility-kicker">404 / PAGE NOT FOUND</p>
        <h1>This page is not on the map.</h1>
        <p className="utility-description">
          The address may have changed. Return to the atlas or browse the documentation.
        </p>
        <p>
          <Link href="/">Go to the atlas</Link> · <Link href="/docs/">Browse documentation</Link>
        </p>
      </main>
    </>
  );
}
