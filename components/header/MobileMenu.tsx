"use client";

import { DynamicIcon } from "@/components/DynamicIcon";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link as I18nLink } from "@/i18n/routing";
import { HeaderLink } from "@/types/common";
import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Fragment } from "react";

export default function MobileMenu() {
  const t = useTranslations("Home");
  const tHeader = useTranslations("Header");

  const headerLinks: HeaderLink[] = tHeader.raw("links");
  const pricingLink = headerLinks.find((link) => link.id === "pricing");
  if (pricingLink) {
    pricingLink.href = process.env.NEXT_PUBLIC_PRICING_PATH!;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="p-2" aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>
          <I18nLink
            href="/"
            title={t("title")}
            prefetch={false}
            className="flex items-center space-x-1 font-bold"
          >
            <Image
              alt={t("title")}
              src="/logo.png"
              className="w-6 h-6"
              width={32}
              height={32}
            />
            <span>{t("title")}</span>
          </I18nLink>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {headerLinks.map((link) =>
            link.items?.length || link.groups?.length ? (
              <DropdownMenuSub key={link.name}>
                <DropdownMenuSubTrigger className="px-2 py-1.5">
                  {link.name}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-72">
                  {(link.groups?.length
                    ? link.groups
                    : [{ title: "", items: link.items ?? [] }]
                  ).map((group, groupIndex) => (
                    <Fragment key={group.title || groupIndex}>
                      {groupIndex > 0 && <DropdownMenuSeparator />}
                      <DropdownMenuGroup>
                        {group.title && (
                          <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                            {group.title}
                          </DropdownMenuLabel>
                        )}
                        {group.items.map((child) => (
                          <DropdownMenuItem key={child.name} asChild>
                            <I18nLink
                              href={child.href}
                              title={child.name}
                              prefetch={false}
                              target={child.target || "_self"}
                              rel={child.rel || undefined}
                              className="flex w-full items-center gap-3 py-2"
                            >
                              {child.icon && (
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
                                  <DynamicIcon
                                    name={child.icon}
                                    className="size-4"
                                    aria-hidden="true"
                                  />
                                </span>
                              )}
                              <span className="min-w-0">
                                <span className="block truncate">
                                  {child.name}
                                </span>
                                {child.description && (
                                  <span className="block text-xs text-muted-foreground">
                                    {child.description}
                                  </span>
                                )}
                              </span>
                            </I18nLink>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuGroup>
                    </Fragment>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ) : (
              <DropdownMenuItem key={link.name}>
                <I18nLink
                  href={link.href}
                  title={link.name}
                  prefetch={false}
                  target={link.target || "_self"}
                  rel={link.rel || undefined}
                >
                  {link.name}
                </I18nLink>
              </DropdownMenuItem>
            ),
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between px-1">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
