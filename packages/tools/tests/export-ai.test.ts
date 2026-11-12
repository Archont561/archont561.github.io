import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@archont561/bun-test-utils";
import { exportAi, parseAiManifest } from "@/src/maintenance/export-ai.ts";

const page = {
  title: "A [title] & more",
  description: "A <summary> & notes",
  url: "/docs/",
  markdown: "/docs/index.md",
  text: "# A title\n\n[Other](/docs/other/)\n",
};
const dated = {
  title: "Other",
  description: "A dated page",
  url: "/docs/other/",
  markdown: "/docs/other.md",
  text: "# Other\n\nProcessed content.\n",
  date: "2024-02-29",
};
const manifest = { version: 1, pages: [dated, page] };

function fixture(run: (dir: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), "export-ai-"));
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "ai-manifest.json"), JSON.stringify(manifest));
    run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function outputs(dir: string): Record<string, string> {
  return Object.fromEntries(
    [
      "docs/index.md",
      "docs/other.md",
      "llms.txt",
      "llms-full.txt",
      "feed.xml",
      "feed.rss",
      "feed.atom",
      "feed.json",
    ].map((path) => [path, readFileSync(join(dir, path), "utf8")]),
  );
}

test("exports processed Markdown, escaped indexes and honest dates deterministically", () => {
  fixture((dir) => {
    expect(exportAi(dir).map((entry) => entry.url)).toEqual(["/docs/", "/docs/other/"]);
    const first = outputs(dir);
    expect(first["docs/index.md"]).toContain("[Other](https://archont561.github.io/docs/other/)");
    expect(first["feed.xml"]).toContain("A &lt;summary&gt; &amp; notes");
    expect(first["feed.xml"]).toContain("Thu, 29 Feb 2024 00:00:00 GMT");
    expect((first["feed.xml"]?.match(/<pubDate>/g) ?? []).length).toBe(1);
    expect(first["feed.rss"]).toBe(first["feed.xml"]);
    expect(first["feed.atom"]).toContain('xmlns="http://www.w3.org/2005/Atom"');
    expect(first["feed.atom"]).toContain("A &lt;summary&gt; &amp; notes");
    expect(first["feed.atom"]).toContain("<published>2024-02-29T00:00:00.000Z</published>");
    expect((first["feed.atom"]?.match(/<published>/g) ?? []).length).toBe(1);
    expect((first["feed.atom"]?.match(/<updated>/g) ?? []).length).toBe(3);
    expect(first["feed.atom"]).toContain("<updated>2026-11-10T00:00:00.000Z</updated>");
    expect(existsSync(join(dir, ".nojekyll"))).toBe(true);
    // Snapshot the JSON string so multiline artifact values do not produce
    // trailing whitespace in Bun's object snapshot serializer.
    expect(JSON.stringify(first, null, 2)).toMatchSnapshot();
    exportAi(dir);
    expect(outputs(dir)).toEqual(first);
  });
});

test("Atom uses the latest declared page date when it is newer than the feed edition", () => {
  fixture((dir) => {
    writeFileSync(
      join(dir, "ai-manifest.json"),
      JSON.stringify({ version: 1, pages: [page, { ...dated, date: "2027-04-02" }] }),
    );
    exportAi(dir);
    const atom = readFileSync(join(dir, "feed.atom"), "utf8");
    expect(atom.split("<entry>")[0]).toContain("<updated>2027-04-02T00:00:00.000Z</updated>");
  });
});

test("rejects missing, duplicate, unsafe, empty, mismatched and invalid manifest data", () => {
  for (const input of [
    null,
    {},
    { version: 1, pages: [] },
    { version: 2, pages: [page] },
    { version: 1, pages: [page, page] },
    { version: 1, pages: [{ ...page, url: "/docs/../escape/" }] },
    { version: 1, pages: [{ ...page, markdown: "/docs/../../escape.md" }] },
    { version: 1, pages: [{ ...page, markdown: "/docs/other.md" }] },
    { version: 1, pages: [{ ...page, text: "  " }] },
    { version: 1, pages: [{ ...page, date: "2023-02-29" }] },
    { version: 1, pages: [{ ...page, date: "not-a-date" }] },
  ])
    expect(() => parseAiManifest(input)).toThrow();
  // A nested index would otherwise overwrite the root index twin.
  expect(() =>
    parseAiManifest({
      version: 1,
      pages: [page, { ...dated, url: "/docs/index/", markdown: "/docs/index.md" }],
    }),
  ).toThrow(/Duplicate/);
});

test("invalid manifest fails before writing artifacts", () => {
  fixture((dir) => {
    writeFileSync(
      join(dir, "ai-manifest.json"),
      JSON.stringify({ version: 1, pages: [page, { ...dated, markdown: "/../../evil" }] }),
    );
    expect(() => exportAi(dir)).toThrow();
    expect(existsSync(join(dir, "llms.txt"))).toBe(false);
    expect(existsSync(join(dir, "docs/index.md"))).toBe(false);
  });
});

test("export-ai CLI runs against the selected repository root", async () => {
  const { runCommand } = await import("citty");
  const command = (await import("@/src/cli/commands/export-ai.ts")).default;
  const root = mkdtempSync(join(tmpdir(), "export-ai-cli-"));
  try {
    const out = join(root, "apps/portfolio/out");
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, "ai-manifest.json"), JSON.stringify(manifest));
    await runCommand(command, { rawArgs: ["--root", root] });
    expect(readFileSync(join(out, "docs/index.md"), "utf8")).toContain("# A title");
    expect(existsSync(join(out, "feed.xml"))).toBe(true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
