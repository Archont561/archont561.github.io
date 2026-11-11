import { pageSchema } from "fumadocs-core/source/schema";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import { z } from "zod";

export const docs = defineDocs({
  dir: "../../docs",
  docs: {
    schema: pageSchema.extend({ date: z.iso.date().optional() }),
    postprocess: { includeProcessedMarkdown: true },
  },
});
export default defineConfig();
