import Link from "next/link";
import type { ReactNode } from "react";
import SiteHeader from "@/src/components/site-header";
import { staticPageMetadata } from "@/src/lib/site";
import {
  type PreviewPageKind,
  previewGroup,
  previewSections,
  resourceMenus,
} from "@/src/lib/site-file-nav";

export function seoPageMetadata(kind: PreviewPageKind) {
  const section = previewSections[kind];
  return {
    ...staticPageMetadata(`/seo/${kind}/`, section.title, section.description),
    robots: { index: false, follow: true },
  };
}

export default function SeoPageShell({
  kind,
  children,
}: {
  kind: PreviewPageKind;
  children: ReactNode;
}) {
  const section = previewSections[kind];
  const group = previewGroup(kind);
  const menu = resourceMenus[group];
  return (
    <>
      <SiteHeader active={group} previewKind={kind} />
      <main id="main-content" className="utility-page site-file-page" tabIndex={-1}>
        <Link href="/" className="utility-back">
          ← Back to the atlas
        </Link>
        <div className="site-file-intro">
          <p className="site-file-kicker">
            THE OPEN WORKSPACE / {group === "seo" ? "SEO" : "MACHINE-READABLE"}
          </p>
          <h1 className="site-file-title">{section.title}</h1>
          <p className="utility-description site-file-intro-description">{section.description}</p>
        </div>
        <nav className="site-file-nav" aria-label={menu.ariaLabel}>
          {menu.links.map((item) => {
            const Anchor = item.raw ? "a" : Link;
            return (
              <Anchor
                className="site-file-nav-link"
                key={item.href}
                href={item.href}
                aria-current={kind === item.previewKind ? "page" : undefined}
              >
                <item.Icon size={16} aria-hidden="true" /> {item.label}
              </Anchor>
            );
          })}
        </nav>
        {children}
      </main>
    </>
  );
}
