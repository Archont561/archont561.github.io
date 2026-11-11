import { defineCommand } from "citty";
import { updateReadme } from "@/src/maintenance/readme.ts";
import { repositoryRoot } from "@/src/maintenance/workspaces.ts";

export default defineCommand({
  meta: { description: "Generate the root README from package metadata" },
  args: {
    root: { type: "string", description: "Repository root", default: repositoryRoot() },
    check: { type: "boolean", description: "Check for drift without writing", default: false },
  },
  run({ args }) {
    const changed = updateReadme(repositoryRoot(args.root), args.check);
    if (args.check && changed) throw new Error("README.md is out of date; run pixi run readme");
    process.stdout.write(changed ? "Updated README.md.\n" : "README.md is up to date.\n");
  },
});
