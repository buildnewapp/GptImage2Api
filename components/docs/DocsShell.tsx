import { Link } from "@/i18n/routing";
import { BookOpen, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import DocsSearch from "./DocsSearch";
import { getDocsCopy, getDocsNavigation } from "./docs-config";

type DocsShellProps = {
  locale: string;
  currentSlug?: string;
  children: ReactNode;
};

export default function DocsShell({
  locale,
  currentSlug,
  children,
}: DocsShellProps) {
  const copy = getDocsCopy(locale);
  const navigation = getDocsNavigation(locale);
  const searchItems = navigation.flatMap((group) => group.items);

  return (
    <div className="w-full bg-linear-to-b from-primary/[0.04] via-background to-background">
      <header className="relative z-10 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center gap-3 px-4 py-2 sm:gap-4 sm:px-6">
          <Link
            href="/docs"
            aria-label={copy.center}
            className="group flex shrink-0 cursor-pointer items-center gap-2 text-sm font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors duration-200 group-hover:bg-primary/15 motion-reduce:transition-none">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="hidden sm:inline">{copy.center}</span>
          </Link>
          <div className="ml-auto min-w-0 flex-1 sm:max-w-md">
            <DocsSearch
              items={searchItems}
              placeholder={copy.search}
              shortcut={copy.searchShortcut}
              noResults={copy.noResults}
            />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:gap-14 lg:py-10">
        <aside className="hidden w-60 shrink-0 lg:block">
          <nav className="sticky top-24 space-y-7" aria-label={copy.menu}>
            <Link
              href="/docs"
              className="mb-6 flex cursor-pointer items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
            >
              {copy.back}
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            {navigation.map((group) => (
              <div key={group.title}>
                <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
                  {group.title}
                </h2>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = item.slug === currentSlug;

                    return (
                      <Link
                        key={item.slug}
                        href={item.href}
                        aria-current={isActive ? "page" : undefined}
                        className={`block cursor-pointer rounded-md border-l-2 px-3 py-2 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${
                          isActive
                            ? "border-primary/50 bg-primary/10 font-medium text-primary"
                            : "border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                        }`}
                      >
                        {item.title}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <details className="mb-6 rounded-xl border border-border/70 bg-card/80 p-3 shadow-sm lg:hidden">
            <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {copy.menu}
            </summary>
            <nav className="mt-3 space-y-4" aria-label={copy.menu}>
              {navigation.map((group) => (
                <div key={group.title}>
                  <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.title}
                  </h2>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const isActive = item.slug === currentSlug;

                      return (
                        <Link
                          key={item.slug}
                          href={item.href}
                          aria-current={isActive ? "page" : undefined}
                          className={`block min-h-11 cursor-pointer rounded-md px-3 py-2.5 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${
                            isActive
                              ? "bg-primary/10 font-medium text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          {item.title}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </details>
          <div className="min-w-0 max-w-4xl">{children}</div>
        </div>
      </div>
    </div>
  );
}
