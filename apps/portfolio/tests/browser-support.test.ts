import { expect, test } from "@archont561/bun-test-utils";
import type { LaunchOptions } from "playwright";
import { selectChromium } from "@/tests/support/browser";

const missing = () =>
  new Error("browserType.launch: Executable doesn't exist at the expected path");

test("missing Playwright browsers skip browser tests after both variants are checked", async () => {
  const attempts: LaunchOptions[] = [];
  const selected = await selectChromium(async (options) => {
    attempts.push(options);
    throw missing();
  }, {});
  expect(selected).toBeNull();
  expect(attempts).toEqual([{ headless: true }, { headless: true, channel: "chromium" }]);
});

test("the full Chromium installation is used if its headless shell is missing", async () => {
  let attempts = 0;
  let closed = false;
  const selected = await selectChromium(async () => {
    if (++attempts === 1) throw missing();
    return {
      close: async () => {
        closed = true;
      },
    };
  }, {});
  expect(selected).toEqual({ headless: true, channel: "chromium" });
  expect(closed).toBe(true);
});

test("an explicit Chromium executable and arguments are used without a fallback", async () => {
  let attempted: LaunchOptions | undefined;
  const selected = await selectChromium(
    async (options) => {
      attempted = options;
      return { close: async () => {} };
    },
    {
      PORTFOLIO_CHROMIUM_EXECUTABLE: "/opt/chromium",
      PORTFOLIO_CHROMIUM_ARGS: '["--no-sandbox"]',
    },
  );
  expect(selected).toEqual({
    headless: true,
    executablePath: "/opt/chromium",
    args: ["--no-sandbox"],
  });
  expect(attempted?.executablePath).toBe("/opt/chromium");
});

test("a missing explicit executable skips instead of selecting another browser", async () => {
  let attempts = 0;
  const selected = await selectChromium(
    async () => {
      attempts++;
      throw missing();
    },
    { PORTFOLIO_CHROMIUM_EXECUTABLE: "/missing/chromium" },
  );
  expect(selected).toBeNull();
  expect(attempts).toBe(1);
});

test("a broken installation or invalid configuration is not silently skipped", async () => {
  await expect(
    selectChromium(async () => {
      throw new Error("missing system library");
    }, {}),
  ).rejects.toThrow("missing system library");
  await expect(
    selectChromium(async () => ({ close: async () => {} }), { PORTFOLIO_CHROMIUM_ARGS: "invalid" }),
  ).rejects.toThrow("PORTFOLIO_CHROMIUM_ARGS");
  await expect(
    selectChromium(async () => ({ close: async () => {} }), { PORTFOLIO_CHROMIUM_ARGS: "[1]" }),
  ).rejects.toThrow("PORTFOLIO_CHROMIUM_ARGS");
});
