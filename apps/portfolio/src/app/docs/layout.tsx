import { Boxes, Github, Search } from "lucide-react";
import Link from "next/link";
import BrandMark from "@/src/components/brand-mark";
import { source } from "@/src/lib/source";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="docs-shell terrain-surface">
      <header className="docs-header terrain-shell terrain-navigation">
        <Link href="/" className="docs-brand">
          <BrandMark />
          <span>Archont561</span>
        </Link>
        <Link href="/search" aria-label="Search the field notes">
          <Search size={15} />
        </Link>
        <Link href="/packages" aria-label="Package portfolio">
          <Boxes size={15} />
        </Link>
        <a href="/llms.txt">LLMs.txt</a>
        <a href="https://github.com/Archont561" aria-label="GitHub profile">
          <Github size={15} />
        </a>
      </header>
      <div className="docs-grid terrain-shell">
        <aside className="docs-sidebar">
          <nav aria-label="Documentation">
            {source.getPages().map((page) => (
              <Link key={page.url} href={page.url}>
                {page.data.title}
              </Link>
            ))}
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
