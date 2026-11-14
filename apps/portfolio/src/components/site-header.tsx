"use client";

import { ChevronDown, Github, Menu, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import BrandMark from "@/src/components/brand-mark";
import { SearchTrigger } from "@/src/components/search-palette";
import ThemeToggle from "@/src/components/theme-toggle";
import { type PreviewPageKind, type ResourceGroup, resourceMenus } from "@/src/lib/site-file-nav";

type Section = "atlas" | "projects" | "packages" | "docs" | "search" | ResourceGroup;

const links = [
  { href: "/", label: "Atlas", section: "atlas" },
  { href: "/projects/", label: "Projects", section: "projects" },
  { href: "/packages/", label: "Packages", section: "packages" },
  { href: "/docs/", label: "Docs", section: "docs" },
  { href: "/search/", label: "Search", section: "search" },
] as const;

function ResourceMenuList({
  group,
  active,
  current,
  pageHref,
  onSelect,
}: {
  group: ResourceGroup;
  active: boolean;
  current?: PreviewPageKind;
  pageHref: string;
  onSelect: () => void;
}) {
  const { ariaLabel, links: resources } = resourceMenus[group];
  return (
    <ul className="site-seo-menu-list" aria-label={ariaLabel}>
      {resources.map((item) => {
        const Anchor = item.raw ? "a" : Link;
        return (
          <li key={item.href}>
            <Anchor
              href={item.previewKind === "pages" ? pageHref : item.href}
              aria-current={
                active && item.previewKind && item.previewKind === current ? "page" : undefined
              }
              onClick={onSelect}
            >
              <span className="site-seo-menu-icon" aria-hidden="true">
                <item.Icon size={17} />
              </span>
              <span className="site-seo-menu-copy">
                <strong>{item.label}</strong>
                <small>{item.menuDescription}</small>
              </span>
            </Anchor>
          </li>
        );
      })}
    </ul>
  );
}

/** Native details keeps both resource groups usable before or without JavaScript. */
function ResourceMenu({
  group,
  active,
  current,
  notFound,
  onSelect,
}: {
  group: ResourceGroup;
  active: boolean;
  current?: PreviewPageKind;
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
  const { label, Icon } = resourceMenus[group];
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
    // Reuse the existing disclosure styles for both groups, including old WebKit's baseline.
    <details
      className="site-seo-menu"
      data-resource-menu={group}
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
        <Icon size={15} aria-hidden="true" />
        <span>{label}</span>
        <ChevronDown className="site-seo-chevron" size={13} aria-hidden="true" />
      </summary>
      <ResourceMenuList
        group={group}
        active={active}
        current={current}
        pageHref={pageHref}
        onSelect={() => {
          close();
          onSelect?.();
        }}
      />
    </details>
  );
}

function NavigationLinks({
  active,
  previewKind,
  onSelect,
}: {
  active?: Section;
  previewKind?: PreviewPageKind;
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
      {(["seo", "machine"] as const).map((group) => (
        <ResourceMenu
          key={group}
          group={group}
          active={active === group}
          current={previewKind}
          notFound={active === undefined}
          onSelect={onSelect}
        />
      ))}
      <a href="https://github.com/Archont561" onClick={onSelect}>
        <Github size={15} aria-hidden="true" /> GitHub
      </a>
    </>
  );
}

/** Native details keeps the mobile navigation usable before or without JavaScript. */
export default function SiteHeader({
  active,
  previewKind,
}: {
  active?: Section;
  previewKind?: PreviewPageKind;
}) {
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
          <NavigationLinks active={active} previewKind={previewKind} />
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
              <NavigationLinks active={active} previewKind={previewKind} onSelect={closeMenu} />
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
