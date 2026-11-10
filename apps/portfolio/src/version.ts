import { readPackageMeta } from "@archont561/tools/package-meta";

export const meta = readPackageMeta(import.meta.url);
export const { name, version } = meta;
