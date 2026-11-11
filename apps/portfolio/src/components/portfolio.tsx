import {
  ArrowRight,
  ArrowUpRight,
  FlaskConical,
  Layers,
  Map as MapIcon,
  Sparkles,
  Terminal,
} from "lucide-react";
import Link from "next/link";
import GlobePlaceholder from "@/src/components/globe-placeholder";
import ProjectCard from "@/src/components/project-card";
import SiteFooter from "@/src/components/site-footer";
import projects from "@/src/lib/projects.json";

const previewProjects = projects.filter((project) => project.featured.home);
const domainCount = new Set(projects.map((project) => project.category)).size;

function DisciplineStrip() {
  return (
    <div className="discipline-strip">
      <span>AREAS OF EXPLORATION</span>
      <div>
        <MapIcon size={15} /> Geospatial systems
      </div>
      <div>
        <Layers size={15} /> Reproducible environments
      </div>
      <div>
        <FlaskConical size={15} /> Testing infrastructure
      </div>
      <div>
        <Sparkles size={15} /> Agent workflows
      </div>
    </div>
  );
}

/** Retain the existing #work destination as a preview and route to the full list. */
function WorkPreview() {
  return (
    <section id="work" className="work-section">
      <div className="section-heading">
        <div>
          <div className="eyebrow">THE PUBLIC WORKSPACE</div>
          <h2>Small automation. Connected ideas.</h2>
        </div>
        <p>
          Independent projects with a shared thread:
          <br />
          making complex workflows easier to reason about.
        </p>
      </div>
      <div className="project-grid project-preview-grid">
        {previewProjects.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </div>
      <div className="project-preview-action">
        <p>
          {projects.length} projects across {domainCount} areas of exploration.
        </p>
        <Link className="button primary" href="/projects/">
          View all projects <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

function NotesBanner() {
  return (
    <section className="notes-banner">
      <div className="notes-icon">
        <Terminal size={27} />
      </div>
      <div>
        <div className="eyebrow">HUMAN READABLE. AGENT READY.</div>
        <h2>The work, with context.</h2>
        <p>
          Project notes for people. Portable Markdown for machines.
          <br />
          No walled gardens. Just source, structure, and a little curiosity.
        </p>
      </div>
      <Link href="/docs" className="button primary">
        Open field notes <ArrowRight size={16} />
      </Link>
    </section>
  );
}

function AboutSection() {
  return (
    <section className="about-section" id="about">
      <div className="eyebrow">A NOTE ABOUT THIS SPACE</div>
      <h2>
        Less black box.
        <br />
        <span>More building blocks.</span>
      </h2>
      <div>
        <p>
          This is a map of my public workspace — geospatial tools, reproducible environments,
          testing systems, and experiments in agent-driven workflows.
        </p>
        <p>Follow the source to see how things fit together.</p>
        <a href="https://github.com/Archont561">
          Find me on GitHub <ArrowUpRight size={16} />
        </a>
      </div>
    </section>
  );
}

export default function Portfolio() {
  return (
    <div className="portfolio">
      <main id="main-content" tabIndex={-1}>
        <GlobePlaceholder />
        <div className="portfolio-content">
          <DisciplineStrip />
          <WorkPreview />
          <NotesBanner />
          <AboutSection />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
