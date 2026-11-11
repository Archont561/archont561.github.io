import type { Metadata } from "next";
import SearchProvider from "@/src/components/search-palette";
import { ORIGIN, SITE_DESCRIPTION } from "@/src/lib/site";
import "./uno.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(`${ORIGIN}/`),
  title: { default: "Archont561 — Tools for a reproducible world", template: "%s · Archont561" },
  description: SITE_DESCRIPTION,
  icons: { icon: [{ url: "/brand/terrain-a-favicon.svg", type: "image/svg+xml" }] },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="alternate"
          type="application/rss+xml"
          href="/feed.xml"
          title="Archont561 field notes"
        />
        <link
          rel="alternate"
          type="application/feed+json"
          href="/feed.json"
          title="Archont561 field notes"
        />
      </head>
      <body>
        <SearchProvider>
          <a href="#main-content" className="skip-link">
            Skip to content
          </a>
          {children}
        </SearchProvider>
      </body>
    </html>
  );
}
