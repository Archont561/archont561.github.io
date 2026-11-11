import { test } from "@archont561/bun-test-utils";
import { renderProjectOutputs } from "@/scripts/project-render";
import { indexedPageToItem, matchingQuickLinks, mergePaletteItems } from "@/src/lib/palette-search";
import { loadProjectCatalog } from "@/src/lib/project-catalog";

interface Fixtures {
  tmpdir: { dir: string; write: (path: string, content: string) => string };
}

test
  .scenario<Fixtures>("A curated project appears consistently across portfolio outputs")
  .given("a project and its committed repository snapshot", ({ tmpdir }) => {
    tmpdir.write(
      "data/project-categories.json",
      JSON.stringify([{ id: "research", label: "Research" }]),
    );
    tmpdir.write(
      "data/repositories.json",
      JSON.stringify({
        retrieved: "2026-11-10",
        repositories: [
          {
            name: "atlas-sample",
            html_url: "https://github.com/Owner/atlas-sample",
            description: "A reproducible research project.",
            language: "TypeScript",
            topics: ["research"],
          },
        ],
      }),
    );
    tmpdir.write(
      "data/projects/atlas-sample.json",
      JSON.stringify({
        repository: "Owner/atlas-sample",
        category: "research",
        order: 1,
        featured: { home: true },
      }),
    );
    return { root: tmpdir.dir };
  })
  .when("the project catalog is rendered", ({ root }) => ({
    outputs: renderProjectOutputs(loadProjectCatalog(root)),
  }))
  .then("the client data, navigation, and documentation agree", ({ outputs, expect }) => {
    const view = JSON.parse(outputs.get("apps/portfolio/src/lib/projects.json") ?? "[]") as {
      slug: string;
      description: string;
      featured: { home: boolean };
    }[];
    const navigation = JSON.parse(outputs.get("docs/projects/meta.json") ?? "{}") as {
      pages: string[];
    };
    expect(view).toHaveLength(1);
    expect(view[0]).toMatchObject({
      slug: "atlas-sample",
      description: "A reproducible research project.",
      featured: { home: true },
    });
    expect(navigation.pages).toContain("atlas-sample");
    expect(outputs.get("docs/projects/index.mdx")).toContain("/docs/projects/atlas-sample");
    expect(outputs.get("docs/projects/atlas-sample.mdx")).toContain(
      "https://github.com/Owner/atlas-sample",
    );
  });

test
  .scenario("Search keeps local destinations and rejects an external index result")
  .given("quick links and indexed pages for a search", () => ({
    quick: matchingQuickLinks("documentation"),
    pages: [
      { url: "/docs/", meta: { title: "Duplicate documentation" } },
      { url: "/docs/projects/qgis-sdk/", meta: { title: "qgis-sdk" } },
      { url: "https://other.example/unsafe", meta: { title: "External" } },
    ],
  }))
  .when("the palette combines the results", ({ quick, pages }) => {
    const indexed = pages.flatMap((page) => {
      const item = indexedPageToItem(page, "https://archont561.github.io");
      return item ? [item] : [];
    });
    return { items: mergePaletteItems(quick, indexed) };
  })
  .then(
    "the documentation shortcut comes first and only safe, unique links remain",
    ({ items, expect }) => {
      expect(items.map((item) => item.url)).toEqual(["/docs/", "/docs/projects/qgis-sdk/"]);
    },
  );
