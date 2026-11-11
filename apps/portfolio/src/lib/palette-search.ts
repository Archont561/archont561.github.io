export type PaletteItem = {
  title: string;
  description: string;
  url: string;
  kind: "page" | "document";
};

export type IndexedPage = {
  url: string;
  meta?: { title?: string };
  plain_excerpt?: string;
};

export const quickLinks: PaletteItem[] = [
  {
    title: "Explore the atlas",
    description: "Open the project overview",
    url: "/",
    kind: "page",
  },
  {
    title: "Project directory",
    description: "Browse and filter the public workspace",
    url: "/projects/",
    kind: "page",
  },
  {
    title: "Package directory",
    description: "Browse registry snapshots",
    url: "/packages/",
    kind: "page",
  },
  {
    title: "Documentation",
    description: "Browse guides and project notes",
    url: "/docs/",
    kind: "page",
  },
];

export function matchingQuickLinks(query: string): PaletteItem[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return quickLinks.filter((item) => {
    const text = `${item.title} ${item.description} ${item.url}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });
}

/** Only navigate to same-origin results returned by the static Pagefind index. */
export function indexedPageToItem(page: IndexedPage, origin: string): PaletteItem | null {
  try {
    const url = new URL(page.url, origin);
    if (url.origin !== origin || !url.pathname.startsWith("/")) return null;
    return {
      title: page.meta?.title || "Untitled document",
      description: page.plain_excerpt || "Documentation",
      url: `${url.pathname}${url.search}${url.hash}`,
      kind: "document",
    };
  } catch {
    return null;
  }
}

export function mergePaletteItems(quick: PaletteItem[], results: PaletteItem[]): PaletteItem[] {
  const seen = new Set<string>();
  return [...quick, ...results].filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}
