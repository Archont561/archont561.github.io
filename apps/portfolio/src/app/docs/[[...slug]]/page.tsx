import type { DocData } from "fumadocs-mdx/runtime/types";
import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ComponentProps } from "react";
import StructuredData from "@/src/components/structured-data";
import projects from "@/src/lib/projects.json";
import { docsUrl, markdownUrl, ORIGIN } from "@/src/lib/site";
import { source } from "@/src/lib/source";

interface Props {
  params: Promise<{ slug?: string[] }>;
}
export const dynamicParams = false;
export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = source.getPage((await params).slug);
  if (!page) return {};
  const url = `${ORIGIN}${docsUrl(page.slugs)}`;
  return {
    title: page.data.title,
    description: page.data.description,
    alternates: { canonical: url, types: { "text/markdown": markdownUrl(page.slugs) } },
    openGraph: { title: page.data.title, description: page.data.description, url, type: "article" },
    twitter: { card: "summary", title: page.data.title, description: page.data.description },
  };
}

export default async function Page({ params }: Props) {
  const page = source.getPage((await params).slug);
  if (!page) notFound();
  const MDX = (page.data as typeof page.data & DocData).body;
  const project =
    page.slugs[0] === "projects" && page.slugs.length === 2
      ? projects.find((item) => item.slug === page.slugs[1])
      : undefined;
  const structured = project
    ? {
        "@context": "https://schema.org",
        "@type": "SoftwareSourceCode",
        name: project.name,
        description: project.description,
        codeRepository: project.url,
        programmingLanguage: project.language,
        url: `${ORIGIN}${docsUrl(page.slugs)}`,
      }
    : null;
  return (
    <article className="docs-article" data-pagefind-body>
      {structured && <StructuredData value={structured} />}
      <h1>{page.data.title}</h1>
      <p className="docs-description">{page.data.description}</p>
      <div className="docs-actions">
        <a className="markdown-button primary" href={markdownUrl(page.slugs)}>
          Read as Markdown <ArrowUpRight size={12} />
        </a>
        <a className="markdown-button secondary" href="/llms.txt">
          llms.txt <ArrowUpRight size={12} />
        </a>
      </div>
      <MDX
        components={{
          a: ({ href, ...props }: ComponentProps<"a">) => <Link href={href ?? "#"} {...props} />,
        }}
      />
    </article>
  );
}
