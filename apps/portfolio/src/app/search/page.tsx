import Link from "next/link";
import DocsSearch from "@/src/components/docs-search";
import { staticPageMetadata } from "@/src/lib/site";
export const metadata = staticPageMetadata(
  "/search/",
  "Search the workspace",
  "Search the Archont561 field notes.",
);
export default function Page() {
  return (
    <main style={{ maxWidth: 850, margin: "70px auto", padding: 24 }}>
      <Link href="/">← Back to the workspace</Link>
      <h1 style={{ fontSize: 36, margin: "28px 0" }}>Search the field notes</h1>
      <p style={{ marginBottom: 24 }}>Local, static search. No server or API key.</p>
      <DocsSearch />
    </main>
  );
}
