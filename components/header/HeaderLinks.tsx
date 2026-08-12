"use client";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { DynamicIcon } from "@/components/DynamicIcon";
import { Link as I18nLink, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { HeaderLink } from "@/types/common";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

const HeaderLinks = () => {
  const tHeader = useTranslations("Header");
  const pathname = usePathname();

  const headerLinks: HeaderLink[] = tHeader.raw("links");
  const pricingLink = headerLinks.find((link) => link.id === "pricing");
  if (pricingLink) {
    pricingLink.href = process.env.NEXT_PUBLIC_PRICING_PATH!;
  }

  return (
    <NavigationMenu viewport={false} className="hidden lg:block">
      <NavigationMenuList className="flex-wrap">
        {headerLinks.map((link) => (
          <NavigationMenuItem key={link.name}>
            {link.items?.length || link.groups?.length ? (
              <>
                <NavigationMenuTrigger className="bg-transparent rounded-xl px-4 py-2 flex items-center gap-x-1 hover:bg-accent-foreground/10 hover:text-accent-foreground text-sm font-normal text-muted-foreground">
                  {link.name}
                </NavigationMenuTrigger>
                <NavigationMenuContent
                  className={cn(
                    "z-50 rounded-xl border-slate-200 p-2 group-data-[viewport=false]/navigation-menu:bg-white group-data-[viewport=false]/navigation-menu:text-slate-900 shadow-xl dark:border-white/10 dark:group-data-[viewport=false]/navigation-menu:bg-slate-950 dark:group-data-[viewport=false]/navigation-menu:text-slate-100",
                    link.groups?.length && "left-1/2 -translate-x-1/2",
                  )}
                >
                  <div
                    className={cn(
                      "grid w-[256px] gap-2",
                      link.groups?.length && "w-[544px] grid-cols-2 gap-3",
                    )}
                  >
                    {(link.groups?.length
                      ? link.groups
                      : [{ title: "", items: link.items ?? [] }]
                    ).map((group, groupIndex) => (
                      <div key={group.title || groupIndex} className="min-w-0">
                        {group.title && (
                          <p className="px-2 pb-1.5 pt-1 text-xs font-medium text-muted-foreground">
                            {group.title}
                          </p>
                        )}
                        <ul className="grid gap-0.5">
                          {group.items.map((child) => (
                            <li key={child.name}>
                              <NavigationMenuLink asChild>
                                <I18nLink
                                  href={child.href}
                                  title={child.name}
                                  prefetch={false}
                                  target={child.target || "_self"}
                                  rel={child.rel || undefined}
                                  className="group/link rounded-lg border border-transparent px-2 py-1.5 text-[13px] text-muted-foreground transition-[background-color,border-color,color,box-shadow,backdrop-filter] duration-200 ease-out hover:border-border/70 hover:bg-background/70 hover:text-foreground hover:shadow-sm hover:backdrop-blur-md focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none dark:hover:border-white/10 dark:hover:bg-white/[0.06]"
                                >
                                  <div className="flex min-w-0 items-center gap-2.5">
                                    {child.icon && (
                                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground transition-colors duration-200 group-hover/link:bg-background">
                                        <DynamicIcon
                                          name={child.icon}
                                          className="size-4"
                                          aria-hidden="true"
                                        />
                                      </span>
                                    )}
                                    <span className="min-w-0">
                                      <span className="flex items-center gap-1.5 font-medium text-foreground">
                                        <span className="truncate">
                                          {child.name}
                                        </span>
                                        {child.target === "_blank" && (
                                          <ExternalLink className="size-3 shrink-0" />
                                        )}
                                      </span>
                                      {child.description && (
                                        <span className="mt-0.5 block text-xs text-muted-foreground">
                                          {child.description}
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                </I18nLink>
                              </NavigationMenuLink>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </NavigationMenuContent>
              </>
            ) : (
              <I18nLink
                key={link.name}
                href={link.href}
                title={link.name}
                prefetch={false}
                target={link.target || "_self"}
                rel={link.rel || undefined}
                className={cn(
                  "bg-transparent rounded-xl px-4 py-2 flex items-center gap-x-1 text-sm font-normal text-muted-foreground hover:bg-accent-foreground/10 hover:text-accent-foreground",
                  pathname === link.href &&
                    "font-medium text-accent-foreground",
                )}
              >
                {link.name}
                {link.target === "_blank" && (
                  <span className="text-xs">
                    <ExternalLink className="w-4 h-4" />
                  </span>
                )}
              </I18nLink>
            )}
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
};

export default HeaderLinks;
