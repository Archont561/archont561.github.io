import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "@archont561/bun-test-utils";
import { renderAgents } from "@/src/maintenance/agents.ts";
import { createRepository, readFixture, runTool, writeFixture } from "@/tests/fixtures/task009.ts";

interface ScenarioFixtures {
  tmpdir: { dir: string };
}

const markedAgents = `# Agent guidance\n\n<!-- agents-md:begin id=commands -->\n## Commands\nStale generated content.\n<!-- agents-md:end id=commands -->\n\n## Notes\nPreserve npm run in my example.\n`;

test
  .scenario<ScenarioFixtures>("Agent guidance: refresh commands without changing human notes")
  .given("agent guidance with a marked commands region and human notes", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    writeFixture(tmpdir.dir, "AGENTS.md", markedAgents);
    return { root: tmpdir.dir };
  })
  .when("I refresh the guidance twice", ({ root }) => {
    const first = runTool(root, "agents");
    const afterFirst = readFixture(root, "AGENTS.md");
    const second = runTool(root, "agents");
    return { first, afterFirst, second, root };
  })
  .then(
    "generated commands use Bun and human notes stay unchanged",
    ({ first, afterFirst, second, root, expect }) => {
      expect(first.status).toBe(0);
      expect(second.status).toBe(0);
      expect(afterFirst).toContain("bun install --frozen-lockfile");
      expect(afterFirst).toContain("bun run dev");
      expect(afterFirst).toEndWith("Preserve npm run in my example.\n");
      expect(readFixture(root, "AGENTS.md")).toBe(afterFirst);
      expect(existsSync(join(root, "CLAUDE.md"))).toBe(false);
    },
  );

test
  .scenario<ScenarioFixtures>("Agent guidance: reject malformed markers safely")
  .given("agent guidance with an unclosed marked region", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    const original = "Human notes\n<!-- agents-md:begin id=commands -->\nKeep this text.\n";
    writeFixture(tmpdir.dir, "AGENTS.md", original);
    return { root: tmpdir.dir, original };
  })
  .when("I refresh the guidance", ({ root }) => ({ result: runTool(root, "agents"), root }))
  .then("refresh fails without altering the file", ({ result, root, original, expect }) => {
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("marker");
    expect(readFixture(root, "AGENTS.md")).toBe(original);
  });

test
  .scenario<ScenarioFixtures>("Agent guidance: leave unmarked files alone")
  .given("a human-owned AGENTS.md without markers", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    writeFixture(tmpdir.dir, "AGENTS.md", "# Human guidance\nLeave me alone.\n");
    return { root: tmpdir.dir };
  })
  .when("I refresh the guidance", ({ root }) => ({ result: runTool(root, "agents"), root }))
  .then(
    "refresh reports the missing markers without overwriting guidance",
    ({ result, root, expect }) => {
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("marker");
      expect(readFixture(root, "AGENTS.md")).toBe("# Human guidance\nLeave me alone.\n");
    },
  );

test
  .scenario<ScenarioFixtures>("Agent guidance: check drift without writing")
  .given("a stale marked commands region", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    writeFixture(tmpdir.dir, "AGENTS.md", markedAgents);
    return { root: tmpdir.dir };
  })
  .when("I check the guidance", ({ root }) => ({
    result: runTool(root, "agents", "--check"),
    root,
  }))
  .then("the check reports drift but leaves the file unchanged", ({ result, root, expect }) => {
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("AGENTS.md");
    expect(readFixture(root, "AGENTS.md")).toBe(markedAgents);
  });

test
  .scenario<ScenarioFixtures>("Agent guidance: generate stable structure across checkouts")
  .given(
    "equivalent repositories whose folders were created in a different order",
    ({ tmpdir }) => {
      const first = join(tmpdir.dir, "first");
      const second = join(tmpdir.dir, "second");
      for (const root of [first, second]) {
        createRepository(root);
        writeFixture(
          root,
          "AGENTS.md",
          "<!-- agents-md:begin id=structure -->\nOld.\n<!-- agents-md:end id=structure -->\n",
        );
      }
      for (const name of ["zeta", "alpha"]) mkdirSync(join(first, name));
      for (const name of ["alpha", "zeta"]) mkdirSync(join(second, name));
      return { first, second };
    },
  )
  .when("the marked guidance is regenerated", ({ first, second }) => ({
    one: renderAgents(first),
    two: renderAgents(second),
  }))
  .then("the structure section is deterministic", ({ one, two, expect }) => {
    expect(one).toBe(two);
    expect(one).toContain("Top-level: `alpha/`, `apps/`");
  });
