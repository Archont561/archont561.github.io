import { expect, test } from "@archont561/bun-test-utils";
import { runTasks, task, tasks } from "@archont561/tools/tasks";
import { writeFixture } from "@/tests/fixtures/task009.ts";

test("target drift reruns the producer and its dependant", async ({ tmpdir }) => {
  writeFixture(tmpdir.dir, "input.txt", "input");
  const events: string[] = [];
  const registry = tasks(
    task({
      name: "producer",
      fileDep: ["input.txt"],
      targets: ["output.txt"],
      run: ({ root }) => {
        events.push("producer");
        writeFixture(root, "output.txt", "generated");
      },
    }),
    task({
      name: "consumer",
      deps: ["producer"],
      fileDep: ["input.txt"],
      run: () => {
        events.push("consumer");
      },
    }),
  ).map((item) => ({ task: item, source: "test" }));
  await runTasks(registry, ["consumer"], { root: tmpdir.dir });
  expect(
    (await runTasks(registry, ["consumer"], { root: tmpdir.dir })).map(({ status }) => status),
  ).toEqual(["skip", "skip"]);
  writeFixture(tmpdir.dir, "output.txt", "edited");
  expect(
    (await runTasks(registry, ["consumer"], { root: tmpdir.dir })).map(({ status }) => status),
  ).toEqual(["run", "run"]);
  expect(events).toEqual(["producer", "consumer", "producer", "consumer"]);
});
