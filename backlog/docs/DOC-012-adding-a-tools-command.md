# DOC-012: Adding a tools command

**Status:** draft · **Milestone:** M1 · **Decisions:** D-005

One command = one file. No registry, no build step.

## 1. Scenario first

```gherkin
# features/check-structure.feature
Feature: Repository structure contract
  Scenario: missing root README is reported
    Given a workspace without "README.md"
    When I run "check-structure"
    Then the report mentions "README.md"
```

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

## 3. Steps + unit tests

`tests/check-structure.steps.ts` (`withState<State>()` from
`@aboviq/bun-test-cucumber`) and `tests/check-structure.test.ts`
(`@archont561/bun-test-utils`). Run `bun run test` from the repo root.
