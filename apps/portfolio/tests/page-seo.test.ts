import { expect, test } from "@archont561/bun-test-utils";
import { type InspectablePage, localSeoImage, selectedPage, seoValue } from "@/src/lib/page-seo";

const pages: InspectablePage[] = [
  { path: "/", label: "Home", group: "Site" },
  { path: "/docs/", label: "Docs", group: "Documentation" },
];

test("the page inspector accepts only known local pages", () => {
  expect(selectedPage("/", pages)).toBe("/");
  expect(selectedPage("/docs/", pages)).toBe("/docs/");
  for (const value of [null, "/missing/", "https://evil.example/", "//evil.example/", "/docs/?x=1"])
    expect(selectedPage(value, pages)).toBeNull();
});

test("Open Graph image previews only load safe same-site URLs", () => {
  expect(localSeoImage("/brand/card.png")).toBe("/brand/card.png");
  expect(localSeoImage("https://archont561.github.io/brand/card.png")).toBe("/brand/card.png");
  expect(localSeoImage("cover.png", "/docs/example/")).toBe("/docs/example/cover.png");
  expect(localSeoImage("../card.png", "/docs/example/")).toBe("/docs/card.png");
  expect(localSeoImage("cover.png", "https://evil.example/")).toBeNull();
  for (const value of [
    "",
    "javascript:alert(1)",
    "https://evil.example/card.png",
    "//evil.example/card.png",
    "https://archont561.github.io//evil.example/card.png",
    "https://user@archont561.github.io/card.png",
  ])
    expect(localSeoImage(value)).toBeNull();
});

test("metadata lookups preserve the first declared value", () => {
  const data = {
    source: "",
    tags: [
      { name: "og:title", value: "First", source: "" },
      { name: "og:title", value: "Second", source: "" },
    ],
  };
  expect(seoValue(data, "og:title")).toBe("First");
  expect(seoValue(data, "og:image")).toBe("");
});
