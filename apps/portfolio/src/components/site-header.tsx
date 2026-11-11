"use client";

import { Github, Menu, Search } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import BrandMark from "@/src/components/brand-mark";
import { SearchTrigger } from "@/src/components/search-palette";

type Section = "atlas" | "projects" | "packages" | "docs" | "search";

const links = [
  { href: "/", label: "Atlas", section: "atlas" },
  { href: "/projects/", label: "Projects", section: "projects" },
  { href: "/packages/", label: "Packages", section: "packages" },
  { href: "/docs/", label: "Docs", section: "docs" },
  { href: "/search/", label: "Search", section: "search" },
] as const;

function NavigationLinks({ active, onSelect }: { active?: Section; onSelect?: () => void }) {
  return (
    <>
      {links.map(({ href, label, section }) =>
        section === "search" ? (
          <SearchTrigger key={section} current={active === section} onSelect={onSelect}>
            <Search size={15} aria-hidden="true" /> {label}
            <span className="site-search-shortcut" aria-hidden="true">
              ⌘ K
            </span>
          </SearchTrigger>
        ) : (
          <Link
            key={section}
            href={href}
            aria-current={active === section ? "page" : undefined}
            onClick={onSelect}
          >
            {label}
          </Link>
        ),
      )}
      <a href="https://github.com/Archont561" onClick={onSelect}>
        <Github size={15} aria-hidden="true" /> GitHub
      </a>
    </>
  );
}

/** Native details keeps the mobile navigation usable before or without JavaScript. */
export default function SiteHeader({ active }: { active?: Section }) {
  const menu = useRef<HTMLDetailsElement>(null);
  const closeMenu = () => {
    if (menu.current) menu.current.open = false;
  };
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-brand" aria-label="Archont561 home">
          <BrandMark />
          <span>
            archont561<span className="site-brand-dot">.</span>
          </span>
        </Link>
        <span className="site-header-divider" aria-hidden="true" />
        <span className="site-header-caption">THE OPEN WORKSPACE</span>
        <nav className="site-nav" aria-label="Primary navigation">
          <NavigationLinks active={active} />
        </nav>
        <SearchTrigger className="site-mobile-search" current={active === "search"}>
          <Search size={19} aria-hidden="true" />
          <span className="visually-hidden">Search</span>
        </SearchTrigger>
        <details
          className="site-mobile-menu"
          ref={menu}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              closeMenu();
              menu.current?.querySelector("summary")?.focus();
            }
          }}
        >
          <summary>
            <Menu size={19} aria-hidden="true" /> <span>Menu</span>
          </summary>
          <nav aria-label="Mobile navigation">
            <NavigationLinks active={active} onSelect={closeMenu} />
          </nav>
        </details>
      </div>
    </header>
  );
}
