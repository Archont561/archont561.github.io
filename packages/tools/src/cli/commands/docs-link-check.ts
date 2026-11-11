import { defineCommand } from "citty";
import { checkDocsLinks } from "@/src/maintenance/docs-link-check.ts";
import { repositoryRoot } from "@/src/maintenance/workspaces.ts";

export default defineCommand({
  meta: { description: "Check documentation links with lychee" },
  args: {
    root: { type: "string", description: "Repository root", default: repositoryRoot() },
    offline: {
      type: "boolean",
      description: "Check local links without network requests",
      default: false,
    },
    "site-dir": {
      type: "string",
      description: "Optional static export directory, relative to root",
    },
    "base-path": { type: "string", description: "Published site path prefix", default: "" },
  },
  run({ args }) {
    checkDocsLinks({
      root: repositoryRoot(args.root),
      offline: args.offline,
      siteDir: args["site-dir"],
      basePath: args["base-path"],
    });
  },
});
