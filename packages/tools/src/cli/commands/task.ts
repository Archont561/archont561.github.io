import { defineCommand } from "citty";
import { repositoryRoot } from "@/src/maintenance/workspaces.ts";
import { discoverTasks, runTasks } from "@/src/tasks/index.ts";

export default defineCommand({
  meta: { description: "List and run file-aware repository tasks" },
  args: {
    name: { type: "positional", description: "Task name(s)", required: false },
    root: { type: "string", description: "Repository root", default: repositoryRoot() },
    list: { type: "boolean", description: "List tasks and their source files", default: false },
    force: { type: "boolean", description: "Run even when clean", default: false },
    "dry-run": {
      type: "boolean",
      description: "Show what would run without writing",
      default: false,
    },
  },
  async run({ args }) {
    const root = repositoryRoot(args.root);
    const registry = await discoverTasks(root);
    if (args.list) {
      for (const entry of registry) process.stdout.write(`${entry.task.name}\t${entry.source}\n`);
      return;
    }
    const results = await runTasks(registry, args._, {
      root,
      force: args.force,
      dryRun: args["dry-run"],
    });
    for (const result of results) process.stdout.write(`${result.status}\t${result.name}\n`);
  },
});
