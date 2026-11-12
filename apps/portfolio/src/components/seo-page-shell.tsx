import Link from "next/link";
import type { ReactNode } from "react";
import SiteHeader from "@/src/components/site-header";
import { staticPageMetadata } from "@/src/lib/site";
import { type SeoKind, seoKinds, seoSections } from "@/src/lib/site-file-nav";

export function seoPageMetadata(kind: SeoKind) {
  const section = seoSections[kind];
  return {
    ...staticPageMetadata(`/seo/${kind}/`, section.title, section.description),
    robots: { index: false, follow: true },
  };
}

export default function SeoPageShell({ kind, children }: { kind: SeoKind; children: ReactNode }) {
  const section = seoSections[kind];
  return (
    <>
      <SiteHeader active="seo" seoKind={kind} />
      <main id="main-content" className="utility-page site-file-page" tabIndex={-1}>
        <Link href="/" className="utility-back">
          ← Back to the atlas
        </Link>
        <div className="site-file-intro">
          <p className="site-file-kicker">THE OPEN WORKSPACE / PUBLIC DATA</p>
          <h1 className="site-file-title">{section.title}</h1>
          <p className="utility-description site-file-intro-description">{section.description}</p>
        </div>
        <nav className="site-file-nav" aria-label="Site data previews">
          {seoKinds.map((id) => {
            const item = seoSections[id];
            return (
              <Link
                className="site-file-nav-link"
                key={id}
                href={`/seo/${id}/`}
                aria-current={kind === id ? "page" : undefined}
              >
                <item.Icon size={16} aria-hidden="true" /> {item.label}
              </Link>
            );
          })}
        </nav>
        {children}
      </main>
    </>
  );
}
