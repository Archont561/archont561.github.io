import { defineCommand } from "citty";
import {
  checkRepositorySnapshot,
  refreshRepositories,
  repositorySignals,
} from "@/src/maintenance/watch-repos.ts";
import { repositoryRoot } from "@/src/maintenance/workspaces.ts";

export default defineCommand({
  meta: { description: "Refresh the public GitHub repository audit snapshot" },
  args: {
    root: { type: "string", description: "Repository root", default: repositoryRoot() },
    check: {
      type: "boolean",
      description: "Validate the committed snapshot offline",
      default: false,
    },
  },
  async run({ args }) {
    const root = repositoryRoot(args.root);
    if (args.check) {
      const snapshot = checkRepositorySnapshot(root);
      process.stdout.write(
        `Repository snapshot verified: ${repositorySignals(snapshot.repositories).owned} repositories.\n`,
      );
    } else {
      process.stdout.write(
        (await refreshRepositories(root))
          ? "Repository snapshot updated.\n"
          : "Repository snapshot already current.\n",
      );
    }
  },
});
