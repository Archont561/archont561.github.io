import { randomUUID } from "node:crypto";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@archont561/bun-test-utils";
import { assertSuccess, repo, run, tsc } from "@/tests/fixtures/config-test-utils.ts";

const workspaces = [
  { path: "apps/github-app", name: "@archont561/github-app", kind: "worker" },
  { path: "apps/portfolio", name: "@archont561/portfolio", kind: "app" },
  { path: "packages/github-app-client", name: "@archont561/github-app-client", kind: "package" },
  { path: "packages/tools", name: "@archont561/tools", kind: "tools" },
] as const;

type Workspace = (typeof workspaces)[number];

function assertCompilerSettings(workspace: Workspace): void {
  const dir = join(repo, workspace.path);
  const raw = JSON.parse(readFileSync(join(dir, "tsconfig.json"), "utf8"));
  expect(Object.keys(raw)).toEqual(["extends"]);
  const result = run(tsc, ["--showConfig", "-p", dir], dir);
  assertSuccess(result);
  const config = JSON.parse(result.stdout);
  expect(config.compilerOptions).toMatchObject({
    target: "esnext",
    module: "preserve",
    moduleResolution: "bundler",
    strict: true,
    noImplicitOverride: true,
    noFallthroughCasesInSwitch: true,
    noImplicitReturns: true,
    noUncheckedIndexedAccess: true,
    verbatimModuleSyntax: true,
    allowImportingTsExtensions: true,
    noEmit: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
  });
  const expectedLib = workspace.kind === "app" ? ["esnext", "dom", "dom.iterable"] : ["esnext"];
  const expectedTypes =
    workspace.kind === "worker" ? ["@cloudflare/workers-types", "node"] : ["node"];
  expect(config.compilerOptions.lib).toEqual(expectedLib);
  expect(config.compilerOptions.types).toEqual(expectedTypes);
  expect(config.compilerOptions.jsx).toBe(workspace.kind === "app" ? "preserve" : undefined);
  expect(Object.keys(config.compilerOptions.paths)).toEqual(
    workspace.kind === "tools" ? ["@/*", "@root/*"] : ["@/*"],
  );
  expect(config.files).toContain("./src/version.ts");
  if (workspace.kind === "tools") {
    expect(config.files).toContain("./tests/version.test.ts");
    expect(config.files).toContain("./features/cli.test.ts");
    expect(config.files).toContain("./features/version.test.ts");
    expect(config.files).toContain("../../tasks/docs.ts");
    expect(config.files).toContain("../../tasks/version.ts");
  }
}

function typecheckAlias(workspace: Workspace): void {
  const dir = join(repo, workspace.path);
  const file = join(dir, "src", `config-alias-probe-${randomUUID()}.ts`);
  const rootImport =
    'import type { PackageMeta } from "@root/packages/tools/src/package-meta/index.ts";\nexport type RootProbe = PackageMeta;\n';
  let source = 'import { name } from "@/src/version.ts";\nexport const alias: string = name;\n';
  if (workspace.kind === "app") source += 'export { default as config } from "../uno.config.ts";\n';
  if (workspace.kind === "package") {
    source += 'export { default as config } from "../bunup.config.ts";\n';
  }
  try {
    writeFileSync(file, workspace.kind === "tools" ? source + rootImport : source);
    assertSuccess(run(tsc, ["--noEmit", "-p", dir], dir));
    if (workspace.kind !== "tools") {
      writeFileSync(file, source + rootImport);
      const rejected = run(tsc, ["--noEmit", "-p", dir], dir);
      expect(rejected.status).not.toBe(0);
      expect(rejected.stdout + rejected.stderr).toContain("Cannot find module '@root/");
    }
  } finally {
    rmSync(file, { force: true });
  }
}

function runtimeAlias(workspace: Workspace): void {
  const dir = join(repo, workspace.path);
  const result = run(
    process.execPath,
    ["-e", 'import { name } from "@/src/version.ts"; process.stdout.write(name);'],
    dir,
  );
  assertSuccess(result);
  expect(result.stdout).toBe(workspace.name);
  const rootResult = run(
    process.execPath,
    ["-e", 'import root from "@root/package.json"; process.stdout.write(root.name);'],
    dir,
  );
  if (workspace.kind === "tools") {
    assertSuccess(rootResult);
    expect(rootResult.stdout).toBe("archont561-workspace");
  } else {
    expect(rootResult.status).not.toBe(0);
    expect(rootResult.stderr).toContain("Cannot find module");
  }
}

for (const workspace of workspaces) {
  test(`${workspace.path}: shared TypeScript settings and aliases`, () => {
    assertCompilerSettings(workspace);
    typecheckAlias(workspace);
  });

  test(`${workspace.path}: Bun resolves aliases from this package`, () => {
    runtimeAlias(workspace);
  });
}
