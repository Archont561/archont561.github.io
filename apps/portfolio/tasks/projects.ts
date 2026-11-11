import { task, tasks } from "@archont561/tools/tasks";
import { loadProjectCatalog } from "@/src/lib/project-catalog";
import { projectOutputChanges, writeProjectOutputs } from "@/tasks/lib/project-outputs";
import { renderProjectOutputs } from "@/tasks/lib/project-render";

function outputsFor(root: string): Map<string, string> {
  return renderProjectOutputs(loadProjectCatalog(root));
}

function generate(root: string, adoptExisting: boolean): void {
  const changes = writeProjectOutputs(root, outputsFor(root), { adoptExisting });
  process.stdout.write(
    `Project outputs: ${changes.stale.length} written, ${changes.orphaned.length} removed.\n`,
  );
}

export default tasks(
  task({
    name: "portfolio:projects:generate",
    fileDep: [
      "data/project-categories.json",
      "data/repositories.json",
      "data/projects/**/*",
      "apps/portfolio/src/lib/project-catalog.ts",
      "apps/portfolio/tasks/**/*.ts",
      "bun.lock",
    ],
    targets: [
      "docs/projects/*.mdx",
      "docs/projects/meta.json",
      "apps/portfolio/src/lib/projects.json",
    ],
    run: ({ root }) => generate(root, false),
  }),
  task({
    name: "portfolio:projects:check",
    run: ({ root }) => {
      const changes = projectOutputChanges(root, outputsFor(root));
      const paths = [...changes.stale, ...changes.orphaned, ...changes.unmanaged];
      if (paths.length) {
        throw new Error(
          `Project outputs are stale or unmanaged:\n${paths.join("\n")}\nRun pixi run tools task portfolio:projects:generate.`,
        );
      }
      process.stdout.write("Project outputs are up to date.\n");
    },
  }),
  task({
    // Explicitly opt in before replacing reviewed, hand-written project pages.
    name: "portfolio:projects:adopt",
    run: ({ root }) => generate(root, true),
  }),
);
