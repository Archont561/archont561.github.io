import { defineCommand } from "citty";
import { updateAgents } from "@/src/maintenance/agents.ts";
import { repositoryRoot } from "@/src/maintenance/workspaces.ts";

export default defineCommand({
  meta: { description: "Refresh marked AGENTS.md guidance safely" },
  args: {
    root: { type: "string", description: "Repository root", default: repositoryRoot() },
    check: { type: "boolean", description: "Check for drift without writing", default: false },
  },
  run({ args }) {
    const changed = updateAgents(repositoryRoot(args.root), args.check);
    if (args.check && changed) throw new Error("AGENTS.md is out of date; run pixi run agents");
    process.stdout.write(
      changed ? "Updated marked AGENTS.md regions.\n" : "AGENTS.md is up to date.\n",
    );
  },
});
