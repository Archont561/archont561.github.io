import { spawnSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export type ProcessRunner = (command: string, args: string[], root: string) => void;

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

/** Check prerequisites and the declared container contract without running processes. */
export function checkDevcontainer(root: string): void {
  for (const name of [
    "pixi.toml",
    "pixi.lock",
    "bun.lock",
    "package.json",
    "apps/portfolio/package.json",
    ".devcontainer/devcontainer.json",
    ".devcontainer/setup.sh",
  ]) {
    if (!isFile(join(root, name))) throw new Error(`Missing workspace prerequisite: ${name}`);
  }
  const config: unknown = JSON.parse(
    readFileSync(join(root, ".devcontainer/devcontainer.json"), "utf8"),
  );
  if (!config || typeof config !== "object" || Array.isArray(config))
    throw new Error("Invalid devcontainer configuration");
  const value = config as Record<string, unknown>;
  if (
    typeof value.image !== "string" ||
    !/^ghcr\.io\/prefix-dev\/pixi:\d+\.\d+\.\d+$/.test(value.image) ||
    !Array.isArray(value.runArgs) ||
    !value.runArgs.includes("--platform=linux/amd64") ||
    value.postCreateCommand !== "bash .devcontainer/setup.sh" ||
    value.waitFor !== "postCreateCommand" ||
    !Array.isArray(value.forwardPorts) ||
    !value.forwardPorts.includes(3000)
  )
    throw new Error(
      "Devcontainer must pin Pixi, target linux/amd64, run the locked setup and forward port 3000",
    );
}

export const runProcess: ProcessRunner = (command, args, root) => {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit" });
  if (result.error)
    throw new Error(`Cannot start ${command}: ${result.error.message}`, { cause: result.error });
  if (result.status !== 0)
    throw new Error(`${command} failed (exit ${result.status ?? result.signal})`);
};

/** Locked installs first; never install global tools, hooks or start a server implicitly. */
export function setupDevcontainer(
  root: string,
  options: { hooks?: boolean; run?: ProcessRunner; platform?: NodeJS.Platform; arch?: string } = {},
): void {
  const platform = options.platform ?? process.platform;
  const arch = options.arch ?? process.arch;
  if (platform !== "linux" || arch !== "x64")
    throw new Error("The devcontainer requires Linux x86-64 (Pixi linux-64)");
  checkDevcontainer(root);
  const run = options.run ?? runProcess;
  run("bun", ["install", "--frozen-lockfile"], root);
  run("vale", ["sync"], root);
  if (options.hooks) run("lefthook", ["install"], root);
}
