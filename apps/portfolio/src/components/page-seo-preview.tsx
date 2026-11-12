"use client";

import { ArrowUpRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { type MouseEvent, Suspense, useEffect, useState } from "react";
import PageSeoView from "@/src/components/page-seo-view";
import SiteFileCode from "@/src/components/site-file-code";
import SiteFileViewModes from "@/src/components/site-file-view-modes";
import { type InspectablePage, type PageSeo, parsePageSeo, selectedPage } from "@/src/lib/page-seo";
import { type SiteFileViewMode, siteFileViewMode } from "@/src/lib/site-file-preview";

type Settings = { path: string; view: SiteFileViewMode; invalid: boolean };
type LoadState =
  | { status: "idle" }
  | { status: "loading"; path: string }
  | { status: "ready"; path: string; data: PageSeo }
  | { status: "error"; path: string };

function settingsFromSearch(search: string, pages: InspectablePage[]): Settings {
  const params = new URLSearchParams(search);
  const requested = params.get("page");
  const path = selectedPage(requested, pages);
  return {
    path: path ?? pages[0]?.path ?? "/",
    view: siteFileViewMode(params.get("view")),
    invalid: requested !== null && path === null,
  };
}

// Next.js can change a query through client navigation without a popstate event.
// Keep this observer inside Suspense so the inspector's static/no-JS shell remains exported.
function SearchObserver({
  pages,
  sync,
}: {
  pages: InspectablePage[];
  sync: (settings: Settings) => void;
}) {
  const search = useSearchParams();
  useEffect(() => {
    sync(settingsFromSearch(search.toString(), pages));
  }, [search, pages, sync]);
  return null;
}

function usePageSettings(pages: InspectablePage[]) {
  const [settings, setSettings] = useState<Settings>({
    path: pages[0]?.path ?? "/",
    view: "rendered",
    invalid: false,
  });
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const sync = () => setSettings(settingsFromSearch(window.location.search, pages));
    sync();
    setHydrated(true);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [pages]);
  function update(key: "page" | "view", value: string) {
    const url = new URL(window.location.href);
    if (url.searchParams.get(key) !== value) {
      url.searchParams.set(key, value);
      window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
    setSettings(settingsFromSearch(url.search, pages));
  }
  function selectView(event: MouseEvent<HTMLAnchorElement>, mode: SiteFileViewMode) {
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
    update("view", mode);
  }
  return { settings, hydrated, update, selectView, sync: setSettings };
}

function usePageSeo(path: string, pages: InspectablePage[], enabled: boolean): LoadState {
  const [state, setState] = useState<LoadState>({ status: "idle" });
  useEffect(() => {
    if (!enabled || !selectedPage(path, pages)) return;
    const controller = new AbortController();
    setState({ status: "loading", path });
    // Do not follow a redirect from an allowed path to another origin.
    fetch(path, { signal: controller.signal, redirect: "error" })
      .then((response) => {
        if (!response.ok) throw new Error(`Could not fetch ${path}`);
        return response.text();
      })
      .then((html) => {
        const data = parsePageSeo(html);
        if (!controller.signal.aborted) setState({ status: "ready", path, data });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "error", path });
      });
    return () => controller.abort();
  }, [path, pages, enabled]);
  return state;
}

function viewHref(path: string, view: SiteFileViewMode): string {
  return `/seo/pages/?${new URLSearchParams({ page: path, view }).toString()}`;
}

export default function PageSeoPreview({ pages }: { pages: InspectablePage[] }) {
  const { settings, hydrated, update, selectView, sync } = usePageSettings(pages);
  const state = usePageSeo(settings.path, pages, hydrated);
  const ready = state.status === "ready" && state.path === settings.path ? state : null;
  const failed = state.status === "error" && state.path === settings.path;
  return (
    <section className="site-file-panel" aria-label="Page metadata preview">
      <Suspense fallback={null}>
        <SearchObserver pages={pages} sync={sync} />
      </Suspense>
      <div className="site-file-toolbar page-seo-toolbar">
        <div className="page-seo-picker">
          <label className="site-file-label" htmlFor="page-seo-select">
            PAGE TO INSPECT
          </label>
          <select
            id="page-seo-select"
            value={settings.path}
            disabled={!hydrated}
            onChange={(event) => {
              const path = selectedPage(event.currentTarget.value, pages);
              if (path) update("page", path);
            }}
          >
            {(["Site", "Documentation", "SEO"] as const).map((group) => (
              <optgroup key={group} label={group}>
                {pages
                  .filter((page) => page.group === group)
                  .map((page) => (
                    <option key={page.path} value={page.path}>
                      {page.label} — {page.path}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>
        <a className="site-file-raw" href={settings.path}>
          Open page <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </div>
      <noscript className="site-file-noscript">
        This inspector needs JavaScript. You can still open the page and inspect its HTML in your
        browser.
      </noscript>
      {settings.invalid && (
        <p className="site-file-status" role="status">
          That page is not in this site's list. Showing the homepage instead.
        </p>
      )}
      {hydrated && !ready && !failed && (
        <p className="site-file-status" role="status">
          Loading page metadata…
        </p>
      )}
      {failed && (
        <p className="site-file-status" role="alert">
          The metadata could not be read. You can still open the page above.
        </p>
      )}
      {ready && (
        <>
          <SiteFileViewModes
            view={settings.view}
            hrefFor={(view) => viewHref(settings.path, view)}
            select={selectView}
          />
          <div className={`site-file-content site-file-content--${settings.view}`}>
            {settings.view !== "rendered" && (
              <div className="site-file-source">
                <div className="site-file-source-heading">
                  <span>Extracted metadata</span>
                  <span>HTML · normalized</span>
                </div>
                <SiteFileCode source={ready.data.source} language="markup" label="Metadata" />
              </div>
            )}
            {settings.view !== "source" && (
              <PageSeoView key={settings.path} data={ready.data} path={settings.path} />
            )}
          </div>
        </>
      )}
    </section>
  );
}
