import { existsSync, mkdtempSync, readlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "@archont561/bun-test-utils";
import {
  checkDocsLinks,
  linkArguments,
  normalizeBasePath,
} from "@/src/maintenance/docs-link-check.ts";
import { writeFixture } from "@/tests/fixtures/task009.ts";

interface Fixtures {
  tmpdir: { dir: string };
}
function docsFixture(root: string): void {
  writeFixture(root, "README.md", "# Readme\n[docs](docs/index.mdx)\n");
  writeFixture(root, "docs/index.mdx", "# Docs\n");
  writeFixture(root, ".lychee.toml", "timeout = 10\n");
  writeFixture(root, "out/index.html", "<html></html>");
}

test
  .scenario<Fixtures>("Link checking: remap project prefix to the local export")
  .given("a static export and documentation", ({ tmpdir }) => {
    docsFixture(tmpdir.dir);
    return { root: tmpdir.dir };
  })
  .when("link checking is prepared with a project prefix", ({ root }) => {
    const stage = mkdtempSync(join(tmpdir(), "links-test-"));
    const args = linkArguments(
      { root, siteDir: "out", basePath: "/project", offline: true },
      stage,
    );
    const linked = readlinkSync(join(stage, "project"));
    rmSync(stage, { recursive: true, force: true });
    return { args, linked };
  })
  .then(
    "published URLs map to the export and the prefixed root exists",
    ({ root, args, linked, expect }) => {
      expect(linked).toBe(join(root, "out"));
      expect(args).toContain("--remap");
      expect(args).toContain("--offline");
      expect(args.join(" ")).toContain("archont561\\.github\\.io/project/");
      expect(args).toContain("out/index.html");
    },
  );

test
  .scenario<Fixtures>("Link checking: root hosting and unsafe prefixes")
  .given("a static export", ({ tmpdir }) => {
    docsFixture(tmpdir.dir);
    return { root: tmpdir.dir };
  })
  .when("root hosting is prepared", ({ root }) => {
    const stage = mkdtempSync(join(tmpdir(), "links-root-"));
    const args = linkArguments({ root, siteDir: "out" }, stage);
    const empty = !existsSync(join(stage, "project"));
    rmSync(stage, { recursive: true, force: true });
    return { args, empty };
  })
  .then("the export is the root and traversal is rejected", ({ root, args, empty, expect }) => {
    expect(args[args.indexOf("--root-dir") + 1]).toBe(join(root, "out"));
    expect(empty).toBe(true);
    expect(() => normalizeBasePath("/../secret")).toThrow("Unsafe");
    expect(() => normalizeBasePath("/%2e%2e/secret")).toThrow("Unsafe");
  });

test
  .scenario<Fixtures>("Link checking: propagate a failing process")
  .given("documentation and a failing lychee executable", ({ tmpdir }) => {
    docsFixture(tmpdir.dir);
    return { root: tmpdir.dir };
  })
  .when("the checker runs", ({ root }) => {
    try {
      checkDocsLinks({ root, binary: "/bin/false", offline: true });
      return { message: "" };
    } catch (error) {
      return { message: String(error) };
    }
  })
  .then("its failure reaches the caller", ({ message, expect }) => {
    expect(message).toContain("lychee failed");
  });

test
  .scenario<Fixtures>("Link checking: validate source routes without a build")
  .given("documentation with a page and a section index", ({ tmpdir }) => {
    docsFixture(tmpdir.dir);
    writeFixture(tmpdir.dir, "docs/about.mdx", "# About\n");
    writeFixture(tmpdir.dir, "docs/guides/index.mdx", "# Guides\n");
    return { root: tmpdir.dir };
  })
  .when("source-only link checking is prepared", ({ root }) => {
    const stage = mkdtempSync(join(tmpdir(), "links-source-"));
    try {
      const args = linkArguments({ root, offline: true }, stage);
      return {
        root: args[args.indexOf("--root-dir") + 1],
        indexFiles: args[args.indexOf("--index-files") + 1],
        about: readlinkSync(join(stage, "docs/about/index.mdx")),
        guides: readlinkSync(join(stage, "docs/guides/index.mdx")),
      };
    } finally {
      rmSync(stage, { recursive: true, force: true });
    }
  })
  .then(
    "published routes resolve to their MDX sources",
    ({ root, indexFiles, about, guides, expect }) => {
      expect(root).toContain("links-source-");
      expect(indexFiles).toBe("index.mdx,index.html");
      expect(about).toEndWith("docs/about.mdx");
      expect(guides).toEndWith("docs/guides/index.mdx");
    },
  );

test
  .scenario<Fixtures>("Link checking: reject ambiguous documentation routes")
  .given("two pages with the same published slug", ({ tmpdir }) => {
    docsFixture(tmpdir.dir);
    writeFixture(tmpdir.dir, "docs/guides.mdx", "# Guides\n");
    writeFixture(tmpdir.dir, "docs/guides/index.mdx", "# Guides\n");
    return { root: tmpdir.dir };
  })
  .when("source-only checking is prepared", ({ root }) => {
    const stage = mkdtempSync(join(tmpdir(), "links-duplicate-"));
    try {
      try {
        linkArguments({ root }, stage);
        return { message: "" };
      } catch (error) {
        return { message: String(error) };
      }
    } finally {
      rmSync(stage, { recursive: true, force: true });
    }
  })
  .then("the duplicate route fails closed", ({ message, expect }) => {
    expect(message).toContain("Duplicate documentation route");
  });
