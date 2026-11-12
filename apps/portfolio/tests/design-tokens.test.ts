import { readFileSync } from "node:fs";
import { expect, test } from "@archont561/bun-test-utils";
import { createTokensPreset } from "@archont561/tools/configs/unocss";
import { createGenerator } from "unocss";
import config from "@/uno.config";

const tokens = readFileSync(new URL("../src/app/tokens.css", import.meta.url), "utf8");
const entries = [...tokens.matchAll(/--palette-(day|night)-([a-z-]+):\s*(#[0-9a-f]{6});/gi)];
const palette = new Map(entries.map((match) => [`${match[1]}-${match[2]}`, match[3] ?? ""]));

function color(mode: "day" | "night", name: string): string {
  const value = palette.get(`${mode}-${name}`);
  if (!value) throw new Error(`Missing ${mode} ${name} palette token`);
  return value;
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const [red = 0, green = 0, blue = 0] = channels.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(first: string, second: string): number {
  const [lower = 0, higher = 0] = [luminance(first), luminance(second)].sort((a, b) => a - b);
  return (higher + 0.05) / (lower + 0.05);
}

test("day and night palettes define matching, non-duplicated semantic colors", () => {
  expect(palette.size).toBe(entries.length);
  const names = (mode: string) =>
    [...palette.keys()]
      .filter((key) => key.startsWith(`${mode}-`))
      .map((key) => key.slice(mode.length + 1))
      .sort();
  expect(names("day")).toEqual(names("night"));
  for (const match of tokens.matchAll(/var\(--palette-(day|night)-([a-z-]+)\)/g)) {
    expect(palette.has(`${match[1]}-${match[2]}`)).toBe(true);
  }
});

test("core token pairs provide at least 4.5 to 1 text contrast in both themes", () => {
  for (const mode of ["day", "night"] as const) {
    for (const [foreground, background] of [
      ["text", "background"],
      ["muted", "background"],
      ["primary", "background"],
      ["secondary", "background"],
      ["secondary", "surface"],
      ["link", "background"],
      ["on-primary", "primary"],
      ["syntax-tag", "code-background"],
      ["syntax-attribute", "code-background"],
      ["syntax-value", "code-background"],
      ["syntax-punctuation", "code-background"],
    ] as const) {
      expect(contrast(color(mode, foreground), color(mode, background))).toBeGreaterThanOrEqual(
        4.5,
      );
    }
  }
});

test("every semantic color is exposed through the token preset and merged UnoCSS theme", async () => {
  expect(config.configDeps).toContain("src/app/tokens.css");
  const names = new Set(
    [...tokens.matchAll(/--color-([a-zA-Z0-9_-]+)\s*:/g)].map((match) => match[1] ?? ""),
  );
  const colors = createTokensPreset().theme.colors;
  expect(names.size).toBeGreaterThan(0);
  expect(Object.keys(colors).sort()).toEqual([...names].sort());
  for (const name of names) expect(colors[name]).toBe(`var(--color-${name})`);

  const generator = await createGenerator(config);
  for (const name of names) expect(generator.config.theme.colors?.[name]).toBe(colors[name]);
  expect(generator.config.theme.colors?.pine).toBe("var(--color-primary)");
  expect(generator.config.theme.colors?.sage).toBe("var(--color-secondary)");
  expect(generator.config.theme.colors?.ivory).toBe("var(--color-background)");
});

test("terrain gap utilities use token values and retain numeric gaps", async () => {
  const generator = await createGenerator(config);
  const { css } = await generator.generate(
    "terrain-gap-0 terrain-gap-1 terrain-gap-4 terrain-gap-5 terrain-gap-6 terrain-navigation",
  );
  expect(css).toContain(".terrain-gap-1{gap:4px;");
  expect(css).toContain(".terrain-gap-4{gap:16px;");
  expect(css).toContain(".terrain-gap-5{gap:calc(4px * 5);");
  expect(css).toContain(".terrain-gap-6{gap:24px;");
  expect(css).toContain(".terrain-navigation{");
  expect(css).toContain("gap:16px");
});

test("UnoCSS terrain utilities use the same semantic tokens", async () => {
  const generator = await createGenerator(config);
  const { css } = await generator.generate(
    "terrain-text-primary terrain-text-secondary terrain-bg-primary terrain-surface",
  );
  expect(css).toContain(".terrain-text-primary{color:var(--color-primary);");
  expect(css).toContain(".terrain-text-secondary{color:var(--color-secondary);");
  expect(css).toContain(".terrain-bg-primary{background:var(--color-primary);");
  expect(css).toContain("color:var(--color-on-primary)");
  expect(css).toContain(".terrain-surface{background:var(--color-background);");
});
