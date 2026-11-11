import type { DocData } from "fumadocs-mdx/runtime/types";
import { ArrowUpRight, BookOpen, ChevronDown, ChevronRight, FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ComponentProps } from "react";
import DocsNavigation from "@/src/components/docs-navigation";
import StructuredData from "@/src/components/structured-data";
import projects from "@/src/lib/projects.json";
import { docsUrl, markdownUrl, ORIGIN } from "@/src/lib/site";
import { source } from "@/src/lib/source";

interface Props {
  params: Promise<{ slug?: string[] }>;
}
const projectsBySlug = new Map(projects.map((project) => [project.slug, project]));
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
  const { body: MDX, toc } = page.data as typeof page.data & DocData;
  const ancestors = page.slugs
    .slice(0, -1)
    .map((_, index) => source.getPage(page.slugs.slice(0, index + 1)))
    .filter((ancestor) => ancestor !== undefined);
  const project =
    page.slugs[0] === "projects" && page.slugs.length === 2
      ? projectsBySlug.get(page.slugs[1] ?? "")
      : undefined;
  const structured = project
    ? {
        "@context": "https://schema.org",
        "@type": "SoftwareSourceCode",
        name: project.name,
        description: project.description,
        codeRepository: project.url,
        ...(project.language ? { programmingLanguage: project.language } : {}),
        url: `${ORIGIN}${docsUrl(page.slugs)}`,
      }
    : null;
  const tree = source.pageTree;
  return (
    <div className="docs-workspace">
      <aside className="docs-sidebar">
        <div className="docs-sidebar-inner">
          <DocsNavigation tree={tree} currentPath={page.url} />
        </div>
      </aside>
      <div className="docs-page-shell">
        <details className="docs-mobile-nav" key={page.url}>
          <summary>
            <BookOpen size={16} aria-hidden="true" />
            <span>Browse documentation</span>
            <ChevronDown size={16} aria-hidden="true" />
          </summary>
          <DocsNavigation tree={tree} currentPath={page.url} />
        </details>
        <main id="main-content" className="docs-main" tabIndex={-1}>
          <article
            className={`docs-article${page.slugs.length === 0 ? " docs-home" : ""}`}
            data-pagefind-body
          >
            {structured && <StructuredData value={structured} />}
            <nav className="docs-breadcrumbs" aria-label="Breadcrumb" data-pagefind-ignore>
              <ol>
                <li>
                  <Link href="/docs/">Field notes</Link>
                </li>
                {ancestors.map((ancestor) => (
                  <li key={ancestor.url}>
                    <ChevronRight size={13} aria-hidden="true" />
                    <Link href={ancestor.url}>{ancestor.data.title}</Link>
                  </li>
                ))}
                <li aria-current="page">
                  <ChevronRight size={13} aria-hidden="true" />
                  {page.slugs.length ? page.data.title : "Overview"}
                </li>
              </ol>
            </nav>
            <div className="docs-article-kicker">THE OPEN WORKSPACE / FIELD NOTES</div>
            <h1>{page.data.title}</h1>
            <p className="docs-description">{page.data.description}</p>
            <div className="docs-actions" data-pagefind-ignore>
              <a className="markdown-button primary" href={markdownUrl(page.slugs)}>
                <FileText size={14} aria-hidden="true" /> Read as Markdown
                <ArrowUpRight size={12} aria-hidden="true" />
              </a>
              <a className="markdown-button secondary" href="/llms.txt">
                llms.txt <ArrowUpRight size={12} aria-hidden="true" />
              </a>
            </div>
            <div className="docs-prose">
              <MDX
                components={{
                  a: ({ href, ...props }: ComponentProps<"a">) => (
                    <Link href={href ?? "#"} {...props} />
                  ),
                }}
              />
            </div>
          </article>
          {toc.length > 0 && (
            <aside className="docs-toc">
              <nav aria-label="On this page">
                <p>ON THIS PAGE</p>
                <ol>
                  {toc.map((item) => (
                    <li key={item.url} className={item.depth > 2 ? "docs-toc-nested" : undefined}>
                      <a href={item.url}>{item.title}</a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>
          )}
        </main>
      </div>
    </div>
  );
}
