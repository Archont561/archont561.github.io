import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const portfolioRoot = fileURLToPath(new URL("../../../../../apps/portfolio/", import.meta.url));

type Tokens = Record<string, string>;

/** Read only semantic colors, spacing, and radii; the first declaration wins. */
export function parseTokensCss(css: string): Tokens {
  const declarations = new Map<string, string>();
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, " ");
  for (const match of withoutComments.matchAll(/--([a-zA-Z0-9_-]+)\s*:\s*([^;{}]*);/g)) {
    const [, name, value] = match;
    if (!name || value === undefined || !/^(?:color|space|radius)-.+/.test(name)) continue;
    if (!declarations.has(name)) declarations.set(name, value.trim());
  }
  return Object.fromEntries(declarations);
}

function tokenGroup(tokens: Tokens, prefix: string, references = false): Tokens {
  return Object.fromEntries(
    Object.entries(tokens)
      .filter(([name]) => name.startsWith(`${prefix}-`))
      .map(([name, value]) => [
        name.slice(prefix.length + 1),
        references ? `var(--${name})` : value,
      ]),
  );
}

/** Use the portfolio's already-installed UnoCSS under Bun's isolated workspace linker. */
export function createTokensPreset(cssPath = "src/app/tokens.css") {
  const tokens = parseTokensCss(readFileSync(resolve(portfolioRoot, cssPath), "utf8"));
  const colors = tokenGroup(tokens, "color", true);
  const spacing = tokenGroup(tokens, "space");
  const borderRadius = tokenGroup(tokens, "radius");
  // Using the token map also preserves arbitrary legacy numeric gaps via space-1.
  const gapRule: [RegExp, (match: RegExpMatchArray) => { gap: string } | undefined] = [
    /^terrain-gap-([a-zA-Z0-9_-]+)$/,
    ([, key]) => {
      if (!key) return undefined;
      const value = Object.hasOwn(spacing, key) ? spacing[key] : undefined;
      if (value !== undefined) return { gap: value };
      if (/^\d+$/.test(key) && spacing["1"] !== undefined)
        return { gap: `calc(${spacing["1"]} * ${key})` };
      return undefined;
    },
  ];
  const require = createRequire(resolve(portfolioRoot, "package.json"));
  const { definePreset } = require("unocss") as {
    definePreset: <T extends object>(preset: T) => T;
  };
  return definePreset({
    name: "@archont561/tokens",
    theme: { colors, spacing, borderRadius },
    rules: [gapRule],
  });
}
