"use client";

import { DynamicIcon } from "@/components/DynamicIcon";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Link as I18nLink, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import type { HeaderLink } from "@/types/common";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

interface VideoHeaderLinksProps {
  overlay?: boolean;
}

function resolveLinkHref(link: HeaderLink) {
  if (link.id === "pricing" && process.env.NEXT_PUBLIC_PRICING_PATH) {
    return process.env.NEXT_PUBLIC_PRICING_PATH;
  }

  return link.href;
}

export function resolveHeaderLinks(links: HeaderLink[]): HeaderLink[] {
  return links.map((link) => ({
    ...link,
    href: resolveLinkHref(link),
    items: link.items ? resolveHeaderLinks(link.items) : undefined,
    groups: link.groups?.map((group) => ({
      ...group,
      items: resolveHeaderLinks(group.items),
    })),
  }));
}

function isActiveLink(pathname: string, href: string) {
  if (href.includes("#")) {
    return false;
  }

  return pathname === href;
}

export default function VideoHeaderLinks({
  overlay = false,
}: VideoHeaderLinksProps) {
  const tHeader = useTranslations("Header");
  const pathname = usePathname();
  const headerLinks = resolveHeaderLinks(tHeader.raw("links") as HeaderLink[]);

  return (
    <NavigationMenu viewport={false}>
      <NavigationMenuList className="gap-1">
        {headerLinks.map((link) => {
          return (
            <NavigationMenuItem key={link.name}>
              {link.items?.length || link.groups?.length ? (
                <>
                  <NavigationMenuTrigger
                    className={cn(
                      "rounded-full bg-transparent px-4 py-2 text-[0.78rem] font-semibold uppercase tracking-[0.18em] transition-colors",
                      overlay
                        ? "text-white/74 hover:bg-white/10 hover:text-white data-[state=open]:bg-white/12 data-[state=open]:text-white"
                        : "text-muted-foreground hover:bg-card/70 hover:text-foreground data-[state=open]:bg-card/80 data-[state=open]:text-foreground",
                    )}
                  >
                    {link.name}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent
                    className={cn(
                      "z-50 rounded-[1.25rem] p-2",
                      link.groups?.length && "left-1/2 -translate-x-1/2",
                      overlay
                        ? "border border-white/12 group-data-[viewport=false]/navigation-menu:bg-slate-950 group-data-[viewport=false]/navigation-menu:text-white shadow-[0_26px_60px_-36px_rgba(2,8,23,0.86)]"
                        : "border border-slate-200 group-data-[viewport=false]/navigation-menu:bg-white group-data-[viewport=false]/navigation-menu:text-slate-900 shadow-[0_26px_60px_-36px_rgba(15,23,42,0.58)] dark:border-white/10 dark:group-data-[viewport=false]/navigation-menu:bg-slate-950 dark:group-data-[viewport=false]/navigation-menu:text-slate-100",
                    )}
                  >
                    <div
                      className={cn(
                        "grid w-[16rem] gap-2",
                        link.groups?.length && "w-[34rem] grid-cols-2 gap-3",
                      )}
                    >
                      {(link.groups?.length
                        ? link.groups
                        : [{ title: "", items: link.items ?? [] }]
                      ).map((group, groupIndex) => (
                        <div
                          key={group.title || groupIndex}
                          className="min-w-0"
                        >
                          {group.title && (
                            <p
                              className={cn(
                                "px-2 pl-4 pb-1.5 pt-1 text-xs font-medium",
                                overlay
                                  ? "text-white/50"
                                  : "text-muted-foreground",
                              )}
                            >
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
                                    className={cn(
                                      "group/link rounded-xl px-2 py-1.5 text-[13px] transition-[background-color,color,transform,box-shadow] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-ring motion-safe:hover:translate-x-0.5 hover:shadow-sm motion-reduce:transition-none",
                                      overlay
                                        ? "text-white/72 hover:bg-white/8 hover:text-white"
                                        : "text-muted-foreground hover:bg-card/80 hover:text-foreground",
                                    )}
                                  >
                                    <div className="flex min-w-0 items-center gap-2.5">
                                      {child.icon && (
                                        <span
                                          className={cn(
                                            "flex size-8 shrink-0 items-center justify-center rounded-lg transition-[background-color,color,transform] duration-200 ease-out motion-safe:group-hover/link:scale-105 motion-reduce:transition-none",
                                            overlay
                                              ? "bg-white/8 text-white group-hover/link:bg-white/12"
                                              : "bg-muted text-foreground group-hover/link:bg-background",
                                          )}
                                        >
                                          <DynamicIcon
                                            name={child.icon}
                                            className="size-4"
                                            aria-hidden="true"
                                          />
                                        </span>
                                      )}
                                      <span className="min-w-0">
                                        <span
                                          className={cn(
                                            "flex items-center gap-1.5 font-medium",
                                            overlay
                                              ? "text-white"
                                              : "text-foreground",
                                          )}
                                        >
                                          <span className="truncate">
                                            {child.name}
                                          </span>
                                          {child.target === "_blank" && (
                                            <ExternalLink
                                              className={cn(
                                                "size-3 shrink-0",
                                                overlay
                                                  ? "text-white/50"
                                                  : "text-muted-foreground",
                                              )}
                                            />
                                          )}
                                        </span>
                                        {child.description && (
                                          <span
                                            className={cn(
                                              "mt-0.5 block text-xs",
                                              overlay
                                                ? "text-white/56"
                                                : "text-muted-foreground",
                                            )}
                                          >
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
                  href={link.href}
                  title={link.name}
                  prefetch={false}
                  target={link.target || "_self"}
                  rel={link.rel || undefined}
                  className={cn(
                    "flex items-center gap-1 rounded-full px-4 py-2 text-[0.78rem] font-semibold uppercase tracking-[0.18em] transition-colors",
                    overlay
                      ? "text-white/74 hover:bg-white/10 hover:text-white"
                      : "text-muted-foreground hover:bg-card/70 hover:text-foreground",
                    isActiveLink(pathname, link.href) &&
                      (overlay
                        ? "bg-white/12 text-white"
                        : "bg-card/80 text-primary"),
                  )}
                >
                  <span>{link.name}</span>
                  {link.target === "_blank" && (
                    <ExternalLink className="h-3.5 w-3.5" />
                  )}
                </I18nLink>
              )}
            </NavigationMenuItem>
          );
        })}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
