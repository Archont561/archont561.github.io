// Public entrypoints use package subpaths so consuming app bundlers don't
// reinterpret tools' package-local @/ aliases as their own.
export type { PackageMeta } from "@archont561/tools/package-meta";
export { parsePackageMeta, readPackageMeta } from "@archont561/tools/package-meta";
