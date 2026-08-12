"use client";

import { Link } from "@/i18n/routing";
import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DocsNavItem } from "./docs-config";

type DocsSearchProps = {
  items: DocsNavItem[];
  placeholder: string;
  shortcut: string;
  noResults: string;
};

export default function DocsSearch({
  items,
  placeholder,
  shortcut,
  noResults,
}: DocsSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }

      if (event.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return items.slice(0, 6);

    return items
      .filter((item) =>
        `${item.title} ${item.description}`
          .toLowerCase()
          .includes(normalizedQuery),
      )
      .slice(0, 6);
  }, [items, query]);

  return (
    <div className="relative min-w-0 flex-1 sm:max-w-md" role="search">
      <div className="flex h-11 items-center gap-2 rounded-xl border border-border/70 bg-card/90 px-3 shadow-sm transition-[border-color,box-shadow] duration-200 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15 motion-reduce:transition-none">
        <Search
          className="h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          aria-label={placeholder}
          aria-expanded={open}
          aria-controls="docs-search-results"
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm"
        />
        <kbd className="hidden rounded-md border border-border/70 bg-muted/70 px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline-block">
          {shortcut}
        </kbd>
      </div>

      {open && (
        <div
          id="docs-search-results"
          className="absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-xl border border-border/70 bg-popover/95 p-1.5 shadow-xl backdrop-blur"
        >
          {results.length > 0 ? (
            results.map((item) => (
              <Link
                key={item.slug}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block cursor-pointer rounded-lg px-3 py-2.5 transition-colors duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
              >
                <div className="text-sm font-medium">{item.title}</div>
                <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                  {item.description}
                </div>
              </Link>
            ))
          ) : (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              {noResults}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
