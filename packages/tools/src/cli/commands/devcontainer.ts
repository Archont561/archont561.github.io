import { defineCommand } from "citty";
import { checkDevcontainer, setupDevcontainer } from "@/src/maintenance/devcontainer.ts";
import { repositoryRoot } from "@/src/maintenance/workspaces.ts";

export default defineCommand({
  meta: { description: "Validate or prepare the locked development container" },
  args: {
    root: { type: "string", description: "Repository root", default: repositoryRoot() },
    setup: {
      type: "boolean",
      description: "Install frozen JS dependencies and sync Vale",
      default: false,
    },
    hooks: {
      type: "boolean",
      description: "Opt into installing Git hooks during setup",
      default: false,
    },
  },
  run({ args }) {
    const root = repositoryRoot(args.root);
    if (args.hooks && !args.setup) throw new Error("--hooks requires --setup");
    if (args.setup) setupDevcontainer(root, { hooks: args.hooks });
    else checkDevcontainer(root);
    process.stdout.write(
      args.setup ? "Devcontainer workspace prepared.\n" : "Devcontainer configuration validated.\n",
    );
  },
});
