"use client";
import {
  ArrowRight,
  ArrowUpRight,
  FlaskConical,
  Github,
  Layers,
  Map as MapIcon,
  Menu,
  Search,
  Sparkles,
  Terminal,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import BrandMark from "@/src/components/brand-mark";
import projects from "@/src/lib/projects.json";

const categories = [
  "All projects",
  "Geospatial",
  "Environments",
  "Testing",
  "Agents",
  "Developer tools",
];
const icons = {
  Geospatial: MapIcon,
  Environments: Layers,
  Testing: FlaskConical,
  Agents: Sparkles,
  "Developer tools": Terminal,
};
function Header() {
  const [menu, setMenu] = useState(false);
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <BrandMark />
        <span>
          archont561<span className="brand-dot">.</span>
        </span>
      </Link>
      <nav className={menu ? "nav open" : "nav"}>
        <a href="#work">Selected work</a>
        <Link href="/docs">
          Field notes <ArrowUpRight size={13} />
        </Link>
        <Link href="/packages">
          Packages <ArrowUpRight size={13} />
        </Link>
        <Link href="/search" aria-label="Search documentation">
          <Search size={15} />
        </Link>
        <a href="https://github.com/Archont561" aria-label="GitHub profile">
          <Github size={15} />
        </a>
      </nav>
      <div className="header-actions">
        <button
          type="button"
          className="mobile-menu"
          aria-label="Toggle navigation"
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          <Menu size={20} />
        </button>
      </div>
    </header>
  );
}

function HeroArt() {
  return (
    <div
      className="hero-art"
      aria-label="Abstract topographic map with a reproducible workflow overlay"
      role="img"
    >
      <div className="map-grid" />
      <svg viewBox="0 0 520 540" className="contours" aria-hidden="true">
        <title>Topographic contour illustration</title>
        {Array.from({ length: 15 }, (_, i) => i).map((i) => (
          <ellipse
            key={`contour-${i}`}
            cx="265"
            cy="275"
            rx={43 + i * 19}
            ry={51 + i * 16}
            transform={`rotate(-32 265 275) skewX(${i * 0.7})`}
          />
        ))}
        <path d="M0 390L150 320 245 350 340 200 520 125" className="route-line" />
        <circle cx="340" cy="200" r="6" className="map-point" />
      </svg>
      <div className="map-coordinates">SOURCE → ENVIRONMENT → ARTIFACT</div>
      <div className="workflow-card">
        <div className="terminal-title">
          <span>
            <i />
            <i />
            <i />
          </span>
          <span>workspace / build</span>
          <Terminal size={13} />
        </div>
        <div className="terminal-body">
          <p>
            <span className="terminal-green">❯</span> bun run --cwd apps/portfolio build
          </p>
          <p className="terminal-muted">Resolving the environment…</p>
          <p>
            <span className="terminal-green">✓</span> Environment locked
          </p>
          <p>
            <span className="terminal-green">✓</span> Artifacts reproducible
          </p>
          <p>
            <span className="terminal-green">✓</span> Ready to explore
            <span className="cursor" />
          </p>
        </div>
        <div className="terminal-bottom">
          <span className="status-dot" /> A REPRODUCIBLE MINDSET
          <span>↗</span>
        </div>
      </div>
      <div className="map-label">
        <span>FIG. 01</span> THE TERRAIN IS THE INTERFACE
      </div>
      <div className="north">
        N<br />↑
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="hero-copy">
        <div className="eyebrow">
          <span className="status-dot" /> OPEN SOURCE / OPEN POSSIBILITIES
        </div>
        <h1>
          Tools for a<br />
          <span>reproducible</span>
          <br />
          world<span className="period">.</span>
        </h1>
        <p className="hero-description">
          From geospatial systems to developer tooling.
          <br className="desktop-break" /> Exploring the space between data, infrastructure,
          <br className="desktop-break" /> and the agents that connect them.
        </p>
        <div className="hero-buttons">
          <a className="button primary" href="#work">
            Explore the work <ArrowRight size={16} />
          </a>
          <a className="button secondary" href="https://github.com/Archont561">
            <Github size={16} /> GitHub profile <ArrowUpRight size={14} />
          </a>
        </div>
        <div className="hero-footnote">
          <span>01 /</span> Built in the open. Documented for humans & agents.
        </div>
      </div>
      <HeroArt />
    </section>
  );
}

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

type Filters = {
  category: string;
  setCategory: (value: string) => void;
  query: string;
  setQuery: (value: string) => void;
};

function ProjectToolbar({ category, setCategory, query, setQuery }: Filters) {
  return (
    <div className="project-toolbar">
      <div className="filters">
        {categories.map((c) => (
          <button
            type="button"
            key={c}
            className={category === c ? "active" : ""}
            onClick={() => setCategory(c)}
          >
            {c}
            {c === "All projects" && <span className="filter-count">{projects.length}</span>}
          </button>
        ))}
      </div>
      <label className="project-search">
        <Search size={16} />
        <input
          aria-label="Search projects"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a project…"
        />
        {query && (
          <button type="button" aria-label="Clear search" onClick={() => setQuery("")}>
            <X size={13} />
          </button>
        )}
      </label>
    </div>
  );
}

type Project = (typeof projects)[number];
function ProjectCard({ project: p }: { project: Project }) {
  const Icon = icons[p.category as keyof typeof icons];
  return (
    <Link
      className={`project-card tone-${p.category.toLowerCase().replaceAll(" ", "-")}`}
      href={`/docs/projects/${p.slug}`}
    >
      <div className="card-top">
        <span className="project-icon">
          <Icon size={21} strokeWidth={1.5} />
        </span>
        <span className="card-category">{p.category}</span>
        <ArrowUpRight className="card-arrow" size={18} />
      </div>
      <span className="project-number">{String(projects.indexOf(p) + 1).padStart(2, "0")} /</span>
      <h3>{p.name}</h3>
      <p>{p.description}</p>
      <div className="card-bottom">
        <span>
          <i className={`language-dot lang-${p.language.toLowerCase()}`} />
          {p.language}
        </span>
        <span>
          Explore project <ArrowRight size={13} />
        </span>
      </div>
    </Link>
  );
}

function WorkSection() {
  const [category, setCategory] = useState("All projects");
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () =>
      projects.filter(
        (p) =>
          (category === "All projects" || p.category === category) &&
          `${p.name} ${p.description} ${p.category}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [category, query],
  );
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
      <ProjectToolbar
        category={category}
        setCategory={setCategory}
        query={query}
        setQuery={setQuery}
      />
      <div className="project-grid" aria-live="polite">
        {filtered.map((project) => (
          <ProjectCard key={project.name} project={project} />
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="empty-state">
          No projects match “{query}”.{" "}
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("All projects");
            }}
          >
            Reset filters
          </button>
        </div>
      )}
      <p className="project-note">
        Selected public repositories · Summaries from GitHub metadata ·{" "}
        <a href="https://github.com/Archont561?tab=repositories">
          View all repositories <ArrowUpRight size={12} />
        </a>
      </p>
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

function Footer() {
  return (
    <footer>
      <Link href="/" className="footer-brand">
        <BrandMark monochrome /> <strong>archont561.</strong>
      </Link>
      <span>Built with Fumadocs. Kept in Git.</span>
      <div>
        <a href="/llms.txt">
          llms.txt <ArrowUpRight size={12} />
        </a>
        <Link href="/docs/ai-access">
          AI exports <ArrowUpRight size={12} />
        </Link>
        <Link href="/packages">
          Packages <ArrowUpRight size={12} />
        </Link>
        <a href="/feed.xml">
          Feed <ArrowUpRight size={12} />
        </a>
        <a href="https://github.com/Archont561/archont561.github.io">
          Source <Github size={13} />
        </a>
      </div>
    </footer>
  );
}

export default function Portfolio() {
  return (
    <div className="portfolio">
      <Header />
      <main>
        <Hero />
        <DisciplineStrip />
        <WorkSection />
        <NotesBanner />
        <AboutSection />
      </main>
      <Footer />
    </div>
  );
}
