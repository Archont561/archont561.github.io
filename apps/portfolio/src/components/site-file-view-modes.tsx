import { Code2, Columns2, Eye, type LucideIcon } from "lucide-react";
import type { MouseEvent } from "react";
import type { SiteFileViewMode } from "@/src/lib/site-file-preview";

const views = [
  { id: "rendered", label: "Rendered", Icon: Eye },
  { id: "source", label: "Source", Icon: Code2 },
  { id: "both", label: "Both", Icon: Columns2 },
] as const satisfies readonly { id: SiteFileViewMode; label: string; Icon: LucideIcon }[];

export default function SiteFileViewModes({
  view,
  hrefFor,
  select,
}: {
  view: SiteFileViewMode;
  hrefFor: (mode: SiteFileViewMode) => string;
  select: (event: MouseEvent<HTMLAnchorElement>, mode: SiteFileViewMode) => void;
}) {
  return (
    <div className="site-file-view-toolbar">
      <span className="site-file-label">VIEW MODE</span>
      <nav className="site-file-view-modes" aria-label="View mode">
        {views.map((item) => (
          <a
            key={item.id}
            href={hrefFor(item.id)}
            className="site-file-view-mode"
            aria-current={view === item.id ? "page" : undefined}
            onClick={(event) => select(event, item.id)}
          >
            <item.Icon size={15} aria-hidden="true" /> {item.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
