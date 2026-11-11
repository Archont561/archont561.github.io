import { loader } from "fumadocs-core/source";
import { docs } from "@/.source/server";

export const source = loader({ baseUrl: "/docs", source: docs.toFumadocsSource() });

/** Markdown comes from Fumadocs' MDX processing, not a separate converter. */
export async function getLLMText(
  page: ReturnType<typeof source.getPages>[number],
): Promise<string> {
  const body = (await page.data.getText("processed")).trim();
  if (!body) throw new Error(`Empty processed Markdown for ${page.url}`);
  return `# ${page.data.title}\n\n${page.data.description ?? ""}\n\n${body}\n`;
}
