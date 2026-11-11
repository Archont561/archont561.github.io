import { ArrowUpRight, Github } from "lucide-react";
import Link from "next/link";
import BrandMark from "@/src/components/brand-mark";

export default function SiteFooter() {
  return (
    <footer>
      <Link href="/" className="footer-brand">
        <BrandMark monochrome /> <strong>archont561.</strong>
      </Link>
      <span>Built with Fumadocs. Kept in Git.</span>
      <div>
        <Link href="/projects/">
          Projects <ArrowUpRight size={12} />
        </Link>
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
