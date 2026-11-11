import type { Browser, LaunchOptions } from "playwright";

/** Keep the browser probe injectable so the skip decision is testable without a browser. */
type Launch = (options: LaunchOptions) => Promise<Pick<Browser, "close">>;
type BrowserEnvironment = {
  PORTFOLIO_CHROMIUM_EXECUTABLE?: string;
  PORTFOLIO_CHROMIUM_ARGS?: string;
};

function extraArgs(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("PORTFOLIO_CHROMIUM_ARGS must be a JSON array of strings");
  }
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error("PORTFOLIO_CHROMIUM_ARGS must be a JSON array of strings");
  }
  return value;
}

/**
 * Probe the Playwright headless shell, then its full Chromium build. A missing
 * executable skips browser tests; any other launch failure remains a failure.
 */
export async function selectChromium(
  launch: Launch,
  env: BrowserEnvironment,
): Promise<LaunchOptions | null> {
  const args = extraArgs(env.PORTFOLIO_CHROMIUM_ARGS);
  const common: LaunchOptions = { headless: true, ...(args ? { args } : {}) };
  const candidates: LaunchOptions[] = env.PORTFOLIO_CHROMIUM_EXECUTABLE
    ? [{ ...common, executablePath: env.PORTFOLIO_CHROMIUM_EXECUTABLE }]
    : [common, { ...common, channel: "chromium" }];

  for (const candidate of candidates) {
    let browser: Pick<Browser, "close">;
    try {
      browser = await launch(candidate);
    } catch (error) {
      if (/executable doesn't exist/i.test(String(error))) continue;
      throw error;
    }
    await browser.close();
    return candidate;
  }
  return null;
}
