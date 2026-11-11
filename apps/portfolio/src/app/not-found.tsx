import { ArrowRight, ArrowUpRight, Search } from "lucide-react";
import Link from "next/link";
import { SearchTrigger } from "@/src/components/search-palette";
import SiteHeader from "@/src/components/site-header";
import { quickLinks } from "@/src/lib/palette-search";

/** A decorative, CSS-animated map; navigation remains available without JavaScript. */
function LostMap() {
  return (
    <div className="not-found-map" aria-hidden="true">
      <div className="not-found-map-label">
        <span>THE OPEN WORKSPACE</span>
        <span>ROUTE / 404</span>
      </div>
      <svg className="not-found-map-art" viewBox="0 0 480 350" fill="none" aria-hidden="true">
        <g className="not-found-contours" stroke="currentColor">
          <path d="M-12 105c54-58 111-45 143-5 40 51 76 35 106 1 39-43 89-63 143-23 35 25 68 32 112 12" />
          <path d="M-19 127c52-53 103-43 137-2 43 53 84 45 121 6 42-44 84-58 133-24 43 30 82 35 126 15" />
          <path d="M-15 151c48-44 91-38 127 5 45 54 96 52 135 12 40-40 80-50 125-20 47 31 87 37 124 17" />
          <path d="M-13 177c40-36 81-36 116 3 48 55 102 57 149 15 40-36 75-44 119-16 43 28 83 35 122 17" />
          <path d="M-10 204c38-30 75-32 109 6 46 51 110 60 160 17 36-31 69-37 111-12 46 27 82 33 122 17" />
          <path d="M-11 232c37-26 67-27 101 9 51 54 116 60 168 22 39-29 70-32 110-11 43 24 83 31 124 17" />
        </g>
        <circle className="not-found-orbit" cx="240" cy="175" r="106" stroke="currentColor" />
        <circle className="not-found-ring" cx="240" cy="175" r="76" stroke="currentColor" />
        <path
          className="not-found-crosshair"
          d="M240 80v25m0 140v25m-95-95h25m140 0h25"
          stroke="currentColor"
        />
        <circle className="not-found-pulse" cx="240" cy="175" r="14" stroke="currentColor" />
        <circle className="not-found-dot" cx="240" cy="175" r="6" fill="currentColor" />
      </svg>
      <div className="not-found-map-caption">
        <span>NO ROUTE FOUND</span>
        <span>REORIENT / EXPLORE</span>
      </div>
    </div>
  );
}

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="utility-page not-found-page" tabIndex={-1}>
        <div className="not-found-hero">
          <div className="not-found-copy">
            <p className="not-found-kicker">
              <span className="not-found-kicker-dot" /> 404 / OFF THE MAP
            </p>
            <h1>This page is not on the map.</h1>
            <p className="utility-description">
              The address may have moved or the trail ends here. Search the field notes or choose a
              familiar starting point below.
            </p>
            <SearchTrigger className="not-found-search">
              <Search size={18} aria-hidden="true" />
              <span className="not-found-search-label">Search the workspace</span>
              <span className="not-found-shortcut" aria-hidden="true">
                ⌘ K
              </span>
            </SearchTrigger>
            <div className="not-found-actions">
              <Link href="/" className="not-found-home">
                Return to the atlas <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link href="/docs/" className="not-found-docs">
                Browse field notes <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
          <LostMap />
        </div>
        <nav className="not-found-index" aria-label="Explore the workspace">
          <div className="not-found-index-heading">
            <div>
              <p className="not-found-index-label">THE WORKSPACE / INDEX</p>
              <h2>Pick a new direction.</h2>
            </div>
            <a href="/sitemap.xml">
              Full sitemap (XML) <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
          <ul className="not-found-links">
            {quickLinks.map((link, index) => (
              <li key={link.url}>
                <Link href={link.url}>
                  <span className="not-found-link-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="not-found-link-copy">
                    <strong>{link.title}</strong>
                    <span className="not-found-link-description">{link.description}</span>
                  </span>
                  <ArrowUpRight className="not-found-link-icon" size={16} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>
    </>
  );
}
