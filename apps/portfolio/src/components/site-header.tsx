"use client";

import { ChevronDown, Github, Menu, ScanSearch, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import BrandMark from "@/src/components/brand-mark";
import { SearchTrigger } from "@/src/components/search-palette";
import ThemeToggle from "@/src/components/theme-toggle";
import { type SeoKind, seoKinds, seoSections } from "@/src/lib/site-file-nav";

type Section = "atlas" | "projects" | "packages" | "docs" | "search" | "seo";

const links = [
  { href: "/", label: "Atlas", section: "atlas" },
  { href: "/projects/", label: "Projects", section: "projects" },
  { href: "/packages/", label: "Packages", section: "packages" },
  { href: "/docs/", label: "Docs", section: "docs" },
  { href: "/search/", label: "Search", section: "search" },
] as const;

/** Native details keeps the resource links usable before or without JavaScript. */
function SeoMenu({
  active,
  current,
  notFound,
  onSelect,
}: {
  active: boolean;
  current?: SeoKind;
  notFound: boolean;
  onSelect?: () => void;
}) {
  const pathname = usePathname();
  const currentPath = notFound
    ? "/404.html"
    : pathname && pathname !== "/"
      ? `${pathname.replace(/\/+$/, "")}/`
      : pathname;
  const pageHref = currentPath
    ? `/seo/pages/?page=${encodeURIComponent(currentPath)}`
    : "/seo/pages/";
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function dismiss(event: PointerEvent) {
      if (menu.current && !menu.current.contains(event.target as Node)) menu.current.open = false;
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);
  const close = () => {
    if (menu.current) menu.current.open = false;
  };
  return (
    <details
      className="site-seo-menu"
      ref={menu}
      onKeyDown={(event) => {
        if (event.key === "Escape" && menu.current?.open) {
          event.preventDefault();
          event.stopPropagation();
          close();
          menu.current?.querySelector("summary")?.focus();
        }
      }}
    >
      <summary className="site-seo-menu-trigger" data-active={active ? "true" : undefined}>
        <ScanSearch size={15} aria-hidden="true" />
        <span>SEO</span>
        <ChevronDown className="site-seo-chevron" size={13} aria-hidden="true" />
      </summary>
      <ul className="site-seo-menu-list" aria-label="SEO resources">
        {seoKinds.map((kind) => {
          const item = seoSections[kind];
          return (
            <li key={kind}>
              <Link
                href={kind === "pages" ? pageHref : `/seo/${kind}/`}
                aria-current={active && current === kind ? "page" : undefined}
                onClick={() => {
                  close();
                  onSelect?.();
                }}
              >
                <span className="site-seo-menu-icon" aria-hidden="true">
                  <item.Icon size={17} />
                </span>
                <span className="site-seo-menu-copy">
                  <strong>{item.label}</strong>
                  <small>{item.menuDescription}</small>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

function NavigationLinks({
  active,
  seoKind,
  onSelect,
}: {
  active?: Section;
  seoKind?: SeoKind;
  onSelect?: () => void;
}) {
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
      <SeoMenu
        active={active === "seo"}
        current={seoKind}
        notFound={active === undefined}
        onSelect={onSelect}
      />
      <a href="https://github.com/Archont561" onClick={onSelect}>
        <Github size={15} aria-hidden="true" /> GitHub
      </a>
    </>
  );
}

/** Native details keeps the mobile navigation usable before or without JavaScript. */
export default function SiteHeader({ active, seoKind }: { active?: Section; seoKind?: SeoKind }) {
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
          <NavigationLinks active={active} seoKind={seoKind} />
        </nav>
        <div className="site-header-actions">
          <ThemeToggle />
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
              <NavigationLinks active={active} seoKind={seoKind} onSelect={closeMenu} />
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
