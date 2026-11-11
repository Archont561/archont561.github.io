import type { Manifest } from "@/src/maintenance/registries.ts";

const manifest: Manifest = {
  owner: "Archont561",
  identity: {
    npm: { user: "archont", scope: "@archont561" },
    pypi: { user: "Archont561" },
    prefix: { channel: "@archont561/archont561" },
  },
  registries: [
    {
      name: "npm",
      label: "npm",
      ecosystem: "JavaScript",
      url: "https://npmjs.com",
      packages: [
        { name: "@archont561/alpha", relation: "authored", repo: "Archont561/alpha" },
        { name: "alpha", relation: "alias", alias_of: "@archont561/alpha" },
        { name: "@archont561/beta", relation: "reserved" },
      ],
    },
    {
      name: "pypi",
      label: "PyPI",
      ecosystem: "Python",
      url: "https://pypi.org",
      packages: [{ name: "alpha", relation: "authored", repo: "Archont561/alpha" }],
    },
    {
      name: "prefix",
      label: "Prefix.dev",
      ecosystem: "Conda",
      url: "https://prefix.dev",
      packages: [
        { name: "alpha", relation: "authored" },
        { name: "other", relation: "upstream" },
      ],
    },
  ],
};
const npm = (name: string, version: string, description: string) => ({
  name,
  description,
  "dist-tags": { latest: version },
  versions: {
    [version]: { license: "MIT", repository: { url: "https://github.com/Archont561/alpha.git" } },
  },
  time: { [version]: "2026-01-02T00:00:00Z" },
  maintainers: [{ name: "archont" }],
});
const captures = {
  npm: {
    "@archont561/alpha": npm("@archont561/alpha", "1.2.3", "Alpha"),
    alpha: npm("alpha", "1.2.3", "Alias"),
    "@archont561/beta": npm("@archont561/beta", "0.0.0", "Reserved package name"),
  },
  pypi: {
    alpha: {
      info: {
        version: "1.2.3",
        summary: "Alpha",
        license: "MIT",
        project_urls: { Repository: "https://github.com/Archont561/alpha" },
        requires_python: ">=3.11",
      },
      releases: { "1.2.3": [{ upload_time: "2026-01-03T00:00:00" }], "1.0.0": [{}] },
    },
  },
  prefix: {
    alpha: {
      version: "1.2.3",
      summary: "Alpha",
      platforms: ["osx-arm64", "linux-64"],
      builds: 3,
      totalSize: 123,
      lastCreatedDate: "2026-01-04T00:00:00Z",
    },
    other: { version: "2.0.0", summary: "Other", platforms: ["linux-64"], builds: 1 },
  },
};
export function registryFixture() {
  return structuredClone({ manifest, captures });
}
