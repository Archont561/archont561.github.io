#!/usr/bin/env bun
import { runMain } from "citty";
import { createCli, showCliUsage } from "@/src/cli/app.ts";

await runMain(await createCli(), { showUsage: showCliUsage });
