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
import { assertSuccess, repo, run } from "@/tests/fixtures/config-test-utils.ts";

const worker = join(repo, "apps/github-app");
const portfolio = join(repo, "apps/portfolio");

function seedTsconfig(workspace: string, fixture: string): void {
  copyFileSync(join(workspace, "tsconfig.json"), join(fixture, "tsconfig.json"));
  symlinkSync(
    join(repo, "packages/tools/src/configs/typescript"),
    join(fixture, ".tsconfig"),
    "dir",
  );
}

test(
  "Wrangler bundles the worker's package-root alias",
  () => {
    const fixture = mkdtempSync(join(worker, ".config-test-"));
    const output = mkdtempSync(join(tmpdir(), "wrangler-config-test-"));
    try {
      seedTsconfig(worker, fixture);
      mkdirSync(join(fixture, "src"));
      writeFileSync(join(fixture, "src/value.ts"), 'export const value = "worker-alias-probe";\n');
      writeFileSync(
        join(fixture, "src/worker.ts"),
        'import { value } from "@/src/value.ts";\nexport default { fetch: () => new Response(value) };\n',
      );
      const result = run(
        join(worker, "node_modules/.bin/wrangler"),
        [
          "deploy",
          "src/worker.ts",
          "--dry-run",
          "--name",
          "config-alias-test",
          "--outdir",
          output,
          "--compatibility-date",
          "2026-10-01",
        ],
        fixture,
      );
      assertSuccess(result);
      expect(result.stdout + result.stderr).toContain("--dry-run");
      expect(readFileSync(join(output, "worker.js"), "utf8")).toContain("worker-alias-probe");
    } finally {
      rmSync(fixture, { recursive: true, force: true });
      rmSync(output, { recursive: true, force: true });
    }
  },
  { timeout: 60_000 },
);

function seedNextProject(fixture: string): void {
  seedTsconfig(portfolio, fixture);
  copyFileSync(join(portfolio, "next.config.mjs"), join(fixture, "next.config.mjs"));
  mkdirSync(join(fixture, "src/app"), { recursive: true });
  // A same-shaped local module catches accidental resolution of tools' public
  // imports using the app's @/ alias, even if both paths happen to exist.
  mkdirSync(join(fixture, "src/package-meta"));
  writeFileSync(
    join(fixture, "src/package-meta/index.ts"),
    'export type PackageMeta = {name: string};\nexport function parsePackageMeta(_raw: unknown) { return {name: "wrong-workspace"}; }\nexport function readPackageMeta() { return {name: "wrong-workspace"}; }\n',
  );
  writeFileSync(join(fixture, "src/value.ts"), 'export const value = "next-alias-probe";\n');
  writeFileSync(
    join(fixture, "src/app/layout.tsx"),
    'import type { ReactNode } from "react";\nexport default function Layout({ children }: { children: ReactNode }) { return <html><body>{children}</body></html>; }\n',
  );
  writeFileSync(
    join(fixture, "src/app/page.tsx"),
    'import { parsePackageMeta } from "@archont561/tools";\nimport { value } from "@/src/value.ts";\nexport default function Page() { return <main>{value} {parsePackageMeta({name: "demo", version: "1.0.0"}).name}</main>; }\n',
  );
}

for (const [bundler, flags] of [
  ["Turbopack", []],
  ["webpack", ["--webpack"]],
] as const) {
  test(
    `Next ${bundler} builds the portfolio's package-root alias and tools entry`,
    () => {
      const fixture = mkdtempSync(join(portfolio, ".config-test-"));
      try {
        seedNextProject(fixture);
        const config = readFileSync(join(fixture, "tsconfig.json"), "utf8");
        const result = run(
          join(portfolio, "node_modules/.bin/next"),
          ["build", fixture, ...flags],
          portfolio,
        );
        assertSuccess(result);
        const html = readFileSync(join(fixture, ".next/server/app/index.html"), "utf8");
        expect(html).toContain("next-alias-probe");
        expect(html).toContain("demo");
        expect(html).not.toContain("wrong-workspace");
        expect(readFileSync(join(fixture, "tsconfig.json"), "utf8")).toBe(config);
      } finally {
        rmSync(fixture, { recursive: true, force: true });
      }
    },
    { timeout: 120_000 },
  );
}
