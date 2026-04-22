"use client";

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
              {link.items?.length ? (
                <>
                  <NavigationMenuTrigger
                    className={cn(
                      "rounded-full bg-transparent px-4 py-2 text-[0.78rem] font-semibold uppercase tracking-[0.18em] transition-colors",
                      overlay
                        ? "text-white/74 hover:bg-white/10 hover:text-white data-[state=open]:bg-white/12 data-[state=open]:text-white"
                        : "text-muted-foreground hover:bg-card/70 hover:text-foreground data-[state=open]:bg-card/80 data-[state=open]:text-foreground"
                    )}
                  >
                    {link.name}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent
                    className={cn(
                      "rounded-[1.5rem] p-2 backdrop-blur-xl",
                      overlay
                        ? "border border-white/12 bg-slate-950/88 text-white shadow-[0_26px_60px_-36px_rgba(2,8,23,0.86)]"
                        : "border border-border/70 bg-background/95 shadow-[0_26px_60px_-36px_rgba(15,23,42,0.58)]"
                    )}
                  >
                    <ul className="grid min-w-[15rem] gap-1">
                      {link.items.map((child) => {
                        return (
                          <li key={child.name}>
                            <NavigationMenuLink asChild>
                              <I18nLink
                                href={child.href}
                                title={child.name}
                                prefetch={child.target === "_blank" ? false : true}
                                target={child.target || "_self"}
                                rel={child.rel || undefined}
                                className={cn(
                                  "rounded-[1.1rem] px-3 py-2.5 text-sm transition-colors",
                                  overlay
                                    ? "text-white/72 hover:bg-white/8 hover:text-white"
                                    : "text-muted-foreground hover:bg-card/80 hover:text-foreground"
                                )}
                              >
                                <div
                                  className={cn(
                                    "flex items-center gap-1.5 font-medium",
                                    overlay ? "text-white" : "text-foreground"
                                  )}
                                >
                                  <span>{child.name}</span>
                                  {child.target === "_blank" && (
                                    <ExternalLink
                                      className={cn(
                                        "h-3.5 w-3.5",
                                        overlay ? "text-white/50" : "text-muted-foreground"
                                      )}
                                    />
                                  )}
                                </div>
                                {child.description && (
                                  <span
                                    className={cn(
                                      "text-xs",
                                      overlay ? "text-white/56" : "text-muted-foreground"
                                    )}
                                  >
                                    {child.description}
                                  </span>
                                )}
                              </I18nLink>
                            </NavigationMenuLink>
                          </li>
                        );
                      })}
                    </ul>
                  </NavigationMenuContent>
                </>
              ) : (
                <I18nLink
                  href={link.href}
                  title={link.name}
                  prefetch={link.target === "_blank" ? false : true}
                  target={link.target || "_self"}
                  rel={link.rel || undefined}
                  className={cn(
                    "flex items-center gap-1 rounded-full px-4 py-2 text-[0.78rem] font-semibold uppercase tracking-[0.18em] transition-colors",
                    overlay
                      ? "text-white/74 hover:bg-white/10 hover:text-white"
                      : "text-muted-foreground hover:bg-card/70 hover:text-foreground",
                    isActiveLink(pathname, link.href) &&
                      (overlay ? "bg-white/12 text-white" : "bg-card/80 text-primary")
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
