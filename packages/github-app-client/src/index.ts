/**
 * Scaffold entry. The generated SDK (`@/src/client/*`) and `createClient` land
 * in M3 (backlog/tasks/TASK-006-client-gen-and-publish.md) — what this
 * establishes now is the publishable build shape (D-004): bunup dist + d.ts,
 * private `@archont561/tools` inlined via `noExternal`.
 */
export { meta, name, version } from "@/src/version.ts";
