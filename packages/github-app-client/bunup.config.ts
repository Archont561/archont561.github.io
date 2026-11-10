import { defineConfig } from "bunup";
import { exports as generateExports } from "bunup/plugins";

// Publishable build (D-004): ESM + d.ts into dist/.
// `@/*` path aliases resolve from the package tsconfig automatically.
// `@archont561/tools` is private — inlined into the bundle so it never
// appears in the published manifest (it lives in devDependencies).
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  noExternal: [/@archont561\/tools/],
  plugins: [generateExports()],
});
