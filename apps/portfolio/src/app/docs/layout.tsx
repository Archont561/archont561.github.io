import SiteHeader from "@/src/components/site-header";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="docs-shell">
      <SiteHeader active="docs" />
      {children}
    </div>
  );
}
