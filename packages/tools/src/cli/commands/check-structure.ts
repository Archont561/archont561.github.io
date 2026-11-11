import { defineCommand } from "citty";
import { checkStructure } from "@/src/maintenance/structure.ts";
import { repositoryRoot } from "@/src/maintenance/workspaces.ts";

export default defineCommand({
  meta: { description: "Validate repository structure and package versions" },
  args: {
    root: { type: "string", description: "Repository root", default: repositoryRoot() },
  },
  run({ args }) {
    const issues = checkStructure(repositoryRoot(args.root));
    if (issues.length)
      throw new Error(`Repository structure validation failed:\n- ${issues.join("\n- ")}`);
    process.stdout.write("Repository structure validated.\n");
  },
});
