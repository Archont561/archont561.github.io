import type { Metadata } from "next";
import SearchProvider from "@/src/components/search-palette";
import { ORIGIN, SITE_DESCRIPTION } from "@/src/lib/site";
import { themeBootstrap } from "@/src/lib/theme";
import "./legacy.css";
import "./uno.css";
import "./tokens.css";
import "./globals.css";
import "./site-file.css";
import "./resource-nav.css";

export const metadata: Metadata = {
  metadataBase: new URL(`${ORIGIN}/`),
  title: { default: "Archont561 — Tools for a reproducible world", template: "%s · Archont561" },
  description: SITE_DESCRIPTION,
  icons: {
    icon: [
      {
        url: "/favicon.ico",
        sizes: "16x16 32x32 48x48 64x64 256x256",
        type: "image/x-icon",
      },
      { url: "/brand/terrain-a-favicon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static, locally defined theme bootstrap runs before paint. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        <link
          rel="alternate"
          type="application/rss+xml"
          href="/feed.xml"
          title="Archont561 field notes"
        />
        <link
          rel="alternate"
          type="application/atom+xml"
          href="/feed.atom"
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
