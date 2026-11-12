import { expect, test } from "@archont561/bun-test-utils";
import {
  feedFormat,
  jsonFeedPreview,
  robotsPreview,
  siteFileViewMode,
  sitePath,
} from "@/src/lib/site-file-preview";

test("feed format selection is restricted to known static files", () => {
  expect(feedFormat(null)).toBe("rss");
  expect(feedFormat("atom")).toBe("atom");
  expect(feedFormat("json")).toBe("json");
  expect(feedFormat("../../robots.txt")).toBe("rss");
});

test("view mode selection defaults safely and accepts the available modes", () => {
  expect(siteFileViewMode(null)).toBe("rendered");
  expect(siteFileViewMode("rendered")).toBe("rendered");
  expect(siteFileViewMode("source")).toBe("source");
  expect(siteFileViewMode("both")).toBe("both");
  expect(siteFileViewMode("invalid")).toBe("rendered");
});

test("only safe links to this site become local preview links", () => {
  expect(sitePath("https://archont561.github.io/docs/projects/qgis-sdk/#overview")).toBe(
    "/docs/projects/qgis-sdk/#overview",
  );
  expect(sitePath("/docs/?query=yes")).toBe("/docs/?query=yes");
  for (const value of [
    "",
    " ",
    "javascript:alert(1)",
    "https://evil.example/",
    "//evil.example/",
    "https://archont561.github.io//evil.example/",
    "https://archont561.github.io.evil.example/",
    "https://user@archont561.github.io/",
  ]) {
    expect(sitePath(value)).toBeNull();
  }
});

test("JSON Feed previews keep descriptions as text and reject unsafe links", () => {
  const preview = jsonFeedPreview(
    JSON.stringify({
      title: "Field notes",
      items: [
        {
          title: "One",
          content_text: "<script>alert(1)</script>",
          url: "https://archont561.github.io/docs/",
        },
        {
          title: "Two",
          content_text: "Other",
          url: "javascript:alert(1)",
          date_modified: "2024-02-29T00:00:00Z",
        },
      ],
    }),
  );
  expect(preview.items).toEqual([
    { title: "One", description: "<script>alert(1)</script>", path: "/docs/" },
    { title: "Two", description: "Other", path: null, date: "2024-02-29T00:00:00Z" },
  ]);
  expect(() => jsonFeedPreview('{"items":{}}')).toThrow();
  expect(() => jsonFeedPreview("not json")).toThrow();
});

test("robots preview preserves directive values, including URLs with colons", () => {
  expect(
    robotsPreview(
      "# Policy\nUser-agent: *\nAllow: /\n\nSitemap: https://example.test/sitemap.xml\n",
    ),
  ).toEqual([
    { line: 1, directive: "User-agent", value: "*" },
    { line: 2, directive: "Allow", value: "/" },
    { line: 4, directive: "Sitemap", value: "https://example.test/sitemap.xml" },
  ]);
});
