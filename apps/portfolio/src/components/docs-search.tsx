"use client";
import { useEffect, useRef } from "react";
export default function DocsSearch() {
  const root = useRef<HTMLDivElement>(null);
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
      }
    };
    script.onerror = () => {
      if (root.current)
        root.current.textContent =
          "Search becomes available after a production build. Use the homepage project filter during development.";
    };
    document.body.append(script);
    return () => {
      script.remove();
      css.remove();
      if (root.current) root.current.innerHTML = "";
    };
  }, []);
  return <div ref={root} />;
}
