import { docsUrl, markdownUrl } from "@/src/lib/site";
import { getLLMText, source } from "@/src/lib/source";

export const dynamic = "force-static";

/** Produced at build time; export-ai consumes exactly the Fumadocs page set. */
export async function GET(): Promise<Response> {
  const pages = await Promise.all(
    source.getPages().map(async (page) => ({
      title: page.data.title,
      description: page.data.description ?? "",
      url: docsUrl(page.slugs),
      markdown: markdownUrl(page.slugs),
      text: await getLLMText(page),
      ...(page.data.date ? { date: page.data.date } : {}),
    })),
  );
  pages.sort((a, b) => a.url.localeCompare(b.url, "en"));
  return Response.json({ version: 1, pages });
}
