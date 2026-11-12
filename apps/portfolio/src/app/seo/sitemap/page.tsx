import SiteFilePage, { siteFileMetadata } from "@/src/components/site-file-page";

export const metadata = siteFileMetadata("sitemap");

export default function Page() {
  return <SiteFilePage kind="sitemap" />;
}
