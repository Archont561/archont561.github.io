import { describe, expect, test } from "@archont561/bun-test-utils";
import {
  indexedPageToItem,
  matchingQuickLinks,
  mergePaletteItems,
  quickLinks,
} from "@/src/lib/palette-search";

const origin = "https://archont561.github.io";

describe("palette quick links", () => {
  test("show all destinations for an empty query", () => {
    expect(matchingQuickLinks("  ")).toEqual(quickLinks);
    expect(quickLinks.map((item) => item.url)).toEqual(["/", "/projects/", "/packages/", "/docs/"]);
  });

  test("match all words regardless of case or whitespace", () => {
    expect(matchingQuickLinks("  DOCS   guides  ").map((item) => item.url)).toEqual(["/docs/"]);
    expect(matchingQuickLinks("PROJECT atlas").map((item) => item.url)).toEqual(["/"]);
    expect(matchingQuickLinks("nothing matches here")).toEqual([]);
  });
});

describe("Pagefind result handling", () => {
  test("preserves same-origin paths, fragments, titles, and plain excerpts", () => {
    expect(
      indexedPageToItem(
        {
          url: `${origin}/docs/projects/qgis-sdk/?from=search#overview`,
          meta: { title: "qgis-sdk" },
          plain_excerpt: "A QGIS SDK.",
        },
        origin,
      ),
    ).toEqual({
      title: "qgis-sdk",
      description: "A QGIS SDK.",
      url: "/docs/projects/qgis-sdk/?from=search#overview",
      kind: "document",
    });
    expect(indexedPageToItem({ url: "/docs/" }, origin)).toEqual({
      title: "Untitled document",
      description: "Documentation",
      url: "/docs/",
      kind: "document",
    });
  });

  test("rejects external, script, and malformed destinations", () => {
    for (const url of [
      "https://example.com/docs/",
      "//example.com/docs/",
      "https://archont561.github.io.example.com/",
      "javascript:alert(1)",
      "data:text/html,example",
      "http://[",
    ]) {
      expect(indexedPageToItem({ url }, origin)).toBeNull();
    }
  });

  test("deduplicates URLs while keeping quick links ahead of indexed results", () => {
    const docs = indexedPageToItem({ url: "/docs/", meta: { title: "Docs" } }, origin);
    const project = indexedPageToItem({ url: "/docs/projects/qgis-sdk/" }, origin);
    const quickDocs = quickLinks.find((item) => item.url === "/docs/");
    if (!docs || !project || !quickDocs) throw new Error("Expected same-origin pages");
    expect(mergePaletteItems([quickDocs], [docs, project, project])).toEqual([quickDocs, project]);
  });
});
