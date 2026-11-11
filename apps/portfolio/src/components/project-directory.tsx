"use client";

import { ArrowUpRight, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ProjectCard from "@/src/components/project-card";
import projects from "@/src/lib/projects.json";

const categories = ["All projects", ...new Set(projects.map((project) => project.category))];

type Filters = {
  category: string;
  setCategory: (value: string) => void;
  query: string;
  setQuery: (value: string) => void;
};

function ProjectToolbar({ category, setCategory, query, setQuery }: Filters) {
  return (
    <div className="project-toolbar">
      <fieldset className="filters">
        <legend className="visually-hidden">Filter projects by area</legend>
        {categories.map((name) => (
          <button
            type="button"
            key={name}
            className={category === name ? "active" : ""}
            aria-pressed={category === name}
            onClick={() => setCategory(name)}
          >
            {name}
            {name === "All projects" && <span className="filter-count">{projects.length}</span>}
          </button>
        ))}
      </fieldset>
      <label className="project-search">
        <Search size={16} aria-hidden="true" />
        <input
          aria-label="Search projects"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find a project…"
        />
        {query && (
          <button type="button" aria-label="Clear search" onClick={() => setQuery("")}>
            <X size={13} aria-hidden="true" />
          </button>
        )}
      </label>
    </div>
  );
}

export default function ProjectDirectory() {
  const [category, setCategory] = useState("All projects");
  const [query, setQuery] = useState("");
  const [canFilter, setCanFilter] = useState(false);
  useEffect(() => setCanFilter(true), []);
  const filtered = useMemo(
    () =>
      projects.filter(
        (project) =>
          (category === "All projects" || project.category === category) &&
          `${project.name} ${project.description} ${project.category}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [category, query],
  );
  return (
    <section className="project-directory" aria-labelledby="project-list-title">
      <h2 id="project-list-title" className="visually-hidden">
        All projects
      </h2>
      {canFilter && (
        <ProjectToolbar
          category={category}
          setCategory={setCategory}
          query={query}
          setQuery={setQuery}
        />
      )}
      <noscript>
        <p className="project-note project-directory-noscript">
          Browse all projects below. Filters require JavaScript.
        </p>
      </noscript>
      <div className="project-grid" aria-live="polite">
        {filtered.map((project) => (
          <ProjectCard key={project.slug} project={project} />
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
        Selected public repositories · Curated summaries and GitHub metadata ·{" "}
        <a href="https://github.com/Archont561?tab=repositories">
          View all repositories <ArrowUpRight size={12} aria-hidden="true" />
        </a>
      </p>
    </section>
  );
}
