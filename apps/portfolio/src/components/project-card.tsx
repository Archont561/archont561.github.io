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
import type projects from "@/src/lib/projects.json";

const icons = {
  geospatial: MapIcon,
  environments: Layers,
  testing: FlaskConical,
  agents: Sparkles,
  "developer-tools": Terminal,
};

type Project = (typeof projects)[number];

export default function ProjectCard({ project }: { project: Project }) {
  const Icon = icons[project.categoryId as keyof typeof icons] ?? Layers;
  return (
    <Link
      className={`project-card tone-${project.categoryId}`}
      href={`/docs/projects/${project.slug}/`}
    >
      <div className="card-top">
        <span className="project-icon">
          <Icon size={21} strokeWidth={1.5} aria-hidden="true" />
        </span>
        <span className="card-category">{project.category}</span>
        <ArrowUpRight className="card-arrow" size={18} aria-hidden="true" />
      </div>
      <span className="project-number">{String(project.number).padStart(2, "0")} /</span>
      <h3>{project.name}</h3>
      <p>{project.description}</p>
      <div className="card-bottom">
        <span>
          {project.language ? (
            <>
              <i className={`language-dot lang-${project.language.toLowerCase()}`} />
              {project.language}
            </>
          ) : (
            "Language not captured"
          )}
        </span>
        <span>
          Explore project <ArrowRight size={13} aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
