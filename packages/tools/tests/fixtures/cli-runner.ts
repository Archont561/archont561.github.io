import { runMain } from "citty";
import { createCli, showCliUsage } from "@/src/cli/app.ts";

const [directory, ...rawArgs] = process.argv.slice(2);
if (!directory) throw new Error("A command directory is required");
await runMain(await createCli(directory), { rawArgs, showUsage: showCliUsage });
