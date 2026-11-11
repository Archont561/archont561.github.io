import { test } from "@archont561/bun-test-utils";
import {
  projectRepositories,
  refreshRepositories,
  repositorySignals,
  retrieveRepositories,
} from "@/src/maintenance/watch-repos.ts";
import { readFixture, runTool, writeFixture } from "@/tests/fixtures/task009.ts";

interface Fixtures {
  tmpdir: { dir: string };
}
const repos = [
  {
    name: "alpha",
    description: "one",
    html_url: "https://github.com/Archont561/alpha",
    language: "TypeScript",
    fork: false,
    topics: ["docs"],
    extra: 42,
  },
  {
    name: "beta",
    description: null,
    html_url: "https://github.com/Archont561/beta",
    language: "Python",
    fork: true,
    topics: [],
  },
];

test
  .scenario<Fixtures>("Repository watch: ignore capture date drift")
  .given("a committed repository snapshot", async ({ tmpdir }) => {
    await refreshRepositories(tmpdir.dir, { records: repos, retrieved: "2026-01-01" });
    return { root: tmpdir.dir, previous: readFixture(tmpdir.dir, "data/repositories.json") };
  })
  .when("the same repository metadata is captured on a later date", async ({ root }) => ({
    changed: await refreshRepositories(root, { records: repos, retrieved: "2026-01-02" }),
  }))
  .then(
    "the original file and capture date are retained",
    ({ root, previous, changed, expect }) => {
      expect(changed).toBe(false);
      expect(readFixture(root, "data/repositories.json")).toBe(previous);
      expect(runTool(root, "watch-repos", "--check").status).toBe(0);
    },
  );

test
  .scenario<Fixtures>("Repository watch: rewrite drifted repository metadata")
  .given("a committed snapshot", async ({ tmpdir }) => {
    await refreshRepositories(tmpdir.dir, { records: repos, retrieved: "2026-01-01" });
    return { root: tmpdir.dir };
  })
  .when("a repository description changes", async ({ root }) => ({
    changed: await refreshRepositories(root, {
      records: [{ ...repos[0], description: "changed" }, repos[1]],
      retrieved: "2026-01-02",
    }),
  }))
  .then("the snapshot and hygiene figures reflect the new capture", ({ root, changed, expect }) => {
    const snapshot = JSON.parse(readFixture(root, "data/repositories.json"));
    expect(changed).toBe(true);
    expect(snapshot.retrieved).toBe("2026-01-02");
    expect(snapshot.repositories[0].description).toBe("changed");
    expect(repositorySignals(snapshot.repositories)).toMatchObject({
      owned: 2,
      forks: 1,
      titled: 1,
    });
    expect(snapshot.repositories[0].extra).toBeUndefined();
  });

test
  .scenario("Repository watch: do not truncate pagination")
  .given("a GitHub response with a next page", () => ({ pages: [] as string[] }))
  .when("the owner repositories are fetched", async ({ pages }) => {
    const found = await retrieveRepositories(async (input) => {
      const url = String(input);
      pages.push(url);
      const next = url.endsWith("page=1");
      return new Response(JSON.stringify(next ? [repos[0]] : [repos[1]]), {
        headers: next ? { link: '<https://api.github.com/x?page=2>; rel="next"' } : {},
      });
    });
    return { found, pages };
  })
  .then("all pages are included", ({ found, pages, expect }) => {
    expect(found).toHaveLength(2);
    expect(pages).toHaveLength(2);
  });

test
  .scenario<Fixtures>("Repository watch: reject invalid captures without overwriting")
  .given("a valid snapshot", async ({ tmpdir }) => {
    await refreshRepositories(tmpdir.dir, { records: repos, retrieved: "2026-01-01" });
    return { root: tmpdir.dir, previous: readFixture(tmpdir.dir, "data/repositories.json") };
  })
  .when("malformed GitHub data is projected", ({ root }) => {
    try {
      projectRepositories([{ name: "incomplete" }], "2026-01-02");
      return { message: "" };
    } catch (error) {
      return { message: String(error), root };
    }
  })
  .then(
    "the error is actionable and the committed file is intact",
    ({ root, previous, message, expect }) => {
      expect(message).toContain("Invalid GitHub repository record");
      expect(readFixture(root, "data/repositories.json")).toBe(previous);
      writeFixture(root, "data/repositories.json", "{}");
      expect(runTool(root, "watch-repos", "--check").status).not.toBe(0);
    },
  );
