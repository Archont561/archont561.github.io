import { join } from "node:path";
import { defineCommand } from "citty";
import { exportAi } from "@/src/maintenance/export-ai.ts";
import { repositoryRoot } from "@/src/maintenance/workspaces.ts";

export default defineCommand({
  meta: { description: "Export processed documentation to Markdown, feeds and LLM indexes" },
  args: { root: { type: "string", description: "Repository root", default: repositoryRoot() } },
  run({ args }) {
    const site = join(repositoryRoot(args.root), "apps/portfolio/out");
    const pages = exportAi(site);
    process.stdout.write(`Exported ${pages.length} AI-readable pages to ${site}.\n`);
  },
});
