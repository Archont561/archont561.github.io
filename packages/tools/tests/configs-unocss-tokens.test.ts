import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@archont561/bun-test-utils";
import { createTokensPreset, parseTokensCss } from "@/src/configs/unocss/tokens.ts";

test("token parsing keeps semantic declarations and excludes primitives and aliases", () => {
  const css = `
    /* --color-commented: red; */
    :root {
      --palette-day-primary: #123456;
      --paper: var(--color-background);
      --color-primary: var(--palette-day-primary);
      --color-on-primary : #fff;
      --space-1: 4px;
      --space-fluid: clamp(1rem, 2vw, 2rem);
      --radius-sm: 4px;
      --viewport-small: 100vh;
      --colorful-not-a-token: red;
    }
  `;
  expect(parseTokensCss(css)).toEqual({
    "color-primary": "var(--palette-day-primary)",
    "color-on-primary": "#fff",
    "space-1": "4px",
    "space-fluid": "clamp(1rem, 2vw, 2rem)",
    "radius-sm": "4px",
  });
});

test("duplicate declarations keep the first value across nested blocks", () => {
  const css = `
    :root { --space-1: 4px; --radius-sm: 3px; --color-primary: #111; }
    @supports (height: 100svh) { :root { --space-1: 8px; --radius-sm: 5px; } }
    [data-terrain-theme="night"] { --color-primary: #eee; }
  `;
  expect(parseTokensCss(css)).toEqual({
    "space-1": "4px",
    "radius-sm": "3px",
    "color-primary": "#111",
  });
});

test("the preset derives its theme and gaps from an override file", () => {
  const directory = mkdtempSync(join(tmpdir(), "uno-tokens-"));
  const file = join(directory, "tokens.css");
  try {
    writeFileSync(
      file,
      `
      :root {
        --palette-day-primary: #123456;
        --paper: var(--color-primary);
        --color-primary: #123456;
        --color-new-accent: #abcdef;
        --space-1: 0.5rem;
        --space-4: 3rem;
        --space-fluid: clamp(1rem, 2vw, 2rem);
        --radius-sm: 0.25rem;
      }
      @supports (display: grid) { :root { --space-4: 99px; } }
    `,
    );
    const preset = createTokensPreset(file);
    expect(preset.name).toBe("@archont561/tokens");
    expect(preset.theme).toEqual({
      colors: { primary: "var(--color-primary)", "new-accent": "var(--color-new-accent)" },
      spacing: { "1": "0.5rem", "4": "3rem", fluid: "clamp(1rem, 2vw, 2rem)" },
      borderRadius: { sm: "0.25rem" },
    });
    const rule = preset.rules[0];
    if (!rule) throw new Error("Missing terrain gap rule");
    const [pattern, apply] = rule;
    const gap = (value: string) => {
      const match = value.match(pattern);
      return match ? apply(match) : undefined;
    };
    expect(gap("terrain-gap-4")).toEqual({ gap: "3rem" });
    expect(gap("terrain-gap-fluid")).toEqual({ gap: "clamp(1rem, 2vw, 2rem)" });
    expect(gap("terrain-gap-5")).toEqual({ gap: "calc(0.5rem * 5)" });
    expect(gap("terrain-gap-constructor")).toBeUndefined();
    expect(gap("terrain-gap-missing")).toBeUndefined();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("the default token path is relative to the portfolio, not the current directory", () => {
  const preset = createTokensPreset();
  expect(preset.theme.colors.primary).toBe("var(--color-primary)");
  expect(preset.theme.spacing["4"]).toBe("16px");
  expect(preset.theme.borderRadius.control).toBe("5px");
});
