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
citty `Command`, `.ts` only (`*.d.ts` / `*.test.ts` are skipped). The CLI
shape-checks the export at load and fails loudly otherwise.

## 3. Steps + unit tests

`tests/check-structure.steps.ts` (`withState<State>()` from
`@aboviq/bun-test-cucumber`) and `tests/check-structure.test.ts`
(`@archont561/bun-test-utils`). Run `bun run test` from the repo root.
