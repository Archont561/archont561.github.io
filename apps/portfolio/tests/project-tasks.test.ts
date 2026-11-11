import { existsSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@archont561/bun-test-utils";
import { runTasks } from "@archont561/tools/tasks";
import portfolioTasks from "@/tasks/projects";

const registry = portfolioTasks.map((task) => ({
  task,
  source: "apps/portfolio/tasks/projects.ts",
}));

function seed(write: (path: string, content: string) => string): void {
  write("data/project-categories.json", JSON.stringify([{ id: "testing", label: "Testing" }]));
  write(
    "data/repositories.json",
    JSON.stringify({
      retrieved: "2026-11-10",
      repositories: [
        {
          name: "alpha",
          html_url: "https://github.com/Owner/alpha",
          description: "A test project.",
          language: "TypeScript",
          topics: ["testing"],
        },
      ],
    }),
  );
  write(
    "data/projects/alpha.json",
    JSON.stringify({
      repository: "Owner/alpha",
      category: "testing",
      order: 1,
      featured: { home: true },
    }),
  );
  // These tracked inputs normally come from the checkout, not the data fixture.
  write("apps/portfolio/src/lib/project-catalog.ts", "fixture");
  write("apps/portfolio/tasks/projects.ts", "fixture");
  write("bun.lock", "fixture");
}

const run = (root: string, name: string) => runTasks(registry, [name], { root });

test("portfolio project tasks check without writing and regenerate changed outputs", async ({
  tmpdir,
}) => {
  seed(tmpdir.write);
  const root = tmpdir.dir;
  const output = join(root, "docs/projects/alpha.mdx");
  await expect(run(root, "portfolio:projects:check")).rejects.toThrow("stale or unmanaged");
  expect(existsSync(output)).toBe(false);

  expect((await run(root, "portfolio:projects:generate"))[0]?.status).toBe("run");
  expect((await run(root, "portfolio:projects:check"))[0]?.status).toBe("run");
  expect((await run(root, "portfolio:projects:generate"))[0]?.status).toBe("skip");

  tmpdir.write("data/projects/alpha.mdx", "## Details\n\nNew project notes.\n");
  expect((await run(root, "portfolio:projects:generate"))[0]?.status).toBe("run");
  expect(await Bun.file(output).text()).toContain("New project notes.");
  tmpdir.write("docs/projects/alpha.mdx", "tampered");
  await expect(run(root, "portfolio:projects:check")).rejects.toThrow("docs/projects/alpha.mdx");
});

test("project tasks only adopt hand-written pages with explicit opt-in", async ({ tmpdir }) => {
  seed(tmpdir.write);
  const root = tmpdir.dir;
  tmpdir.write("docs/projects/alpha.mdx", "Hand-written page.\n");
  await expect(run(root, "portfolio:projects:generate")).rejects.toThrow(
    "Refusing to overwrite unmarked project pages",
  );
  expect(await Bun.file(join(root, "docs/projects/alpha.mdx")).text()).toBe("Hand-written page.\n");
  await run(root, "portfolio:projects:adopt");
  expect(await Bun.file(join(root, "docs/projects/alpha.mdx")).text()).toContain(
    "Generated from data/projects",
  );
  tmpdir.write("docs/projects/unmanaged.mdx", "Extra hand-written page.\n");
  await expect(run(root, "portfolio:projects:generate")).rejects.toThrow("Unmanaged project pages");
});
