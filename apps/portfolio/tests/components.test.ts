import { expect, test } from "@archont561/bun-test-utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import BrandMark from "@/src/components/brand-mark";
import GlobePlaceholder from "@/src/components/globe-placeholder";
import Portfolio from "@/src/components/portfolio";
import ProjectCard from "@/src/components/project-card";
import ProjectDirectory from "@/src/components/project-directory";
import SiteFooter from "@/src/components/site-footer";
import SiteHeader from "@/src/components/site-header";
import StructuredData from "@/src/components/structured-data";
import ThemeToggle from "@/src/components/theme-toggle";
import projects from "@/src/lib/projects.json";

const example = projects[0];
if (!example) throw new Error("Expected at least one project in the portfolio catalog");

test("the theme control has an accessible, disabled pre-hydration fallback", () => {
  const html = renderToStaticMarkup(createElement(ThemeToggle));
  expect(html).toContain('aria-label="Theme follows browser settings"');
  expect(html).toContain("disabled");
  expect(html).toContain("theme-icon-sun");
  expect(html).toContain("theme-icon-moon");
});

test("a project card links to its documentation and escapes project data", () => {
  const project = { ...example, name: "<unsafe>", description: 'A "quoted" description.' };
  const html = renderToStaticMarkup(createElement(ProjectCard, { project }));
  expect(html).toMatch(new RegExp(`href="/docs/projects/${project.slug}/?"`));
  expect(html).toContain("&lt;unsafe&gt;");
  expect(html).not.toContain("<unsafe>");
  expect(html).toContain("A &quot;quoted&quot; description.");
  expect(html).toContain(project.category);
});

test("a project with no recorded language has an honest fallback", () => {
  const project = { ...example, language: null };
  const html = renderToStaticMarkup(createElement(ProjectCard, { project }));
  expect(html).toContain("Language not captured");
});

test("the directory initially exposes all cards and its no-JavaScript explanation", () => {
  const html = renderToStaticMarkup(createElement(ProjectDirectory));
  expect((html.match(/<a class="project-card /g) ?? []).length).toBe(projects.length);
  expect(html).toContain('aria-live="polite"');
  expect(html).toContain("Filters require JavaScript.");
  expect(html).not.toContain('aria-label="Search projects"');
});

test("the shared header exposes navigation and marks the active page", () => {
  const html = renderToStaticMarkup(createElement(SiteHeader, { active: "projects" }));
  expect(html).toContain('aria-label="Primary navigation"');
  expect(html).toContain('aria-label="Mobile navigation"');
  expect(html).toContain('aria-label="Archont561 home"');
  expect(html).toContain('aria-current="page"');
  expect(html).toContain('class="theme-toggle"');
  expect(html).toContain('href="/search"');
});

test("the brand supplies decorative light and dark assets", () => {
  const html = renderToStaticMarkup(createElement(BrandMark));
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain("terrain-a-icon.svg");
  expect(html).toContain("terrain-a-icon-light.svg");
});

test("the atlas preview is labeled and links to the project section", () => {
  const html = renderToStaticMarkup(createElement(GlobePlaceholder));
  expect(html).toContain('aria-labelledby="atlas-preview-title"');
  expect(html).toContain('href="#work"');
  expect(html).toContain("An interactive globe is planned");
  expect(html).toContain(`${String(projects.length).padStart(2, "0")} / PROJECTS`);
});

test("the homepage preview contains only featured projects", () => {
  const html = renderToStaticMarkup(createElement(Portfolio));
  const featured = projects.filter((project) => project.featured.home);
  expect((html.match(/<a class="project-card /g) ?? []).length).toBe(featured.length);
  for (const project of featured) expect(html).toContain(project.name);
  expect(html).toContain('id="work"');
});

test("the footer keeps documentation and machine-readable destinations", () => {
  const html = renderToStaticMarkup(createElement(SiteFooter));
  expect(html).toContain('href="/llms.txt"');
  expect(html).toContain('href="/feed.xml"');
  expect(html).toContain("https://github.com/Archont561/archont561.github.io");
});

test("structured data cannot terminate its script element", () => {
  const html = renderToStaticMarkup(
    createElement(StructuredData, { value: { name: "</script><script>alert(1)</script>" } }),
  );
  expect(html).toContain('type="application/ld+json"');
  expect(html).toContain("\\u003c/script>");
  expect(html).not.toContain("</script><script>");
});
