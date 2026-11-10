/**
 * Turbopack does not expand inherited `${configDir}` paths. Its wildcard alias
 * is relative to the app, so `@/src/...` remains package-root relative.
 * Consumed source packages must use relative imports or package self-references
 * in their public import graph: Turbopack applies this alias globally, and
 * TypeScript likewise checks imported source in the app's config context.
 */
export function createNextBase() {
  return { turbopack: { resolveAlias: { "@/*": "./*" } } };
}
