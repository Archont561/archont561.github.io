import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import ProjectDirectory from "@/src/components/project-directory";
import SiteFooter from "@/src/components/site-footer";
import SiteHeader from "@/src/components/site-header";
import projects from "@/src/lib/projects.json";
import { staticPageMetadata } from "@/src/lib/site";

export const metadata = staticPageMetadata(
  "/projects/",
  "Project directory",
  "Explore the Archont561 public workspace: geospatial systems, environments, testing, agents, and developer tools.",
);

const domainCount = new Set(projects.map((project) => project.category)).size;

export default function Page() {
  return (
    <>
      <SiteHeader active="projects" />
      <div className="portfolio">
        <main id="main-content" className="project-page" tabIndex={-1}>
          <div className="portfolio-content">
            <Link href="/" className="project-page-back">
              <ArrowLeft size={14} aria-hidden="true" /> Back to the atlas
            </Link>
            <div className="project-page-intro">
              <div className="project-page-title">
                <p className="eyebrow">THE PUBLIC WORKSPACE / PROJECT INDEX</p>
                <h1>
                  Projects, <span>in context.</span>
                </h1>
                <p>
                  Open-source work across geospatial systems, reproducible environments, testing,
                  and agent workflows.
                </p>
                <Link href="/docs/projects/" className="project-index-link">
                  Browse the documentation index <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
              </div>
              <dl className="project-page-facts">
                <div>
                  <dt>PROJECTS</dt>
                  <dd>{String(projects.length).padStart(2, "0")}</dd>
                </div>
                <div>
                  <dt>AREAS</dt>
                  <dd>{String(domainCount).padStart(2, "0")}</dd>
                </div>
              </dl>
            </div>
            <ProjectDirectory />
          </div>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
