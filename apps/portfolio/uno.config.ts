import { createTokensPreset, createUnoPreset } from "@archont561/tools/configs/unocss";
import { defineConfig } from "unocss";

export default defineConfig<Partial<ReturnType<typeof createTokensPreset>["theme"]>>({
  presets: [createUnoPreset(), createTokensPreset()],
  // Re-read token values and discover new names during styles:watch.
  configDeps: ["src/app/tokens.css"],
  content: { filesystem: ["src/app/**/*.{tsx,ts}", "src/components/**/*.{tsx,ts}"] },
  theme: {
    colors: {
      pine: "var(--color-primary)",
      sage: "var(--color-secondary)",
      ivory: "var(--color-background)",
    },
  },
  rules: [
    ["terrain-shell", { "max-width": "1280px", margin: "0 auto", padding: "24px" }],
    ["terrain-row", { display: "flex", "align-items": "center", gap: "var(--space-4)" }],
    ["terrain-surface", { background: "var(--color-background)", color: "var(--color-text)" }],
    ["terrain-text-primary", { color: "var(--color-primary)" }],
    ["terrain-text-secondary", { color: "var(--color-secondary)" }],
    [
      "terrain-bg-primary",
      { background: "var(--color-primary)", color: "var(--color-on-primary)" },
    ],
  ],
  shortcuts: { "terrain-navigation": "terrain-row terrain-gap-4" },
  safelist: ["terrain-shell", "terrain-row", "terrain-surface", "terrain-navigation"],
});
