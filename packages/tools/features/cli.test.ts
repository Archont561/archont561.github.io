import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "@archont561/bun-test-utils";

interface ScenarioFixtures {
  tmpdir: {
    dir: string;
    write: (path: string, content: string) => string;
  };
}

const runner = fileURLToPath(new URL("../tests/fixtures/cli-runner.ts", import.meta.url));

function invokeCli(directory: string, argument: string) {
  const result = spawnSync(process.execPath, [runner, directory, argument], {
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
  if (result.error) throw result.error;
  return result;
}

const cases = [
  {
    title: "an unknown command fails clearly",
    name: "sample",
    kind: "working",
    source: "export default { run() {} };\n",
    argument: "missing",
    expected: "Unknown command missing",
  },
  {
    title: "a broken command module fails clearly",
    name: "broken",
    kind: "broken",
    source: "export default {};\n",
    argument: "broken",
    expected: 'Failed to load command "broken"',
  },
  {
    title: "help fails rather than hiding a broken command module",
    name: "broken",
    kind: "broken",
    source: "export default {};\n",
    argument: "--help",
    expected: 'Failed to load command "broken"',
  },
] as const;

for (const { title, name, kind, source, argument, expected } of cases) {
  test
    .scenario<ScenarioFixtures>(`Tools command discovery: ${title}`)
    .given(`a CLI directory containing a ${kind} "${name}" command`, ({ tmpdir }) => {
      tmpdir.write(`${name}.ts`, source);
      return { directory: tmpdir.dir };
    })
    .when(`I invoke the test CLI with "${argument}"`, ({ directory }) => ({
      result: invokeCli(directory, argument),
    }))
    .then(`the CLI fails with an error containing "${expected}"`, ({ result, expect }) => {
      expect(result.status).not.toBeNull();
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain(expected);
    });
}
