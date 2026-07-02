"use client";

import {
  Crown,
  Home,
  type LucideIcon,
  MessageSquareText,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Link as I18nLink, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type TabItem = {
  href: string;
  labelKey: "home" | "prompts" | "generate" | "premium" | "user";
  icon: LucideIcon;
  primary?: boolean;
  matchPrefix?: string;
};

const tabItems: TabItem[] = [
  {
    href: "/",
    labelKey: "home",
    icon: Home,
  },
  {
    href: "/prompts",
    labelKey: "prompts",
    icon: MessageSquareText,
  },
  {
    href: "/generator",
    labelKey: "generate",
    icon: Sparkles,
    primary: true,
  },
  {
    href: "/pricing",
    labelKey: "premium",
    icon: Crown,
  },
  {
    href: "/dashboard/videos",
    labelKey: "user",
    icon: UserRound,
    matchPrefix: "/dashboard",
  },
] as const;

function isActivePath(pathname: string, href: string, matchPrefix?: string) {
  if (href === "/") {
    return pathname === "/";
  }

  if (matchPrefix && pathname.startsWith(matchPrefix)) {
    return true;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MobileTabBar() {
  const t = useTranslations("Navigation");
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile primary navigation"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 h-[6rem] bg-transparent px-3 pb-[calc(10px+env(safe-area-inset-bottom))] lg:hidden"
    >
      <div className="pointer-events-auto relative z-10 mx-auto grid h-[5rem] max-w-md grid-cols-5 items-end gap-1">
        <div className="absolute inset-x-0 bottom-0 h-[3.75rem] rounded-[1.5rem] border border-white/10 bg-[#050505] shadow-[0_18px_48px_-26px_rgba(0,0,0,0.92)]" />
        {tabItems.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(pathname, item.href, item.matchPrefix);

          return (
            <I18nLink
              key={item.href}
              href={item.href}
              prefetch={false}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative z-10 flex min-w-0 flex-col items-center justify-end gap-1 rounded-full px-1 pb-1.5 text-[11px] font-medium leading-none transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                item.primary
                  ? "text-zinc-400"
                  : active
                    ? "text-white"
                    : "text-zinc-500 hover:text-zinc-200",
              )}
            >
              <span
                className={cn(
                  "inline-flex items-center justify-center transition-all duration-200",
                  item.primary
                    ? "mb-0 h-14 w-14 -translate-y-1 rounded-full bg-[linear-gradient(135deg,#212c45_0%,#2e82ef_100%)] text-black shadow-[0_0px_0_#91b80a,0_22px_34px_-22px_rgba(217,255,0,0.9)] group-active:translate-y-1"
                    : "h-7 w-7 rounded-full group-active:scale-95",
                  !item.primary && active ? "text-white" : null,
                  !item.primary && !active ? "text-zinc-400" : null,
                )}
                aria-hidden="true"
              >
                <Icon
                  className={cn(
                    item.primary ? "h-6 w-6 text-white" : "h-5 w-5",
                  )}
                  strokeWidth={item.primary ? 2.6 : 2.4}
                />
              </span>
              <span className="max-w-full truncate">{t(item.labelKey)}</span>
            </I18nLink>
          );
        })}
      </div>
    </nav>
  );
}
