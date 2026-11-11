import { test } from "@archont561/bun-test-utils";
import {
  checkRegistrySnapshot,
  fetchChannel,
  projectRegistryCapture,
  reconcileRegistrySnapshot,
  refreshRegistries,
  registryCounts,
} from "@/src/maintenance/registries.ts";
import { registryFixture } from "@/tests/fixtures/registries.ts";
import { readFixture, runTool, writeFixture } from "@/tests/fixtures/task009.ts";

interface Fixtures {
  tmpdir: { dir: string };
}

test
  .scenario("Registry capture: project evidence and count only published relations")
  .given("curated npm, PyPI and Prefix.dev packages with live records", () => registryFixture())
  .when("the records are projected", ({ manifest, captures }) => ({
    snapshot: projectRegistryCapture(captures, manifest, "2026-01-07"),
  }))
  .then(
    "versions, ownership evidence and counts come from the registries",
    ({ snapshot, expect }) => {
      const npm = snapshot.registries[0]?.packages;
      const pypi = snapshot.registries[1]?.packages;
      const prefix = snapshot.registries[2]?.packages;
      expect(npm?.[0]).toMatchObject({
        version: "1.2.3",
        license: "MIT",
        published: "2026-01-02",
        proof: "scope",
      });
      expect(pypi?.[0]).toMatchObject({
        proof: "repository",
        releases: 2,
        requires_python: ">=3.11",
      });
      expect(prefix?.[0]).toMatchObject({
        proof: "channel",
        builds: 3,
        platforms: ["linux-64", "osx-arm64"],
      });
      expect(registryCounts(snapshot)).toMatchObject({
        npm: { published: 1, aliases: 1, reserved: 1 },
        prefix: { published: 2 },
      });
    },
  );

test
  .scenario("Registry capture: reject uncurated and missing packages")
  .given("a curated manifest and incomplete registry records", () => registryFixture())
  .when("a channel adds an undeclared package and PyPI omits one", ({ manifest, captures }) => ({
    manifest,
    captures: { ...captures, prefix: { ...captures.prefix, surprise: {} }, pypi: {} },
  }))
  .then("neither inconsistency can be projected", ({ manifest, captures, expect }) => {
    expect(() => projectRegistryCapture(captures, manifest, "2026-01-07")).toThrow(
      "missing from capture",
    );
    expect(() =>
      projectRegistryCapture(
        { ...captures, pypi: registryFixture().captures.pypi },
        manifest,
        "2026-01-07",
      ),
    ).toThrow("surprise");
  });

test
  .scenario("Registry capture: reject a reservation that became a release")
  .given("a reserved npm name", () => registryFixture())
  .when("the registry starts reporting a real release", ({ manifest, captures }) => ({
    manifest,
    captures: {
      ...captures,
      npm: { ...captures.npm, "@archont561/beta": captures.npm["@archont561/alpha"] },
    },
  }))
  .then(
    "the manifest must be reconciled instead of changing the count",
    ({ manifest, captures, expect }) => {
      expect(() => projectRegistryCapture(captures, manifest, "2026-01-07")).toThrow(
        "reconcile the manifest",
      );
    },
  );

test
  .scenario<Fixtures>("Registry capture: offline check rejects partial or stale evidence")
  .given("a complete committed capture and manifest", ({ tmpdir }) => {
    const { manifest, captures } = registryFixture();
    const snapshot = projectRegistryCapture(captures, manifest, "2026-01-07");
    writeFixture(tmpdir.dir, "data/packages-manifest.json", JSON.stringify(manifest));
    writeFixture(tmpdir.dir, "data/packages.json", JSON.stringify(snapshot));
    return { root: tmpdir.dir, manifest, snapshot };
  })
  .when("a partial capture and changed relation are checked", ({ root, manifest, snapshot }) => {
    const valid = runTool(root, "registries", "--check");
    const partial = { ...snapshot, registries: snapshot.registries.slice(0, 1) };
    const changed = structuredClone(manifest);
    const first = changed.registries[1]?.packages[0];
    if (first) first.relation = "reserved";
    return { valid, partial, changed, snapshot };
  })
  .then("offline validation fails closed", ({ valid, partial, changed, snapshot, expect }) => {
    expect(valid.status).toBe(0);
    expect(() => reconcileRegistrySnapshot(partial, changed)).toThrow("partial");
    expect(() => reconcileRegistrySnapshot(snapshot, changed)).toThrow("re-run the capture");
    expect(() => reconcileRegistrySnapshot({ ...snapshot, retrieved: "" }, changed)).toThrow(
      "date",
    );
  });

test
  .scenario("Registry capture: walk every Prefix.dev page")
  .given("a two-page channel", () => ({ calls: [] as string[] }))
  .when("the channel is fetched", async ({ calls }) => {
    const rows = await fetchChannel("@owner/channel", async (_url, body) => {
      const payload = body as { variables: { channel: string; page: number } };
      const { channel, page } = payload.variables;
      calls.push(`${channel}:${page}`);
      if (channel.startsWith("@")) return { data: { channel: null } };
      return {
        data: {
          channel: {
            packages: {
              pages: 2,
              totalCount: 2,
              page: [
                {
                  name: page ? "second" : "first",
                  versions: { totalCount: 1, page: [{ version: "1.0.0" }] },
                },
              ],
            },
          },
        },
      };
    });
    return { calls, rows };
  })
  .then(
    "both pages are retained after retrying the channel spelling",
    ({ calls, rows, expect }) => {
      expect(calls).toEqual(["@owner/channel:0", "owner/channel:0", "owner/channel:1"]);
      expect(Object.keys(rows)).toEqual(["first", "second"]);
    },
  );

test
  .scenario<Fixtures>("Registry capture: failed refresh preserves the previous file")
  .given("a committed capture", ({ tmpdir }) => {
    const { manifest, captures } = registryFixture();
    const snapshot = projectRegistryCapture(captures, manifest, "2026-01-07");
    writeFixture(tmpdir.dir, "data/packages-manifest.json", JSON.stringify(manifest));
    writeFixture(tmpdir.dir, "data/packages.json", JSON.stringify(snapshot));
    return { root: tmpdir.dir, previous: readFixture(tmpdir.dir, "data/packages.json") };
  })
  .when("a registry endpoint fails", async ({ root }) => {
    try {
      await refreshRegistries(root, {
        fetcher: async (url) => {
          throw new Error(`cannot reach ${url}`);
        },
      });
      return { message: "" };
    } catch (error) {
      return { message: String(error) };
    }
  })
  .then(
    "the failure names the endpoint and leaves the snapshot intact",
    ({ root, previous, message, expect }) => {
      expect(message).toContain("https://registry.npmjs.org/");
      expect(readFixture(root, "data/packages.json")).toBe(previous);
      expect(checkRegistrySnapshot(root).retrieved).toBe("2026-01-07");
    },
  );
