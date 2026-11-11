import { assertWorkspaceVersions, task, tasks } from "@archont561/tools/tasks";

export default tasks(
  task({
    name: "version:sync",
    fileDep: [
      "apps/*/package.json",
      "apps/*/src/version.ts",
      "packages/*/package.json",
      "packages/*/src/version.ts",
      "packages/tools/src/maintenance/structure.ts",
      "packages/tools/src/maintenance/version-probe.ts",
      "packages/tools/src/package-meta/index.ts",
    ],
    run: ({ root }) => assertWorkspaceVersions(root),
  }),
);
