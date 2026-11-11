import type { CatalogProject, ProjectCatalog } from "@/src/lib/project-catalog";

export const GENERATED_MARKER = "# Generated from data/projects; do not edit by hand.";

function markdownText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replace(/([\\`*_{}[\]])/g, "\\$1");
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function provenance(project: CatalogProject): string {
  const source = project.descriptionSource;
  if (source.kind === "curated")
    return "The description above is curated from public project information.";
  const date = formatDate(source.captured);
  if (source.kind === "snapshot")
    return `The description above comes from the committed public GitHub repository snapshot captured on ${date}.`;
  if (source.kind === "legacy-github")
    return `Earlier project documentation attributed the description above to GitHub repository metadata captured on ${date}. That older capture is not contained in the current repository snapshot.`;
  return `The description above is attributed to public GitHub repository metadata captured on ${date}.`;
}

function languageLine(project: CatalogProject): string {
  if (!project.language || !project.repositoryCaptured)
    return "* Primary language: not recorded in the committed repository snapshot.";
  return `* Primary language: ${markdownText(project.language)} (repository metadata captured on ${formatDate(project.repositoryCaptured)}).`;
}

export function renderProjectPage(project: CatalogProject): string {
  const name = markdownText(project.name);
  const category = markdownText(project.category);
  const notes = project.notes ? `\n\n${project.notes}` : "";
  return `---
${GENERATED_MARKER}
title: ${JSON.stringify(project.name)}
description: ${JSON.stringify(project.description)}
---

<span id="overview"></span>

## Project context

This repository is part of the ${category.toLowerCase()} collection in this portfolio.
${provenance(project)}
It describes the project's stated scope, not a guarantee of feature completeness.

## Explore the source

Visit [${name} on GitHub](${project.url}) for source code, installation instructions, current status, and licensing.

## Metadata

${languageLine(project)}
* Category: ${markdownText(project.metadataCategory)}.
* Source: [public GitHub repository](${project.url}).${notes}
`;
}

function nonEmptyGroups(catalog: ProjectCatalog) {
  return catalog.categories
    .map((category) => ({
      category,
      projects: catalog.projects.filter((project) => project.categoryId === category.id),
    }))
    .filter((group) => group.projects.length > 0);
}

function renderDirectory(catalog: ProjectCatalog): string {
  const groups = nonEmptyGroups(catalog).map(({ category, projects }) => {
    const rows = projects.map(
      (project) =>
        `* [${markdownText(project.name)}](/docs/projects/${project.slug}): ${markdownText(project.directorySummary)}`,
    );
    return `## ${markdownText(category.label)}\n\n${rows.join("\n")}`;
  });
  return `---
${GENERATED_MARKER}
title: Project directory
description: Open-source work grouped by problem domain.
---

<span id="selected-repositories"></span>

These summaries are curated from public repository information. Visit each source repository for current status and installation instructions.

${groups.join("\n\n")}
`;
}

function renderMetadata(catalog: ProjectCatalog): string {
  const pages = ["index"];
  for (const { category, projects } of nonEmptyGroups(catalog)) {
    pages.push(`---${category.label}---`, ...projects.map((project) => project.slug));
  }
  return `${JSON.stringify({ title: "Projects", defaultOpen: true, pages }, null, 2)}\n`;
}

function renderProjectView(catalog: ProjectCatalog): string {
  const projects = catalog.projects.map((project) => ({
    name: project.name,
    category: project.category,
    categoryId: project.categoryId,
    description: project.description,
    language: project.language,
    url: project.url,
    slug: project.slug,
    topics: project.topics,
    featured: project.featured,
    number: project.number,
  }));
  return `${JSON.stringify(projects, null, 2)}\n`;
}

/** Render Fumadocs inputs and the small serializable client view from one catalog. */
export function renderProjectOutputs(catalog: ProjectCatalog): Map<string, string> {
  const outputs = new Map<string, string>([
    ["docs/projects/index.mdx", renderDirectory(catalog)],
    ["docs/projects/meta.json", renderMetadata(catalog)],
    ["apps/portfolio/src/lib/projects.json", renderProjectView(catalog)],
  ]);
  for (const project of catalog.projects) {
    outputs.set(`docs/projects/${project.slug}.mdx`, renderProjectPage(project));
  }
  return outputs;
}
