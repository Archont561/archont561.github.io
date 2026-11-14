import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { expect, test } from "@archont561/bun-test-utils";
import {
  buildPackageDirectory,
  countRelations,
  familyId,
  installGuidance,
  packageFilterCss,
  type RegistryCapture,
  type RegistryManifest,
} from "@/src/lib/package-directory";
import { loadProjectCatalog } from "@/src/lib/project-catalog";

const root = resolve(import.meta.dir, "../../..");
const capture = JSON.parse(
  readFileSync(join(root, "data/packages.json"), "utf8"),
) as RegistryCapture;
const manifest = JSON.parse(
  readFileSync(join(root, "data/packages-manifest.json"), "utf8"),
) as RegistryManifest;
const projects = loadProjectCatalog(root).projects;
const hasPage = (slug: string) => existsSync(join(root, "docs/projects", `${slug}.mdx`));
const build = (snapshot = capture, curated = manifest) =>
  buildPackageDirectory(snapshot, curated, { projects, hasProjectPage: hasPage });

function entry(registry: string, name: string) {
  const section = build().registries.find((item) => item.name === registry);
  const item = section?.packages.find((item) => item.evidence.name === name);
  if (!section || !item) throw new Error(`Missing fixture ${registry}/${name}`);
  return { registry: section, item };
}

test("families use curated repositories and explicit same-registry aliases, not name similarity", () => {
  const directory = build();
  const qgis = entry("npm", "@archont561/qgis-sdk").item.family;
  expect(qgis?.repo).toBe("Archont561/qgis-sdk");
  expect(qgis?.projectPage).toBe("/docs/projects/qgis-sdk/");
  for (const [registry, name] of [
    ["npm", "qgis-sdk"],
    ["npm", "@archont561/qgis-sdk-ui"],
    ["npm", "qgis-sdk-ui"],
    ["pypi", "qgis-sdk"],
    ["pypi", "qgis-sdk-runtime"],
    ["pypi", "qgis-sdk-tools"],
    ["prefix", "qgis-sdk"],
    ["prefix", "qgis-sdk-runtime"],
    ["prefix", "qgis-sdk-tools"],
  ] as const) {
    expect(entry(registry, name).item.family?.id).toBe(qgis?.id);
  }
  const upstream = entry("prefix", "cloudcompare").item;
  expect(upstream.curated.relation).toBe("upstream");
  expect(upstream.family?.repo).toBe("Archont561/CloudCompare-conda");
  expect(upstream.family?.projectPage).toBe("/docs/projects/cloudcompare-conda/");
  const rude = entry("pypi", "rude-clean-code").item;
  expect(rude.family?.repo).toBe("Archont561/rude-clean-code");
  expect(rude.family?.projectPage).toBeUndefined();
  expect(directory.families).toHaveLength(6);
  expect(
    directory.registries.flatMap((registry) => registry.packages).filter((item) => !item.family),
  ).toHaveLength(11);
});

test("unmapped rows stay unmapped even when captured repository metadata or names suggest a project", () => {
  const snapshot = structuredClone(capture);
  const npm = snapshot.registries.find((registry) => registry.name === "npm");
  const prefix = snapshot.registries.find((registry) => registry.name === "prefix");
  if (!npm || !prefix) throw new Error("Missing fixture registries");
  const pathway = npm.packages.find((item) => item.name === "@archont561/pathway");
  const playtest = npm.packages.find((item) => item.name === "@archont561/playtest");
  const unreviewed = prefix.packages.find((item) => item.name === "fastrasterfilter");
  if (!pathway || !playtest || !unreviewed) throw new Error("Missing unmapped fixtures");
  pathway.repository = "https://github.com/Archont561/qgis-sdk";
  unreviewed.repository = "https://github.com/Archont561/CloudCompare-conda";
  expect(playtest.repository).toContain("Archont561/playtest");
  const directory = build(snapshot);
  for (const name of [pathway.name, playtest.name, unreviewed.name]) {
    const item = directory.registries
      .flatMap((registry) => registry.packages)
      .find((row) => row.evidence.name === name);
    expect(item && familyId(item)).toBe("unmapped");
  }
});

test("cyclic aliases and missing project pages never acquire invented families or links", () => {
  const snapshot = structuredClone(capture);
  const curated = structuredClone(manifest);
  for (const source of [snapshot, curated]) {
    const packages = source.registries.find((registry) => registry.name === "npm")?.packages;
    const first = packages?.find((item) => item.name === "qgis-sdk");
    const second = packages?.find((item) => item.name === "qgis-sdk-ui");
    if (!first || !second) throw new Error("Missing aliases");
    first.alias_of = second.name;
    second.alias_of = first.name;
  }
  const directory = build(snapshot, curated);
  const aliases =
    directory.registries[0]?.packages.filter((item) => item.curated.relation === "alias") ?? [];
  expect(aliases.map(familyId)).toEqual(["unmapped", "unmapped"]);
  expect(
    buildPackageDirectory(capture, manifest, {
      projects,
      hasProjectPage: () => false,
    }).families.every((family) => !family.projectPage),
  ).toBe(true);
});

test("refuses inconsistent curation instead of displaying stale or partial data", () => {
  const snapshot = structuredClone(capture);
  const first = snapshot.registries[0]?.packages[0];
  if (!first) throw new Error("Missing first fixture");
  first.repo = "someone/else";
  expect(() => build(snapshot)).toThrow(/differs from manifest on repo/);
  expect(() => build({ ...capture, registries: capture.registries.slice(1) })).toThrow(/complete/);
  const wrongRegistry = structuredClone(capture);
  if (!wrongRegistry.registries[0]) throw new Error("Missing registry fixture");
  wrongRegistry.registries[0].url = "https://example.com";
  expect(() => build(wrongRegistry)).toThrow(/Registry metadata differs/);
  const invalid = structuredClone(manifest);
  const invalidSnapshot = structuredClone(capture);
  const badCurated = invalid.registries[0]?.packages[0];
  const badEvidence = invalidSnapshot.registries[0]?.packages[0];
  if (!badCurated || !badEvidence) throw new Error("Missing first fixture");
  badCurated.repo = "../unsafe";
  badEvidence.repo = badCurated.repo;
  expect(() => build(invalidSnapshot, invalid)).toThrow(/Invalid curated repository/);
});

test("relation counts distinguish registry entries from projects", () => {
  const directory = build();
  expect(
    directory.registries.map((registry) => [
      registry.name,
      registry.packages.length,
      countRelations(registry),
    ]),
  ).toEqual([
    ["npm", 12, { authored: 4, alias: 2, reserved: 6 }],
    ["pypi", 5, { authored: 5 }],
    ["prefix", 9, { authored: 4, upstream: 1, unreviewed: 4 }],
  ]);
});

test("installation guidance follows captured versions and curated relations", () => {
  const directory = build();
  const channel = capture.identity.prefix.install_channel ?? "";
  const alias = entry("npm", "qgis-sdk");
  expect(installGuidance(alias.item, alias.registry, channel)).toEqual({
    label: "Install the canonical package",
    command: "npm install @archont561/qgis-sdk",
  });
  for (const item of directory.registries[0]?.packages.filter(
    (row) => row.curated.relation === "reserved",
  ) ?? []) {
    expect(item.evidence.version).toBe("0.0.0");
    expect(item.evidence.published).toBeTruthy();
    expect(
      installGuidance(item, directory.registries[0] as typeof alias.registry, channel),
    ).toBeUndefined();
  }
  const python = entry("pypi", "qgis-sdk");
  expect(python.item.evidence.version).toBe("0.10.0");
  expect(entry("npm", "@archont561/qgis-sdk").item.evidence.version).toBe("0.7.0");
  expect(installGuidance(python.item, python.registry, channel)?.command).toBe(
    "pip install qgis-sdk",
  );
  const upstream = entry("prefix", "cloudcompare");
  expect(installGuidance(upstream.item, upstream.registry, channel)?.label).toContain(
    "upstream software",
  );
  const unreviewed = entry("prefix", "fastrasterfilter");
  expect(installGuidance(unreviewed.item, unreviewed.registry, channel)?.label).toContain(
    "authorship unreviewed",
  );
  expect(installGuidance(unreviewed.item, unreviewed.registry, channel)?.command).toBe(
    `pixi add --channel ${channel} fastrasterfilter`,
  );
});

test("compiled filters have safe identifiers and a no-match rule without modern selectors", () => {
  const directory = build();
  const css = packageFilterCss(directory);
  for (const family of directory.families) {
    expect(family.id).toMatch(/^project-\d+$/);
    expect(css).toContain(`#family-filter-${family.id}:checked`);
  }
  expect(css).toContain("#family-filter-unmapped:checked");
  expect(css).toContain("#relation-filter-reserved:checked");
  expect(css).toContain(".package-empty { display: block; }");
  expect(css).not.toContain(":has(");
  expect(css).not.toContain("</style>");
});
