# DOC-012: Adding a tools command

**Status:** draft · **Milestone:** M1 · **Decisions:** D-005

One command = one file. No registry, no build step.

## 1. Scenario first

Write an executable Given/When/Then scenario in
`features/check-structure.test.ts` using `@archont561/bun-test-utils`:

```ts
import { test } from "@archont561/bun-test-utils";

// Define runCheckStructure in the test for the command being exercised.
test
  .scenario("a missing root README is reported")
  .given("a workspace without README.md", ({ tmpdir }) => ({ root: tmpdir.dir }))
  .when("I run check-structure", ({ root }) => ({ report: runCheckStructure(root) }))
  .then("the report mentions README.md", ({ report, expect }) => {
    expect(report).toContain("README.md");
  });
```

`tmpdir` is a test-scoped fixture and is cleaned up after the scenario. The
scenario chain itself is the executable spec; no separate `.steps.ts` file or
`.feature` loader is needed. See `features/cli.test.ts` for a real CLI example.

## 2. Command module

```ts
// src/cli/commands/check-structure.ts
import { defineCommand } from "citty";

export default defineCommand({
  meta: {
    name: "check-structure", // ignored: the filename is the name
    description: "Validate the repository contract",
  },
  args: {
    strict: { type: "boolean", description: "Fail on warnings", default: false },
  },
  async run({ args }) {
    // ...
  },
});
```

Rules: kebab-case filename (that is the command name), default-export a
citty command with `run` or `subCommands`, `.ts` only (`*.d.ts`, `*.test.ts`,
and `*.spec.ts` are skipped). Discovery is flat and imports commands lazily;
root help loads each command to list its description. The CLI shape-checks
exports when loaded and reports the command and file on import/shape errors.

## 3. Unit tests

Add focused unit tests in `tests/check-structure.test.ts` when appropriate.
Run `bun run test` from the repo root.
