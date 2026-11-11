"use client";

import { BookOpen, CornerDownLeft, Layers, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  type IndexedPage,
  indexedPageToItem,
  matchingQuickLinks,
  mergePaletteItems,
  type PaletteItem,
  quickLinks,
} from "@/src/lib/palette-search";

type Pagefind = {
  search: (query: string) => Promise<{
    results: { data: () => Promise<IndexedPage> }[];
  } | null>;
};
type SearchStatus = "idle" | "loading" | "ready" | "error";
type OpenPalette = (trigger?: HTMLElement | null) => boolean;
type PaletteControl = {
  dialog: RefObject<HTMLDialogElement | null>;
  input: RefObject<HTMLInputElement | null>;
  isOpen: boolean;
  open: OpenPalette;
  close: () => void;
  restoreFocus: () => void;
};

const SearchContext = createContext<{ open: OpenPalette; enhanced: boolean } | null>(null);
let pagefindPromise: Promise<Pagefind> | undefined;

function loadPagefind(): Promise<Pagefind> {
  // Pagefind is generated after static export, so load it only in the browser.
  const modulePath = "/pagefind/pagefind.js";
  pagefindPromise ??= import(/* webpackIgnore: true */ modulePath) as Promise<Pagefind>;
  return pagefindPromise.catch((error: unknown) => {
    pagefindPromise = undefined;
    throw error;
  });
}

/** A real link until hydration, including for modified clicks and no-JavaScript use. */
export function SearchTrigger({
  children,
  className,
  current = false,
  onSelect,
}: {
  children: ReactNode;
  className?: string;
  current?: boolean;
  onSelect?: () => void;
}) {
  const search = useContext(SearchContext);
  function handleClick(event: ReactMouseEvent<HTMLAnchorElement>) {
    onSelect?.();
    if (
      !search ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    if (search.open(event.currentTarget)) event.preventDefault();
  }
  return (
    <Link
      className={className}
      aria-current={current ? "page" : undefined}
      aria-keyshortcuts={search?.enhanced ? "Control+K Meta+K" : undefined}
      aria-haspopup={search?.enhanced ? "dialog" : undefined}
      aria-controls={search?.enhanced ? "search-palette" : undefined}
      href="/search/"
      onClick={handleClick}
    >
      {children}
    </Link>
  );
}

function useSearchShortcut(open: OpenPalette) {
  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === "k" &&
        open()
      ) {
        event.preventDefault();
      }
    }
    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, [open]);
}

function useScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);
}

function useCloseOnHistoryChange(dialog: RefObject<HTMLDialogElement | null>) {
  useEffect(() => {
    const handleHistoryChange = () => dialog.current?.close();
    window.addEventListener("popstate", handleHistoryChange);
    return () => window.removeEventListener("popstate", handleHistoryChange);
  }, [dialog]);
}

function usePaletteControl(): PaletteControl {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback((trigger?: HTMLElement | null) => {
    const element = dialog.current;
    if (!element || typeof element.showModal !== "function") return false;
    if (!element.open) {
      const active =
        trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
      const mobileMenu = active?.closest<HTMLDetailsElement>(".site-mobile-menu");
      returnFocus.current = mobileMenu?.querySelector("summary") ?? active;
      try {
        element.showModal();
      } catch {
        return false;
      }
      setIsOpen(true);
    }
    input.current?.focus();
    return true;
  }, []);
  const close = useCallback(() => dialog.current?.close(), []);
  const restoreFocus = useCallback(() => {
    setIsOpen(false);
    if (returnFocus.current?.isConnected) returnFocus.current.focus();
  }, []);
  useSearchShortcut(open);
  useScrollLock(isOpen);
  useCloseOnHistoryChange(dialog);
  return { dialog, input, isOpen, open, close, restoreFocus };
}

function usePaletteResults(isOpen: boolean, query: string) {
  const [results, setResults] = useState<PaletteItem[]>([]);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [activeTerm, setActiveTerm] = useState("");
  const term = query.trim();
  useEffect(() => {
    setActiveTerm(term);
    setResults([]);
    if (!isOpen || !term) {
      setStatus("idle");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    const timer = window.setTimeout(async () => {
      try {
        const pagefind = await loadPagefind();
        const response = await pagefind.search(term);
        const pages = await Promise.all(
          (response?.results ?? []).slice(0, 8).map((item) => item.data()),
        );
        if (cancelled) return;
        setResults(
          pages.flatMap((page) => {
            const item = indexedPageToItem(page, window.location.origin);
            return item ? [item] : [];
          }),
        );
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isOpen, term]);
  const current = activeTerm === term;
  return {
    results: current ? results : [],
    status: !isOpen || !term ? "idle" : current ? status : "loading",
  } as const;
}

function PaletteOption({
  item,
  index,
  active,
  onSelect,
  onHover,
}: {
  item: PaletteItem;
  index: number;
  active: boolean;
  onSelect: (item: PaletteItem) => void;
  onHover: (index: number) => void;
}) {
  return (
    <div
      id={`palette-option-${index}`}
      className="palette-option"
      role="option"
      aria-selected={active}
      tabIndex={-1}
      onMouseEnter={() => onHover(index)}
      onClick={() => onSelect(item)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(item);
        }
      }}
    >
      <span className="palette-item-icon">
        {item.kind === "document" ? (
          <BookOpen size={17} aria-hidden="true" />
        ) : (
          <Layers size={17} aria-hidden="true" />
        )}
      </span>
      <span className="palette-item-copy">
        <strong>{item.title}</strong>
        <span>{item.description}</span>
      </span>
      <span className="palette-item-action">
        <CornerDownLeft size={15} aria-hidden="true" />
      </span>
    </div>
  );
}

function PaletteBody({
  query,
  status,
  items,
  activeIndex,
  onSelect,
  onHover,
  close,
}: {
  query: string;
  status: SearchStatus;
  items: PaletteItem[];
  activeIndex: number;
  onSelect: (item: PaletteItem) => void;
  onHover: (index: number) => void;
  close: () => void;
}) {
  let statusText = "Choose a page or start typing to search the field notes.";
  if (status === "loading") statusText = "Searching the documentation…";
  if (status === "error") statusText = "The search index is unavailable. Try the full search page.";
  if (status === "ready")
    statusText = items.length ? `${items.length} results shown.` : "No results found.";
  return (
    <div className="palette-content">
      <p className="palette-label">{query.trim() ? "SEARCH RESULTS" : "QUICK LINKS"}</p>
      <p className="palette-status" role="status">
        {statusText}
      </p>
      {items.length ? (
        <div
          id="palette-results"
          className="palette-results"
          role="listbox"
          aria-label="Search results"
        >
          {items.map((item, index) => (
            <PaletteOption
              key={item.url}
              item={item}
              index={index}
              active={index === activeIndex}
              onSelect={onSelect}
              onHover={onHover}
            />
          ))}
        </div>
      ) : (
        <div id="palette-results" className="palette-results" />
      )}
      {status === "error" && (
        <p className="palette-fallback">
          <Link href="/search/" onClick={close}>
            Open the full search page
          </Link>
        </p>
      )}
    </div>
  );
}

function PaletteInput({
  control,
  query,
  setQuery,
  items,
  activeIndex,
  onKeyDown,
}: {
  control: PaletteControl;
  query: string;
  setQuery: (value: string) => void;
  items: PaletteItem[];
  activeIndex: number;
  onKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="palette-input-row">
      <Search size={21} aria-hidden="true" />
      <label htmlFor="palette-input" className="visually-hidden">
        Search the documentation
      </label>
      <input
        ref={control.input}
        id="palette-input"
        type="search"
        role="combobox"
        autoComplete="off"
        placeholder="Search projects, docs, and guides…"
        value={query}
        aria-autocomplete="list"
        aria-expanded={items.length > 0}
        aria-controls="palette-results"
        aria-activedescendant={activeIndex >= 0 ? `palette-option-${activeIndex}` : undefined}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={onKeyDown}
      />
      <button
        type="button"
        className="palette-close"
        aria-label="ESC — Close search"
        onClick={control.close}
      >
        <span>ESC</span>
        <X size={15} aria-hidden="true" />
      </button>
    </div>
  );
}

function PaletteFooter() {
  return (
    <div className="palette-footer" aria-hidden="true">
      <span>
        <kbd>↑</kbd>
        <kbd>↓</kbd> navigate
      </span>
      <span>
        <kbd>↵</kbd> open
      </span>
      <span>
        <kbd>esc</kbd> close
      </span>
      <span className="palette-footer-brand">FIELD NOTES / SEARCH</span>
    </div>
  );
}

function closeOnBackdrop(event: ReactPointerEvent<HTMLDialogElement>, close: () => void) {
  if (event.target !== event.currentTarget) return;
  const bounds = event.currentTarget.getBoundingClientRect();
  if (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  )
    close();
}

function useActiveOption(isOpen: boolean, activeIndex: number) {
  useEffect(() => {
    if (isOpen && activeIndex >= 0) {
      document
        .getElementById(`palette-option-${activeIndex}`)
        ?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, isOpen]);
}

function usePaletteSelection(
  items: PaletteItem[],
  select: (item: PaletteItem) => void,
  close: () => void,
) {
  const [selected, setSelected] = useState(0);
  const activeIndex = Math.min(selected, items.length - 1);
  function handleInputKey(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Escape") {
      // A search input otherwise consumes Escape to clear its text before the dialog closes.
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown" && items.length) {
      event.preventDefault();
      setSelected((activeIndex + 1) % items.length);
    } else if (event.key === "ArrowUp" && items.length) {
      event.preventDefault();
      setSelected((activeIndex - 1 + items.length) % items.length);
    } else if (event.key === "Enter" && items[activeIndex]) {
      event.preventDefault();
      select(items[activeIndex]);
    }
  }
  return { activeIndex, setSelected, handleInputKey };
}

function PaletteFrame({
  control,
  onClose,
  children,
}: {
  control: PaletteControl;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <dialog
      ref={control.dialog}
      id="search-palette"
      className="search-palette"
      aria-labelledby="search-palette-title"
      onClose={() => {
        if (!control.dialog.current?.open) onClose();
      }}
      onPointerDown={(event) => closeOnBackdrop(event, control.close)}
    >
      <h2 id="search-palette-title" className="visually-hidden">
        Search the workspace
      </h2>
      {children}
    </dialog>
  );
}

function SearchDialog({ control }: { control: PaletteControl }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { results, status } = usePaletteResults(control.isOpen, query);
  const items = query.trim() ? mergePaletteItems(matchingQuickLinks(query), results) : quickLinks;
  function select(item: PaletteItem) {
    control.close();
    router.push(item.url);
  }
  const { activeIndex, setSelected, handleInputKey } = usePaletteSelection(
    items,
    select,
    control.close,
  );
  useActiveOption(control.isOpen, activeIndex);
  return (
    <PaletteFrame
      control={control}
      onClose={() => {
        setQuery("");
        setSelected(0);
        control.restoreFocus();
      }}
    >
      <PaletteInput
        control={control}
        query={query}
        setQuery={(value) => {
          setQuery(value);
          setSelected(0);
        }}
        items={items}
        activeIndex={activeIndex}
        onKeyDown={handleInputKey}
      />
      <PaletteBody
        query={query}
        status={status}
        items={items}
        activeIndex={activeIndex}
        onSelect={select}
        onHover={setSelected}
        close={control.close}
      />
      <PaletteFooter />
    </PaletteFrame>
  );
}

export default function SearchProvider({ children }: { children: ReactNode }) {
  const control = usePaletteControl();
  const [enhanced, setEnhanced] = useState(false);
  useEffect(() => {
    setEnhanced(
      typeof HTMLDialogElement !== "undefined" &&
        typeof HTMLDialogElement.prototype.showModal === "function",
    );
  }, []);
  return (
    <SearchContext.Provider value={{ open: control.open, enhanced }}>
      {children}
      <SearchDialog control={control} />
    </SearchContext.Provider>
  );
}
