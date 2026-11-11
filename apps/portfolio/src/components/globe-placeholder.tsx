import { ArrowDown } from "lucide-react";
import projects from "@/src/lib/projects.json";

const domains = [...new Set(projects.map((project) => project.category))];

/** A static illustration, deliberately separate from the future interactive atlas. */
export default function GlobePlaceholder() {
  return (
    <section className="atlas-preview" aria-labelledby="atlas-preview-title">
      <div className="atlas-preview-topline">
        <span>THE PROJECT ATLAS / 01</span>
        <span>
          <i /> IN THE WORKS
        </span>
      </div>
      <div className="atlas-preview-stage">
        <div className="atlas-intro">
          <p className="atlas-intro-label">THE OPEN WORKSPACE</p>
          <h1 id="atlas-preview-title">
            Tools for a <span>reproducible</span> world<span className="period">.</span>
          </h1>
          <p className="atlas-intro-description">
            Geospatial systems, reproducible environments, and the tools that connect them.
          </p>
        </div>
        <div className="atlas-preview-art" aria-hidden="true">
          <svg viewBox="50 20 360 320" fill="none" aria-hidden="true">
            <defs>
              <radialGradient id="atlas-glow" cx="50%" cy="45%" r="55%">
                <stop stopColor="#9fb79b" stopOpacity=".28" />
                <stop offset="1" stopColor="#9fb79b" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="atlas-sphere" cx="34%" cy="22%" r="78%">
                <stop stopColor="#587c61" />
                <stop offset="1" stopColor="#183d2d" />
              </radialGradient>
              <clipPath id="atlas-circle">
                <circle cx="230" cy="179" r="126" />
              </clipPath>
            </defs>
            <circle cx="230" cy="179" r="182" fill="url(#atlas-glow)" />
            <circle
              cx="230"
              cy="179"
              r="151"
              stroke="#90ac8d"
              strokeOpacity=".35"
              strokeDasharray="2 7"
            />
            <circle cx="230" cy="179" r="126" fill="url(#atlas-sphere)" />
            <g clipPath="url(#atlas-circle)" stroke="#d2e0c5" strokeOpacity=".36" strokeWidth=".8">
              <ellipse cx="230" cy="179" rx="62" ry="126" />
              <ellipse cx="230" cy="179" rx="102" ry="126" />
              <path d="M104 179h252M111 136h238M111 222h238M136 98h188M136 260h188" />
              <path d="M230 53v252" />
            </g>
            <g
              fill="#b9d1aa"
              fillOpacity=".52"
              stroke="#dce8d2"
              strokeOpacity=".5"
              strokeWidth=".8"
            >
              <path d="m154 120 14-13 19 3 7 10 14 4-4 12-15 3-5 12-10 1-5 18-8-5-3-19-11-8z" />
              <path d="m188 174 17-7 12 6 3 13 10 11-7 13-4 18-11 17-6-8 1-16-9-12-5-16-9-9z" />
              <path d="m235 116 15-9 13 5 12-4 17 7 17-2 22 12-2 12-17 3-8 10-13-5-12 9-11-5-6 13-13-4-8-12-11-2-8-11z" />
              <path d="m255 163 14-4 14 9 8 14-4 19-11 13-4 17-10-2-5-18-11-9-4-18z" />
              <path d="m302 218 16-8 15 6 3 13-11 8-18-3-8-8z" />
            </g>
            <circle cx="230" cy="179" r="126" stroke="#c9ddbd" strokeOpacity=".7" />
            <g fill="#e6f3cf" stroke="#365c42" strokeWidth="3">
              <circle cx="174" cy="141" r="5" />
              <circle cx="204" cy="197" r="5" />
              <circle cx="268" cy="136" r="5" />
              <circle cx="271" cy="190" r="5" />
              <circle cx="316" cy="224" r="5" />
            </g>
            <path
              d="M110 290c38 20 92 29 145 26M331 68c21 12 39 28 52 47"
              stroke="#92aa8b"
              strokeOpacity=".6"
            />
            <path d="m249 312 8 4-8 4M378 111l5 5-7 1" stroke="#92aa8b" strokeOpacity=".8" />
          </svg>
          <span className="atlas-coordinate atlas-coordinate-left">
            {String(domains.length).padStart(2, "0")} / DOMAINS
          </span>
          <span className="atlas-coordinate atlas-coordinate-right">
            {String(projects.length).padStart(2, "0")} / PROJECTS
          </span>
        </div>
        <div className="atlas-domain-index">
          <p>THE WORKSPACE / INDEX</p>
          <ol>
            {domains.map((domain, index) => (
              <li key={domain}>
                <span>{String(index + 1).padStart(2, "0")}</span> {domain}
              </li>
            ))}
          </ol>
        </div>
      </div>
      <div className="atlas-preview-caption">
        <div>
          <span className="atlas-caption-label">ATLAS / PREVIEW</span>
          <h2>The atlas is taking shape.</h2>
          <p>An interactive globe is planned. For now, explore the projects below.</p>
        </div>
        <a href="#work" aria-label="Explore projects, scroll to discover">
          <span className="atlas-scroll-text">
            Explore projects <small>SCROLL TO DISCOVER</small>
          </span>
          <span className="atlas-scroll-icon">
            <ArrowDown size={18} aria-hidden="true" />
          </span>
        </a>
      </div>
    </section>
  );
}
