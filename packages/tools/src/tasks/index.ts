/** Small, dependency-free task definitions and workspace presets. */
import { readWorkspaces, repositoryRoot } from "../maintenance/workspaces.ts";

export interface TaskContext {
  root: string;
}

export interface Task {
  name: string;
  deps?: string[];
  fileDep?: string[];
  targets?: string[];
  upToDate?: (context: TaskContext) => boolean | Promise<boolean>;
  run: (context: TaskContext) => void | Promise<void>;
}

export type TaskDef = Task;
export type Tasks = Task[];
export type TaskPreset = (params: Record<string, string>) => Task | Tasks;

function strings(value: unknown, label: string): asserts value is string[] | undefined {
  if (
    value !== undefined &&
    (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item))
  ) {
    throw new TypeError(`${label} must be an array of non-empty strings`);
  }
}

/** Validate and copy a task so callers cannot mutate its dependency arrays accidentally. */
export function task(def: TaskDef): Task {
  if (
    !def ||
    typeof def !== "object" ||
    typeof def.name !== "string" ||
    !/^[a-zA-Z0-9][a-zA-Z0-9:._/-]*$/.test(def.name)
  ) {
    throw new TypeError(`Invalid task name: ${JSON.stringify(def?.name)}`);
  }
  if (typeof def.run !== "function") throw new TypeError(`${def.name}: run must be a function`);
  if (def.upToDate !== undefined && typeof def.upToDate !== "function")
    throw new TypeError(`${def.name}: upToDate must be a function`);
  strings(def.deps, `${def.name}.deps`);
  strings(def.fileDep, `${def.name}.fileDep`);
  strings(def.targets, `${def.name}.targets`);
  for (const pattern of [...(def.fileDep ?? []), ...(def.targets ?? [])]) {
    if (
      pattern.startsWith("/") ||
      pattern.includes("\\") ||
      pattern.split("/").some((part) => part === ".." || part === ".")
    ) {
      throw new Error(`${def.name}: unsafe file pattern ${JSON.stringify(pattern)}`);
    }
  }
  return {
    ...def,
    deps: def.deps && [...def.deps],
    fileDep: def.fileDep && [...def.fileDep],
    targets: def.targets && [...def.targets],
  };
}

/** Splice preset results into a registry and reject duplicate names in that file. */
export function tasks(...defs: Array<TaskDef | TaskDef[]>): Tasks {
  const result = defs.flat().map(task);
  const seen = new Set<string>();
  for (const item of result) {
    if (seen.has(item.name))
      throw new Error(`Duplicate task name ${JSON.stringify(item.name)} in one registry`);
    seen.add(item.name);
  }
  return result;
}

/** Expand a factory once for each declared workspace, sorted by path. */
export function forWorkspaces(
  factory: (path: string) => Task | Tasks,
  root = repositoryRoot(),
): Tasks {
  return tasks(...readWorkspaces(root).map(({ path }) => factory(path)));
}

export { updateTextFile } from "../maintenance/files.ts";
export type { RegisteredTask } from "./internal/discover.ts";
export { discoverTasks } from "./internal/discover.ts";
export type { TaskResult, TaskRunOptions } from "./internal/runner.ts";
export { runTasks } from "./internal/runner.ts";
export { assertWorkspaceVersions } from "./internal/versions.ts";

// All top-level task modules are discoverable registries; the API itself adds none.
export default tasks();
