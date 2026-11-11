import { resolve } from "node:path";
import { projectOutputChanges, writeProjectOutputs } from "@/scripts/project-outputs";
import { renderProjectOutputs } from "@/scripts/project-render";
import { loadProjectCatalog } from "@/src/lib/project-catalog";

const root = resolve(import.meta.dir, "../../..");
const args = process.argv.slice(2);
const check = args.includes("--check");
const adoptExisting = args.includes("--adopt-existing");

if (
  args.some((arg) => arg !== "--check" && arg !== "--adopt-existing") ||
  (check && adoptExisting)
) {
  throw new Error("Usage: bun run scripts/projects.ts [--check | --adopt-existing]");
}

const outputs = renderProjectOutputs(loadProjectCatalog(root));
if (check) {
  const changes = projectOutputChanges(root, outputs);
  const paths = [...changes.stale, ...changes.orphaned, ...changes.unmanaged];
  if (paths.length) {
    process.stderr.write(
      `Project outputs are stale or unmanaged:\n${paths.join("\n")}\nRun bun run --cwd apps/portfolio projects:generate.\n`,
    );
    process.exitCode = 1;
  } else {
    process.stdout.write("Project outputs are up to date.\n");
  }
} else {
  const changes = writeProjectOutputs(root, outputs, { adoptExisting });
  process.stdout.write(
    `Project outputs: ${changes.stale.length} written, ${changes.orphaned.length} removed.\n`,
  );
}
