import { createBunupBase } from "@archont561/tools/configs/bunup";
import { defineConfig } from "bunup";
import { exports as generateExports } from "bunup/plugins";

// Publishable build (D-004): ESM + d.ts into dist/.
// `@/*` path aliases resolve from each package's shared tsconfig.
// `@archont561/tools` is private — inlined into the bundle so it never
// appears in the published manifest (it lives in devDependencies).
const base = createBunupBase();
export default defineConfig({
  ...base,
  entry: ["src/index.ts"],
  noExternal: [/@archont561\/tools/],
  plugins: [...base.plugins, generateExports()],
});
