"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import {
  THEME_CHANGE_EVENT,
  THEME_REQUEST_EVENT,
  type Theme,
  themeFromAttribute,
} from "@/src/lib/theme";

/** The bootstrap owns synchronization; this control only requests a new theme. */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const sync = () =>
      setTheme(themeFromAttribute(document.documentElement.getAttribute("data-terrain-theme")));
    window.addEventListener(THEME_CHANGE_EVENT, sync);
    sync();
    return () => window.removeEventListener(THEME_CHANGE_EVENT, sync);
  }, []);

  const next = theme === "dark" ? "light" : "dark";
  const label = theme ? `Switch to ${next} theme` : "Theme follows browser settings";
  return (
    <button
      className="theme-toggle"
      type="button"
      aria-label={label}
      title={label}
      disabled={!theme}
      onClick={() => window.dispatchEvent(new CustomEvent(THEME_REQUEST_EVENT, { detail: next }))}
    >
      <Sun className="theme-icon-sun" size={19} aria-hidden="true" />
      <Moon className="theme-icon-moon" size={19} aria-hidden="true" />
    </button>
  );
}
