import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { withState } from "@aboviq/bun-test-cucumber";

interface CliState {
  cliDirectory?: string;
  cliStatus?: number | null;
  cliError?: string;
}

const { After, Given, When, Then } = withState<CliState>();

After({ tags: "@cli" }, (state) => {
  if (state.cliDirectory) rmSync(state.cliDirectory, { recursive: true, force: true });
  return state;
});

Given(
  /^a CLI directory containing a (working|broken) "([^"]+)" command$/,
  (state, [kind, name]) => {
    const directory = mkdtempSync(join(tmpdir(), "tools-cli-feature-"));
    const contents = kind === "working" ? "export default { run() {} };\n" : "export default {};\n";
    writeFileSync(join(directory, `${name}.ts`), contents);
    return { ...state, cliDirectory: directory };
  },
);

When(/^I invoke the test CLI with "([^"]+)"$/, (state, [argument]) => {
  if (!state.cliDirectory || !argument) throw new Error("Missing CLI directory or argument");
  const runner = fileURLToPath(new URL("./fixtures/cli-runner.ts", import.meta.url));
  const result = spawnSync(process.execPath, [runner, state.cliDirectory, argument], {
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
  if (result.error) throw result.error;
  return { ...state, cliStatus: result.status, cliError: result.stderr };
});

Then(/^the CLI fails with an error containing "([^"]+)"$/, (state, [text]) => {
  if (state.cliStatus === null || state.cliStatus === undefined || state.cliStatus === 0) {
    throw new Error(`Expected a non-zero CLI exit code, got ${state.cliStatus}`);
  }
  if (!text || !state.cliError?.includes(text)) {
    throw new Error(`Expected an error containing ${text}, got: ${state.cliError}`);
  }
  return state;
});
