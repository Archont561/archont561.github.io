import Portfolio from "@/src/components/portfolio";
import SiteHeader from "@/src/components/site-header";
import StructuredData from "@/src/components/structured-data";
import { ORIGIN, SITE_DESCRIPTION, staticPageMetadata } from "@/src/lib/site";

export const metadata = staticPageMetadata("/", "Tools for a reproducible world", SITE_DESCRIPTION);

export default function Page() {
  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${ORIGIN}/#website`,
        url: `${ORIGIN}/`,
        name: "Archont561",
        description: SITE_DESCRIPTION,
      },
      {
        "@type": "ProfilePage",
        "@id": `${ORIGIN}/#profile`,
        url: `${ORIGIN}/`,
        mainEntity: {
          "@type": "Person",
          name: "Archont561",
          sameAs: "https://github.com/Archont561",
        },
      },
    ],
  };
  return (
    <>
      <StructuredData value={structured} />
      <SiteHeader active="atlas" />
      <Portfolio />
    </>
  );
}
