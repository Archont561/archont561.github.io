"use client";

import { ArrowUpRight } from "lucide-react";
import { type MouseEvent, useEffect, useState } from "react";
import SiteFileCode from "@/src/components/site-file-code";
import SiteFileViewModes from "@/src/components/site-file-view-modes";
import SiteFileView from "@/src/components/site-file-views";
import {
  type FeedFormat,
  feedFormat,
  feedFormats,
  type PreviewData,
  type PreviewKind,
  parseSiteFile,
  type SiteFileViewMode,
  siteFileViewMode,
} from "@/src/lib/site-file-preview";

type PreviewState =
  | { status: "idle" }
  | { status: "loading"; path: string }
  | { status: "ready"; path: string; source: string; data: PreviewData }
  | { status: "error"; path: string };

type Resource = { path: string; label: string; language: "markup" | "json" | "text" };
type Settings = { format: FeedFormat; view: SiteFileViewMode };
type SelectSetting = (
  event: MouseEvent<HTMLAnchorElement>,
  key: "format" | "view",
  value: FeedFormat | SiteFileViewMode,
) => void;

function resourceFor(kind: PreviewKind, format: FeedFormat): Resource {
  if (kind === "robots") return { path: "/robots.txt", label: "robots.txt", language: "text" };
  if (kind === "sitemap") return { path: "/sitemap.xml", label: "sitemap.xml", language: "markup" };
  const resource = feedFormats.find((item) => item.id === format) ?? feedFormats[0];
  if (!resource) throw new Error("Missing RSS preview configuration");
  return { path: resource.path, label: resource.label, language: resource.language };
}

function readSettings(search: string): Settings {
  const params = new URLSearchParams(search);
  return { format: feedFormat(params.get("format")), view: siteFileViewMode(params.get("view")) };
}

function useSettings() {
  const [settings, setSettings] = useState<Settings>({ format: "rss", view: "rendered" });
  useEffect(() => {
    const sync = () => setSettings(readSettings(window.location.search));
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  const select: SelectSetting = (event, key, value) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    const url = new URL(window.location.href);
    if (url.searchParams.get(key) === value) return;
    url.searchParams.set(key, value);
    window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
    setSettings(readSettings(url.search));
  };
  return { settings, select };
}

/** Useful hrefs for opening a selected format or mode in another tab. */
function settingsHref(kind: PreviewKind, settings: Settings): string {
  const params = new URLSearchParams();
  if (kind === "feed") params.set("format", settings.format);
  params.set("view", settings.view);
  return `/seo/${kind}/?${params.toString()}`;
}

function useSiteFile(kind: PreviewKind, format: FeedFormat, path: string): PreviewState {
  const [state, setState] = useState<PreviewState>({ status: "idle" });
  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading", path });
    fetch(path, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Could not fetch ${path}`);
        return response.text();
      })
      .then((source) => {
        const data = parseSiteFile(kind, format, source);
        if (!controller.signal.aborted) setState({ status: "ready", path, source, data });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "error", path });
      });
    return () => controller.abort();
  }, [kind, format, path]);
  return state;
}

function FormatLinks({ settings, select }: { settings: Settings; select: SelectSetting }) {
  return (
    <nav className="site-file-formats" aria-label="Feed format">
      {feedFormats.map((item) => (
        <a
          key={item.id}
          className="site-file-format"
          href={settingsHref("feed", { ...settings, format: item.id })}
          aria-current={settings.format === item.id ? "page" : undefined}
          onClick={(event) => select(event, "format", item.id)}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

function NoScriptFallback({ kind, resource }: { kind: PreviewKind; resource: Resource }) {
  return (
    <noscript className="site-file-noscript">
      This preview needs JavaScript. Open the raw file instead:{" "}
      {kind === "feed" ? (
        <>
          <a href="/feed.rss">RSS</a>, <a href="/feed.atom">Atom</a>, or{" "}
          <a href="/feed.json">JSON Feed</a>.
        </>
      ) : (
        <a href={resource.path}>{resource.label}</a>
      )}
    </noscript>
  );
}

export default function SiteFilePreview({ kind }: { kind: PreviewKind }) {
  const { settings, select } = useSettings();
  const resource = resourceFor(kind, settings.format);
  const state = useSiteFile(kind, settings.format, resource.path);
  const ready = state.status === "ready" && state.path === resource.path ? state : null;
  const failed = state.status === "error" && state.path === resource.path;
  return (
    <section className="site-file-panel" aria-label={`${kind} preview`}>
      <div className="site-file-toolbar">
        {kind === "feed" ? (
          <FormatLinks settings={settings} select={select} />
        ) : (
          <span className="site-file-label">PUBLIC / {resource.label}</span>
        )}
        <a className="site-file-raw" href={resource.path}>
          Open raw {resource.label} <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </div>
      <NoScriptFallback kind={kind} resource={resource} />
      {state.status !== "idle" && !ready && !failed && (
        <p className="site-file-status" role="status">
          Loading the file…
        </p>
      )}
      {failed && (
        <p className="site-file-status" role="alert">
          The preview could not load this file. You can still open the raw version above.
        </p>
      )}
      {ready && (
        <>
          <SiteFileViewModes
            view={settings.view}
            hrefFor={(view) => settingsHref(kind, { ...settings, view })}
            select={(event, view) => select(event, "view", view)}
          />
          <div className={`site-file-content site-file-content--${settings.view}`}>
            {settings.view !== "rendered" && (
              <div className="site-file-source">
                <div className="site-file-source-heading">
                  <span>{resource.label} source</span>
                  <span>
                    {resource.language === "markup" ? "XML" : resource.language.toUpperCase()}
                  </span>
                </div>
                <SiteFileCode
                  source={ready.source}
                  language={resource.language}
                  label={resource.label}
                />
              </div>
            )}
            {settings.view !== "source" && <SiteFileView data={ready.data} />}
          </div>
        </>
      )}
    </section>
  );
}
