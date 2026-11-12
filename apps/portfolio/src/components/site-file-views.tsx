import { ArrowUpRight } from "lucide-react";
import type {
  FeedPreview,
  PreviewData,
  RobotRule,
  SitemapEntry,
} from "@/src/lib/site-file-preview";

function dateLabel(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return null;
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

function FeedView({ feed }: { feed: FeedPreview }) {
  return (
    <div className="site-file-rendered">
      <div className="site-file-rendered-header">
        <div>
          <p className="site-file-label">FIELD NOTES / SUBSCRIPTION</p>
          <h2 className="site-file-rendered-title">{feed.title || "Workspace feed"}</h2>
          <p className="site-file-rendered-description">
            {feed.description || "Documentation from the open workspace."}
          </p>
        </div>
        <span className="site-file-count">{feed.items.length} entries</span>
      </div>
      <ol className="site-file-list">
        {feed.items.map((item) => (
          <li className="site-file-feed-item" key={item.path ?? item.title}>
            <div>
              <h3 className="site-file-item-title">
                {item.path ? (
                  <a className="site-file-item-link" href={item.path}>
                    {item.title || "Untitled document"}
                  </a>
                ) : (
                  item.title
                )}
              </h3>
              {item.description && <p className="site-file-item-description">{item.description}</p>}
              <span className="site-file-item-date">
                {dateLabel(item.date) ?? "Date not recorded"}
              </span>
            </div>
            {item.path && <ArrowUpRight size={17} aria-hidden="true" />}
          </li>
        ))}
      </ol>
    </div>
  );
}

function RobotsView({ rules }: { rules: RobotRule[] }) {
  return (
    <div className="site-file-rendered">
      <div className="site-file-rendered-header">
        <div>
          <p className="site-file-label">CRAWL POLICY / DIRECTIVES</p>
          <h2 className="site-file-rendered-title">What crawlers are told</h2>
          <p className="site-file-rendered-description">
            These directives are served from the site's robots.txt file.
          </p>
        </div>
        <span className="site-file-count">{rules.length} directives</span>
      </div>
      <dl className="site-file-rules">
        {rules.map((rule) => (
          <div className="site-file-rule" key={rule.line}>
            <dt className="site-file-directive">{rule.directive}</dt>
            <dd className="site-file-rule-value">{rule.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SitemapView({ entries }: { entries: SitemapEntry[] }) {
  return (
    <div className="site-file-rendered">
      <div className="site-file-rendered-header">
        <div>
          <p className="site-file-label">SITE INDEX / URL SET</p>
          <h2 className="site-file-rendered-title">Pages on the map</h2>
          <p className="site-file-rendered-description">
            Every indexable route listed in the public sitemap.
          </p>
        </div>
        <span className="site-file-count">{entries.length} pages</span>
      </div>
      <ul className="site-file-list site-file-sitemap-list">
        {entries.map((entry) => (
          <li className="site-file-sitemap-item" key={entry.location}>
            {entry.path ? (
              <a className="site-file-sitemap-link" href={entry.path}>
                {entry.path}
              </a>
            ) : (
              <span>{entry.location}</span>
            )}
            {entry.date && (
              <time className="site-file-item-date" dateTime={entry.date}>
                {dateLabel(entry.date) ?? entry.date}
              </time>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SiteFileView({ data }: { data: PreviewData }) {
  if (data.kind === "feed") return <FeedView feed={data.feed} />;
  if (data.kind === "robots") return <RobotsView rules={data.rules} />;
  return <SitemapView entries={data.entries} />;
}
