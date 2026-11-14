import type { CatalogProject } from "@/src/lib/project-catalog";

export const REGISTRY_NAMES = ["npm", "pypi", "prefix"] as const;
export const RELATIONS = ["authored", "alias", "reserved", "upstream", "unreviewed"] as const;
export type RegistryName = (typeof REGISTRY_NAMES)[number];
export type Relation = (typeof RELATIONS)[number];

export type CuratedPackage = {
  name: string;
  relation: Relation;
  alias_of?: string;
  repo?: string;
  upstream?: string;
  note?: string;
};

export type CapturedPackage = CuratedPackage & {
  version?: string;
  description?: string;
  license?: string;
  published?: string;
  repository?: string;
  requires_python?: string;
  platforms?: string[];
  url: string;
};

export type Registry<T> = {
  name: RegistryName;
  label: string;
  ecosystem: string;
  url: string;
  packages: T[];
};

export type RegistryCapture = {
  owner: string;
  retrieved: string;
  identity: { prefix: { install_channel?: string } };
  registries: Registry<CapturedPackage>[];
};

export type RegistryManifest = { registries: Registry<CuratedPackage>[] };
export type PackageFamily = { id: string; label: string; repo: string; projectPage?: string };
export type DirectoryPackage = {
  evidence: CapturedPackage;
  curated: CuratedPackage;
  family?: PackageFamily;
};
export type DirectoryRegistry = Registry<DirectoryPackage>;
export type PackageDirectory = { families: PackageFamily[]; registries: DirectoryRegistry[] };

/** Resolve only the manifest's explicit repo or an alias target in the same registry. */
function curatedRepository(
  entry: CuratedPackage,
  entries: Map<string, CuratedPackage>,
): string | undefined {
  const visited = new Set<string>();
  let current: CuratedPackage | undefined = entry;
  while (current && !visited.has(current.name)) {
    visited.add(current.name);
    if (current.repo) {
      if (
        !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(current.repo) ||
        current.repo.split("/").some((part) => part === "." || part === "..")
      )
        throw new Error(`Invalid curated repository for ${current.name}: ${current.repo}`);
      return current.repo;
    }
    current =
      current.relation === "alias" && current.alias_of ? entries.get(current.alias_of) : undefined;
  }
  return undefined;
}

function reconcileRegistry(capture: Registry<CapturedPackage>, manifest: RegistryManifest) {
  const declared = manifest.registries.find((registry) => registry.name === capture.name);
  if (!declared) throw new Error(`No manifest registry for ${capture.name}`);
  if (
    capture.label !== declared.label ||
    capture.ecosystem !== declared.ecosystem ||
    capture.url !== declared.url
  )
    throw new Error(`Registry metadata differs for ${capture.name}; reconcile the capture`);
  const entries = new Map(declared.packages.map((entry) => [entry.name, entry]));
  if (entries.size !== declared.packages.length || entries.size !== capture.packages.length)
    throw new Error(`Package names differ for ${capture.name}; reconcile the capture`);
  const seen = new Set<string>();
  const packages = capture.packages.map((evidence) => {
    const curated = entries.get(evidence.name);
    if (!curated || seen.has(evidence.name))
      throw new Error(`Undeclared or duplicate package ${capture.name}/${evidence.name}`);
    seen.add(evidence.name);
    if (!RELATIONS.includes(curated.relation))
      throw new Error(`Unknown relation for ${capture.name}/${evidence.name}`);
    for (const field of ["relation", "repo", "alias_of", "upstream", "note"] as const) {
      if (evidence[field] !== curated[field])
        throw new Error(
          `${capture.name}/${evidence.name}: capture differs from manifest on ${field}`,
        );
    }
    return { evidence, curated, repo: curatedRepository(curated, entries) };
  });
  return { ...capture, packages };
}

type FamilyOptions = {
  projects: Pick<CatalogProject, "name" | "slug" | "url">[];
  hasProjectPage: (slug: string) => boolean;
};

function assertComplete(capture: RegistryCapture, manifest: RegistryManifest): void {
  for (const registries of [capture.registries, manifest.registries]) {
    if (
      registries.length !== REGISTRY_NAMES.length ||
      new Set(registries.map((registry) => registry.name)).size !== REGISTRY_NAMES.length ||
      registries.some((registry) => !REGISTRY_NAMES.includes(registry.name))
    )
      throw new Error(
        "The package directory requires the complete npm, PyPI and Prefix.dev capture",
      );
  }
}

function buildFamilies(
  registries: ReturnType<typeof reconcileRegistry>[],
  { projects, hasProjectPage }: FamilyOptions,
): PackageFamily[] {
  const repos = new Map<string, string>();
  for (const registry of registries) {
    for (const entry of registry.packages) {
      if (entry.repo) repos.set(entry.repo.toLowerCase(), entry.repo);
    }
  }
  const byUrl = new Map(projects.map((project) => [project.url.toLowerCase(), project]));
  const families = [...repos.entries()]
    .sort(([first], [second]) => first.localeCompare(second, "en"))
    .map(([, repo], index): PackageFamily => {
      const project = byUrl.get(`https://github.com/${repo}`.toLowerCase());
      return {
        // Numeric identifiers keep generated CSS independent of untrusted text.
        id: `project-${index + 1}`,
        label: project?.name ?? repo.split("/")[1] ?? repo,
        repo,
        ...(project && hasProjectPage(project.slug)
          ? { projectPage: `/docs/projects/${project.slug}/` }
          : {}),
      };
    });
  // Disambiguate identical names from different explicitly curated repositories.
  const labelCounts = new Map<string, number>();
  for (const family of families) {
    const label = family.label.toLowerCase();
    labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
  }
  for (const family of families) {
    if ((labelCounts.get(family.label.toLowerCase()) ?? 0) > 1) family.label = family.repo;
  }
  return families;
}

/** Join dated registry evidence to curated relationships, never to registry-supplied repository strings. */
export function buildPackageDirectory(
  capture: RegistryCapture,
  manifest: RegistryManifest,
  options: FamilyOptions,
): PackageDirectory {
  assertComplete(capture, manifest);
  const registries = capture.registries.map((registry) => reconcileRegistry(registry, manifest));
  const families = buildFamilies(registries, options);
  const byRepo = new Map(families.map((family) => [family.repo.toLowerCase(), family]));
  return {
    families,
    registries: registries.map((registry) => ({
      ...registry,
      packages: registry.packages.map(({ evidence, curated, repo }) => ({
        evidence,
        curated,
        family: repo ? byRepo.get(repo.toLowerCase()) : undefined,
      })),
    })),
  };
}

export function familyId(item: DirectoryPackage): string {
  return item.family?.id ?? "unmapped";
}

export function countRelations(registry: DirectoryRegistry): Partial<Record<Relation, number>> {
  const result: Partial<Record<Relation, number>> = {};
  for (const item of registry.packages)
    result[item.curated.relation] = (result[item.curated.relation] ?? 0) + 1;
  return result;
}

export function installGuidance(
  item: DirectoryPackage,
  registry: DirectoryRegistry,
  channel: string,
): { label: string; command: string } | undefined {
  if (!item.evidence.version || item.curated.relation === "reserved") return undefined;
  let name = item.evidence.name;
  let label = "Install";
  if (item.curated.relation === "alias") {
    const target = registry.packages.find((entry) => entry.evidence.name === item.curated.alias_of);
    if (target?.curated.relation !== "authored" || !target.evidence.version) return undefined;
    name = target.evidence.name;
    label = "Install the canonical package";
  } else if (item.curated.relation === "unreviewed") {
    label = "Channel command (authorship unreviewed)";
  } else if (item.curated.relation === "upstream") {
    label = "Install the upstream software from this channel";
  }
  const command =
    registry.name === "npm"
      ? `npm install ${name}`
      : registry.name === "pypi"
        ? `pip install ${name}`
        : `pixi add --channel ${channel} ${name}`;
  return { label, command };
}

function matches(item: DirectoryPackage, family: string, relation: string): boolean {
  return (
    (family === "all" || familyId(item) === family) &&
    (relation === "all" || item.curated.relation === relation)
  );
}

function emptyFilterSelectors(directory: PackageDirectory, family: string, relation: string) {
  const selection = `#family-filter-${family}:checked ~ .family-results #relation-filter-${relation}:checked ~ .relation-results`;
  const emptyRegistries = directory.registries
    .filter((registry) => !registry.packages.some((item) => matches(item, family, relation)))
    .map((registry) => `${selection} .registry-section[data-registry=${registry.name}]`);
  const emptySelections = ["all", ...REGISTRY_NAMES]
    .filter(
      (registry) =>
        !directory.registries.some(
          (item) =>
            (registry === "all" || item.name === registry) &&
            item.packages.some((entry) => matches(entry, family, relation)),
        ),
    )
    .map(
      (registry) =>
        `#registry-filter-${registry}:checked ~ .registry-sections ${selection} .package-empty`,
    );
  return { emptyRegistries, emptySelections };
}

/** Compile CSS from safe generated IDs, so all combinations work without JavaScript or :has(). */
export function packageFilterCss(directory: PackageDirectory): string {
  const families = ["all", ...directory.families.map((family) => family.id), "unmapped"];
  const relations = ["all", ...RELATIONS];
  const rules = [
    ...families
      .slice(1)
      .map(
        (family) =>
          `#family-filter-${family}:checked ~ .family-results .package-row:not([data-family=${family}]) { display: none; }`,
      ),
    ...RELATIONS.map(
      (relation) =>
        `#relation-filter-${relation}:checked ~ .relation-results .package-row:not([data-relation=${relation}]) { display: none; }`,
    ),
  ];
  const combinations = families.flatMap((family) =>
    relations.map((relation) => emptyFilterSelectors(directory, family, relation)),
  );
  const emptyRegistries = combinations.flatMap((item) => item.emptyRegistries);
  const emptySelections = combinations.flatMap((item) => item.emptySelections);
  if (emptyRegistries.length) rules.push(`${emptyRegistries.join(",\n")} { display: none; }`);
  if (emptySelections.length) rules.push(`${emptySelections.join(",\n")} { display: block; }`);
  return rules.join("\n");
}
