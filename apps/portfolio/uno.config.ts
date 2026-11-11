import { createUnoPreset } from "@archont561/tools/configs/unocss";
import { defineConfig } from "unocss";

export default defineConfig({
  presets: [createUnoPreset()],
  content: { filesystem: ["src/app/**/*.{tsx,ts}", "src/components/**/*.{tsx,ts}"] },
  theme: { colors: { pine: "#294B38", sage: "#8FA17D", ivory: "#F8F7F1" } },
  rules: [
    ["terrain-shell", { "max-width": "1280px", margin: "0 auto", padding: "24px" }],
    ["terrain-row", { display: "flex", "align-items": "center", gap: "16px" }],
    ["terrain-surface", { background: "var(--paper)", color: "var(--ink)" }],
    [/^terrain-gap-(\d+)$/, ([, n]) => ({ gap: `${Number(n) * 4}px` })],
  ],
  shortcuts: { "terrain-navigation": "terrain-row terrain-gap-4" },
  safelist: ["terrain-shell", "terrain-row", "terrain-surface", "terrain-navigation"],
});
