import { randomUUID } from "node:crypto";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@archont561/bun-test-utils";
import { createBunupBase } from "@/src/configs/bunup/base.ts";
import { assertSuccess, repo, run, tsc } from "@/tests/fixtures/config-test-utils.ts";

const client = join(repo, "packages/github-app-client");
const portfolio = join(repo, "apps/portfolio");

function makeConsumer(directory: string, output: string): void {
  const manifest = JSON.parse(readFileSync(join(client, "package.json"), "utf8"));
  const packageDir = join(directory, "node_modules/@archont561/github-app-client");
  mkdirSync(join(packageDir, "dist"), { recursive: true });
  for (const name of ["index.js", "index.d.ts"]) {
    copyFileSync(join(output, name), join(packageDir, "dist", name));
  }
  writeFileSync(
    join(packageDir, "package.json"),
    JSON.stringify({
      name: manifest.name,
      version: manifest.version,
      type: "module",
      exports: { ".": { types: "./dist/index.d.ts", default: "./dist/index.js" } },
    }),
  );
  writeFileSync(
    join(directory, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ESNext",
        module: "preserve",
        moduleResolution: "bundler",
        strict: true,
        noEmit: true,
        types: [],
      },
      include: ["consumer.ts"],
    }),
  );
  writeFileSync(
    join(directory, "consumer.ts"),
    'import { meta, name } from "@archont561/github-app-client";\nexport const value: string = name + meta.version;\n',
  );
}

function assertConsumer(directory: string): void {
  assertSuccess(run(tsc, ["-p", directory], directory));
  const result = run(
    process.execPath,
    ["-e", 'import { name } from "@archont561/github-app-client"; process.stdout.write(name);'],
    directory,
  );
  assertSuccess(result);
  expect(result.stdout).toBe("@archont561/github-app-client");
}

function seedAliasWorkspace(directory: string, marker: string): void {
  mkdirSync(join(directory, "src"), { recursive: true });
  symlinkSync(
    join(repo, "packages/tools/src/configs/typescript"),
    join(directory, ".tsconfig"),
    "dir",
  );
  writeFileSync(join(directory, "tsconfig.json"), '{"extends":"./.tsconfig/package.json"}\n');
  writeFileSync(
    join(directory, "src/value.ts"),
    `export const marker = ${JSON.stringify(marker)};\n`,
  );
}

test("bunup resolves each inlined workspace's aliases, including colliding paths", () => {
  const fixture = mkdtempSync(join(client, ".config-test-"));
  const consumer = join(fixture, "consumer");
  const dependency = join(fixture, "dependency");
  const script = `
    import { createBunupBase } from "@archont561/tools/configs/bunup";
    const config = createBunupBase();
    const result = await Bun.build({
      entrypoints: ["./src/entry.ts"], target: "node", tsconfig: config.preferredTsconfig,
      plugins: config.plugins.filter(plugin => typeof plugin.setup === "function"), throw: false,
    });
    if (!result.success) throw new Error(result.logs.map(String).join("\\n"));
    const source = await result.outputs[0].text();
    const bundled = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));
    process.stdout.write(bundled.consumer + "|" + bundled.dependency);
  `;
  try {
    seedAliasWorkspace(consumer, "consumer");
    seedAliasWorkspace(dependency, "dependency");
    symlinkSync(
      join(repo, "packages/tools/src/configs/bunup/tsconfig.json"),
      join(consumer, ".tsconfig.bunup.json"),
      "file",
    );
    writeFileSync(
      join(dependency, "package.json"),
      JSON.stringify({ name: "config-test-dependency", type: "module", exports: "./src/entry.ts" }),
    );
    mkdirSync(join(consumer, "node_modules"));
    symlinkSync(dependency, join(consumer, "node_modules/config-test-dependency"), "dir");
    writeFileSync(
      join(dependency, "src/entry.ts"),
      'export { marker as dependency } from "@/src/value.ts";\n',
    );
    writeFileSync(
      join(consumer, "src/entry.ts"),
      'export { marker as consumer } from "@/src/value.ts";\nexport { dependency } from "config-test-dependency";\n',
    );
    const result = run(process.execPath, ["-e", script], consumer);
    assertSuccess(result);
    expect(result.stdout).toBe("consumer|dependency");
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("the real client bunup config produces portable JS and declarations", () => {
  const output = `dist/config-test-${randomUUID()}`;
  const outputDir = join(client, output);
  const consumer = mkdtempSync(join(tmpdir(), "client-consumer-"));
  const script = `
    import { build } from "bunup";
    import config from "./bunup.config.ts";
    await build({ ...config, outDir: ${JSON.stringify(output)}, silent: true,
      plugins: config.plugins.filter(plugin => plugin.name !== "exports") });
  `;
  try {
    assertSuccess(run(process.execPath, ["-e", script], client));
    const declarations = readFileSync(join(outputDir, "index.d.ts"), "utf8");
    expect(declarations).not.toContain('from "@/');
    expect(declarations).not.toContain('from "@archont561/tools');
    makeConsumer(consumer, outputDir);
    assertConsumer(consumer);
  } finally {
    rmSync(outputDir, { recursive: true, force: true });
    rmSync(consumer, { recursive: true, force: true });
  }
});

test("bunup refuses to publish unresolved declaration aliases", async () => {
  const plugin = createBunupBase().plugins.find(
    (item) => item.name === "workspace-declaration-alias-check",
  );
  if (!plugin || !("hooks" in plugin)) throw new Error("Missing declaration check");
  const directory = mkdtempSync(join(tmpdir(), "bunup-declarations-"));
  const file = join(directory, "index.d.ts");
  try {
    writeFileSync(file, 'export declare const value: "@/literal";\n');
    await plugin.hooks.onBuildDone({ files: [{ dts: true, fullPath: file }] });
    writeFileSync(file, 'export { value } from "@/src/value.ts";\n');
    await expect(
      plugin.hooks.onBuildDone({ files: [{ dts: true, fullPath: file }] }),
    ).rejects.toThrow("Unresolved @/ import");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("the portfolio consumes the shared UnoCSS preset", () => {
  const script = `
    import { createGenerator } from "unocss";
    import config from "./uno.config.ts";
    const generator = await createGenerator(config);
    const { css } = await generator.generate("sr-only flex");
    process.stdout.write(css);
  `;
  const result = run(process.execPath, ["-e", script], portfolio);
  assertSuccess(result);
  expect(result.stdout).toContain(".sr-only{");
  expect(result.stdout).toContain("white-space:nowrap");
  expect(result.stdout).not.toContain(".flex{");
});
