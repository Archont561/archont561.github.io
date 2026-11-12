import SiteFilePage, { siteFileMetadata } from "@/src/components/site-file-page";

export const metadata = siteFileMetadata("robots");

export default function Page() {
  return <SiteFilePage kind="robots" />;
}
