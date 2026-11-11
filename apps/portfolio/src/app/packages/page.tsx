import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Link from "next/link";
import { staticPageMetadata } from "@/src/lib/site";

type Package = {
  alias_of?: string;
  builds?: number;
  description?: string;
  license?: string;
  name: string;
  note?: string;
  platforms?: string[];
  proof?: string;
  published?: string;
  releases?: number;
  relation?: string;
  repo?: string;
  requires_python?: string;
  size?: number;
  upstream?: string;
  url?: string;
  version?: string;
};

type Registry = {
  ecosystem: string;
  label: string;
  name: "npm" | "prefix" | "pypi";
  packages: Package[];
  url: string;
};

type Capture = {
  identity: { npm?: { scope?: string }; prefix?: { install_channel?: string } };
  owner: string;
  registries: Registry[];
  retrieved: string;
};

export const metadata = staticPageMetadata(
  "/packages/",
  "Package portfolio",
  "Every package published under the Archont561 account on npm, PyPI, and the Prefix.dev channel, with versions, licenses, and platforms captured from each registry.",
);

const data = JSON.parse(
  readFileSync(resolve(process.cwd(), "../../data/packages.json"), "utf8"),
) as Capture;
const installChannel =
  data.identity.prefix?.install_channel ?? "https://prefix.dev/archont561/archont561";

const relationLabels: Record<string, string> = {
  alias: "unscoped alias",
  authored: "authored here",
  reserved: "name reserved",
  unreviewed: "in channel, authorship unreviewed",
  upstream: "recipe for upstream software",
};

function installCommand(registry: Registry, name: string) {
  if (registry.name === "npm") return `npm install ${name}`;
  if (registry.name === "pypi") return `pip install ${name}`;
  return `pixi add --channel ${installChannel} ${name}`;
}

function mebibytes(bytes?: number) {
  if (!bytes) return null;
  return `${(bytes / 1024 / 1024).toFixed(bytes > 1024 * 1024 ? 1 : 2)} MB`;
}

/* A published name is counted once, so an alias — the same software under an unscoped
   name — is not a second package, and a reservation is not a release. The registry
   maintenance command validates the same relation labels. */
const COUNTED = ["authored", "upstream", "unreviewed"];

function published(registry: Registry) {
  return registry.packages.filter((item) => item.relation && COUNTED.includes(item.relation));
}

const style = {
  code: {
    background: "rgba(127,127,127,.12)",
    borderRadius: 6,
    fontSize: 12,
    padding: "2px 6px",
    whiteSpace: "nowrap" as const,
  },
  hint: { fontSize: 13, opacity: 0.72 },
  note: {
    borderLeft: "3px solid rgba(127,127,127,.4)",
    fontSize: 13,
    margin: "20px 0 0",
    opacity: 0.82,
    padding: "4px 0 4px 12px",
  },
  table: {
    borderCollapse: "collapse" as const,
    fontSize: 14,
    width: "100%",
  },
};

type PackageProps = { item: Package; registry: Registry };

function PackageName({ item, registry }: PackageProps) {
  const reserve = item.relation === "reserved";
  const extra =
    registry.name === "prefix"
      ? item.builds && `${item.builds} builds`
      : item.releases && `${item.releases} releases`;
  return (
    <td style={{ padding: "10px 12px 10px 0", verticalAlign: "top" }}>
      <a href={item.url}>
        <code style={{ ...style.code, fontSize: 13 }}>{item.name}</code>
      </a>
      <div style={{ ...style.hint, maxWidth: 430 }}>
        {item.description ?? extra ?? registry.label}
      </div>
      {item.note && <div style={{ ...style.hint, opacity: 0.64 }}>{item.note}</div>}
      {!reserve && (
        <div style={{ marginTop: 6 }}>
          <code style={style.code}>{installCommand(registry, item.name)}</code>
        </div>
      )}
    </td>
  );
}

function PackageVersion({ item }: { item: Package }) {
  return (
    <td style={{ padding: 10, verticalAlign: "top" }}>
      {item.relation === "reserved" ? (
        <span style={style.hint}>no release</span>
      ) : (
        <code style={style.code}>{item.version ?? "—"}</code>
      )}
      {item.requires_python && (
        <div style={{ ...style.hint, marginTop: 4 }}>Python {item.requires_python}</div>
      )}
    </td>
  );
}

function PackagePublished({ item }: { item: Package }) {
  return (
    <td style={{ padding: 10, verticalAlign: "top" }}>
      <span style={style.hint}>{item.published ?? "—"}</span>
      {item.size && <div style={{ ...style.hint, opacity: 0.64 }}>{mebibytes(item.size)}</div>}
    </td>
  );
}

function PackageLicense({ item }: { item: Package }) {
  return (
    <td style={{ padding: 10, verticalAlign: "top" }}>
      <span style={style.hint}>{item.license ?? "—"}</span>
      {!!item.platforms?.length && (
        <div style={{ ...style.hint, maxWidth: 150, opacity: 0.64 }}>
          {item.platforms.join(", ")}
        </div>
      )}
    </td>
  );
}

function PackageRelation({ item }: { item: Package }) {
  return (
    <td style={{ padding: 10, verticalAlign: "top" }}>
      <span style={style.hint}>{relationLabels[item.relation ?? ""] ?? item.relation}</span>
      {item.alias_of && (
        <div style={{ ...style.hint, opacity: 0.64 }}>
          of <code style={style.code}>{item.alias_of}</code>
        </div>
      )}
      {item.repo && (
        <div style={{ ...style.hint, marginTop: 4 }}>
          <a href={`https://github.com/${item.repo}`}>{item.repo}</a>
        </div>
      )}
      {item.upstream && (
        <div style={{ ...style.hint, marginTop: 4 }}>
          <a href={`https://github.com/${item.upstream}`}>{item.upstream}</a>
        </div>
      )}
    </td>
  );
}

function PackageRow({ item, registry }: PackageProps) {
  return (
    <tr style={{ borderTop: "1px solid rgba(127,127,127,.2)" }}>
      <PackageName item={item} registry={registry} />
      <PackageVersion item={item} />
      <PackagePublished item={item} />
      <PackageLicense item={item} />
      <PackageRelation item={item} />
    </tr>
  );
}

function RegistryOverview() {
  return (
    <section
      aria-label="Registry overview"
      style={{ display: "flex", flexWrap: "wrap", gap: 12, margin: "26px 0" }}
    >
      {data.registries.map((registry) => (
        <a
          href={registry.url}
          key={registry.name}
          style={{
            border: "1px solid rgba(127,127,127,.32)",
            borderRadius: 10,
            flex: "1 1 190px",
            padding: "12px 14px",
            textDecoration: "none",
          }}
        >
          <strong style={{ display: "block", fontSize: 17 }}>{registry.label}</strong>
          <span style={style.hint}>
            {registry.ecosystem} · {published(registry).length} published
          </span>
        </a>
      ))}
    </section>
  );
}

function RegistryTable({ registry }: { registry: Registry }) {
  return (
    <section style={{ marginTop: 34 }}>
      <h2 style={{ fontSize: 21, marginBottom: 4 }}>
        {registry.label}
        <span style={{ ...style.hint, fontWeight: 400 }}>
          {"  "}
          {registry.ecosystem} · captured {data.retrieved}
        </span>
      </h2>
      <div style={{ overflowX: "auto" }}>
        <table style={style.table}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th>Package</th>
              <th>Latest</th>
              <th>Published</th>
              <th>Licence</th>
              <th>Relation</th>
            </tr>
          </thead>
          <tbody>
            {registry.packages.map((item) => (
              <PackageRow key={item.name} item={item} registry={registry} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function Page() {
  return (
    <main style={{ margin: "60px auto 90px", maxWidth: 980, padding: 24 }}>
      <Link href="/">← Back to the workspace</Link>
      <h1 style={{ fontSize: 34, margin: "22px 0 10px" }}>Package portfolio</h1>
      <p style={{ maxWidth: "70ch" }}>
        One directory over every registry the {data.owner} account publishes to. Versions, dates,
        licenses, and platforms are captured from each registry on {data.retrieved} — nothing here
        is maintained by hand.
      </p>
      <RegistryOverview />
      {data.registries.map((registry) => (
        <RegistryTable key={registry.name} registry={registry} />
      ))}
      <p style={style.note}>
        Reserved names are listed because the account holds them; they publish no release, and a{" "}
        <code style={style.code}>0.0.0</code> stub is never counted as a package. Download totals
        are shown only where a registry publishes them: PyPI removed download counts from its JSON
        API, so no figure appears for Python. Conda channel download counts are omitted until the
        capture includes them.
      </p>
      <p style={{ marginTop: 26 }}>
        <Link href="/docs/reference">Configuration reference</Link> ·{" "}
        <Link href="/docs/development">Development workflow</Link> ·{" "}
        <a href="https://github.com/Archont561?tab=repositories">Repositories</a> ·{" "}
        <a href="https://github.com/Archont561/qgis-sdk/issues">Issues</a>
      </p>
    </main>
  );
}
