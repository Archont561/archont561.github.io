import { readPackageMeta } from "@/src/package-meta/index.ts";

export const meta = readPackageMeta(import.meta.url);
export const { name, version } = meta;
