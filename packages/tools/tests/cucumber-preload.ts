import { bunTestCucumber } from "@aboviq/bun-test-cucumber";
import { plugin } from "bun";

await plugin(
  bunTestCucumber({
    stepDefinitionsPattern: "tests/**/*.steps.ts",
  }),
);
