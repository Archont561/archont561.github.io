import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const cli = fileURLToPath(new URL("../../src/cli/index.ts", import.meta.url));
const metadata = pathToFileURL(
  fileURLToPath(new URL("../../src/package-meta/index.ts", import.meta.url)),
).href;

export const workspacePaths = [
  "apps/github-app",
  "apps/portfolio",
  "packages/github-app-client",
  "packages/tools",
];

export function writeFixture(root: string, path: string, text: string): void {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
}

export function readFixture(root: string, path: string): string {
  return readFileSync(join(root, path), "utf8");
}

export function writeManifest(root: string, path: string, manifest: Record<string, unknown>): void {
  writeFixture(
    root,
    `${path ? `${path}/` : ""}package.json`,
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

function writeRequiredFiles(root: string): void {
  for (const path of [
    "README.md",
    "AGENTS.md",
    "CONTRIBUTING.md",
    "LICENSE",
    ".alint.yml",
    ".devcontainer/devcontainer.json",
    "bun.lock",
    "lefthook.yml",
    "biome.json",
    "pixi.toml",
    "pixi.lock",
    "scripts/restore.sh",
    "turbo.json",
  ]) {
    writeFixture(root, path, "fixture\n");
  }
  writeFixture(root, "pixi-sandbox.toml", 'schema = 1\n[[bundle]]\nname = "developer"\n');
  writeFixture(root, "docs/index.mdx", "---\ntitle: Docs\ndescription: Example\n---\n\n# Docs\n");
  writeFixture(
    root,
    "templates/README.md.ejs",
    "# <%= root.name %> <%= root.version %>\n<% for (const ws of workspaces) { %><%= ws.meta.name %> <%= ws.meta.version %>\n<% } %>",
  );
  writeManifest(root, "", {
    name: "example-repo",
    version: "1.2.3",
    private: true,
    workspaces: ["apps/*", "packages/*"],
    scripts: { dev: "echo dev", test: "echo test", check: "echo check" },
    devDependencies: { "@biomejs/biome": "2.0.0" },
  });
}

function writeWorkspaces(root: string): void {
  for (const path of workspacePaths) {
    const name = path.split("/").at(-1);
    writeManifest(root, path, {
      name: `@example/${name}`,
      version: "1.2.3",
      description: `${name} workspace`,
    });
    writeFixture(
      root,
      `${path}/src/version.ts`,
      `import { readPackageMeta } from ${JSON.stringify(metadata)};\nexport const meta = readPackageMeta(import.meta.url);\nexport const { name, version } = meta;\n`,
    );
  }
}

/** Build an independent, small example of this repository's contract. */
export function createRepository(root: string): void {
  writeRequiredFiles(root);
  writeWorkspaces(root);
}

export function runTool(root: string, ...args: string[]) {
  const result = spawnSync(process.execPath, [cli, ...args, "--root", root], {
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
  if (result.error) throw result.error;
  return result;
}
