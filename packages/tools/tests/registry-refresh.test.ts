import { expect, test } from "@archont561/bun-test-utils";
import {
  checkRegistrySnapshot,
  fetchRegistryJson,
  parseRegistryManifest,
  projectRegistryCapture,
  refreshRegistries,
} from "@/src/maintenance/registries.ts";
import { registryFixture } from "@/tests/fixtures/registries.ts";
import { readFixture, writeFixture } from "@/tests/fixtures/task009.ts";

interface Fixtures {
  tmpdir: { dir: string };
}

test
  .scenario<Fixtures>("Registry refresh: publish only a complete reconciled capture")
  .given("an old snapshot and a manifest with newly curated metadata", ({ tmpdir }) => {
    const { manifest, captures } = registryFixture();
    const old = projectRegistryCapture(captures, manifest, "2026-01-01");
    const changed = structuredClone(manifest);
    const first = changed.registries[0]?.packages[0];
    if (!first) throw new Error("Fixture package missing");
    first.note = "New curation";
    writeFixture(tmpdir.dir, "data/packages-manifest.json", JSON.stringify(changed));
    writeFixture(tmpdir.dir, "data/packages.json", JSON.stringify(old));
    return { root: tmpdir.dir, captures };
  })
  .when(
    "all registry responses and the account inventory are captured",
    async ({ root, captures }) => {
      const fetcher = async (url: string): Promise<unknown> => {
        if (url.includes("/-/v1/search"))
          return {
            total: 3,
            objects: Object.keys(captures.npm).map((name) => ({ package: { name } })),
          };
        if (url.startsWith("https://registry.npmjs.org/"))
          return captures.npm[
            decodeURIComponent(
              url.slice("https://registry.npmjs.org/".length),
            ) as keyof typeof captures.npm
          ];
        if (url.startsWith("https://pypi.org/")) return captures.pypi.alpha;
        const rows = Object.entries(captures.prefix).map(([name, record]) => ({
          ...record,
          name,
          versions: { totalCount: record.builds, page: [{ version: record.version }] },
        }));
        return {
          data: { channel: { packages: { pages: 1, totalCount: rows.length, page: rows } } },
        };
      };
      const changed = await refreshRegistries(root, { fetcher, retrieved: "2026-01-02" });
      const before = readFixture(root, "data/packages.json");
      const unchanged = await refreshRegistries(root, { fetcher, retrieved: "2026-01-03" });
      return {
        changed,
        unchanged,
        before,
        after: readFixture(root, "data/packages.json"),
        snapshot: checkRegistrySnapshot(root),
      };
    },
  )
  .then(
    "the stale file is replaced once and date-only changes do not rewrite it",
    ({ changed, unchanged, before, after, snapshot, expect }) => {
      expect(changed).toBe(true);
      expect(unchanged).toBe(false);
      expect(after).toBe(before);
      expect(snapshot.retrieved).toBe("2026-01-02");
      expect(snapshot.registries[0]?.packages[0]?.note).toBe("New curation");
    },
  );

test("manifest validation rejects invalid relations, duplicate names and missing registries", () => {
  const { manifest } = registryFixture();
  expect(() => parseRegistryManifest({ ...manifest, registries: [] })).toThrow("cover");
  const { captures } = registryFixture();
  expect(() => projectRegistryCapture(captures, manifest, "2026-02-30")).toThrow("date");
  const duplicate = structuredClone(manifest);
  duplicate.registries[0]?.packages.push({ name: "alpha", relation: "authored" });
  expect(() => parseRegistryManifest(duplicate)).toThrow("duplicate package");
  const invalid = structuredClone(manifest);
  const item = invalid.registries[0]?.packages[1];
  if (item) item.alias_of = "missing";
  expect(() => parseRegistryManifest(invalid)).toThrow("alias target");
});

test("failed registry network requests identify the endpoint", async () => {
  const endpoint = "http://127.0.0.1:1/unreachable";
  await expect(fetchRegistryJson(endpoint)).rejects.toThrow(endpoint);
});

test
  .scenario<Fixtures>("Registry refresh: retain the old snapshot on a network failure")
  .given("a committed snapshot", ({ tmpdir }) => {
    const { manifest, captures } = registryFixture();
    const original = JSON.stringify(projectRegistryCapture(captures, manifest, "2026-01-01"));
    writeFixture(tmpdir.dir, "data/packages-manifest.json", JSON.stringify(manifest));
    writeFixture(tmpdir.dir, "data/packages.json", original);
    return { root: tmpdir.dir, original };
  })
  .when("one registry fails during capture", async ({ root }) => {
    let error = "";
    try {
      await refreshRegistries(root, {
        fetcher: async () => {
          throw new Error("registry unavailable");
        },
        retrieved: "2026-01-02",
      });
    } catch (cause) {
      error = String(cause);
    }
    return { error, after: readFixture(root, "data/packages.json") };
  })
  .then(
    "the error is reported and no partial snapshot is written",
    ({ error, after, original, expect }) => {
      expect(error).toContain("registry unavailable");
      expect(after).toBe(original);
    },
  );
