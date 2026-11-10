import { test } from "@archont561/bun-test-utils";
import { readPackageMeta } from "@/src/package-meta/index.ts";

interface ScenarioFixtures {
  tmpdir: {
    write: (path: string, content: string) => string;
  };
}

function packageManifest(manifest: Record<string, unknown>) {
  return ({ tmpdir }: ScenarioFixtures) => {
    tmpdir.write("package.json", JSON.stringify(manifest, null, 2));
    return {};
  };
}

function moduleAt(path: string) {
  return ({ tmpdir }: ScenarioFixtures) => ({ modulePath: tmpdir.write(path, "// module\n") });
}

function readMeta({ modulePath }: { modulePath: string }) {
  return { meta: readPackageMeta(modulePath) };
}

function tryReadMeta({ modulePath }: { modulePath: string }) {
  try {
    readPackageMeta(modulePath);
    return { error: undefined };
  } catch (error) {
    return { error };
  }
}

const validPackages = [
  {
    title: "reading the manifest of the calling package",
    name: "demo-package",
    version: "1.2.3",
    modulePath: "src/index.ts",
  },
  {
    title: "walking up from nested files",
    name: "deep-package",
    version: "0.4.0",
    modulePath: "src/lib/nested/deep.ts",
  },
] as const;

for (const { title, name, version, modulePath } of validPackages) {
  test
    .scenario<ScenarioFixtures>(`Typed package manifest lookup: ${title}`)
    .given(`a package "${name}" at version "${version}"`, packageManifest({ name, version }))
    .given(`a module "${modulePath}" inside that package`, moduleAt(modulePath))
    .when("I read the package meta from that module", readMeta)
    .then(`the meta name is "${name}"`, ({ meta, expect }) => {
      expect(meta.name).toBe(name);
    })
    .then(`the meta version is "${version}"`, ({ meta, expect }) => {
      expect(meta.version).toBe(version);
    });
}

const invalidPackages = [
  {
    title: "rejecting a manifest without a name",
    given: "a package manifest without a name",
    manifest: { version: "1.0.0" },
    expected: "name",
  },
  {
    title: "rejecting an invalid version",
    given: 'a package "bad-version" at version "one.two"',
    manifest: { name: "bad-version", version: "one.two" },
    expected: "version",
  },
] as const;

for (const { title, given, manifest, expected } of invalidPackages) {
  test
    .scenario<ScenarioFixtures>(`Typed package manifest lookup: ${title}`)
    .given(given, packageManifest(manifest))
    .given('a module "src/index.ts" inside that package', moduleAt("src/index.ts"))
    .when("I try to read the package meta from that module", tryReadMeta)
    .then(`the read fails with an error mentioning "${expected}"`, ({ error, expect }) => {
      expect(error).toBeInstanceOf(Error);
      expect(String(error)).toContain(expected);
    });
}

for (const version of ["0.0.0", "1.2.3", "2.0.0-rc.1", "1.4.2+build.9"]) {
  test
    .scenario<ScenarioFixtures>(
      `Typed package manifest lookup: accepting semantic version ${version}`,
    )
    .given(
      `a package "semver-demo" at version "${version}"`,
      packageManifest({ name: "semver-demo", version }),
    )
    .given('a module "src/index.ts" inside that package', moduleAt("src/index.ts"))
    .when("I read the package meta from that module", readMeta)
    .then(`the meta version is "${version}"`, ({ meta, expect }) => {
      expect(meta.version).toBe(version);
    });
}

test
  .scenario<ScenarioFixtures>("Typed package manifest lookup: preserving unknown fields in raw")
  .given(
    'a package "raw-demo" with an extra field "customField"',
    packageManifest({ name: "raw-demo", version: "1.0.0", customField: "kept" }),
  )
  .given('a module "src/index.ts" inside that package', moduleAt("src/index.ts"))
  .when("I read the package meta from that module", readMeta)
  .then('the raw field "customField" is "kept"', ({ meta, expect }) => {
    expect(meta.raw.customField).toBe("kept");
  });

test
  .scenario<ScenarioFixtures>("Typed package manifest lookup: caching repeated lookups")
  .given(
    'a package "cache-demo" at version "3.0.0"',
    packageManifest({ name: "cache-demo", version: "3.0.0" }),
  )
  .given('a module "src/index.ts" inside that package', moduleAt("src/index.ts"))
  .when("I read the package meta from that module twice", ({ modulePath }) => ({
    first: readPackageMeta(modulePath),
    second: readPackageMeta(modulePath),
  }))
  .then("both reads return the same instance", ({ first, second, expect }) => {
    expect(first).toBe(second);
  });
