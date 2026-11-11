import { defineCommand } from "citty";
import {
  checkRegistrySnapshot,
  refreshRegistries,
  registryCounts,
} from "@/src/maintenance/registries.ts";
import { repositoryRoot } from "@/src/maintenance/workspaces.ts";

export default defineCommand({
  meta: { description: "Refresh npm, PyPI and Prefix.dev package snapshots" },
  args: {
    root: { type: "string", description: "Repository root", default: repositoryRoot() },
    check: {
      type: "boolean",
      description: "Validate the committed capture offline",
      default: false,
    },
  },
  async run({ args }) {
    const root = repositoryRoot(args.root);
    if (args.check) {
      const counts = registryCounts(checkRegistrySnapshot(root));
      process.stdout.write(
        `Registry snapshot verified: ${Object.entries(counts)
          .map(([name, count]) => `${name} ${count.published} published`)
          .join(" · ")}.\n`,
      );
    } else
      process.stdout.write(
        (await refreshRegistries(root))
          ? "Registry snapshot updated.\n"
          : "Registry snapshot already current.\n",
      );
  },
});
