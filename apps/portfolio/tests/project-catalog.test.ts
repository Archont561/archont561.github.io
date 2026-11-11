import { afterEach, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { projectOutputChanges, writeProjectOutputs } from "@/scripts/project-outputs";
import { renderProjectOutputs } from "@/scripts/project-render";
import { loadProjectCatalog } from "@/src/lib/project-catalog";

const root = resolve(import.meta.dir, "../../..");
const temporaryRoots: string[] = [];

type FixtureProject = {
  repository: string;
  category: string;
  order: number;
  directorySummary?: string;
  descriptionOverride?: string;
  descriptionSource?: { kind: string; captured?: string };
  featured: { home: boolean };
};
type FixtureSnapshot = {
  retrieved: string;
  repositories: {
    name: string;
    html_url: string;
    description: string | null;
    language: string | null;
    topics: string[];
  }[];
};

function readJson<T>(base: string, path: string): T {
  return JSON.parse(readFileSync(join(base, path), "utf8")) as T;
}

function write(base: string, path: string, content: string): void {
  const file = join(base, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function writeJson(base: string, path: string, data: unknown): void {
  write(base, path, `${JSON.stringify(data, null, 2)}\n`);
}

function setProject(base: string, slug: string, updates: Partial<FixtureProject>): void {
  const path = `data/projects/${slug}.json`;
  writeJson(base, path, { ...readJson<FixtureProject>(base, path), ...updates });
}

function fixture(): string {
  const base = mkdtempSync(join(tmpdir(), "portfolio-projects-"));
  temporaryRoots.push(base);
  writeJson(base, "data/project-categories.json", [
    { id: "first", label: "First area" },
    { id: "second", label: "Second area" },
  ]);
  writeJson(base, "data/repositories.json", {
    retrieved: "2026-11-10",
    repositories: [
      {
        name: "alpha",
        html_url: "https://github.com/Owner/alpha",
        description: "Alpha snapshot description.",
        language: "TypeScript",
        topics: ["testing"],
      },
      {
        name: "Beta",
        html_url: "https://github.com/Owner/Beta",
        description: "Beta snapshot description.",
        language: "Rust",
        topics: [],
      },
    ],
  } satisfies FixtureSnapshot);
  writeJson(base, "data/projects/alpha.json", {
    repository: "Owner/alpha",
    category: "first",
    order: 20,
    directorySummary: "A short Alpha summary.",
    featured: { home: true },
  } satisfies FixtureProject);
  writeJson(base, "data/projects/beta.json", {
    repository: "Owner/Beta",
    category: "first",
    order: 10,
    descriptionOverride: "Beta editorial description.",
    descriptionSource: { kind: "curated" },
    featured: { home: false },
  } satisfies FixtureProject);
  return base;
}

afterEach(() => {
  for (const base of temporaryRoots.splice(0)) rmSync(base, { recursive: true, force: true });
});

test("retains the existing project URLs and the independent homepage selection", () => {
  const { projects } = loadProjectCatalog(root);
  const slugs = projects.map((project) => project.slug);
  for (const slug of [
    "qgis-agent-harness",
    "qgis-sdk",
    "cloudcompare-conda",
    "odm-conda",
    "pixi-sandbox",
    "universe",
    "staged-recipes-submit",
    "bun-test-utils",
    "playtest",
    "artifactspec",
    "skills",
    "pyshellforge",
    "clifacet",
  ]) {
    expect(slugs).toContain(slug);
  }
  for (const slug of ["qgis-sdk", "pixi-sandbox", "playtest"]) {
    expect(projects.find((project) => project.slug === slug)?.featured.home).toBe(true);
  }
  expect(projects.find((project) => project.slug === "qgis-agent-harness")?.featured.home).toBe(
    false,
  );
});

test("preserves editorial differences and records where facts came from", () => {
  const { projects } = loadProjectCatalog(root);
  const qgis = projects.find((project) => project.slug === "qgis-sdk");
  const clifacet = projects.find((project) => project.slug === "clifacet");
  const pixi = projects.find((project) => project.slug === "pixi-sandbox");
  expect(qgis?.description).toBe(
    "Python-first SDK and TypeScript QWebEngineView bridge for building typed, testable QGIS 4 plugins",
  );
  expect(qgis?.descriptionSource).toEqual({ kind: "legacy-github", captured: "2026-11-09" });
  expect(qgis?.notes).toContain("## Upstream guides");
  expect(clifacet?.description).toBe("A Rust library for command-line presentation modes.");
  expect(clifacet?.metadataCategory).toBe("Developer automation");
  if (!pixi?.repositoryCaptured) throw new Error("Missing pixi-sandbox snapshot");
  expect(pixi.descriptionSource).toEqual({
    kind: "snapshot",
    captured: pixi.repositoryCaptured,
  });
});

test("committed generated pages, navigation, and client data are current", () => {
  const outputs = renderProjectOutputs(loadProjectCatalog(root));
  expect(projectOutputChanges(root, outputs)).toEqual({ stale: [], orphaned: [], unmanaged: [] });
});

test("joins snapshot facts, orders projects, and renders every surface", () => {
  const base = fixture();
  write(base, "data/projects/alpha.mdx", "## Alpha details\n\nA project-specific note.\n");
  const catalog = loadProjectCatalog(base);
  expect(catalog.projects.map((project) => project.slug)).toEqual(["beta", "alpha"]);
  const alpha = catalog.projects[1];
  expect(alpha).toMatchObject({
    name: "alpha",
    description: "Alpha snapshot description.",
    language: "TypeScript",
    topics: ["testing"],
    number: 2,
    descriptionSource: { kind: "snapshot", captured: "2026-11-10" },
  });
  const outputs = renderProjectOutputs(catalog);
  const meta = JSON.parse(outputs.get("docs/projects/meta.json") ?? "null") as {
    pages: string[];
  };
  expect(meta.pages).toEqual(["index", "---First area---", "beta", "alpha"]);
  expect(outputs.get("docs/projects/index.mdx")).toContain("A short Alpha summary.");
  expect(outputs.get("docs/projects/beta.mdx")).toContain(
    "curated from public project information",
  );
  expect(outputs.get("docs/projects/alpha.mdx")).toContain(
    "## Alpha details\n\nA project-specific note.",
  );
  expect(outputs.get("docs/projects/alpha.mdx")).toContain("captured on November 10, 2026");
  const view = JSON.parse(outputs.get("apps/portfolio/src/lib/projects.json") ?? "null") as {
    slug: string;
    featured: { home: boolean };
  }[];
  expect(view.filter((project) => project.featured.home).map((project) => project.slug)).toEqual([
    "alpha",
  ]);
});

test("refreshes snapshot-backed facts without overwriting an editorial description", () => {
  const base = fixture();
  const snapshot = readJson<FixtureSnapshot>(base, "data/repositories.json");
  if (!snapshot.repositories[0] || !snapshot.repositories[1]) throw new Error("Missing fixtures");
  snapshot.retrieved = "2026-11-11";
  snapshot.repositories[0].description = "Updated Alpha description.";
  snapshot.repositories[0].language = "Python";
  snapshot.repositories[1].description = "Updated Beta snapshot description.";
  writeJson(base, "data/repositories.json", snapshot);
  const catalog = loadProjectCatalog(base);
  expect(catalog.projects[1]).toMatchObject({
    description: "Updated Alpha description.",
    language: "Python",
    repositoryCaptured: "2026-11-11",
  });
  expect(catalog.projects[0]?.description).toBe("Beta editorial description.");
  const outputs = renderProjectOutputs(catalog);
  expect(outputs.get("docs/projects/alpha.mdx")).toContain("Updated Alpha description.");
  expect(outputs.get("apps/portfolio/src/lib/projects.json")).toContain(
    "Updated Alpha description.",
  );
});

test("requires an explicit source and uses an honest fallback for an uncaptured repository", () => {
  const base = fixture();
  setProject(base, "alpha", { repository: "Owner/not-captured" });
  expect(() => loadProjectCatalog(base)).toThrow("No usable snapshot description for alpha");
  setProject(base, "alpha", {
    descriptionOverride: "A curated project.",
    descriptionSource: { kind: "curated" },
  });
  const catalog = loadProjectCatalog(base);
  const alpha = catalog.projects.find((project) => project.slug === "alpha");
  expect(alpha).toMatchObject({
    name: "not-captured",
    url: "https://github.com/Owner/not-captured",
    language: null,
    topics: [],
    repositoryCaptured: null,
  });
  expect(renderProjectOutputs(catalog).get("docs/projects/alpha.mdx")).toContain(
    "Primary language: not recorded in the committed repository snapshot",
  );
});

test("escapes plain data in Markdown and quotes frontmatter", () => {
  const base = fixture();
  setProject(base, "alpha", {
    descriptionOverride: 'Quoted "words": <example> & {things}',
    descriptionSource: { kind: "curated" },
    directorySummary: "[A] & <B> {C}",
  });
  const outputs = renderProjectOutputs(loadProjectCatalog(base));
  expect(outputs.get("docs/projects/alpha.mdx")).toContain(
    `description: ${JSON.stringify('Quoted "words": <example> & {things}')}`,
  );
  expect(outputs.get("docs/projects/index.mdx")).toContain("\\[A\\] &amp; &lt;B&gt; \\{C\\}");
});

test("rejects unknown categories and duplicate orders", () => {
  const base = fixture();
  setProject(base, "alpha", { category: "missing" });
  expect(() => loadProjectCatalog(base)).toThrow("Unknown category for alpha");
  setProject(base, "alpha", { category: "first", order: 10 });
  expect(() => loadProjectCatalog(base)).toThrow("Duplicate project order");
});

test("rejects incomplete overrides and invalid dates", () => {
  const base = fixture();
  setProject(base, "alpha", { descriptionOverride: "An override." });
  expect(() => loadProjectCatalog(base)).toThrow("Description overrides and their source");
  setProject(base, "alpha", { descriptionSource: { kind: "github", captured: "2026-02-30" } });
  expect(() => loadProjectCatalog(base)).toThrow("Invalid project data");
});

test("rejects unsafe slugs, repository paths, and orphaned project notes", () => {
  const base = fixture();
  setProject(base, "alpha", { repository: "../alpha" });
  expect(() => loadProjectCatalog(base)).toThrow("Invalid repository identity");
  setProject(base, "alpha", { repository: "Owner/alpha" });
  write(base, "data/projects/missing.mdx", "Unmatched notes");
  expect(() => loadProjectCatalog(base)).toThrow("Project notes have no matching JSON record");
  rmSync(join(base, "data/projects/missing.mdx"));
  writeJson(base, "data/projects/index.json", {});
  expect(() => loadProjectCatalog(base)).toThrow("Invalid or reserved project slug");
});

test("rejects misspelled fields rather than silently discarding them", () => {
  const base = fixture();
  const project = readJson<FixtureProject>(base, "data/projects/alpha.json");
  writeJson(base, "data/projects/alpha.json", { ...project, featuredHome: true });
  expect(() => loadProjectCatalog(base)).toThrow("Invalid project data");
});

test("checks for drift without writing and generates idempotently", () => {
  const base = fixture();
  const outputs = renderProjectOutputs(loadProjectCatalog(base));
  expect(projectOutputChanges(base, outputs).stale).toHaveLength(outputs.size);
  expect(existsSync(join(base, "docs/projects/alpha.mdx"))).toBe(false);
  expect(writeProjectOutputs(base, outputs, { adoptExisting: false }).stale).toHaveLength(
    outputs.size,
  );
  expect(projectOutputChanges(base, outputs)).toEqual({ stale: [], orphaned: [], unmanaged: [] });
  expect(writeProjectOutputs(base, outputs, { adoptExisting: false }).stale).toEqual([]);
});

test("does not overwrite unmarked project content without explicit adoption", () => {
  const base = fixture();
  const outputs = renderProjectOutputs(loadProjectCatalog(base));
  const path = "docs/projects/alpha.mdx";
  write(base, path, "Hand-written content.\n");
  expect(() => writeProjectOutputs(base, outputs, { adoptExisting: false })).toThrow(
    "Refusing to overwrite unmarked project pages",
  );
  expect(readFileSync(join(base, path), "utf8")).toBe("Hand-written content.\n");
  writeProjectOutputs(base, outputs, { adoptExisting: true });
  expect(readFileSync(join(base, path), "utf8")).toContain("Generated from data/projects");
});

test("removes only orphaned generated pages and refuses unmanaged extras", () => {
  const base = fixture();
  writeProjectOutputs(base, renderProjectOutputs(loadProjectCatalog(base)), {
    adoptExisting: false,
  });
  rmSync(join(base, "data/projects/alpha.json"));
  const outputs = renderProjectOutputs(loadProjectCatalog(base));
  expect(projectOutputChanges(base, outputs).orphaned).toEqual(["docs/projects/alpha.mdx"]);
  writeProjectOutputs(base, outputs, { adoptExisting: false });
  expect(existsSync(join(base, "docs/projects/alpha.mdx"))).toBe(false);
  write(base, "docs/projects/manual.mdx", "Keep my content.\n");
  expect(projectOutputChanges(base, outputs).unmanaged).toEqual(["docs/projects/manual.mdx"]);
  expect(() => writeProjectOutputs(base, outputs, { adoptExisting: true })).toThrow(
    "Unmanaged project pages have no data record",
  );
  expect(readFileSync(join(base, "docs/projects/manual.mdx"), "utf8")).toBe("Keep my content.\n");
});

test("rejects output paths outside the managed destinations", () => {
  const base = fixture();
  expect(() => projectOutputChanges(base, new Map([["../outside.mdx", "unsafe"]]))).toThrow(
    "Unsafe generated path",
  );
});
