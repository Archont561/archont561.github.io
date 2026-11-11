import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathExists, updateTextFile } from "../../maintenance/files.ts";
import type { Task } from "../index.ts";
import type { RegisteredTask } from "./discover.ts";

interface StoredTask {
  definition: string;
  inputs: string;
  targets: string;
}
interface State {
  version: 1;
  tasks: Record<string, StoredTask>;
}
export interface TaskRunOptions {
  root: string;
  force?: boolean;
  dryRun?: boolean;
}
export interface TaskResult {
  name: string;
  status: "run" | "skip" | "would-run" | "would-skip";
}

function digest(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashFiles(root: string, patterns: string[]): { hash: string; missing: boolean } {
  const parts: string[] = [];
  let missing = false;
  for (const pattern of patterns) {
    const files = [
      ...new Bun.Glob(pattern).scanSync({ cwd: root, onlyFiles: true, followSymlinks: false }),
    ].sort();
    if (!files.length) missing = true;
    parts.push(
      JSON.stringify([
        pattern,
        files.map((file) => [file, digest(readFileSync(join(root, file)))]),
      ]),
    );
  }
  return { hash: digest(JSON.stringify(parts)), missing };
}

function definition(item: Task): string {
  return digest(
    JSON.stringify({
      name: item.name,
      deps: item.deps,
      fileDep: item.fileDep,
      targets: item.targets,
      run: item.run.toString(),
      upToDate: item.upToDate?.toString(),
    }),
  );
}

function loadState(path: string): State {
  if (!pathExists(path)) return { version: 1, tasks: Object.create(null) };
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(path, "utf8"));
  } catch (cause) {
    throw new Error(`Invalid task state ${path}; remove the cache and retry`, { cause });
  }
  if (
    !value ||
    typeof value !== "object" ||
    (value as State).version !== 1 ||
    !(value as State).tasks ||
    typeof (value as State).tasks !== "object" ||
    Array.isArray((value as State).tasks)
  ) {
    throw new Error(`Invalid task state ${path}; remove the cache and retry`);
  }
  // Avoid inherited task names such as __proto__ in untrusted cache data.
  return { version: 1, tasks: Object.assign(Object.create(null), (value as State).tasks) };
}

/** Validate the entire requested graph before running any action. */
function graph(registry: RegisteredTask[], names: string[]): Map<string, Task> {
  const byName = new Map(registry.map(({ task }) => [task.name, task]));
  if (byName.size !== registry.length) throw new Error("Duplicate task name in registry");
  if (!names.length) throw new Error("Specify at least one task, or use --list");
  const visiting = new Set<string>();
  const visited = new Set<string>();
  function visit(name: string, path: string[]): void {
    const item = byName.get(name);
    if (!item)
      throw new Error(
        `Unknown task ${JSON.stringify(name)}${path.length ? ` required by ${path.at(-1)}` : ""}`,
      );
    if (visiting.has(name))
      throw new Error(`Task dependency cycle: ${[...path, name].join(" -> ")}`);
    if (visited.has(name)) return;
    visiting.add(name);
    for (const dep of item.deps ?? []) visit(dep, [...path, name]);
    visiting.delete(name);
    visited.add(name);
  }
  for (const name of names) visit(name, []);
  return byName;
}

class TaskRunner {
  readonly results: TaskResult[] = [];
  private readonly pending = new Map<string, Promise<TaskResult>>();
  constructor(
    private readonly byName: Map<string, Task>,
    private readonly state: State,
    private readonly options: TaskRunOptions,
  ) {}

  execute = (name: string): Promise<TaskResult> => {
    const previous = this.pending.get(name);
    if (previous) return previous;
    const item = this.byName.get(name);
    if (!item) throw new Error(`Unknown task ${name}`);
    const promise = this.executeTask(item);
    this.pending.set(name, promise);
    return promise;
  };

  private async isClean(item: Task, dependencies: TaskResult[]): Promise<boolean> {
    if (
      this.options.force ||
      dependencies.some((dep) => dep.status === "run" || dep.status === "would-run")
    )
      return false;
    if (item.upToDate && !(await item.upToDate({ root: this.options.root }))) return false;
    if (!item.fileDep?.length && !item.targets?.length) return Boolean(item.upToDate);
    const old = this.state.tasks[item.name];
    if (!old || old.definition !== definition(item)) return false;
    const inputs = hashFiles(this.options.root, item.fileDep ?? []);
    const targets = hashFiles(this.options.root, item.targets ?? []);
    return (
      !inputs.missing &&
      !targets.missing &&
      old.inputs === inputs.hash &&
      old.targets === targets.hash
    );
  }

  private async perform(item: Task): Promise<void> {
    await item.run({ root: this.options.root });
    const targets = hashFiles(this.options.root, item.targets ?? []);
    if (item.targets?.length && targets.missing)
      throw new Error(`${item.name}: declared targets were not created`);
    this.state.tasks[item.name] = {
      definition: definition(item),
      inputs: hashFiles(this.options.root, item.fileDep ?? []).hash,
      targets: targets.hash,
    };
  }

  private async executeTask(item: Task): Promise<TaskResult> {
    // Wait for every sibling even after one fails, so no action continues after
    // the caller sees a rejected graph or tries another run.
    const settled = await Promise.allSettled((item.deps ?? []).map(this.execute));
    const failure = settled.find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    if (failure) throw failure.reason;
    const dependencies = settled.map(
      (result) => (result as PromiseFulfilledResult<TaskResult>).value,
    );
    const clean = await this.isClean(item, dependencies);
    let status: TaskResult["status"] = clean ? "skip" : "run";
    if (this.options.dryRun) status = clean ? "would-skip" : "would-run";
    if (status === "run") await this.perform(item);
    const result = { name: item.name, status };
    this.results.push(result);
    return result;
  }
}

function saveState(root: string, state: State): void {
  mkdirSync(join(root, ".tools-cache"), { recursive: true });
  state.tasks = Object.fromEntries(
    Object.entries(state.tasks).sort(([a], [b]) => a.localeCompare(b)),
  );
  updateTextFile(
    join(root, ".tools-cache/tasks.json"),
    `${JSON.stringify(state, null, 2)}\n`,
    false,
  );
}

/** Execute dependencies before dependants; independent branches run concurrently. */
export async function runTasks(
  registry: RegisteredTask[],
  names: string[],
  options: TaskRunOptions,
): Promise<TaskResult[]> {
  const root = resolve(options.root);
  const byName = graph(registry, names);
  const state = loadState(join(root, ".tools-cache/tasks.json"));
  const runner = new TaskRunner(byName, state, { ...options, root });
  const finished = await Promise.allSettled(names.map(runner.execute));
  const failure = finished.find(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );
  if (failure) throw failure.reason;
  if (!options.dryRun && runner.results.some((result) => result.status === "run"))
    saveState(root, state);
  return runner.results;
}
