import SeoPageShell, { seoPageMetadata } from "@/src/components/seo-page-shell";
import SiteFilePreview from "@/src/components/site-file-preview";
import type { PreviewKind } from "@/src/lib/site-file-preview";

export const siteFileMetadata = seoPageMetadata;

export default function SiteFilePage({ kind }: { kind: PreviewKind }) {
  return (
    <SeoPageShell kind={kind}>
      <SiteFilePreview key={kind} kind={kind} />
    </SeoPageShell>
  );
}
