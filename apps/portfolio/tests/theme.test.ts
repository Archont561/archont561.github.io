import { runInNewContext } from "node:vm";
import { expect, test } from "@archont561/bun-test-utils";
import {
  isTheme,
  THEME_CHANGE_EVENT,
  THEME_REQUEST_EVENT,
  THEME_STORAGE_KEY,
  themeBootstrap,
  themeFromAttribute,
} from "@/src/lib/theme";

type TestEvent = {
  type: string;
  detail?: unknown;
  key?: string | null;
  newValue?: string | null;
  storageArea?: unknown;
  matches?: boolean;
};
type Listener = (event: TestEvent) => void;

class Events {
  private listeners = new Map<string, Listener[]>();

  addEventListener(type: string, listener: Listener): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  dispatchEvent(event: TestEvent): boolean {
    for (const listener of this.listeners.get(event.type) ?? []) listener(event);
    return true;
  }
}

class Storage {
  value: string | null;
  writes: string[] = [];
  blocked: boolean;

  constructor(value: string | null, blocked: boolean) {
    this.value = value;
    this.blocked = blocked;
  }

  getItem(key: string): string | null {
    if (this.blocked) throw new Error("Storage unavailable");
    return key === THEME_STORAGE_KEY ? this.value : null;
  }

  setItem(key: string, value: string): void {
    if (this.blocked) throw new Error("Storage unavailable");
    if (key === THEME_STORAGE_KEY) {
      this.value = value;
      this.writes.push(value);
    }
  }
}

class Media extends Events {
  matches: boolean;

  constructor(matches: boolean) {
    super();
    this.matches = matches;
  }

  change(matches: boolean): void {
    this.matches = matches;
    this.dispatchEvent({ type: "change", matches });
  }
}

class Browser extends Events {
  storage: Storage;
  media: Media;

  constructor(dark: boolean, saved: string | null, blocked: boolean) {
    super();
    this.storage = new Storage(saved, blocked);
    this.media = new Media(dark);
  }

  get localStorage(): Storage {
    if (this.storage.blocked) throw new Error("Storage unavailable");
    return this.storage;
  }

  matchMedia(query: string): Media {
    if (query !== "(prefers-color-scheme: dark)") throw new Error(`Unexpected query: ${query}`);
    return this.media;
  }
}

class CustomEvent {
  type: string;
  detail: unknown;

  constructor(type: string, options: { detail: unknown }) {
    this.type = type;
    this.detail = options.detail;
  }
}

function start(
  options: {
    dark?: boolean;
    saved?: string | null;
    blocked?: boolean;
    legacyMedia?: boolean;
    noMedia?: boolean;
  } = {},
) {
  const browser = new Browser(
    options.dark ?? false,
    options.saved ?? null,
    options.blocked ?? false,
  );
  if (options.noMedia) Object.defineProperty(browser, "matchMedia", { value: undefined });
  if (options.legacyMedia) {
    Object.defineProperty(browser.media, "addEventListener", { value: undefined });
    Object.assign(browser.media, {
      addListener: (listener: Listener) =>
        Events.prototype.addEventListener.call(browser.media, "change", listener),
    });
  }
  const attributes: Record<string, string> = {};
  const document = {
    documentElement: {
      setAttribute(name: string, value: string) {
        attributes[name] = value;
      },
    },
  };
  runInNewContext(themeBootstrap, { window: browser, document, CustomEvent });
  return { browser, attributes };
}

test("first load follows the browser without creating a cached preference", () => {
  for (const [dark, expected] of [
    [false, "day"],
    [true, "night"],
  ] as const) {
    const { browser, attributes } = start({ dark });
    expect(attributes["data-terrain-theme"]).toBe(expected);
    expect(browser.storage.value).toBeNull();
    expect(browser.storage.writes).toEqual([]);
  }
});

test("a valid cached choice wins at load; invalid values fall back to the browser", () => {
  expect(start({ dark: true, saved: "light" }).attributes["data-terrain-theme"]).toBe("day");
  expect(start({ dark: false, saved: "dark" }).attributes["data-terrain-theme"]).toBe("night");
  const invalid = start({ dark: true, saved: "unknown" });
  expect(invalid.attributes["data-terrain-theme"]).toBe("night");
  expect(invalid.browser.storage.writes).toEqual([]);
});

test("manual theme requests update the page, cache, and listeners", () => {
  const { browser, attributes } = start();
  const changes: unknown[] = [];
  browser.addEventListener(THEME_CHANGE_EVENT, (event) => changes.push(event.detail));
  browser.dispatchEvent({ type: THEME_REQUEST_EVENT, detail: "dark" });
  expect(attributes["data-terrain-theme"]).toBe("night");
  expect(browser.storage.value).toBe("dark");
  browser.dispatchEvent({ type: THEME_REQUEST_EVENT, detail: "light" });
  browser.dispatchEvent({ type: THEME_REQUEST_EVENT, detail: "invalid" });
  expect(attributes["data-terrain-theme"]).toBe("day");
  expect(browser.storage.writes).toEqual(["dark", "light"]);
  expect(changes).toEqual(["dark", "light"]);
});

test("browser preference changes replace the current and cached theme", () => {
  const { browser, attributes } = start({ saved: "dark" });
  const changes: unknown[] = [];
  browser.addEventListener(THEME_CHANGE_EVENT, (event) => changes.push(event.detail));
  browser.media.change(true);
  browser.media.change(false);
  expect(attributes["data-terrain-theme"]).toBe("day");
  expect(browser.storage.value).toBe("light");
  expect(browser.storage.writes).toEqual(["dark", "light"]);
  expect(changes).toEqual(["dark", "light"]);
});

test("other tabs' cached choices and cleared storage synchronize without rewriting", () => {
  const { browser, attributes } = start({ dark: true });
  browser.storage.value = "light";
  browser.dispatchEvent({
    type: "storage",
    key: THEME_STORAGE_KEY,
    newValue: "light",
    storageArea: browser.storage,
  });
  expect(attributes["data-terrain-theme"]).toBe("day");
  browser.dispatchEvent({ type: "storage", key: "unrelated", newValue: "dark" });
  browser.dispatchEvent({
    type: "storage",
    key: THEME_STORAGE_KEY,
    newValue: "dark",
    storageArea: {},
  });
  expect(attributes["data-terrain-theme"]).toBe("day");
  browser.storage.value = null;
  browser.dispatchEvent({
    type: "storage",
    key: null,
    newValue: null,
    storageArea: browser.storage,
  });
  expect(attributes["data-terrain-theme"]).toBe("night");
  expect(browser.storage.writes).toEqual([]);
});

test("a delayed cross-tab event cannot replace a newer saved choice", () => {
  const { browser, attributes } = start();
  browser.storage.value = "light";
  browser.dispatchEvent({
    type: "storage",
    key: THEME_STORAGE_KEY,
    newValue: "dark",
    storageArea: browser.storage,
  });
  expect(attributes["data-terrain-theme"]).toBe("day");
  expect(browser.storage.value).toBe("light");
  expect(browser.storage.writes).toEqual([]);
});

test("unavailable storage does not prevent applying manual or browser changes", () => {
  const { browser, attributes } = start({ dark: true, blocked: true });
  expect(attributes["data-terrain-theme"]).toBe("night");
  browser.dispatchEvent({ type: THEME_REQUEST_EVENT, detail: "light" });
  expect(attributes["data-terrain-theme"]).toBe("day");
  browser.media.change(true);
  expect(attributes["data-terrain-theme"]).toBe("night");
});

test("missing and legacy media-query APIs degrade gracefully", () => {
  const missing = start({ noMedia: true });
  expect(missing.attributes["data-terrain-theme"]).toBe("day");
  missing.browser.dispatchEvent({ type: THEME_REQUEST_EVENT, detail: "dark" });
  expect(missing.attributes["data-terrain-theme"]).toBe("night");
  const legacy = start({ legacyMedia: true });
  legacy.browser.media.change(true);
  expect(legacy.attributes["data-terrain-theme"]).toBe("night");
  expect(legacy.browser.storage.value).toBe("dark");
});

test("theme values and document attributes are interpreted explicitly", () => {
  expect(isTheme("light")).toBe(true);
  expect(isTheme("dark")).toBe(true);
  expect(isTheme("day")).toBe(false);
  expect(isTheme(null)).toBe(false);
  expect(themeFromAttribute("day")).toBe("light");
  expect(themeFromAttribute("night")).toBe("dark");
  expect(themeFromAttribute(null)).toBeNull();
});
