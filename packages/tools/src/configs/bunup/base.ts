import { readFile } from "node:fs/promises";
import type { BunPlugin } from "bun";

interface BuildFile {
  dts: boolean;
  fullPath: string;
}

async function rejectUnresolvedAliases({ files }: { files: BuildFile[] }): Promise<void> {
  for (const file of files.filter((output) => output.dts)) {
    const declaration = await readFile(file.fullPath, "utf8");
    if (/\b(?:from\s*|import\s*(?:\(\s*)?)["']@\/[^"']+["']/.test(declaration)) {
      throw new Error(
        `Unresolved @/ import in ${file.fullPath}: bunup could not resolve a package-local alias in a declaration. Use an explicit package subpath or adjust the inlined module's imports.`,
      );
    }
  }
}

/** Shared settings for publishable ESM packages built by bunup. */
export function createBunupBase() {
  const useNearestTsconfig: BunPlugin = {
    name: "workspace-nearest-tsconfig",
    setup(builder) {
      // Bunup uses preferredTsconfig for both JS and declarations. JS must
      // instead use each imported workspace's nearest config, so an inlined
      // tools module's @/ resolves to tools, not the consuming package.
      builder.config.tsconfig = undefined;
    },
  };
  const checkDeclarations = {
    name: "workspace-declaration-alias-check",
    hooks: { onBuildDone: rejectUnresolvedAliases },
  };
  return {
    format: "esm" as const,
    dts: true,
    // bunup's declaration resolver reads paths only from the preferred file,
    // not its extends. This workspace-root symlink provides @ -> "." parity.
    preferredTsconfig: "./.tsconfig.bunup.json",
    plugins: [useNearestTsconfig, checkDeclarations],
  };
}
