import { type SpawnSyncReturns, spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const repo = fileURLToPath(new URL("../../../../", import.meta.url));
export const tsc = join(repo, "node_modules/.bin/tsc");
export const biome = join(repo, "node_modules/.bin/biome");

export function run(executable: string, args: string[], cwd: string): SpawnSyncReturns<string> {
  const result = spawnSync(executable, args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      NO_COLOR: "1",
      CI: process.env.CI ?? "1",
      NEXT_TELEMETRY_DISABLED: "1",
      WRANGLER_SEND_METRICS: "false",
    },
  });
  if (result.error) throw result.error;
  return result;
}

export function assertSuccess(result: SpawnSyncReturns<string>): void {
  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status}):\n${result.stdout}\n${result.stderr}`);
  }
}
