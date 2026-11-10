import { defineCommand } from "citty";
import { readPackageMeta } from "@/src/package-meta/index.ts";

export default defineCommand({
  meta: { description: "Print the tools package name and version" },
  run() {
    const { name, version } = readPackageMeta(import.meta.url);
    process.stdout.write(`${name} ${version}\n`);
  },
});
