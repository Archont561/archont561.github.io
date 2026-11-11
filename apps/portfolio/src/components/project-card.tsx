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
import projects from "@/src/lib/projects.json";

const icons = {
  Geospatial: MapIcon,
  Environments: Layers,
  Testing: FlaskConical,
  Agents: Sparkles,
  "Developer tools": Terminal,
};

type Project = (typeof projects)[number];

export default function ProjectCard({ project }: { project: Project }) {
  const Icon = icons[project.category as keyof typeof icons];
  const number = projects.findIndex((item) => item.slug === project.slug) + 1;
  return (
    <Link
      className={`project-card tone-${project.category.toLowerCase().replaceAll(" ", "-")}`}
      href={`/docs/projects/${project.slug}/`}
    >
      <div className="card-top">
        <span className="project-icon">
          <Icon size={21} strokeWidth={1.5} aria-hidden="true" />
        </span>
        <span className="card-category">{project.category}</span>
        <ArrowUpRight className="card-arrow" size={18} aria-hidden="true" />
      </div>
      <span className="project-number">{String(number).padStart(2, "0")} /</span>
      <h3>{project.name}</h3>
      <p>{project.description}</p>
      <div className="card-bottom">
        <span>
          <i className={`language-dot lang-${project.language.toLowerCase()}`} />
          {project.language}
        </span>
        <span>
          Explore project <ArrowRight size={13} aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
