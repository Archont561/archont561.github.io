import type { Folder, Item, Node, Root, Separator } from "fumadocs-core/page-tree";
import { BookOpen, ChevronDown, Search } from "lucide-react";
import Link from "next/link";
import { SearchTrigger } from "@/src/components/search-palette";

function samePath(left: string, right: string) {
  return left.replace(/\/+$/, "") === right.replace(/\/+$/, "");
}

function containsPage(node: Node, currentPath: string): boolean {
  if (node.type === "page") return samePath(node.url, currentPath);
  if (node.type === "separator") return false;
  return (
    (node.index !== undefined && samePath(node.index.url, currentPath)) ||
    node.children.some((child) => containsPage(child, currentPath))
  );
}

function PageLink({ item, currentPath }: { item: Item; currentPath: string }) {
  const current = samePath(item.url, currentPath);
  const props = {
    className: "docs-tree-link",
    "aria-current": current ? ("page" as const) : undefined,
  };
  if (item.external) {
    return (
      <a href={item.url} {...props}>
        {item.name}
      </a>
    );
  }
  return (
    <Link href={item.url} {...props}>
      {item.name}
    </Link>
  );
}

function FolderNode({ folder, currentPath }: { folder: Folder; currentPath: string }) {
  // A section containing only its landing page needs no extra disclosure.
  if (!folder.index && folder.children.length === 1 && folder.children[0]?.type === "page") {
    return (
      <PageLink item={{ ...folder.children[0], name: folder.name }} currentPath={currentPath} />
    );
  }
  return (
    <details key={currentPath} open={folder.defaultOpen || containsPage(folder, currentPath)}>
      <summary>
        <span>{folder.name}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </summary>
      <ul>
        {folder.index && (
          <li>
            <PageLink item={folder.index} currentPath={currentPath} />
          </li>
        )}
        <TreeItems nodes={folder.children} currentPath={currentPath} />
      </ul>
    </details>
  );
}

type Section = { separator?: Separator; nodes: Node[] };

/** Fumadocs separators label the pages following them, without changing their URLs. */
function TreeItems({ nodes, currentPath }: { nodes: Node[]; currentPath: string }) {
  const sections: Section[] = [{ nodes: [] }];
  for (const node of nodes) {
    if (node.type === "separator") sections.push({ separator: node, nodes: [] });
    else sections[sections.length - 1]?.nodes.push(node);
  }
  return sections.flatMap((section, sectionIndex) => {
    if (section.separator) {
      const key = section.separator.$id ?? `section-${sectionIndex}`;
      return [
        <li className="docs-tree-group" key={key}>
          <details
            key={currentPath}
            open={section.nodes.some((node) => containsPage(node, currentPath))}
          >
            <summary>
              <span>{section.separator.name}</span>
              <ChevronDown size={13} aria-hidden="true" />
            </summary>
            <ul>
              <TreeItems nodes={section.nodes} currentPath={currentPath} />
            </ul>
          </details>
        </li>,
      ];
    }
    return section.nodes.map((node, index) => {
      const key = node.$id ?? `${node.type}-${index}`;
      if (node.type === "page") {
        return (
          <li key={key}>
            <PageLink item={node} currentPath={currentPath} />
          </li>
        );
      }
      if (node.type === "folder") {
        return (
          <li className="docs-tree-folder" key={key}>
            <FolderNode folder={node} currentPath={currentPath} />
          </li>
        );
      }
      return null;
    });
  });
}

/** Render the Fumadocs page tree directly, including meta.json separators and ordering. */
export default function DocsNavigation({ tree, currentPath }: { tree: Root; currentPath: string }) {
  return (
    <nav className="docs-navigation" aria-label="Documentation">
      <div className="docs-navigation-heading">
        <BookOpen size={16} aria-hidden="true" />
        <span>Field notes</span>
        <span className="docs-navigation-caption">DOCUMENTATION</span>
      </div>
      <SearchTrigger className="docs-navigation-search">
        <Search size={15} aria-hidden="true" /> Search the docs
      </SearchTrigger>
      <p className="docs-navigation-label">EXPLORE</p>
      <ul className="docs-tree">
        <TreeItems nodes={tree.children} currentPath={currentPath} />
      </ul>
      <div className="docs-navigation-footer">Built in the open.</div>
    </nav>
  );
}
