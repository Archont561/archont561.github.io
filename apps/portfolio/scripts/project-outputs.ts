import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { GENERATED_MARKER } from "@/scripts/project-render";

export type OutputChanges = { stale: string[]; orphaned: string[]; unmanaged: string[] };

function managedMarkdown(path: string): boolean {
  return existsSync(path) && readFileSync(path, "utf8").slice(0, 300).includes(GENERATED_MARKER);
}

function validOutputPath(path: string): boolean {
  return (
    path === "docs/projects/meta.json" ||
    path === "apps/portfolio/src/lib/projects.json" ||
    /^docs\/projects\/[a-z0-9]+(?:-[a-z0-9]+)*\.mdx$/.test(path)
  );
}

function extraMarkdown(
  root: string,
  outputs: Map<string, string>,
): {
  orphaned: string[];
  unmanaged: string[];
} {
  const directory = join(root, "docs/projects");
  const extra = existsSync(directory)
    ? readdirSync(directory, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith(".mdx"))
        .map((entry) => `docs/projects/${entry.name}`)
        .filter((path) => !outputs.has(path))
        .sort()
    : [];
  return {
    orphaned: extra.filter((path) => managedMarkdown(join(root, path))),
    unmanaged: extra.filter((path) => !managedMarkdown(join(root, path))),
  };
}

/** Compare generated inputs to the committed files without changing the workspace. */
export function projectOutputChanges(root: string, outputs: Map<string, string>): OutputChanges {
  const stale = [...outputs]
    .filter(([path, content]) => {
      if (!validOutputPath(path)) throw new Error(`Unsafe generated path: ${path}`);
      const file = join(root, path);
      return !existsSync(file) || readFileSync(file, "utf8") !== content;
    })
    .map(([path]) => path)
    .sort();
  return { stale, ...extraMarkdown(root, outputs) };
}

/** Only overwrite unmarked MDX when explicitly adopting existing pages. */
export function writeProjectOutputs(
  root: string,
  outputs: Map<string, string>,
  options: { adoptExisting: boolean },
): OutputChanges {
  const changes = projectOutputChanges(root, outputs);
  if (changes.unmanaged.length) {
    throw new Error(
      `Unmanaged project pages have no data record: ${changes.unmanaged.join(", ")}. Move their content to data/projects/<slug>.mdx and add matching JSON.`,
    );
  }
  const unmanaged = changes.stale.filter(
    (path) =>
      path.endsWith(".mdx") && existsSync(join(root, path)) && !managedMarkdown(join(root, path)),
  );
  if (unmanaged.length && !options.adoptExisting) {
    throw new Error(
      `Refusing to overwrite unmarked project pages: ${unmanaged.join(", ")}. Move custom content to data/projects/<slug>.mdx or explicitly adopt the pages after review.`,
    );
  }
  for (const path of changes.stale) {
    const file = join(root, path);
    mkdirSync(dirname(file), { recursive: true });
    const content = outputs.get(path);
    if (content === undefined) throw new Error(`Missing generated content: ${path}`);
    writeFileSync(file, content);
  }
  for (const path of changes.orphaned) rmSync(join(root, path));
  return changes;
}
