import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readManifest, repositoryRoot } from "../maintenance/workspaces.ts";
import { forWorkspaces, type Tasks, task, tasks } from "./index.ts";

/** The first heading identifies the package described by a workspace README. */
export function createTasks(root: string): Tasks {
  const checks = forWorkspaces(
    (path) =>
      task({
        name: `readme:check:${path}`,
        fileDep: [`${path}/package.json`, `${path}/README.md`],
        run: ({ root: current }) => {
          const meta = readManifest(join(current, path, "package.json"));
          const file = join(current, path, "README.md");
          const heading = readFileSync(file, "utf8").match(/^#\s+(.+?)\s*$/m)?.[1];
          if (heading !== meta.name)
            throw new Error(`${path}/README.md: expected heading # ${meta.name}`);
        },
      }),
    root,
  );
  return tasks(
    checks,
    task({ name: "readme:check", deps: checks.map((item) => item.name), run() {} }),
  );
}

export default createTasks(repositoryRoot());
