import { readFileSync } from "node:fs";
import { expect, test } from "@archont561/bun-test-utils";
import { YAML } from "bun";

test("Pages uploads the complete static export including .nojekyll", () => {
  const file = new URL("../../../.github/workflows/pages.yml", import.meta.url);
  const workflow = YAML.parse(readFileSync(file, "utf8")) as {
    jobs: { build: { steps: Array<{ uses?: string; with?: Record<string, unknown> }> } };
  };
  const uploads = workflow.jobs.build.steps.filter((step) =>
    step.uses?.startsWith("actions/upload-pages-artifact@"),
  );
  expect(uploads).toHaveLength(1);
  expect(uploads[0]?.with).toMatchObject({
    path: "apps/portfolio/out",
    "include-hidden-files": true,
  });
});
