import SiteFilePage, { siteFileMetadata } from "@/src/components/site-file-page";

export const metadata = siteFileMetadata("feed");

export default function Page() {
  return <SiteFilePage kind="feed" />;
}
