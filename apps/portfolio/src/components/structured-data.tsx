import { jsonLd } from "@/src/lib/site";

/** JSON-LD needs raw script text; jsonLd escapes '<' to prevent script injection. */
export default function StructuredData({ value }: { value: unknown }) {
  // biome-ignore lint/security/noDangerouslySetInnerHtml: serialized JSON escapes script-breaking characters.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(value) }} />;
}
