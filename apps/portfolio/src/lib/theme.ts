export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "archont561-theme";
export const THEME_CHANGE_EVENT = "archont561-theme-change";
export const THEME_REQUEST_EVENT = "archont561-theme-request";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

export function themeFromAttribute(value: string | null): Theme | null {
  return value === "night" ? "dark" : value === "day" ? "light" : null;
}

/** Run before the first paint and keep the document synchronized without React. */
export const themeBootstrap = `(() => {
  const key = ${JSON.stringify(THEME_STORAGE_KEY)};
  const changeEvent = ${JSON.stringify(THEME_CHANGE_EVENT)};
  const requestEvent = ${JSON.stringify(THEME_REQUEST_EVENT)};
  const isTheme = (value) => value === "light" || value === "dark";
  let media = null;
  try {
    if (typeof window.matchMedia === "function") media = window.matchMedia("(prefers-color-scheme: dark)");
  } catch {}
  const systemTheme = () => media && media.matches ? "dark" : "light";
  const resolve = (value) => isTheme(value) ? value : systemTheme();
  const read = () => {
    try { return window.localStorage.getItem(key); } catch { return null; }
  };
  const apply = (theme, persist, notify) => {
    document.documentElement.setAttribute("data-terrain-theme", theme === "dark" ? "night" : "day");
    if (persist) {
      try { window.localStorage.setItem(key, theme); } catch {}
    }
    if (notify) window.dispatchEvent(new CustomEvent(changeEvent, { detail: theme }));
  };
  apply(resolve(read()), false, false);
  const onMediaChange = (event) => apply(event.matches ? "dark" : "light", true, true);
  if (media && typeof media.addEventListener === "function") media.addEventListener("change", onMediaChange);
  else if (media && typeof media.addListener === "function") media.addListener(onMediaChange);
  window.addEventListener("storage", (event) => {
    if (event.key !== key && event.key !== null) return;
    try {
      if (event.storageArea && event.storageArea !== window.localStorage) return;
    } catch {}
    // A queued event can be older than the latest change from this or another tab.
    apply(resolve(read()), false, true);
  });
  window.addEventListener(requestEvent, (event) => {
    if (isTheme(event.detail)) apply(event.detail, true, true);
  });
})();`;
