import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import Link from "next/link";
import SiteHeader from "@/src/components/site-header";
import {
  buildPackageDirectory,
  countRelations,
  type DirectoryPackage,
  type DirectoryRegistry,
  familyId,
  installGuidance,
  packageFilterCss,
  RELATIONS,
  type RegistryCapture,
  type RegistryManifest,
  type RegistryName,
  type Relation,
} from "@/src/lib/package-directory";
import { loadProjectCatalog } from "@/src/lib/project-catalog";
import { staticPageMetadata } from "@/src/lib/site";

export const metadata = staticPageMetadata(
  "/packages/",
  "Package portfolio",
  "A dated directory of npm, PyPI, and Prefix.dev entries, registry versions, and curated project relationships.",
);

const root = resolve(process.cwd(), "../..");
const data = JSON.parse(readFileSync(join(root, "data/packages.json"), "utf8")) as RegistryCapture;
const manifest = JSON.parse(
  readFileSync(join(root, "data/packages-manifest.json"), "utf8"),
) as RegistryManifest;
const directory = buildPackageDirectory(data, manifest, {
  projects: loadProjectCatalog(root).projects,
  hasProjectPage: (slug) => existsSync(join(root, "docs/projects", `${slug}.mdx`)),
});
const installChannel =
  data.identity.prefix.install_channel ?? "https://prefix.dev/archont561/archont561";
const allPackages = directory.registries.flatMap((registry) => registry.packages);
const reservedPlaceholders =
  directory.registries
    .find((registry) => registry.name === "npm")
    ?.packages.filter(
      (item) => item.curated.relation === "reserved" && item.evidence.version === "0.0.0",
    ).length ?? 0;

const relationLabels: Record<Relation, { filter: string; row: string; count: string }> = {
  authored: { filter: "Authored", row: "Authored package", count: "authored" },
  alias: { filter: "Aliases", row: "Alias, not a separate project", count: "aliases" },
  reserved: { filter: "Reserved", row: "Reserved name", count: "reserved" },
  upstream: {
    filter: "Upstream recipes",
    row: "Recipe for upstream software",
    count: "upstream recipes",
  },
  unreviewed: {
    filter: "Unreviewed",
    row: "Channel entry, authorship unreviewed",
    count: "unreviewed",
  },
};

const style = {
  code: {
    background: "rgba(127,127,127,.12)",
    borderRadius: 6,
    fontSize: 12,
    padding: "2px 6px",
    whiteSpace: "nowrap" as const,
  },
  hint: { color: "var(--muted)", fontSize: 13 },
  table: {
    borderCollapse: "collapse" as const,
    fontSize: 14,
    width: "100%",
  },
};

type PackageProps = { item: DirectoryPackage; registry: DirectoryRegistry };

function PackageName({ item, registry }: PackageProps) {
  const { curated, evidence } = item;
  const guidance = installGuidance(item, registry, installChannel);
  return (
    <th
      scope="row"
      style={{
        padding: "10px 12px 10px 0",
        verticalAlign: "top",
        textAlign: "left",
        fontWeight: 400,
      }}
    >
      <a href={evidence.url}>
        <code style={{ ...style.code, fontSize: 13 }}>{evidence.name}</code>
      </a>
      <div style={{ ...style.hint, maxWidth: 430 }}>{evidence.description ?? registry.label}</div>
      {curated.note && curated.relation !== "reserved" && (
        <div style={style.hint}>{curated.note}</div>
      )}
      {guidance ? (
        <div style={{ ...style.hint, marginTop: 6 }}>
          {guidance.label}: <code style={style.code}>{guidance.command}</code>
        </div>
      ) : (
        <div style={{ ...style.hint, marginTop: 6 }}>No installation guidance for this entry.</div>
      )}
    </th>
  );
}

function PackageVersion({ item }: { item: DirectoryPackage }) {
  return (
    <td style={{ padding: 10, verticalAlign: "top" }}>
      {item.evidence.version ? (
        <code style={style.code}>{item.evidence.version}</code>
      ) : (
        <span style={style.hint}>Not recorded</span>
      )}
      {item.curated.relation === "reserved" && item.evidence.version && (
        <div style={{ ...style.hint, marginTop: 4 }}>
          {item.evidence.version === "0.0.0" ? "Placeholder artifact" : "Registry artifact"}
        </div>
      )}
      {item.evidence.requires_python && (
        <div style={{ ...style.hint, marginTop: 4 }}>Python {item.evidence.requires_python}</div>
      )}
    </td>
  );
}

function PackageRelation({ item }: { item: DirectoryPackage }) {
  const { curated, family } = item;
  return (
    <td style={{ padding: 10, verticalAlign: "top" }}>
      <span>{relationLabels[curated.relation].row}</span>
      {curated.alias_of && (
        <div style={style.hint}>
          Alias of <code style={style.code}>{curated.alias_of}</code>
        </div>
      )}
      <div style={{ ...style.hint, marginTop: 4 }}>
        Family:{" "}
        {family?.projectPage ? (
          <Link href={family.projectPage}>{family.label}</Link>
        ) : (
          (family?.label ?? "Not mapped")
        )}
        {family?.projectPage && " (project overview)"}
      </div>
      {curated.repo && (
        <div style={{ ...style.hint, marginTop: 4 }}>
          <a href={`https://github.com/${curated.repo}`}>
            {curated.relation === "upstream" ? "Recipe repository" : "Source repository"}
          </a>
        </div>
      )}
      {curated.upstream && (
        <div style={{ ...style.hint, marginTop: 4 }}>
          <a href={`https://github.com/${curated.upstream}`}>Upstream software source</a>
        </div>
      )}
    </td>
  );
}

function PackageRow({ item, registry }: PackageProps) {
  return (
    <tr
      className="package-row"
      data-package={item.evidence.name}
      data-family={familyId(item)}
      data-relation={item.curated.relation}
      style={{ borderTop: "1px solid rgba(127,127,127,.2)" }}
    >
      <PackageName item={item} registry={registry} />
      <PackageVersion item={item} />
      <td style={{ padding: 10, verticalAlign: "top" }}>
        <span style={{ ...style.hint, whiteSpace: "nowrap" }}>
          {item.evidence.published ?? "Not recorded"}
        </span>
      </td>
      <td style={{ padding: 10, verticalAlign: "top" }}>
        <span style={style.hint}>{item.evidence.license ?? "Not recorded"}</span>
        {!!item.evidence.platforms?.length && (
          <div style={{ ...style.hint, maxWidth: 150 }}>{item.evidence.platforms.join(", ")}</div>
        )}
      </td>
      <PackageRelation item={item} />
    </tr>
  );
}

function RegistryOption({
  registry,
  label,
  detail,
  initiallySelected = false,
}: {
  registry: RegistryName | "all";
  label: string;
  detail: string;
  initiallySelected?: boolean;
}) {
  const id = `registry-filter-${registry}`;
  return (
    <>
      <input
        className="visually-hidden"
        type="radio"
        name="registry"
        id={id}
        value={registry}
        defaultChecked={initiallySelected}
      />
      <label className="registry-option" htmlFor={id}>
        <strong>{label}</strong>
        <span className="registry-option-detail">{detail}</span>
      </label>
    </>
  );
}

function FilterOption({
  kind,
  value,
  label,
  count,
}: {
  kind: "family" | "relation";
  value: string;
  label: string;
  count: number;
}) {
  const id = `${kind}-filter-${value}`;
  return (
    <>
      <input
        className="visually-hidden"
        type="radio"
        name={kind}
        id={id}
        value={value}
        defaultChecked={value === "all"}
      />
      <label className="package-filter-option" htmlFor={id}>
        {label} <span className="package-filter-count">· {count}</span>
      </label>
    </>
  );
}

function RegistryTable({ registry }: { registry: DirectoryRegistry }) {
  const counts = countRelations(registry);
  const summary = RELATIONS.filter((relation) => counts[relation])
    .map((relation) => `${counts[relation]} ${relationLabels[relation].count}`)
    .join(" · ");
  const dateLabel =
    registry.name === "npm"
      ? "Version published"
      : registry.name === "pypi"
        ? "First listed file upload"
        : "Last channel build";
  return (
    <section
      className="registry-section"
      data-registry={registry.name}
      aria-labelledby={`registry-${registry.name}-title`}
    >
      <div className="registry-section-heading">
        <h2 id={`registry-${registry.name}-title`}>
          {registry.label}
          <span style={{ ...style.hint, fontWeight: 400 }}>
            {"  "}
            {registry.ecosystem} · captured {data.retrieved}
          </span>
        </h2>
        <a href={registry.url}>Visit {registry.label} ↗</a>
      </div>
      <p className="registry-summary">
        Full snapshot: {registry.packages.length} entries · {summary}
      </p>
      <section
        className="registry-table-scroll"
        aria-label={`${registry.label} package table`}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: Allow keyboard users to scroll a wide table.
        tabIndex={0}
      >
        <table style={style.table}>
          <caption className="visually-hidden">
            {registry.label} registry entries and captured details
          </caption>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th scope="col">Package</th>
              <th scope="col">Captured version</th>
              <th scope="col">{dateLabel}</th>
              <th scope="col">Licence / platforms</th>
              <th scope="col">Relation / family</th>
            </tr>
          </thead>
          <tbody>
            {registry.packages.map((item) => (
              <PackageRow key={item.evidence.name} item={item} registry={registry} />
            ))}
          </tbody>
        </table>
      </section>
    </section>
  );
}

function RelationFilters() {
  return (
    <fieldset className="package-filter">
      <legend>Filter by relation</legend>
      <div className="package-filter-grid">
        <FilterOption
          kind="relation"
          value="all"
          label="All relations"
          count={allPackages.length}
        />
        {RELATIONS.map((relation) => (
          <FilterOption
            key={relation}
            kind="relation"
            value={relation}
            label={relationLabels[relation].filter}
            count={allPackages.filter((item) => item.curated.relation === relation).length}
          />
        ))}
        <div className="relation-results">
          <div className="package-filter-help">
            <div role="status" aria-live="polite">
              <p className="package-filter-hint">
                Filters combine. Counts describe the full capture, not the filtered results.
              </p>
              <p className="package-empty">
                No entries match these filters. Reset the filters to show all entries.
              </p>
            </div>
            <button type="reset" className="package-filter-reset">
              Reset all filters
            </button>
          </div>
          <p className="registry-scroll-hint">Scroll sideways to see every column.</p>
          {directory.registries.map((registry) => (
            <RegistryTable key={registry.name} registry={registry} />
          ))}
        </div>
      </div>
    </fieldset>
  );
}

function FamilyFilters() {
  return (
    <fieldset className="package-filter">
      <legend>Filter by project family</legend>
      <div className="package-filter-grid">
        <FilterOption kind="family" value="all" label="All families" count={allPackages.length} />
        {directory.families.map((family) => (
          <FilterOption
            key={family.id}
            kind="family"
            value={family.id}
            label={family.label}
            count={allPackages.filter((item) => familyId(item) === family.id).length}
          />
        ))}
        <FilterOption
          kind="family"
          value="unmapped"
          label="Not mapped"
          count={allPackages.filter((item) => !item.family).length}
        />
        <div className="family-results">
          <RelationFilters />
        </div>
      </div>
    </fieldset>
  );
}

export default function Page() {
  return (
    <>
      <SiteHeader active="packages" />
      <main id="main-content" className="utility-page package-page" tabIndex={-1}>
        <Link href="/" className="utility-back">
          ← Back to the workspace
        </Link>
        <h1 style={{ fontSize: 34, margin: "22px 0 10px" }}>Package portfolio</h1>
        <p style={{ maxWidth: "70ch" }}>
          Browse {allPackages.length} registry entries associated with {data.owner}, captured on{" "}
          {data.retrieved}. Versions and dates come from npm, PyPI, and Prefix.dev; relations and
          family mappings come from the curated manifest. Entries are registry names, not a count of
          distinct authored projects.
        </p>
        <p className="package-explanation">
          Reserved describes intent, not the absence of a published artifact.{" "}
          {reservedPlaceholders > 0 && (
            <>
              The capture records 0.0.0 placeholders for {reservedPlaceholders} reserved npm{" "}
              {reservedPlaceholders === 1 ? "name" : "names"}.{" "}
            </>
          )}
          Reserved names are not installation recommendations. Aliases refer to their canonical
          names, upstream recipes package software maintained elsewhere, and unreviewed channel
          entries have no reviewed authorship.
        </p>
        <style>{packageFilterCss(directory)}</style>
        <form aria-label="Package directory filters">
          <fieldset className="registry-filter">
            <legend>Filter by registry</legend>
            <div className="registry-grid">
              <RegistryOption
                registry="all"
                label="All registries"
                detail={`${allPackages.length} entries`}
                initiallySelected
              />
              {directory.registries.map((registry) => (
                <RegistryOption
                  registry={registry.name}
                  label={registry.label}
                  detail={`${registry.ecosystem} · ${registry.packages.length} entries`}
                  key={registry.name}
                />
              ))}
              <div className="registry-sections">
                <FamilyFilters />
              </div>
            </div>
          </fieldset>
        </form>
        <p className="package-explanation">
          Dates are the npm version publication, the first listed PyPI file upload, or the last
          Prefix.dev channel build. PyPI download totals are not available in its JSON API, and the
          channel capture does not include download counts.
        </p>
        <p style={{ marginTop: 26 }}>
          <Link href="/docs/reference">Configuration reference</Link> ·{" "}
          <Link href="/docs/development">Development workflow</Link> ·{" "}
          <a href="https://github.com/Archont561?tab=repositories">Repositories</a> ·{" "}
          <a href="https://github.com/Archont561/qgis-sdk/issues">Issues</a>
        </p>
      </main>
    </>
  );
}
