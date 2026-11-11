/**
 * Run the probe in a fresh Bun process so version modules and package-meta have
 * empty caches even if a caller checks a workspace repeatedly after changing it.
 */
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export async function probeVersions(files: string[]) {
  const results = [];
  for (const file of files) {
    try {
      const module = await import(pathToFileURL(file).href);
      results.push({ file, name: module.name, version: module.version });
    } catch (cause) {
      results.push({ file, error: cause instanceof Error ? cause.message : String(cause) });
    }
  }
  return results;
}

if (import.meta.main) {
  const [output, ...files] = process.argv.slice(2);
  if (!output) throw new Error("Version probe requires an output file");
  writeFileSync(output, JSON.stringify(await probeVersions(files)));
}
