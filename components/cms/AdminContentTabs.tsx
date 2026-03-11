import { Link as I18nLink } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { ADMIN_CONTENT_TABS } from "@/lib/cms/admin-content-navigation";
import { getTranslations } from "next-intl/server";

type AdminContentTabsProps = {
  currentHref: string;
};

export async function AdminContentTabs({
  currentHref,
}: AdminContentTabsProps) {
  const t = await getTranslations("Login");
  const labels = t.raw("AdminContentTabs") as Record<string, string>;

  return (
    <nav aria-label="Admin content types" className="overflow-x-auto">
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="inline-flex min-w-full items-center gap-1 rounded-lg bg-muted p-1 md:min-w-0"
      >
        {ADMIN_CONTENT_TABS.map((tab) => {
          const isActive = tab.href === currentHref;

          return (
            <I18nLink
              key={tab.href}
              href={tab.href}
              prefetch={false}
              role="tab"
              aria-selected={isActive}
              className={cn(
                "inline-flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {labels[tab.labelKey] ?? tab.label}
            </I18nLink>
          );
        })}
      </div>
    </nav>
  );
}
