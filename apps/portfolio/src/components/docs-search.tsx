"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function DocsSearch() {
  const root = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (root.current) root.current.textContent = "Loading the search index…";
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "/pagefind/pagefind-ui.css";
    document.head.append(css);
    const script = document.createElement("script");
    script.src = "/pagefind/pagefind-ui.js";
    script.onload = () => {
      const UI = (
        window as unknown as {
          PagefindUI: new (options: object) => { destroy: () => void };
        }
      ).PagefindUI;
      if (root.current) {
        root.current.replaceChildren();
        new UI({
          element: root.current,
          showSubResults: true,
          showImages: false,
          bundlePath: "/pagefind/",
        });
        setReady(true);
      }
    };
    script.onerror = () => {
      if (root.current) root.current.textContent = "The search index could not be loaded.";
    };
    document.body.append(script);
    return () => {
      script.remove();
      css.remove();
      if (root.current) root.current.innerHTML = "";
    };
  }, []);
  return (
    <>
      <div ref={root} />
      {!ready && (
        <p className="search-fallback">
          Search requires JavaScript and a supported browser. You can still browse the{" "}
          <Link href="/docs/">documentation</Link> or the{" "}
          <Link href="/projects/">project list</Link>.
        </p>
      )}
    </>
  );
}
