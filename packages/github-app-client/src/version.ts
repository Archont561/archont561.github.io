import type { PackageMeta } from "@archont561/tools/package-meta";
import { readPackageMeta } from "@archont561/tools/package-meta";

// Explicit annotations: bunup's dts uses isolated-declarations (D-004).
export const meta: PackageMeta = readPackageMeta(import.meta.url);
export const name: string = meta.name;
export const version: string = meta.version;
